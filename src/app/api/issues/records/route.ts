import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issues/records?issue_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issue_id");
    const operatorId = searchParams.get("operator_id");
    const actionType = searchParams.get("action_type");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_issue_processing_records",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let records = (data || []) as Record<string, unknown>[];
    if (issueId) {
      records = records.filter((r) => String(r.issue_id) === issueId);
    }
    if (operatorId) {
      records = records.filter((r) => String(r.operator_id) === operatorId);
    }
    if (actionType) {
      records = records.filter((r) => String(r.action_type) === actionType);
    }

    // 按时间倒序
    records.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    return NextResponse.json({ data: records });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
