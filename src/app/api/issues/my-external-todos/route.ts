import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issues/my-external-todos?user_id=xxx
// Returns the source_ids of external issues where the user has a pending todo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });
    }

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const todos = (data || []) as Record<string, unknown>[];
    const userExternalTodos = todos.filter(
      (t) =>
        String(t.source_type) === "issue" &&
        String(t.assignee_id) === userId &&
        String(t.status) === "pending" &&
        t.source_id
    );

    const issueIds = [...new Set(userExternalTodos.map((t) => String(t.source_id)))];

    return NextResponse.json({ data: { issue_ids: issueIds } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
