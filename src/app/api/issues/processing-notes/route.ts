import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issues/processing-notes?issue_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issue_id");
    if (!issueId) {
      return NextResponse.json({ error: "缺少 issue_id" }, { status: 400 });
    }

    // Use raw query to get ordered results
    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_processing_notes",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as Record<string, unknown>[];
    const filtered = rows
      .filter((r) => String(r.issue_id) === issueId)
      .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());

    return NextResponse.json({ data: filtered });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/issues/processing-notes
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { issue_id, operator_id, operator_name, content } = body;

    if (!issue_id) {
      return NextResponse.json({ error: "缺少 issue_id" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_processing_notes",
      p_data: {
        issue_id,
        operator_id: operator_id || "",
        operator_name: operator_name || "",
        content,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also update the main issue's processing_notes for quick access
    await client.rpc("dp_update", {
      p_table: "issue_mgmt_issues",
      p_id: issue_id,
      p_data: { processing_notes: content },
    });

    return NextResponse.json({ data, success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
