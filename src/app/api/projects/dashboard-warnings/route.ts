import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { ensureAITables, chatCompletion } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";

interface ProjectRow {
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  project_schema: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  role_project_manager: string | null;
  updated_at: string | null;
}

interface WarningsRecord {
  id: string;
  project_ids: string[] | null;
  warnings: Array<{
    project_id: string;
    project_name: string;
    level: "error" | "warning" | "info";
    type: string;
    message: string;
  }>;
  generated_at: string;
  generated_by: string | null;
  raw_response?: string | null;
}

function safeSchema(schema: string) {
  return schema.includes("-") ? `"${schema}"` : schema;
}

function normalizeWarning(w: Record<string, unknown>) {
  let level = String(w.level || "warning").toLowerCase();
  if (!["error", "warning", "info"].includes(level)) level = "warning";
  return {
    project_id: String(w.project_id || ""),
    project_name: String(w.project_name || ""),
    level: level as "error" | "warning" | "info",
    type: String(w.type || "ai_alert"),
    message: String(w.message || ""),
  };
}

const MODULE_NAME_MAP: Record<string, string> = {
  scope: "范围管理", schedule: "进度管理", quality: "质量管理",
  cost: "成本管理", collaboration: "协同管理", communication: "沟通管理",
  risk: "风险管理", procurement: "采购管理", resource: "资源管理", document: "资料管理",
};

