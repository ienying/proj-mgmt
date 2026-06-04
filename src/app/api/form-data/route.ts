import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

function escapeSql(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// GET /api/form-data?table_code=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const tableCode = searchParams.get("table_code");
    if (!tableCode) return NextResponse.json({ error: "缺少 table_code" }, { status: 400 });

    const tableName = `design_public.std_definition_${tableCode}`;
    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${tableName} ORDER BY sort_order, created_at`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/form-data
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { table_code, record } = body;
    if (!table_code || !record) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

    const entries = Object.entries(record as Record<string, unknown>).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    );
    if (entries.length === 0) return NextResponse.json({ error: "没有有效数据" }, { status: 400 });

    const columns = entries.map(([k]) => `"${k}"`).join(", ");
    const values = entries.map(([, v]) => escapeSql(v)).join(", ");

    const tableName = `design_public.std_definition_${table_code}`;
    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `INSERT INTO ${tableName} (${columns}) VALUES (${values}) RETURNING *`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
