import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get("schema");
    const table = searchParams.get("table");
    const instanceId = searchParams.get("instance_id");

    if (!schema || !table) {
      return NextResponse.json({ error: "缺少 schema 或 table 参数" }, { status: 400 });
    }

    const client = await createServerClient();
    const whereClause = instanceId
      ? `WHERE instance_id = '${instanceId.replace(/'/g, "''")}'`
      : "";

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${schema}."${table}" ${whereClause} ORDER BY sort_order ASC, created_at DESC`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("获取任务表单数据失败:", error);
    return NextResponse.json({ error: "获取任务表单数据失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, table, data: rowData } = body;

    if (!schema || !table || !rowData) {
      return NextResponse.json({ error: "缺少 schema, table 或 data" }, { status: 400 });
    }

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_insert_generic", {
      p_schema: schema,
      p_table: table,
      p_data: rowData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("写入任务表单数据失败:", error);
    return NextResponse.json({ error: "写入任务表单数据失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, table, id: rowId, data: rowData } = body;

    if (!schema || !table || !rowId || !rowData) {
      return NextResponse.json({ error: "缺少 schema, table, id 或 data" }, { status: 400 });
    }

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_update", {
      p_table: `${schema}.${table}`,
      p_id: rowId,
      p_data: rowData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("更新任务表单数据失败:", error);
    return NextResponse.json({ error: "更新任务表单数据失败" }, { status: 500 });
  }
}
