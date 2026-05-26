import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/todo-tasks/defs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await client.rpc("dp_update", {
      p_table: "todo_task_defs",
      p_id: id,
      p_data: body,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task definition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/todo-tasks/defs/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;

    // 先删除关联的实例
    const { data: instances } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });

    if (instances) {
      for (const inst of instances as Record<string, unknown>[]) {
        if (String(inst.definition_id) === id) {
          await client.rpc("dp_delete", {
            p_table: "todo_task_instances",
            p_id: String(inst.id),
          });
        }
      }
    }

    // 再删除定义
    const { error } = await client.rpc("dp_delete", {
      p_table: "todo_task_defs",
      p_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task definition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
