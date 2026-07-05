import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { ensureConvTables } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "project-management-secret-key-2026";

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const client = await createServerClient();
    const { data: users } = await client.rpc("dp_select", { p_table: "users" });
    const rows = (users as Record<string, unknown>[]) || [];
    const user = rows.find((u) => u.id === decoded.userId);
    if (!user) return null;
    return {
      id: String(user.id || ""),
      name: String(user.name || ""),
      role: String(user.role || "user"),
      department: String(user.department || ""),
      phone: String(user.phone || ""),
    };
  } catch { return null; }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureConvTables();
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, message_id, action_index, confirmed_data } = body;

    if (!conversation_id || !message_id || !confirmed_data) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const client = await createServerClient();

    // 验证消息归属
    const { data: msgData } = await client.rpc("dp_select", { p_table: "design_public.ai_messages" });
    const msgs = (msgData as any[]) || [];
    const msg = msgs.find((m: any) => m.id === message_id && m.conversation_id === conversation_id);
    if (!msg) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 });
    }

    const actionType = String(msg.action_type || "");
    let result: any = { success: false, error: "未知操作类型" };

    // 根据操作类型调用实际业务逻辑
    try {
      if (actionType === "create_project" || actionType === "edit_project") {
        const isEdit = actionType === "edit_project" && confirmed_data.id;
        if (!isEdit && !confirmed_data.project_name) {
          throw new Error("缺少项目名称，请重新让 AI 提取项目信息");
        }
        const url = isEdit ? `/api/projects/${confirmed_data.id}` : "/api/projects";
        const method = isEdit ? "PUT" : "POST";

        // 构造项目数据
        const projectData: any = {
          project_name: confirmed_data.project_name,
          project_code: confirmed_data.project_code || confirmed_data.project_name?.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          project_type: confirmed_data.project_type || "",
          project_stage: confirmed_data.project_stage || "",
          department: confirmed_data.department || user.department || "",
          description: confirmed_data.description || "",
        };
        if (confirmed_data.customer_info) projectData.customer_info = confirmed_data.customer_info;
        if (confirmed_data.entry_date) projectData.entry_date = confirmed_data.entry_date;
        if (confirmed_data.role_sales) projectData.role_sales = confirmed_data.role_sales;
        if (confirmed_data.role_project_manager) projectData.role_project_manager = confirmed_data.role_project_manager;
        if (confirmed_data.members) projectData.members = confirmed_data.members;

        const authHeader = request.headers.get("authorization") || "";
        const res = await fetch(`${request.nextUrl.origin}${url}`, {
          method,
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          body: JSON.stringify(isEdit ? { id: confirmed_data.id, ...projectData } : projectData),
        });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || "操作失败");
        result.success = true;
      } else if (actionType === "create_task") {
        if (!confirmed_data.task_name) {
          throw new Error("缺少任务名称，请重新让 AI 提取任务信息");
        }
        // 确保每个 form_column 都有 name（数据库列名），缺失则自动补
        const formColumns = (confirmed_data.form_columns?.length
          ? confirmed_data.form_columns
          : [{ label: "回复内容", type: "textarea", required: true }]
        ).map((col: any, i: number) => ({
          name: col.name || `field_${i + 1}`,
          label: col.label || `字段${i + 1}`,
          type: col.type || "text",
          required: col.required ?? false,
          options: col.options || undefined,
          assigned_node_id: col.assigned_node_id || null,
        }));

        // 自动构建工作流（如果没有指定）
        const workflowNodes = confirmed_data.workflow_nodes?.length
          ? confirmed_data.workflow_nodes
          : confirmed_data.assignee_config
            ? [{
                id: "node_1", name: "处理", order: 1, node_type: "sequential",
                handler_id: confirmed_data.assignee_config.user_id || user.id,
                handler_name: confirmed_data.assignee_config.user_name || confirmed_data.assignee_config.name || user.name,
                editable_fields: formColumns.map((c: any) => c.name),
                required_fields: formColumns.filter((c: any) => c.required).map((c: any) => c.name),
                handler_ids: [], handler_names: [], max_records: 0, deadline_hours: 24,
              }]
            : null;

        const authHeader = request.headers.get("authorization") || "";
        const res = await fetch(`${request.nextUrl.origin}/api/tasks/defs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          body: JSON.stringify({
            task_name: confirmed_data.task_name,
            time_type: confirmed_data.time_type || "one_time",
            task_mode: confirmed_data.task_mode || "process",
            form_columns: formColumns,
            workflow_nodes: workflowNodes,
            assignee_config: confirmed_data.assignee_config || null,
            board_records: confirmed_data.board_records || null,
            deadline_config: confirmed_data.deadline_config || { due_date: null, remind_days: 1 },
            periodic_config: confirmed_data.periodic_config || null,
            created_by: user.id,
            created_by_name: user.name,
            status: "active",
          }),
        });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || "创建任务失败");
        result.success = true;
      } else if (actionType === "create_issue") {
        if (!confirmed_data.title) {
          throw new Error("缺少工单标题，请重新让 AI 提取工单信息");
        }
        const authHeader = request.headers.get("authorization") || "";
        const res = await fetch(`${request.nextUrl.origin}/api/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          body: JSON.stringify({
            title: confirmed_data.title,
            project_id: confirmed_data.project_id || null,
            project_name: confirmed_data.project_name || "",
            department: confirmed_data.department || user.department || "",
            reporter_id: user.id,
            reporter_name: user.name,
            reporter_phone: user.phone || "",
            handler_id: confirmed_data.handler_id || null,
            handler_name: confirmed_data.handler_name || "",
            handler_phone: confirmed_data.handler_phone || "",
            category_id: confirmed_data.category_id || "",
            urgency_id: confirmed_data.urgency_id || "",
            description: confirmed_data.description || "",
            is_major: confirmed_data.is_major || false,
            is_first_report: confirmed_data.is_first_report ?? true,
            has_similar_history: confirmed_data.has_similar_history || false,
            remarks: confirmed_data.remarks || "",
            expected_handle_time: confirmed_data.expected_handle_time || null,
            creator_id: user.id,
          }),
        });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || "创建工单失败");
        result.success = true;
      } else if (actionType === "edit_profile") {
        const targetUserId = confirmed_data.target_user_id || user.id;
        // 检查权限：只能编辑自己，超管可编辑他人
        if (targetUserId !== user.id && user.role !== "super_admin") {
          throw new Error("您没有权限编辑他人资料");
        }
        const updateData: any = {};
        if (confirmed_data.name) updateData.name = confirmed_data.name;
        if (confirmed_data.phone) updateData.phone = confirmed_data.phone;
        if (confirmed_data.email !== undefined) updateData.email = confirmed_data.email;
        if (confirmed_data.department) updateData.department = confirmed_data.department;
        if (confirmed_data.position !== undefined) updateData.position = confirmed_data.position;
        // 只有超管能改角色
        if (confirmed_data.role && user.role === "super_admin") updateData.role = confirmed_data.role;

        const authHeader = request.headers.get("authorization") || "";
        const res = await fetch(`${request.nextUrl.origin}/api/users/${targetUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(authHeader ? { Authorization: authHeader } : {}) },
          body: JSON.stringify(updateData),
        });
        result = await res.json();
        if (!res.ok) throw new Error(result.error || "编辑资料失败");
        result.success = true;
      } else {
        throw new Error(`不支持的操作类型: ${actionType}`);
      }
    } catch (err: any) {
      result = { success: false, error: err.message || String(err) };
    }

    // 更新消息状态
    const updatedData: any = {
      action_status: result.success ? "executed" : "execution_failed",
      execution_result: result,
    };
    // 如果用户修改了数据，更新 structured_data
    if (JSON.stringify(confirmed_data) !== JSON.stringify(msg.structured_data || {})) {
      updatedData.structured_data = confirmed_data;
    }

    await client.rpc("dp_update", {
      p_table: "design_public.ai_messages",
      p_id: message_id,
      p_data: updatedData,
    });

    // 更新会话时间
    await client.rpc("execute_sql", {
      p_sql: `UPDATE design_public.ai_conversations SET updated_at = NOW() WHERE id = '${conversation_id}'`,
    });

    logAIUsage({
      userId: user.id, userName: user.name,
      feature: `ai-execute-${actionType}`, tokensUsed: 0,
    });

    return NextResponse.json({ success: result.success, data: result, error: result.error });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
