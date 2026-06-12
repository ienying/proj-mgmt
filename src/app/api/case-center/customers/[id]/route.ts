import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/customers/[id] — 获取单个客户完整树
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;

    const { data: customer } = await client.rpc("dp_get_by_id", {
      p_table: "design_case_center.customers",
      p_id: id,
    });

    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }

    const { data: departments } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.customer_departments WHERE customer_id = '${id}' ORDER BY sort_order`,
    });

    const { data: modules } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.customer_modules WHERE customer_id = '${id}' ORDER BY sort_order`,
    });

    return NextResponse.json({
      data: {
        customer,
        departments: departments || [],
        modules: modules || [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/case-center/customers/[id] — 更新客户基础信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "school_name", "customer_types", "location",
      "description", "hardware_info", "network_info",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    if (Object.keys(updateFields).length <= 1) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "design_case_center.customers",
      p_id: id,
      p_data: updateFields,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/case-center/customers/[id] — 删除客户（级联删除科室/模块/版本/周报）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;

    const { error } = await client.rpc("dp_delete", {
      p_table: "design_case_center.customers",
      p_id: id,
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
