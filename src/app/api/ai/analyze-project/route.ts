import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { getAISettings, ensureAITables, chatCompletion } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";

const MODULE_PROMPT_HINTS: Record<string, string> = {
  scope: "重点关注项目范围的定义完整性、WBS 分解合理性、变更控制情况与范围蔓延风险",
  schedule: "重点关注里程碑达成率、关键路径偏差、延期任务趋势与进度压缩可行性",
  quality: "重点关注质量问题的分布与趋势、整改完成率、重复问题模式",
  cost: "重点关注预算执行偏差率、成本超支风险信号、费用结构合理性",
  collaboration: "重点关注跨部门协同效率、资源冲突与排队情况",
  communication: "重点关注沟通记录完整性、干系人覆盖度、问题响应时效",
  risk: "重点关注风险等级分布、高影响概率风险的应对措施覆盖率、残留风险趋势",
  procurement: "重点关注采购进度偏差、供应商交付质量、合同执行风险",
  resource: "重点关注资源利用率、瓶颈资源识别、资源缺口预测与调配建议",
  document: "重点关注文档完整度、版本管理规范性、关键文档缺失风险",
};

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const body = await request.json();
    const { projectSchema, projectName, moduleName, tableCode, userId, userName, question, conversationHistory, systemMessage, userPrompt } = body;

    if (!projectSchema) {
      return NextResponse.json({ error: "缺少 projectSchema" }, { status: 400 });
    }

    const client = await createServerClient();

    // 获取表码→显示名称映射
    let tableNameMap: Record<string, string> = {};
    try {
      const { data: standards } = await client.rpc("dp_select", { p_table: "standards" });
      const stdRows = (standards as Array<{ table_code: string; table_name: string }>) || [];
      for (const s of stdRows) {
        tableNameMap[s.table_code] = s.table_name || s.table_code;
      }
    } catch { /* 降级：使用 table_code 作为显示名 */ }

    function displayName(code: string) {
      return tableNameMap[code] || code;
    }

    // ========== 追问模式 ==========
    if (conversationHistory && question) {
      const messages: Array<{ role: string; content: string }> = [
        ...conversationHistory,
        { role: "user", content: question },
      ];

      const { content, tokens } = await chatCompletion(messages);

      logAIUsage({ userId: userId || "default", userName: userName || "当前用户", feature: "analyze-project-followup", tokensUsed: tokens, projectId: projectSchema });

      return NextResponse.json({ data: { analysis: content, tokens } });
    }

    // ========== 初始分析模式 ==========

    // 1. 获取该 Schema 下的所有表名
    const { data: tablesResult } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${projectSchema}' ORDER BY table_name`,
    });

    let tables = (tablesResult as Array<{ table_name: string }>) || [];

    // 如果指定了 tableCode，只分析该表
    if (tableCode) {
      tables = tables.filter((t) => t.table_name === tableCode);
    }

    if (tables.length === 0) {
      return NextResponse.json({
        data: {
          analysis: tableCode
            ? `表 "${tableCode}" 在项目 Schema 中不存在或暂无数据`
            : "该项目 Schema 下暂无数据表",
          tableCount: 0,
          totalRows: 0,
        },
      });
    }

    // 2. 为每个表拼接结构+更多样本数据
    const tableInfos: Array<{
      name: string;
      columns: string[];
      rowCount: number;
      sampleRows: Record<string, unknown>[];
    }> = [];

    let totalRows = 0;
    const SAMPLE_LIMIT = 50;

    for (const t of tables) {
      const tableName = t.table_name;

      // 获取列信息
      const { data: colsResult } = await client.rpc("execute_sql", {
        p_sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '${projectSchema}' AND table_name = '${tableName}' ORDER BY ordinal_position`,
      });
      const columns = (colsResult as Array<{ column_name: string; data_type: string }>) || [];
      const colNames = columns.map((c) => c.column_name);

      // 获取总行数
      const { data: countResult } = await client.rpc("execute_sql", {
        p_sql: `SELECT COUNT(*) as cnt FROM ${projectSchema}."${tableName}"`,
      });
      const rowCount = Number((countResult as Array<{ cnt: string }>)?.[0]?.cnt) || 0;
      totalRows += rowCount;

      // 获取更多样本行（最多50条）
      const sampleSize = Math.min(SAMPLE_LIMIT, rowCount);
      let rows: Record<string, unknown>[] = [];

      if (sampleSize > 0) {
        const { data: rowsResult } = await client.rpc("execute_sql", {
          p_sql: `SELECT * FROM ${projectSchema}."${tableName}" LIMIT ${sampleSize}`,
        });
        rows = (rowsResult as Record<string, unknown>[]) || [];
      }

      // 脱敏
      const safeCols = colNames.filter(
        (c) => !c.includes("password") && !c.includes("secret") && c !== "login_password" && c !== "api_key"
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

      // 对数值列计算统计摘要
      const numericCols = columns.filter((c) =>
        ["integer", "numeric", "bigint", "double precision", "real", "smallint", "decimal"].includes(c.data_type)
      );
      const stats: Record<string, { min: number; max: number; avg: number }> = {};
      if (numericCols.length > 0 && rows.length > 0) {
        for (const nc of numericCols) {
          const vals = rows
            .map((r) => Number(r[nc.column_name]))
            .filter((v) => !isNaN(v));
          if (vals.length > 0) {
            stats[nc.column_name] = {
              min: Math.min(...vals),
              max: Math.max(...vals),
              avg: vals.reduce((a, b) => a + b, 0) / vals.length,
            };
          }
        }
      }

      tableInfos.push({
        name: tableName,
        columns: safeCols,
        rowCount,
        sampleRows,
        ...(Object.keys(stats).length > 0 ? { stats } as any : {}),
      } as any);
    }

    // 3. 拼装 Prompt
    const tableSummaries = tableInfos
      .map((t: any) => {
        const statsStr = t.stats
          ? `\n数值统计: ${Object.entries(t.stats).map(([k, v]: any) => `${k}(min:${v.min}, max:${v.max}, avg:${v.avg.toFixed(1)})`).join("; ")}`
          : "";
        return `表（${displayName(t.name)}） | 列: [${t.columns.join(", ")}] | 总行数: ${t.rowCount}${statsStr}\n样本数据:\n${JSON.stringify(t.sampleRows, null, 2)}`;
      })
      .join("\n\n---\n\n");

    const displayProjectName = projectName || projectSchema;
    const moduleHint = MODULE_PROMPT_HINTS[moduleName] || "全面分析项目数据";
    const moduleHintPrefix = moduleHint.slice(0, 30);

    const baseRules = `【重要规则】
- 项目名称是"${displayProjectName}"，不要使用 "${projectSchema}" 这个内部标识
- 各表的显示名称见上文括号内标注，请始终使用显示名称，不要使用内部表码
- 报告里绝对不要出现原始数据库标识符（如 ${projectSchema}、表码等），只使用中文可读名称`;

    // 变量替换函数
    function substituteVariables(template: string): string {
      const vars: Record<string, string> = {
        projectName: displayProjectName,
        projectSchema,
        moduleName: moduleName || "全部模块",
        moduleHint,
        moduleHintPrefix,
        baseRules,
        tableSummaries,
        tableCount: String(tables.length),
        totalRows: String(totalRows),
        tableName: tableCode ? displayName(tableCode) : "",
        tableCode: tableCode || "",
      };
      return template.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? `$\{${key}}`);
    }

    // 使用自定义 prompt 或默认 prompt
    const defaultSystemMessage = "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。";
    const effectiveSystemMessage = systemMessage || defaultSystemMessage;

    let effectiveUserPrompt: string;
    if (userPrompt) {
      effectiveUserPrompt = substituteVariables(userPrompt);
    } else if (tableCode) {
      effectiveUserPrompt = `你是一个项目管理数据分析专家。请对项目【\${projectName}】中的【\${tableName}】表进行深入分析。

\${baseRules}
\${moduleHint}

数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown）：
1. **数据概览**：该表的数据规模、字段结构概要
2. **关键发现**：数据中值得关注的模式、异常或亮点（至少3条）
3. **\${moduleHintPrefix}**：基于数据分析给出具体管理建议
4. **数据质量**：缺失值、不一致或异常值情况`;
      effectiveUserPrompt = substituteVariables(effectiveUserPrompt);
    } else {
      effectiveUserPrompt = `你是一个项目管理数据分析专家。请分析项目【\${projectName}】的数据库内容，给出专业的分析报告。

\${baseRules}
\${moduleHint}
数据表数量: \${tableCount} | 总数据行数: \${totalRows}

各表结构与样本数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：整体数据量、表关联关系
   - 用 \`\`\`mermaid 输出一张饼图（pie），展示各表数据量占比
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少5条）
   - 如有数值对比，用 \`\`\`mermaid 输出柱状图
3. **📈 趋势与建议**：基于数据给出项目管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况`;
      effectiveUserPrompt = substituteVariables(effectiveUserPrompt);
    }

    // 4. 调用大模型
    const { content, tokens } = await chatCompletion([
      { role: "system", content: effectiveSystemMessage },
      { role: "user", content: effectiveUserPrompt },
    ]);

    // 5. 记录日志
    logAIUsage({ userId: userId || "default", userName: userName || "当前用户", feature: "analyze-project", tokensUsed: tokens, projectId: projectSchema });

    return NextResponse.json({
      data: {
        analysis: content,
        tableCount: tables.length,
        totalRows,
        tokens,
        conversationHistory: [
          { role: "system", content: effectiveSystemMessage },
          { role: "user", content: effectiveUserPrompt },
          { role: "assistant", content },
        ],
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
