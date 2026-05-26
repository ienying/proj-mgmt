import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issues/notifications?user_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_issue_notifications",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let notifications = (data || []) as Record<string, unknown>[];
    if (userId) {
      notifications = notifications.filter(
        (n) => String(n.user_id) === userId
      );
    }

    return NextResponse.json({ data: notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/issues/notifications - 标记已读
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { id } = body;

    const { data, error } = await client.rpc("dp_update", {
      p_table: "issue_mgmt_issue_notifications",
      p_id: id,
      p_data: { is_read: true },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
