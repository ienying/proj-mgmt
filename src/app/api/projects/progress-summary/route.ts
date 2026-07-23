import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects } = body as {
      projects: Array<{ id: string; project_schema: string; project_status?: string }>;
    };

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json({ data: {} });
    }

    const client = await createServerClient();

    // Get all table definitions
    const { data: allDefs, error: defsError } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (defsError || !allDefs) {
      return NextResponse.json({ data: {} });
    }

    const defs = allDefs as Array<{
      table_code: string;
      apply_project_stages: string[] | null;
      stage_progress_column: string | null; stage_progress_target: string | null;
      stage_display_mode: string | null;
    }>;

    const result: Record<string, number> = {};

    for (const proj of projects) {
      if (!proj.project_schema) { result[proj.id] = 0; continue; }

      const schema = proj.project_schema.replace(/[^a-zA-Z0-9_]/g, "_");
      const safeSchema = schema.includes('-') ? `"${schema}"` : schema;

      // 与 HeroSection stageLayoutTables 过滤完全一致：
      // apply_project_stages?.length > 0 && stage_display_mode in (null, "phase", "both")
      const stageLayoutTables = defs.filter((d) => {
        if (!d.apply_project_stages || d.apply_project_stages.length === 0) return false;
        const mode = d.stage_display_mode;
        if (mode && mode !== "phase" && mode !== "both") return false;
        return true;
      });

      let totalTasks = 0;
      let totalCompleted = 0;

      for (const def of stageLayoutTables) {
        try {
          const { data: recs, error: recsError } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${safeSchema}."${def.table_code}"`,
          });
          if (recsError) continue;
          const rows = (recs || []) as Array<Record<string, unknown>>;
          totalTasks += rows.length;
          // 只有配置了进度列的表才统计完成数
          if (def.stage_progress_column && def.stage_progress_target) {
            const col = def.stage_progress_column;
            const target = String(def.stage_progress_target).trim();
            totalCompleted += rows.filter((r) => String(r[col] || "").trim() === target).length;
          }
        } catch {
          // Table might not exist yet in this schema
        }
      }

      if (totalTasks > 0) {
        result[proj.id] = Math.round((totalCompleted / totalTasks) * 100);
      } else {
        // 无数据：已完工项目默认 100%
        const isCompleted = proj.project_status === 'completed' || proj.project_status === '已完成' || proj.project_status === '已结项';
        result[proj.id] = isCompleted ? 100 : 0;
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Progress summary error:", error);
    return NextResponse.json({ error: "Failed to compute progress" }, { status: 500 });
  }
}
