import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// PUT /api/todo-tasks/instances/[id] - 更新实例状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();
    const { status, form_record_id } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (form_record_id) updateData.form_record_id = form_record_id;

    // 完成时记录时间
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
      // 检查是否迟交
      const { data: instance } = await client.rpc("dp_get_by_id", {
        p_table: "todo_task_instances",
        p_id: id,
      });
      if (instance) {
        const inst = instance as Record<string, unknown>;
        const dueDate = inst.due_date ? String(inst.due_date) : null;
        if (dueDate && new Date() > new Date(dueDate + "T23:59:59")) {
          updateData.status = "overdue";
        }
      }
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "todo_task_instances",
      p_id: id,
      p_data: updateData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task instance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
