import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, user_id, user_name, reason, new_handler_id, new_handler_name, phys_data } = body;

    if (!action || !user_id) {
      return NextResponse.json({ error: "缺少 action 或 user_id" }, { status: 400 });
    }

    const client = await createServerClient();

    // 1. Fetch instance
    const { data: instance, error: fetchError } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (fetchError || !instance) {
      return NextResponse.json({ error: "任务实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, any>;

    // 2. Fetch definition
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: inst.def_id,
    });
    if (!def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;
    const workflowNodes: any[] = d.workflow_nodes || [];
    const nodeHistory: any[] = inst.node_history || [];
    const currentIndex: number = inst.current_node_index ?? 0;
    const currentStatus: string = inst.status;

    const schemaName = d.schema_name;
    const tableName = d.table_name;

    // Helper: update instance
    const updateInstance = async (updates: Record<string, any>) => {
      await client.rpc("dp_update", {
        p_table: "public.task_center_instances",
        p_id: id,
        p_data: updates,
      });
    };

    // Helper: update physical row with node tracking
    const updatePhysRow = async (data: Record<string, any>) => {
      if (!phys_data?._phys_id) return;
      const updateData = { ...data, node_id: inst.current_node_id, submitted_by: user_id };
      await client.rpc("dp_update", {
        p_table: `${schemaName}.${tableName}`,
        p_id: phys_data._phys_id,
        p_data: updateData,
      });
    };

    switch (action) {
      case "submit": {
        if (currentStatus !== "in_progress" && currentStatus !== "pending") {
          return NextResponse.json({ error: "当前状态不允许提交" }, { status: 400 });
        }

        const currentNode = workflowNodes[currentIndex];
        if (!currentNode) {
          return NextResponse.json({ error: "工作流节点不存在" }, { status: 400 });
        }

        // Verify current user is the handler
        if (currentNode.handler_id !== user_id) {
          return NextResponse.json({ error: "仅当前节点处理人可提交" }, { status: 403 });
        }

        // Build node history entry
        const historyEntry: Record<string, any> = {
          node_id: currentNode.id,
          handler_id: user_id,
          handler_name: user_name || "",
          action: "submit",
          submitted_at: new Date().toISOString(),
        };
        if (phys_data) {
          historyEntry.data = phys_data;
        }

        nodeHistory.push(historyEntry);

        // Update physical row
        if (phys_data?._phys_id) {
          await updatePhysRow({});
        }

        // Advance to next node or complete
        const nextIndex = currentIndex + 1;
        if (nextIndex >= workflowNodes.length) {
          // Last node — task complete
          await updateInstance({
            status: "completed",
            current_node_index: nextIndex,
            node_history: nodeHistory,
          });
        } else {
          const nextNode = workflowNodes[nextIndex];
          await updateInstance({
            status: "in_progress",
            current_node_id: nextNode.id,
            current_node_index: nextIndex,
            assignee_id: nextNode.handler_id,
            assignee_name: nextNode.handler_name,
            node_history: nodeHistory,
          });
        }

        break;
      }

      case "reject": {
        if (!reason) {
          return NextResponse.json({ error: "驳回原因不能为空" }, { status: 400 });
        }

        if (currentStatus !== "in_progress") {
          return NextResponse.json({ error: "当前状态不允许驳回" }, { status: 400 });
        }

        const currentNode = workflowNodes[currentIndex];
        if (!currentNode) {
          return NextResponse.json({ error: "工作流节点不存在" }, { status: 400 });
        }

        if (currentNode.handler_id !== user_id) {
          return NextResponse.json({ error: "仅当前节点处理人可驳回" }, { status: 403 });
        }

        nodeHistory.push({
          node_id: currentNode.id,
          handler_id: user_id,
          handler_name: user_name || "",
          action: "reject",
          reason,
          submitted_at: new Date().toISOString(),
        });

        const prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
          // First node rejects → return to initiator
          await updateInstance({
            status: "returned",
            current_node_index: currentIndex,
            assignee_id: d.created_by,
            assignee_name: d.created_by_name,
            node_history: nodeHistory,
          });
        } else {
          const prevNode = workflowNodes[prevIndex];
          await updateInstance({
            status: "in_progress",
            current_node_id: prevNode.id,
            current_node_index: prevIndex,
            assignee_id: prevNode.handler_id,
            assignee_name: prevNode.handler_name,
            node_history: nodeHistory,
          });
        }

        break;
      }

      case "skip": {
        // Only initiator can skip
        if (d.created_by !== user_id) {
          return NextResponse.json({ error: "仅发起人可跳过节点" }, { status: 403 });
        }

        if (currentStatus !== "pending" && currentStatus !== "in_progress") {
          return NextResponse.json({ error: "当前状态不允许跳过" }, { status: 400 });
        }

        const currentNode = workflowNodes[currentIndex];
        if (!currentNode) {
          return NextResponse.json({ error: "工作流节点不存在" }, { status: 400 });
        }

        nodeHistory.push({
          node_id: currentNode.id,
          handler_id: user_id,
          handler_name: user_name || "",
          action: "skip",
          reason: reason || "",
          submitted_at: new Date().toISOString(),
        });

        const nextIndex = currentIndex + 1;
        if (nextIndex >= workflowNodes.length) {
          await updateInstance({
            status: "completed",
            current_node_index: nextIndex,
            node_history: nodeHistory,
          });
        } else {
          const nextNode = workflowNodes[nextIndex];
          await updateInstance({
            status: "in_progress",
            current_node_id: nextNode.id,
            current_node_index: nextIndex,
            assignee_id: nextNode.handler_id,
            assignee_name: nextNode.handler_name,
            node_history: nodeHistory,
          });
        }

        break;
      }

      case "reassign": {
        if (!new_handler_id) {
          return NextResponse.json({ error: "缺少新处理人ID" }, { status: 400 });
        }

        const isHandler = workflowNodes[currentIndex]?.handler_id === user_id;
        const isInitiator = d.created_by === user_id;

        if (!isHandler && !isInitiator) {
          return NextResponse.json({ error: "无权限转办" }, { status: 403 });
        }

        const currentNode = workflowNodes[currentIndex];
        if (!currentNode) {
          return NextResponse.json({ error: "工作流节点不存在" }, { status: 400 });
        }

        nodeHistory.push({
          node_id: currentNode.id,
          handler_id: user_id,
          handler_name: user_name || "",
          action: "reassign",
          from_handler: currentNode.handler_id,
          to_handler: new_handler_id,
          reason: reason || "",
          reassigned_at: new Date().toISOString(),
        });

        // Update workflow node handler in definition
        workflowNodes[currentIndex].handler_id = new_handler_id;
        workflowNodes[currentIndex].handler_name = new_handler_name || "";

        // Update the definition's workflow_nodes
        await client.rpc("dp_update", {
          p_table: "public.task_center_defs",
          p_id: d.id,
          p_data: { workflow_nodes: workflowNodes },
        });

        await updateInstance({
          assignee_id: new_handler_id,
          assignee_name: new_handler_name || "",
          node_history: nodeHistory,
        });

        break;
      }

      case "withdraw": {
        if (d.created_by !== user_id) {
          return NextResponse.json({ error: "仅发起人可撤回任务" }, { status: 403 });
        }

        if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "terminated") {
          return NextResponse.json({ error: "当前状态不可撤回" }, { status: 400 });
        }

        nodeHistory.push({
          node_id: inst.current_node_id,
          handler_id: user_id,
          handler_name: user_name || "",
          action: "withdraw",
          reason: reason || "",
          submitted_at: new Date().toISOString(),
        });

        await updateInstance({
          status: "cancelled",
          node_history: nodeHistory,
        });

        break;
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }

    // Fetch and return updated instance
    const { data: updated } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("工作流推进失败:", error);
    return NextResponse.json({ error: "工作流推进失败" }, { status: 500 });
  }
}
