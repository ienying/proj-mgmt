import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const schema = searchParams.get("schema");
    const table = searchParams.get("table");

    if (!schema) {
      return NextResponse.json({ error: "缺少 schema 参数" }, { status: 400 });
    }

    const client = await createServerClient();

    // If table specified, fetch records from that table
    if (table) {
      const { data, error } = await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${schema}."${table}" ORDER BY sort_order ASC, created_at DESC LIMIT 500`,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    // Get valid table codes from data_table_definitions
    const { data: tableDefs } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_code, table_name FROM public.data_table_definitions WHERE is_active = true`,
    });
    const validCodes = new Set<string>();
    const codeToName: Record<string, string> = {};
    if (tableDefs && Array.isArray(tableDefs)) {
      for (const def of tableDefs as any[]) {
        validCodes.add(def.table_code);
        codeToName[def.table_code] = def.table_name;
      }
    }

    // List tables in schema, but only those matching data_table_definitions
    const { data: tables, error: tablesError } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    });
    if (tablesError) {
      return NextResponse.json({ error: tablesError.message }, { status: 500 });
    }

    const result: any[] = [];
    if (tables && Array.isArray(tables)) {
      for (const t of tables) {
        const tableName = (t as Record<string, any>).table_name;
        // Only include tables that are defined in data_table_definitions
        if (!validCodes.has(tableName)) continue;
        const { data: columns } = await client.rpc("execute_sql", {
          p_sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}' ORDER BY ordinal_position`,
        });
        result.push({
          table_name: tableName,
          display_name: codeToName[tableName] || tableName,
          columns: columns || [],
        });
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("获取看板记录失败:", error);
    return NextResponse.json({ error: "获取看板记录失败" }, { status: 500 });
  }
}
