import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/todo-tasks/instances?assignee_id=xxx&definition_id=xxx&status=pending&project_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assignee_id");
    const definitionId = searchParams.get("definition_id");
    const status = searchParams.get("status");
    const projectId = searchParams.get("project_id");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = (data || []) as Record<string, unknown>[];

    if (assigneeId) {
      items = items.filter((r) => String(r.assignee_id) === assigneeId);
    }
    if (definitionId) {
      items = items.filter((r) => String(r.def_id) === definitionId);
    }
    if (status) {
      const statuses = status.split(",");
      items = items.filter((r) => statuses.includes(String(r.status)));
    }
    if (projectId) {
      items = items.filter((r) => String(r.project_id) === projectId);
    }

    items.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    // Map DB column names to frontend-expected field names
    const mapped = items.map((r) => ({
      ...r,
      title: r.name,
      definition_id: r.def_id,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch task instances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
