import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

interface ModuleField {
  column: string;
  label: string;
  render: string;
}

interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  table_code: string;
  display_type: string;
  fields: ModuleField[];
}

interface OverviewMetric {
  label: string;
  table_code: string;
  column?: string;
  filter_value?: string;
  calc: string;
}

// POST /api/case-center/user-profile-detail - 查询单个项目的用户画像全量数据
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectSchema = body.projectSchema as string || "";
    const modules = (body.modules as ModuleConfig[]) || [];
    const overviewMetrics = (body.overviewMetrics as OverviewMetric[]) || [];

    if (!projectSchema) {
      return NextResponse.json(
        { error: "projectSchema 为必填" },
        { status: 400 }
      );
    }

    const client = await createServerClient();

    // Validate schema name to prevent SQL injection
    const safeSchema = projectSchema.replace(/[^a-zA-Z0-9_]/g, "");
    if (!safeSchema) {
      return NextResponse.json(
        { error: "无效的 projectSchema" },
        { status: 400 }
      );
    }

    // Verify schema exists
    const { data: schemaCheck } = await client.rpc("execute_sql", {
      p_sql: `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = '${safeSchema}') as exists_flag`,
    });
    const schemaExists = (schemaCheck as Record<string, unknown>[])?.[0]?.exists_flag;
    if (!schemaExists) {
      return NextResponse.json({ data: {}, metrics: {} });
    }

    // Collect all unique table codes
    const moduleTableCodes = [...new Set(modules.map((m) => m.table_code).filter(Boolean))];
    const metricsTableCodes = [...new Set(overviewMetrics.map((m) => m.table_code).filter(Boolean))];
    const allTableCodes = [...new Set([...moduleTableCodes, ...metricsTableCodes])];

    // Check which tables actually exist in the schema
    const { data: existingTables } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${safeSchema}' AND table_name IN (${allTableCodes.map(t => `'${t.replace(/'/g, "''")}'`).join(",")})`,
    });
    const existingTableNames = new Set(
      ((existingTables as Record<string, unknown>[]) || []).map((t) => t.table_name as string)
    );

    // Parallel query all tables that exist
    const tableDataMap: Record<string, Record<string, unknown>[]> = {};
    const queryPromises = allTableCodes
      .filter((tc) => existingTableNames.has(tc))
      .map(async (tableCode) => {
        try {
          const safeTable = tableCode.replace(/[^a-zA-Z0-9_]/g, "");
          const { data, error } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM "${safeSchema}"."${safeTable}" ORDER BY sort_order, created_at`,
          });
          if (!error && data) {
            tableDataMap[tableCode] = data as Record<string, unknown>[];
          } else {
            tableDataMap[tableCode] = [];
          }
        } catch {
          tableDataMap[tableCode] = [];
        }
      });

    await Promise.all(queryPromises);

    // For tables that don't exist, set empty
    for (const tc of allTableCodes) {
      if (!tableDataMap[tc]) {
        tableDataMap[tc] = [];
      }
    }

    // Assemble module data
    const moduleData: Record<string, Record<string, unknown>[]> = {};
    for (const mod of modules) {
      moduleData[mod.id] = tableDataMap[mod.table_code] || [];
    }

    // Calculate overview metrics
    const metrics: Record<string, unknown> = {};
    for (const metric of overviewMetrics) {
      const rows = tableDataMap[metric.table_code] || [];
      if (metric.calc === "total") {
        metrics[metric.label] = rows.length;
        metrics[`${metric.label}_type`] = "count";
      } else if (metric.calc === "count" && metric.column && metric.filter_value) {
        const count = rows.filter(
          (row) => String(row[metric.column!] || "") === metric.filter_value
        ).length;
        metrics[metric.label] = count;
        metrics[`${metric.label}_type`] = "count";
      } else if (metric.calc === "percent" && metric.column && metric.filter_value) {
        const total = rows.length;
        const matched = rows.filter(
          (row) => String(row[metric.column!] || "") === metric.filter_value
        ).length;
        metrics[metric.label] = total > 0 ? Math.round((matched / total) * 100) : 0;
        metrics[`${metric.label}_type`] = "percent";
      } else {
        metrics[metric.label] = 0;
        metrics[`${metric.label}_type`] = "count";
      }
    }

    return NextResponse.json({ data: moduleData, metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询用户画像详情失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
