import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/weekly-reports?customer_id=xxx — 获取周报列表
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ error: "customer_id 为必填项" }, { status: 400 });
    }

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.weekly_reports WHERE customer_id = '${customerId}' ORDER BY report_week DESC, created_at DESC`,
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

// POST /api/case-center/weekly-reports — 提交周报
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { customer_id, report_week, content, created_by } = body;

    if (!customer_id || !report_week) {
      return NextResponse.json({ error: "customer_id 和 report_week 为必填项" }, { status: 400 });
    }

    // 去重检查：同学校+同周+同工程师
    const safeCreatedBy = (created_by || "").replace(/'/g, "''");
    const safeWeek = report_week.replace(/'/g, "''");
    const { data: existing } = await client.rpc("execute_sql", {
      p_sql: `SELECT id FROM design_case_center.weekly_reports WHERE customer_id = '${customer_id}' AND report_week = '${safeWeek}' AND created_by = '${safeCreatedBy}' LIMIT 1`,
    });

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: "该学校本周已有您的周报记录，请确认是否覆盖", duplicate: true, existing_id: (existing[0] as Record<string, unknown>).id },
        { status: 409 }
      );
    }

    const reportData: Record<string, unknown> = {
      customer_id,
      report_week,
      content: content || {},
      created_by: created_by || "",
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "design_case_center.weekly_reports",
      p_data: reportData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 周报提交同时生成版本快照
    try {
      const { data: customer } = await client.rpc("dp_get_by_id", {
        p_table: "design_case_center.customers",
        p_id: customer_id,
      });

      const { data: maxVersion } = await client.rpc("execute_sql", {
        p_sql: `SELECT COALESCE(MAX(version_number), 0) as max_ver FROM design_case_center.profile_versions WHERE customer_id = '${customer_id}'`,
      });
      const nextVersion = Array.isArray(maxVersion)
        ? parseInt(String((maxVersion[0] as Record<string, unknown>).max_ver || "0"), 10) + 1
        : 1;

      await client.rpc("dp_insert", {
        p_table: "design_case_center.profile_versions",
        p_data: {
          customer_id,
          version_number: nextVersion,
          change_summary: `周报: ${report_week}`,
          changed_fields: JSON.stringify(["周报"]),
          snapshot: JSON.stringify({ customer, weekly_report: content }),
          operator: created_by || "",
        },
      });
    } catch {
      // 版本快照失败不影响周报提交
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/case-center/weekly-reports — 更新周报（覆盖）
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { id, content } = body;

    if (!id) {
      return NextResponse.json({ error: "周报 id 为必填项" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "design_case_center.weekly_reports",
      p_id: id,
      p_data: {
        content: content || {},
        updated_at: new Date().toISOString(),
      },
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

// DELETE /api/case-center/weekly-reports?id=xxx — 删除周报
export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "周报 id 为必填项" }, { status: 400 });
    }

    const { error } = await client.rpc("dp_delete", {
      p_table: "design_case_center.weekly_reports",
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
