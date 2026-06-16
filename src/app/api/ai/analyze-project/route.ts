import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { getAISettings, ensureAITables, chatCompletion } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const body = await request.json();
    const { projectSchema, moduleName, userId, userName } = body;

    if (!projectSchema) {
      return NextResponse.json({ error: "缺少 projectSchema" }, { status: 400 });
    }

    const client = await createServerClient();

    // 1. 获取该项目 Schema 下的所有表
    const { data: tablesResult } = await client.rpc("execute_sql", {
      p_sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = '${projectSchema}'
        ORDER BY table_name
      `,
    });

    const tables = (tablesResult as Array<{ table_name: string }>) || [];
    if (tables.length === 0) {
      return NextResponse.json({
        data: {
          summary: "该项目 Schema 下暂无数据表",
          tables: [],
          totalRows: 0,
        },
      });
    }

    // 2. 为每个表拼接结构+数据样本
    const tableInfos: Array<{
      name: string;
      columns: string[];
      rowCount: number;
      sampleRows: Record<string, unknown>[];
    }> = [];

    let totalRows = 0;

    for (const t of tables) {
      const tableName = t.table_name;

      // 获取列信息
      const { data: colsResult } = await client.rpc("execute_sql", {
        p_sql: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = '${projectSchema}' AND table_name = '${tableName}'
          ORDER BY ordinal_position
        `,
      });
      const columns = (colsResult as Array<{ column_name: string; data_type: string }>) || [];
      const colNames = columns.map((c) => c.column_name);

      // 获取行数 + 前 10 条样本
      const { data: rowsResult } = await client.rpc("execute_sql", {
        p_sql: `
          SELECT * FROM ${projectSchema}."${tableName}" LIMIT 10
        `,
      });
      const rows = (rowsResult as Record<string, unknown>[]) || [];

      // 获取总行数
      const { data: countResult } = await client.rpc("execute_sql", {
        p_sql: `
          SELECT COUNT(*) as cnt FROM ${projectSchema}."${tableName}"
        `,
      });
      const rowCount =
        Number((countResult as Array<{ cnt: string }>)?.[0]?.cnt) || 0;
      totalRows += rowCount;

      // 脱敏：移除可能敏感的列值
      const safeCols = colNames.filter(
        (c) =>
          !c.includes("password") &&
          !c.includes("secret") &&
          c !== "login_password" &&
          c !== "api_key"
      );

      const sampleRows = rows.map((row) => {
        const safe: Record<string, unknown> = {};
        safeCols.forEach((col) => {
          const val = row[col];
          if (typeof val === "string" && val.length > 200) {
            safe[col] = val.slice(0, 200) + "...";
          } else {
            safe[col] = val;
          }
        });
        return safe;
      });

      tableInfos.push({ name: tableName, columns: safeCols, rowCount, sampleRows });
    }

    // 3. 拼装 Prompt
    const tableSummaries = tableInfos
      .map(
        (t) =>
          `表名: ${t.name} | 列: [${t.columns.join(", ")}] | 总行数: ${t.rowCount}\n样本数据:\n${JSON.stringify(t.sampleRows, null, 2)}`
      )
      .join("\n\n---\n\n");

    const prompt = `你是一个项目管理数据分析专家。请分析以下项目数据库的内容，给出专业的分析报告。

项目 Schema: ${projectSchema}
当前模块: ${moduleName || "全部模块"}
数据表数量: ${tables.length}
总数据行数: ${totalRows}

各表结构与样本数据：
${tableSummaries}

请按以下结构输出分析报告（使用 Markdown 格式）：
1. **数据概览**：整体数据量、表关联关系
2. **关键发现**：数据中值得关注的模式、异常或亮点
3. **趋势与建议**：基于数据给出项目管理建议
4. **数据质量**：是否存在缺失值、不一致等问题`;

    // 4. 调用大模型
    const { content, tokens } = await chatCompletion([
      { role: "system", content: "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。" },
      { role: "user", content: prompt },
    ]);

    // 5. 记录日志
    if (userId) {
      logAIUsage({
        userId,
        userName,
        feature: "analyze-project",
        tokensUsed: tokens,
        projectId: projectSchema,
      });
    }

    return NextResponse.json({
      data: {
        analysis: content,
        tableCount: tables.length,
        totalRows,
        tokens,
      },
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("API Key 未配置")) {
      return NextResponse.json({ error: "API Key 未配置", code: "NO_KEY" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
