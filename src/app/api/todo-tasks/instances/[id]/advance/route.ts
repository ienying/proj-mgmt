import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// POST /api/todo-tasks/instances/[id]/advance
// 工作流推进：将任务实例推进到下一节点（或退回/驳回）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();
    const {
      action = "advance",   // advance | return | reject
      comment,
      form_record_id,
      handler_id,           // 当前操作人ID
      handler_name,         // 当前操作人姓名
    } = body;

    // 1. 获取实例
    const { data: instance } = await client.rpc("dp_get_by_id", {
      p_table: "todo_task_instances",
      p_id: id,
    });
    if (!instance) {
      return NextResponse.json({ error: "实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, unknown>;
    const defId = String(inst.def_id || "");

    // 2. 获取任务定义的工作流节点
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "todo_task_defs",
      p_id: defId,
    });
    if (!def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const defRecord = def as Record<string, unknown>;
    const periodConfig = (defRecord.period_config || {}) as Record<string, unknown>;
    const workflowNodes = (periodConfig.workflow_nodes || []) as Array<Record<string, unknown>>;

    if (!workflowNodes || workflowNodes.length === 0) {
      return NextResponse.json({ error: "该任务没有工作流配置" }, { status: 400 });
    }

    const currentIndex = typeof inst.current_node_index === "number"
      ? inst.current_node_index
      : Number(inst.current_node_index || 0);

    const currentNode = workflowNodes[currentIndex] || null;

    // 3. 处理驳回
    if (action === "reject") {
      await client.rpc("dp_update", {
        p_table: "todo_task_instances",
        p_id: id,
        p_data: { status: "rejected", updated_at: new Date().toISOString() },
      });
      return NextResponse.json({ data: { status: "rejected" } });
    }

    // 4. 处理退回（到上一节点）
    if (action === "return") {
      if (currentIndex <= 0) {
        return NextResponse.json({ error: "已是第一个节点，无法退回" }, { status: 400 });
      }
      const prevNode = workflowNodes[currentIndex - 1];
      const prevHandlerIds = Array.isArray(prevNode.handler_ids) ? prevNode.handler_ids as string[] : [];
      const prevAssigneeId = prevHandlerIds[0] || null;

      // 获取上一节点处理人姓名
      let prevAssigneeName = "";
      if (prevAssigneeId) {
        const { data: prevUser } = await client.rpc("dp_get_by_id", {
          p_table: "users", p_id: prevAssigneeId,
        });
        if (prevUser) {
          prevAssigneeName = String((prevUser as Record<string, unknown>).name || "");
        }
      }

      const updateData: Record<string, unknown> = {
        status: "returned",
        current_node_index: currentIndex - 1,
        current_node_id: prevNode.id || null,
        assignee_id: prevAssigneeId,
        assignee_name: prevAssigneeName,
        updated_at: new Date().toISOString(),
      };
      if (form_record_id) updateData.form_record_id = form_record_id;

      await client.rpc("dp_update", {
        p_table: "todo_task_instances",
        p_id: id,
        p_data: updateData,
      });

      // 记录完成记录
      if (handler_id && currentNode) {
        await recordNodeCompletion(client, id, String(currentNode.id || ""), handler_id, handler_name || "", action, comment, form_record_id);
      }

      return NextResponse.json({
        data: {
          status: "returned",
          previous_node: { name: prevNode.name, index: currentIndex - 1 },
        },
      });
    }

    // 5. 处理推进 (advance)
    if (!currentNode) {
      return NextResponse.json({ error: "当前节点不存在" }, { status: 400 });
    }

    const handlerMode = String(currentNode.handler_mode || "any_one");
    const currentNodeId = String(currentNode.id || "");
    const nodeHandlerIds: string[] = Array.isArray(currentNode.handler_ids)
      ? currentNode.handler_ids as string[]
      : [];

    // 5a. 如果 handler_mode === "all"，需要检查是否所有处理人都已完成
    if (handlerMode === "all" && handler_id) {
      // 记录当前处理人的完成
      await recordNodeCompletion(client, id, currentNodeId, handler_id, handler_name || "", "complete", comment, form_record_id);

      // 检查是否所有处理人都已完成
      const allHandlersCompleted = await checkAllHandlersCompleted(client, id, currentNodeId, nodeHandlerIds);

      if (!allHandlersCompleted) {
        // 还有人未完成，实例保持在当前节点但更新 form_record_id
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (form_record_id) updateData.form_record_id = form_record_id;
        await client.rpc("dp_update", {
          p_table: "todo_task_instances",
          p_id: id,
          p_data: updateData,
        });
        return NextResponse.json({
          data: {
            status: "waiting_others",
            message: "已提交，等待其他处理人完成",
            current_node: { name: currentNode.name, index: currentIndex },
          },
        });
      }
    } else if (handler_id) {
      // any_one 模式，记录完成
      await recordNodeCompletion(client, id, currentNodeId, handler_id, handler_name || "", "complete", comment, form_record_id);
    }

    // 5b. 找到下一个有效的节点（跳过无处理人的节点）
    let nextIndex = currentIndex + 1;
    let nextNode: Record<string, unknown> | null = null;
    let nextHandlerIds: string[] = [];

    while (nextIndex < workflowNodes.length) {
      const candidate = workflowNodes[nextIndex];
      const candidateHandlers: string[] = Array.isArray(candidate.handler_ids)
        ? candidate.handler_ids as string[]
        : [];
      if (candidateHandlers.length > 0) {
        nextNode = candidate;
        nextHandlerIds = candidateHandlers;
        break;
      }
      // 当前节点无处理人，跳过
      nextIndex++;
    }

    // 如果后面没有有处理人的节点了，直接完成
    if (!nextNode) {
      const completeData: Record<string, unknown> = {
        status: "completed",
        completed_at: new Date().toISOString(),
        current_node_index: workflowNodes.length,
        current_node_id: null,
        updated_at: new Date().toISOString(),
      };
      if (form_record_id) completeData.form_record_id = form_record_id;

      await client.rpc("dp_update", {
        p_table: "todo_task_instances",
        p_id: id,
        p_data: completeData,
      });

      return NextResponse.json({
        data: {
          status: "completed",
          message: "所有节点已完成",
        },
      });
    }

    const nextAssigneeId = nextHandlerIds[0];

    let nextAssigneeName = "";
    if (nextAssigneeId) {
      const { data: nextUser } = await client.rpc("dp_get_by_id", {
        p_table: "users", p_id: nextAssigneeId,
      });
      if (nextUser) {
        nextAssigneeName = String((nextUser as Record<string, unknown>).name || "");
      }
    }

    const advanceData: Record<string, unknown> = {
      status: "pending",
      current_node_index: nextIndex,
      current_node_id: nextNode.id || null,
      assignee_id: nextAssigneeId,
      assignee_name: nextAssigneeName,
      updated_at: new Date().toISOString(),
    };
    if (form_record_id) advanceData.form_record_id = form_record_id;

    await client.rpc("dp_update", {
      p_table: "todo_task_instances",
      p_id: id,
      p_data: advanceData,
    });

    return NextResponse.json({
      data: {
        status: "pending",
        message: `已推进到节点「${nextNode.name}」`,
        next_node: { name: nextNode.name, index: nextIndex, assignee_name: nextAssigneeName },
        total_nodes: workflowNodes.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to advance workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function recordNodeCompletion(
  client: Awaited<ReturnType<typeof createServerClient>>,
  instanceId: string,
  nodeId: string,
  handlerId: string,
  handlerName: string,
  action: string,
  comment?: string,
  formRecordId?: string,
) {
  const { data: existing } = await client.rpc("dp_select", {
    p_table: "workflow_node_completions",
  });
  const completions = (existing || []) as Array<Record<string, unknown>>;
  const alreadyDone = completions.find(
    (c) =>
      String(c.instance_id) === instanceId &&
      String(c.node_id) === nodeId &&
      String(c.handler_id) === handlerId
  );
  if (alreadyDone) return; // 不重复记录

  await client.rpc("dp_insert", {
    p_table: "workflow_node_completions",
    p_data: {
      instance_id: instanceId,
      node_id: nodeId,
      handler_id: handlerId,
      handler_name: handlerName,
      action,
      comment: comment || null,
      form_record_id: formRecordId || null,
    },
  });
}

async function checkAllHandlersCompleted(
  client: Awaited<ReturnType<typeof createServerClient>>,
  instanceId: string,
  nodeId: string,
  handlerIds: string[],
): Promise<boolean> {
  const { data: existing } = await client.rpc("dp_select", {
    p_table: "workflow_node_completions",
  });
  const completions = (existing || []) as Array<Record<string, unknown>>;
  const completedHandlers = new Set(
    completions
      .filter(
        (c) =>
          String(c.instance_id) === instanceId &&
          String(c.node_id) === nodeId &&
          String(c.action) === "complete"
      )
      .map((c) => String(c.handler_id))
  );
  return handlerIds.every((hid) => completedHandlers.has(hid));
}
