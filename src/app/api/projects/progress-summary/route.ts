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

    // Get all table definitions with progress config
    const { data: allDefs, error: defsError } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
      p_filters: { is_active: true },
    });

    if (defsError || !allDefs) {
      return NextResponse.json({ data: {} });
    }

    const defs = allDefs as Array<{
      table_code: string; apply_project_types: string[] | null;
      apply_project_stages: string[] | null;
      stage_progress_column: string | null; stage_progress_target: string | null;
      stage_display_mode: string | null;
    }>;

    const result: Record<string, number> = {};

    for (const proj of projects) {
      if (!proj.project_schema) { result[proj.id] = 0; continue; }

      const schema = proj.project_schema.replace(/[^a-zA-Z0-9_]/g, "_");

      // 与 HeroSection 逻辑一致，只统计 stage_display_mode === "phase" 的表
      const relevantDefs = defs.filter((d) => {
        if (!d.stage_progress_column || !d.stage_progress_target) return false;
        if (!d.apply_project_stages || d.apply_project_stages.length === 0) return false;
        if (d.stage_display_mode !== "phase") return false;
        return true;
      });

      let totalTasks = 0;
      let totalCompleted = 0;

      for (const def of relevantDefs) {
        try {
          const tableName = `${schema}.${def.table_code}`;
          const { data: recs, error: recsError } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${tableName}`,
          });
          if (recsError || !recs) continue;
          const rows = recs as Array<Record<string, unknown>>;
          totalTasks += rows.length;
          const col = def.stage_progress_column!;
          const target = String(def.stage_progress_target!).trim();
          totalCompleted += rows.filter((r) => String(r[col] || "").trim() === target).length;
        } catch {
          // Table might not exist yet
        }
      }

      if (totalTasks > 0) {
        result[proj.id] = Math.round((totalCompleted / totalTasks) * 100);
      } else {
        // 无 phase 表或无数据：项目已完工 → 100%，否则 0%
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
