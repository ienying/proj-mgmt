import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * GET: 查询项目 Schema 中实际存在的所有表名
 * 参数: schema (项目 Schema 名称)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get("schema");

    if (!schema) {
      return NextResponse.json({ error: "schema required" }, { status: 400 });
    }

    const client = await createServerClient();

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' ORDER BY table_name`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tables = Array.isArray(data)
      ? (data as Record<string, unknown>[]).map((r) => r.table_name as string)
      : [];

    return NextResponse.json({ tables });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
