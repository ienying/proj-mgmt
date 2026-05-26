import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/product-stats - 跨 schema 聚合统计
export async function GET() {
  try {
    const client = await createServerClient();

    // 1. Get product_case config
    const { data: configs } = await client.rpc("dp_select", {
      p_table: "case_center_config",
    });

    const config = (configs as Record<string, unknown>[])?.find(
      (item) => item.type === "product_case" && item.is_enabled === true
    );

    if (!config || !config.stat_fields) {
      return NextResponse.json({
        data: {
          overview: { total: 0, projectCount: 0, totalProjects: 0 },
          distributions: [],
        },
        config: null,
      });
    }

    const tableCode = config.table_code as string;
    const statFields = config.stat_fields as Array<{
      field: string;
      label: string;
      chart: string;
    }>;

    // 2. Get all active projects with schemas
    const { data: projects } = await client.rpc("dp_select", {
      p_table: "projects",
    });

    const activeProjects = (
      (projects as Record<string, unknown>[]) || []
    ).filter((p) => p.project_schema && p.project_status === "active");

    // 3. Parallel query each project schema
    const queryPromises = activeProjects.map(
      async (project: Record<string, unknown>) => {
        const schema = project.project_schema as string;
        const projectId = project.id as string;
        try {
          const { data: tableCheck } = await client.rpc("execute_sql", {
            p_sql: `SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
            ) as exists_flag`,
          });

          const existsFlag = (
            tableCheck as Record<string, unknown>[]
          )?.[0]?.exists_flag;
          if (!existsFlag) return { rows: [], projectId };

          const { data, error } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${schema}."${tableCode}"`,
          });

          if (error || !data)
            return { rows: [], projectId };
          return {
            rows: data as Record<string, unknown>[],
            projectId,
          };
        } catch {
          return { rows: [], projectId };
        }
      }
    );

    const resultsWithProject = await Promise.all(queryPromises);

    // 4. Collect all data with project tracking
    const allData: Array<Record<string, unknown>> = [];
    const projectsWithData = new Set<string>();

    for (const result of resultsWithProject) {
      if (result.rows.length > 0) {
        projectsWithData.add(result.projectId);
        allData.push(...result.rows);
      }
    }

    // 5. Calculate distributions for stat_fields
    const distributions = statFields.map((sf) => {
      const valueCounts: Record<string, number> = {};
      for (const row of allData) {
        const val = row[sf.field];
        if (val === null || val === undefined) continue;

        if (Array.isArray(val)) {
          for (const v of val) {
            const key = String(v);
            valueCounts[key] = (valueCounts[key] || 0) + 1;
          }
        } else {
          const key = String(val);
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        }
      }

      // Sort by count descending
      const items = Object.entries(valueCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({ value: key, count }));

      return {
        field: sf.field,
        label: sf.label,
        chart: sf.chart || "bar",
        items,
      };
    });

    return NextResponse.json({
      data: {
        overview: {
          total: allData.length,
          projectCount: projectsWithData.size,
          totalProjects: activeProjects.length,
        },
        distributions,
      },
      config: {
        title_field: config.title_field,
        table_code: tableCode,
        stat_fields: statFields,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "统计查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
