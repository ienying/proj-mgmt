import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/versions?customer_id=xxx — 获取版本历史
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ error: "customer_id 为必填项" }, { status: 400 });
    }

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.profile_versions WHERE customer_id = '${customerId}' ORDER BY version_number DESC`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/case-center/versions — 创建版本快照
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { customer_id, change_summary, changed_fields, operator } = body;

    if (!customer_id) {
      return NextResponse.json({ error: "customer_id 为必填项" }, { status: 400 });
    }

    // 查询当前完整客户状态作为快照
    const { data: customer } = await client.rpc("dp_get_by_id", {
      p_table: "design_case_center.customers",
      p_id: customer_id,
    });

    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }

    const { data: departments } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.customer_departments WHERE customer_id = '${customer_id}' ORDER BY sort_order`,
    });

    const { data: modules } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.customer_modules WHERE customer_id = '${customer_id}' ORDER BY sort_order`,
    });

    // 获取当前最大版本号
    const { data: maxVersion } = await client.rpc("execute_sql", {
      p_sql: `SELECT COALESCE(MAX(version_number), 0) as max_ver FROM design_case_center.profile_versions WHERE customer_id = '${customer_id}'`,
    });
    const nextVersion = Array.isArray(maxVersion)
      ? parseInt(String((maxVersion[0] as Record<string, unknown>).max_ver || "0"), 10) + 1
      : 1;

    const snapshot = {
      customer,
      departments: departments || [],
      modules: modules || [],
    };

    const versionData: Record<string, unknown> = {
      customer_id,
      version_number: nextVersion,
      changed_fields: changed_fields || [],
      change_summary: change_summary || "",
      snapshot: JSON.stringify(snapshot),
      operator: operator || "",
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "design_case_center.profile_versions",
      p_data: versionData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
