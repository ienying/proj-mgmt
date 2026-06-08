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

// DELETE /api/todo-tasks/defs/[id]?user_id=xxx&user_role=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const userRole = searchParams.get("user_role");

    // 权限检查：先查询任务定义
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "todo_task_defs",
      p_id: id,
    });

    if (!def) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    const taskDef = def as Record<string, unknown>;
    const isCreator = userId && String(taskDef.created_by) === userId;
    const isSuperAdmin = userRole === "super_admin";

    if (!isCreator && !isSuperAdmin) {
      return NextResponse.json({ error: "无权限删除此任务" }, { status: 403 });
    }

    // 0. 清理工作流模板和节点
    const { data: allTemplates } = await client.rpc("dp_select", {
      p_table: "workflow_templates",
    });
    if (allTemplates) {
      for (const tmpl of allTemplates as Record<string, unknown>[]) {
        if (String(tmpl.task_def_id) === id) {
          // 先删节点
          await client.rpc("execute_sql", {
            p_sql: `DELETE FROM design_public.workflow_nodes WHERE template_id = '${tmpl.id}'`,
          });
          // 再删模板
          await client.rpc("execute_sql", {
            p_sql: `DELETE FROM design_public.workflow_templates WHERE id = '${tmpl.id}'`,
          });
        }
      }
    }

    // 1. 先查询所有关联实例
    const { data: instances } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });

    if (instances) {
      for (const inst of instances as Record<string, unknown>[]) {
        if (String(inst.def_id) === id) {
          const instanceId = String(inst.id);

          // 1a. 清理工作流节点完成记录
          await client.rpc("execute_sql", {
            p_sql: `DELETE FROM design_public.workflow_node_completions WHERE instance_id = '${instanceId}'`,
          });

          // 1b. 删除实例
          await client.rpc("dp_delete", {
            p_table: "todo_task_instances",
            p_id: instanceId,
          });
        }
      }
    }

    // 2. 删除定义
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
