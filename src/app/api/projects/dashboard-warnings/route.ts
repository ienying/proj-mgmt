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
}

function safeSchema(schema: string) {
  return schema.includes("-") ? `"${schema}"` : schema;
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

    // 4. 组装项目数据文本
    const lines = projectSummaries.map((p) => {
      const tablesStr = p.tables
        .filter((t) => t.count > 0)
        .map((t) => `${t.name}(${t.count}条)`)
        .join("、") || "无数据";
      const statusText = p.status === "active" ? "进行中" : p.status === "completed" ? "已完成" : p.status;
      let line = `· ${p.name}（${p.type}/${p.stage}/${statusText}/经理${p.manager}）：总记录${p.total_records}条，进度${p.schedule_records}条`;
      if (p.end_date) {
        const daysLeft = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000);
        line += `，截止${p.end_date.slice(0, 10)}（${daysLeft >= 0 ? `剩余${daysLeft}天` : `已逾期${Math.abs(daysLeft)}天`}）`;
      }
      if (p.updated_at) {
        const daysSinceUpdate = Math.ceil((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
        line += `，${daysSinceUpdate}天前更新`;
      }
      line += `\n  数据表：${tablesStr}`;
      return line;
    }).join("\n\n");

    const projectDataText = lines;
    const projectCount = projectSummaries.length;

    const DEFAULT_SYSTEM = `你是一个项目管理预警分析专家。你需要基于项目数据识别风险并生成预警。

分析维度：
1. 进度风险：截止日期临近/已逾期、进度管理数据为空或极少
2. 数据异常：长期未更新（>60天）、总记录数异常少
3. 管理风险：缺少项目经理、无任何数据记录

输出要求：
- 仅返回 JSON 数组，不要输出任何其他文字
- 每个预警项包含：project_id（项目id）、project_name（项目名称）、level（error/warning/info）、type（短代码英文）、message（中文描述，简洁明了，每条不超过30字）
- 每个项目最多3条预警，优先输出最严重的
- 如果项目状态良好，不要强行生成预警

JSON 格式示例：
[{"project_id":"xxx","project_name":"项目A","level":"error","type":"overdue","message":"已超过截止日期15天"}]`;

    const effectiveSystem = system_message || DEFAULT_SYSTEM;
    const effectiveUser = user_message
      ? user_message
          .replace(/\$\{projectCount\}/g, String(projectCount))
          .replace(/\$\{projectData\}/g, projectDataText)
      : `请分析以下 ${projectCount} 个项目的数据，生成预警：

${projectDataText}`;

    // 5. 调用 AI
    const { content, tokens } = await chatCompletion(
      [
        { role: "system", content: effectiveSystem },
        { role: "user", content: effectiveUser },
      ],
      { maxTokens: 4096 },
    );

    logAIUsage({
      userId: "system",
      userName: user_name || "当前用户",
      feature: "dashboard-warnings",
      tokensUsed: tokens,
      projectId: "dashboard",
    });

    // 6. 解析 AI 返回的 JSON
    let warnings: Array<{
      project_id: string;
      project_name: string;
      level: "error" | "warning" | "info";
      type: string;
      message: string;
    }> = [];

    try {
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          warnings = parsed
            .filter((w: Record<string, unknown>) => w.project_id && w.message)
            .map((w: Record<string, unknown>) => ({
              project_id: String(w.project_id || ""),
              project_name: String(w.project_name || ""),
              level: (["error", "warning", "info"].includes(String(w.level)) ? String(w.level) : "warning") as "error" | "warning" | "info",
              type: String(w.type || "ai_alert"),
              message: String(w.message || ""),
            }));
        }
      }
    } catch {
      console.error("解析 AI 预警 JSON 失败，原始响应:", content.slice(0, 500));
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
    const idsStr = `{${projectIdArr.join(",")}}`;
    const safeUser = insertedBy.replace(/'/g, "''");

    try {
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.dashboard_ai_warnings (project_ids, warnings, generated_by)
                VALUES ('${idsStr}', '${warningsJson}'::jsonb, '${safeUser}')`,
      });
    } catch (insertErr) {
      console.error("存储 AI 预警失败:", insertErr);
    }

    // 8. 读取实际插入的记录以获取 generated_at
    const { data: latestRows } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_public.dashboard_ai_warnings ORDER BY generated_at DESC LIMIT 1`,
    });
    const latest = (latestRows as WarningsRecord[])?.[0];

    return NextResponse.json({
      data: {
        warnings,
        generated_at: latest?.generated_at || new Date().toISOString(),
        generated_by: insertedBy,
        tokens,
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
