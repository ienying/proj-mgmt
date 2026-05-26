import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// PUT /api/issues/[id] - 更新问题状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();

    const { status, handler_id, handler_name, handler_phone, operator_id, operator_name, action_type, comment, to_user_id, to_user_name } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (handler_id !== undefined) {
      updateData.handler_id = handler_id || null;
      updateData.handler_name = handler_name || null;
      updateData.handler_phone = handler_phone || null;
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "issue_mgmt_issues",
      p_id: id,
      p_data: updateData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 同时写处理流水记录
    if (action_type && operator_id) {
      const recordData: Record<string, unknown> = {
        issue_id: id,
        action_type,
        operator_id,
        operator_name: operator_name || "",
        comment: comment || null,
      };
      if (to_user_id) {
        recordData.to_user_id = to_user_id;
        recordData.to_user_name = to_user_name || null;
      }
      await client.rpc("dp_insert", {
        p_table: "issue_mgmt_issue_processing_records",
        p_data: recordData,
      });
    }

    // 同步更新待办任务实例状态
    if (status) {
      // 查询该工单对应的待办任务实例
      const { data: todoItems } = await client.rpc("dp_select", {
        p_table: "todo_task_instances",
      });
      const todoList = (todoItems || []) as Record<string, unknown>[];
      const matchedTodos = todoItems
        ? todoList.filter(
            (t) =>
              String(t.source_type) === "issue" &&
              String(t.source_id) === id
          )
        : [];

      for (const todo of matchedTodos) {
        const updateTodo: Record<string, unknown> = {
          status: status,
          is_read: true,
        };
        if (status === "completed" || status === "closed") {
          updateTodo.completed_at = new Date().toISOString();
        }
        await client.rpc("dp_update", {
          p_table: "todo_task_instances",
          p_id: String(todo.id),
          p_data: updateTodo,
        });
      }

      // 转交工单：为新的处理人创建待办任务实例
      if (to_user_id && to_user_name && (action_type === "transfer" || action_type === "assign")) {
        const existingForNewHandler = matchedTodos.find(
          (t) => String(t.assignee_id) === to_user_id
        );
        if (!existingForNewHandler) {
          const { data: issueData } = await client.rpc("dp_get_by_id", {
            p_table: "issue_mgmt_issues",
            p_id: id,
          });
          const issue = issueData as Record<string, unknown> | null;

          await client.rpc("dp_insert", {
            p_table: "todo_task_instances",
            p_data: {
              definition_id: null,
              title: issue?.title || "",
              description: issue?.description
                ? String(issue.description).replace(/<[^>]*>/g, "").slice(0, 200)
                : "",
              source_type: "issue",
              source_id: id,
              source_data: {
                issue_id: id,
                status: status,
                is_major: issue?.is_major || false,
              },
              assignee_id: to_user_id,
              assignee_name: to_user_name || "",
              project_id: issue?.project_id || null,
              project_name: null,
              priority: issue?.is_major ? "urgent" : "medium",
              status: "pending",
              due_date: issue?.expected_handle_time || null,
              is_read: false,
            },
          });
        }
      }

      // 重新打开工单：重新激活待办任务实例
      if (status === "pending" && action_type === "reopen") {
        for (const todo of matchedTodos) {
          await client.rpc("dp_update", {
            p_table: "todo_task_instances",
            p_id: String(todo.id),
            p_data: {
              status: "pending",
              is_read: false,
              completed_at: null,
            },
          });
        }
      }
    }

    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/issues/[id] - 删除问题
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;

    const { error } = await client.rpc("dp_delete", {
      p_table: "issue_mgmt_issues",
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
