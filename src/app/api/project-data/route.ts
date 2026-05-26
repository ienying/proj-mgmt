import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * GET: 查询项目 Schema 中的表数据
 * 参数: projectSchema, tableCode
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema");
    const tableCode = searchParams.get("tableCode");

    if (!projectSchema || !tableCode) {
      return NextResponse.json({ error: "projectSchema and tableCode required" }, { status: 400 });
    }

    const client = await createServerClient();

    // 查询项目 Schema 中的表数据
    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${projectSchema}."${tableCode}" ORDER BY sort_order, created_at`,
    });

    if (error) {
      // 表不存在(42P01)时静默返回空数据，其他错误才记录日志
      if (error.code !== '42P01') {
        console.error("查询表数据失败:", error);
      }
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: 新增记录到项目 Schema 表
 */
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema, tableCode, data } = body;

    if (!projectSchema || !tableCode || !data) {
      return NextResponse.json({ error: "projectSchema, tableCode and data required" }, { status: 400 });
    }

    // 如果调用方未指定 data_source/allow_delete，则设置默认值
    const dataWithMeta = { 
      ...data, 
      data_source: data.data_source || "manual", 
      allow_delete: data.allow_delete !== undefined ? data.allow_delete : true 
    };

    // 构建插入 SQL
    const columns = Object.keys(dataWithMeta).map(k => `"${k}"`);
    const values = Object.values(dataWithMeta).map((v) => {
      if (v === null || v === undefined) return "NULL";
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (typeof v === "number") return String(v);
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
        return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
      }
      return `'${String(v).replace(/'/g, "''")}'`;
    });

    const insertSQL = `
      INSERT INTO ${projectSchema}."${tableCode}" (${columns.join(", ")})
      VALUES (${values.join(", ")})
      RETURNING *
    `;

    const { data: result, error } = await client.rpc("execute_sql", {
      p_sql: insertSQL,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result?.[0] || data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: 更新项目 Schema 表中的记录
 */
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema, tableCode, rowId, data } = body;

    if (!projectSchema || !tableCode || !rowId || !data) {
      return NextResponse.json({ error: "projectSchema, tableCode, rowId and data required" }, { status: 400 });
    }

    // 构建更新 SQL
    const setClauses = Object.entries(data).map(([key, value]) => {
      if (value === null || value === undefined) {
        return `"${key}" = NULL`;
      }
      if (typeof value === "boolean") {
        return `"${key}" = ${value ? "TRUE" : "FALSE"}`;
      }
      if (typeof value === "number") {
        return `"${key}" = ${value}`;
      }
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        return `"${key}" = '${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }
      return `"${key}" = '${String(value).replace(/'/g, "''")}'`;
    });

    const updateSQL = `
      UPDATE ${projectSchema}."${tableCode}"
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = '${rowId}'
      RETURNING *
    `;

    const { data: result, error } = await client.rpc("execute_sql", {
      p_sql: updateSQL,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result?.[0] || data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 删除项目 Schema 表中的记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema");
    const tableCode = searchParams.get("tableCode");
    const rowId = searchParams.get("rowId");

    if (!projectSchema || !tableCode || !rowId) {
      return NextResponse.json({ error: "projectSchema, tableCode and rowId required" }, { status: 400 });
    }

    const deleteSQL = `
      DELETE FROM ${projectSchema}."${tableCode}"
      WHERE id = '${rowId}'
    `;

    const { error } = await client.rpc("execute_sql", {
      p_sql: deleteSQL,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