// GET: 返回最新缓存的 AI 预警
export async function GET() {
  try {
    await ensureAITables();
    const client = await createServerClient();

    const { data: rows } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_public.dashboard_ai_warnings ORDER BY generated_at DESC LIMIT 1`,
    });

    const record = (rows as WarningsRecord[])?.[0] || null;

    return NextResponse.json({
      data: record
        ? {
            warnings: record.warnings,
            generated_at: record.generated_at,
            generated_by: record.generated_by,
            raw_response: record.raw_response,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 触发 AI 生成新预警
export async function POST(request: NextRequest) {
  try {
    await ensureAITables();
    const client = await createServerClient();

    const body = await request.json().catch(() => ({}));
    const { project_ids, user_name, system_message, user_message } = body as {
      project_ids?: string[];
      user_name?: string;
      system_message?: string;
      user_message?: string;
    };

    // 1. 获取项目列表
    const { data: projectRows, error: projErr } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }
    let projects = (projectRows as ProjectRow[]) || [];
    if (project_ids && project_ids.length > 0) {
      projects = projects.filter((p) => project_ids.includes(p.id));
    }

    // 2. 获取数据表定义
    const { data: defRows } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });
    const allDefs = ((defRows as Record<string, unknown>[]) || [])
      .filter((d) => !String(d.table_code || "").startsWith("task_"))
      .map((d) => ({
        table_code: d.table_code as string,
        table_name: d.table_name as string,
        module_type: (d.module_type as string[]) || [],
      }));

    // 3. 对每个项目统计表数据，构建 AI 分析摘要
    const projectSummaries: Array<{
      id: string;
      name: string;
      code: string;
      type: string;
      stage: string;
      status: string;
      manager: string;
      end_date: string | null;
      updated_at: string | null;
      tables: Array<{ name: string; module: string; count: number }>;
      total_records: number;
      schedule_records: number;
    }> = [];

    for (const project of projects) {
      const schema = safeSchema(project.project_schema);
      const tables: Array<{ name: string; module: string; count: number }> = [];

      try {
        const { data: schemaTables } = await client.rpc("execute_sql", {
          p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${project.project_schema}' ORDER BY table_name`,
        });
        const tableNames = (schemaTables as Array<{ table_name: string }>) || [];

        for (const { table_name } of tableNames) {
          try {
            const { data: countRows } = await client.rpc("execute_sql", {
              p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${table_name}"`,
            });
            const count = Number((countRows as Array<{ cnt: string }>)?.[0]?.cnt) || 0;
            const def = allDefs.find((d) => d.table_code === table_name);
            tables.push({
              name: def?.table_name || table_name,
              module: def?.module_type?.[0] || "other",
              count,
            });
          } catch { /* skip */ }
        }
      } catch { /* schema might not exist */ }

      projectSummaries.push({
        id: project.id,
        name: project.project_name,
        code: project.project_code,
        type: project.project_type,
        stage: project.project_stage,
        status: project.status,
        manager: project.role_project_manager || "未指定",
        end_date: project.end_date,
        updated_at: project.updated_at,
        tables,
        total_records: tables.reduce((s, t) => s + t.count, 0),
        schedule_records: tables.filter((t) => t.module === "schedule").reduce((s, t) => s + t.count, 0),
      });
    }

    // 4. 逐项目独立分析
    const DEFAULT_SYSTEM = `你是一个项目管理预警分析专家，擅长从项目数据中识别风险并给出可操作建议。使用中文回复。

关键要求：你必须输出完整的 Markdown 分析报告（包含标题、段落、图标、表格），严禁只输出 JSON 数组。预警数据放在报告末尾的 \`\`\`json 代码块中。`;

    const effectiveSystem = system_message || DEFAULT_SYSTEM;

    let allContent = "";
    let totalTokens = 0;

    // 并行逐项目调用 AI
    const perProjectResults = await Promise.all(
      projectSummaries.map(async (p) => {
        const tablesStr = p.tables
          .filter((t) => t.count > 0)
          .map((t) => `${t.name}(${t.count}条)`)
          .join("、") || "无数据";
        const statusText = p.status === "active" ? "进行中" : p.status === "completed" ? "已完成" : p.status;
        let line = `项目名称：${p.name}\n项目类型：${p.type}/${p.stage}/${statusText}\n项目经理：${p.manager}\n总记录：${p.total_records}条，进度记录：${p.schedule_records}条`;
        if (p.end_date) {
          const daysLeft = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000);
          line += `\n截止日期：${p.end_date.slice(0, 10)}（${daysLeft >= 0 ? `剩余${daysLeft}天` : `已逾期${Math.abs(daysLeft)}天`}）`;
        }
        if (p.updated_at) {
          const daysSinceUpdate = Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
          line += `\n最近更新：${daysSinceUpdate}天前`;
        }
        line += `\n数据表：${tablesStr}`;

        const perProjectUserPrompt = user_message
          ? user_message
              .replace(/\$\{projectCount\}/g, "1")
              .replace(/\$\{projectData\}/g, line)
          : `请分析以下项目的数据，生成预警分析报告。

项目ID：${p.id}
${line}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：该项目的整体数据量、各表分布
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少2条）
3. **📈 风险与建议**：具体的风险描述和管理改进建议
4. **⚠️ 预警汇总**：最后附一个 \`\`\`json 代码块，包含该项目的预警项 JSON 数组，每项格式为：
   {"project_id":"${p.id}","project_name":"${p.name}","level":"error|warning|info","type":"英文代码","message":"中文描述（不超过30字）"}`;

        try {
          const { content, tokens } = await chatCompletion(
            [
              { role: "system", content: effectiveSystem },
              { role: "user", content: perProjectUserPrompt },
            ],
            { maxTokens: 4096 },
          );
          return { projectId: p.id, projectName: p.name, content, tokens };
        } catch (e) {
          return { projectId: p.id, projectName: p.name, content: `## ${p.name}\n\n⚠️ 分析失败：${String(e)}`, tokens: 0 };
        }
      })
    );

    // 汇总
    for (const r of perProjectResults) {
      allContent += (allContent ? "\n\n---\n\n" : "") + `## 📋 ${r.projectName}\n\n` + r.content;
      totalTokens += r.tokens;
    }

    const overview = `# 📊 AI 预警分析报告\n\n> 分析时间：${new Date().toLocaleString("zh-CN")}\n> 项目数量：${projectSummaries.length}\n> 总记录数：${projectSummaries.reduce((s, p) => s + p.total_records, 0)}\n\n---\n\n`;
    const content = overview + allContent;

    // 逐项目结果数组（前端单独呈现）
    const perProjectReports = perProjectResults.map((r) => ({
      project_id: r.projectId,
      project_name: r.projectName,
      content: r.content,
      tokens: r.tokens,
    }));

    logAIUsage({
      userId: "system",
      userName: user_name || "当前用户",
      feature: "dashboard-warnings",
      tokensUsed: totalTokens,
      projectId: "dashboard",
    });

    // 6. 解析所有 AI 返回的 JSON（从各项目汇总内容中提取）
    let warnings: Array<{
      project_id: string;
      project_name: string;
      level: "error" | "warning" | "info";
      type: string;
      message: string;
    }> = [];

    const tryParse = (text: string): Record<string, unknown>[] | null => {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not valid JSON */ }
      return null;
    };

    // 策略 1: 提取 ```json ... ``` 代码块
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const result = tryParse(codeBlockMatch[1].trim());
      if (result) warnings = result.map(normalizeWarning);
    }

    // 策略 2: 提取 [...] 数组（从第一个 [ 到最后一个 ]）
    if (warnings.length === 0) {
      const arrMatch = content.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        const result = tryParse(arrMatch[0]);
        if (result) warnings = result.map(normalizeWarning);
      }
    }

    // 策略 3: 按行查找 {...} 对象
    if (warnings.length === 0) {
      const objMatches = content.match(/\{[^}]+\}/g);
      if (objMatches) {
        const items = objMatches.map((m: string) => {
          try { return JSON.parse(m); } catch { return null; }
        }).filter(Boolean) as Record<string, unknown>[];
        if (items.length > 0) warnings = items.map(normalizeWarning);
      }
    }

    if (warnings.length === 0) {
      console.error("AI 预警 JSON 解析失败，原始响应:", content.slice(0, 500));
    }

    // 如果 AI 没返回有效预警，生成基础规则预警作为兜底
    if (warnings.length === 0) {
      for (const p of projectSummaries) {
        if (p.end_date) {
          const daysLeft = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000);
          if (daysLeft < 0 && p.status !== "completed") {
            warnings.push({ project_id: p.id, project_name: p.name, level: "error", type: "overdue", message: `已超过截止日期${Math.abs(daysLeft)}天` });
          }
        }
        if (p.schedule_records === 0 && p.total_records > 0) {
          warnings.push({ project_id: p.id, project_name: p.name, level: "warning", type: "empty_schedule", message: "进度管理模块无数据记录" });
        }
      }
    }

    // 7. 存入数据库
    const projectIdArr = projectSummaries.map((p) => p.id);
    const insertedBy = user_name || "当前用户";
    const warningsJson = JSON.stringify(warnings).replace(/'/g, "''");
    const rawContent = content.replace(/'/g, "''");
    const idsStr = `{${projectIdArr.join(",")}}`;
    const safeUser = insertedBy.replace(/'/g, "''");

    try {
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.dashboard_ai_warnings (project_ids, warnings, raw_response, generated_by)
                VALUES ('${idsStr}', '${warningsJson}'::jsonb, '${rawContent}', '${safeUser}')`,
      });
    } catch (insertErr) {
      console.error("存储 AI 预警失败:", insertErr);
    }

    // 8. 读取实际插入的记录以获取 generated_at
    const { data: latestRows } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_public.dashboard_ai_warnings ORDER BY generated_at DESC LIMIT 1`,
    });
    const latest = (latestRows as WarningsRecord[])?.[0];

    const totalTables = projectSummaries.reduce((s, p) => s + p.tables.length, 0);
    const totalRecords = projectSummaries.reduce((s, p) => s + p.total_records, 0);

    return NextResponse.json({
      data: {
        warnings,
        perProjectReports,
        generated_at: latest?.generated_at || new Date().toISOString(),
        generated_by: insertedBy,
        raw_response: content,
        tokens: totalTokens,
        stats: {
          projectCount: projectSummaries.length,
          tableCount: totalTables,
          recordCount: totalRecords,
          warningCount: warnings.length,
          hasParsedAI: warnings.length > 0,
        },
        conversationHistory: [
          { role: "system", content: effectiveSystem },
          { role: "user", content: "逐项目独立分析" },
          { role: "assistant", content },
        ],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // AI 调用失败时返回友好提示
    if (message.includes("API Key 未配置")) {
      return NextResponse.json({ error: "AI API Key 未配置，无法生成预警" }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
