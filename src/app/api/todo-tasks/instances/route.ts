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

    // Fetch task definitions to join metadata
    const { data: defs } = await client.rpc("dp_select", {
      p_table: "todo_task_defs",
    });
    const defMap = new Map<string, Record<string, unknown>>();
    if (defs) {
      for (const d of defs as Record<string, unknown>[]) {
        defMap.set(String(d.id), d);
      }
    }

    // Map DB column names to frontend-expected field names and join definition metadata
    const mapped = items.map((r) => {
      const def = defMap.get(String(r.def_id || ""));
      const periodConfig = (def?.period_config || {}) as Record<string, unknown>;
      const wfNodes = (periodConfig.workflow_nodes || []) as Array<Record<string, unknown>>;
      const currentIndex = typeof r.current_node_index === "number"
        ? r.current_node_index
        : Number(r.current_node_index || 0);
      const currentNode = wfNodes[currentIndex] || null;

      return {
        ...r,
        title: r.name,
        definition_id: r.def_id,
        // Join definition metadata for form/task_mode
        _task_type: def?.task_type || null,
        _task_mode: periodConfig.task_mode || null,
        _form_source: periodConfig.form_source || null,
        _form_table_code: periodConfig.form_table_code || null,
        _form_table_name: periodConfig.form_table_name || null,
        _workflow_nodes: wfNodes,
        _current_node_name: currentNode ? currentNode.name : null,
        _current_node_index: currentIndex,
        _total_nodes: wfNodes.length,
        _current_node_handler_mode: currentNode ? currentNode.handler_mode : null,
        _current_node_fillable_fields: currentNode ? currentNode.fillable_fields : null,
      };
    });

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch task instances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
