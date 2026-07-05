import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { ensureConvTables, getRoleFeaturePermission, chatCompletion, getAISettings, ensureAITables } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "project-management-secret-key-2026";

interface UserInfo {
  id: string; name: string; role: string; department: string; phone: string;
}

async function getUserFromToken(request: NextRequest): Promise<UserInfo | null> {
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
  } catch {
    return null;
  }
}

async function getUserContext(user: UserInfo) {
  const client = await createServerClient();

  // 获取项目列表 + 权限
  let projects: any[] = [];
  try {
    const { data } = await client.rpc("dp_select", { p_table: "projects" });
    projects = (data as any[]) || [];
  } catch { /* ignore */ }

  const projectContext = [];
  for (const p of projects) {
    const pm = (p.members as any[]) || [];
    const isMember = pm.some((m: any) => m.user_id === user.id);
    let permissions: string[] = [];
    if (["super_admin", "sub_admin"].includes(user.role)) {
      permissions = ["project_edit", "member_manage", "module_manage", "task_manage", "issue_handle", "issue_report", "data_view", "data_export"];
    } else if (isMember) {
      try {
        const { data: permData } = await client.rpc("dp_select", { p_table: "project_member_permissions" });
        const permRows = (permData as any[]) || [];
        const member = pm.find((m: any) => m.user_id === user.id);
        if (member) {
          permissions = permRows
            .filter((pr: any) => pr.member_record_id === member.id)
            .map((pr: any) => String(pr.permission_key || ""));
        }
      } catch { /* ignore */ }
    }
    projectContext.push({
      id: p.id, name: p.project_name || p.id,
      type: p.project_type || "", stage: p.project_stage || "",
      is_member: isMember, permissions,
    });
  }

  // 获取用户待办任务实例（含任务名称等详细信息）
  let taskInstances: any[] = [];
  let taskDefs: any[] = [];
  try {
    const { data: instances } = await client.rpc("dp_select", { p_table: "task_center_instances" });
    const { data: defs } = await client.rpc("dp_select", { p_table: "task_center_defs" });
    const instRows = (instances as any[]) || [];
    const defRows = (defs as any[]) || [];
    taskDefs = defRows.filter((d: any) => d.created_by === user.id);

    const defMap = new Map(defRows.map((d: any) => [d.id, d]));
    taskInstances = instRows
      .filter((i: any) => i.assignee_id === user.id && ["pending", "in_progress"].includes(i.status))
      .slice(0, 20)
      .map((i: any) => {
        const def = defMap.get(i.def_id) || {};
        return {
          id: i.id,
          task_name: def.task_name || i.task_name || "未命名",
          status: i.status,
          due_date: i.due_date,
          project_name: i.project_name || "",
          task_mode: def.task_mode || "process",
          time_type: def.time_type || "one_time",
          form_columns: def.form_columns || [],
          workflow_nodes: def.workflow_nodes || [],
          current_node_index: i.current_node_index ?? 0,
          assignee_name: i.assignee_name || "",
        };
      });
  } catch { /* ignore */ }

  // 获取用户工单（处理人 + 提交人）
  let issues: any[] = [];
  try {
    const { data: issueData } = await client.rpc("dp_select", { p_table: "issue_mgmt_issues" });
    const issueRows = (issueData as any[]) || [];
    issues = issueRows
      .filter((i: any) =>
        i.handler_id === user.id || i.creator_id === user.id
      )
      .slice(0, 30)
      .map((i: any) => ({
        id: i.id,
        title: i.title || "无标题",
        status: i.status,
        handler_name: i.handler_name || "未指定",
        reporter_name: i.reporter_name || "",
        urgency_id: i.urgency_id || "",
        category_id: i.category_id || "",
        project_name: i.project_name || "",
        created_at: i.created_at,
        is_handler: i.handler_id === user.id,
        is_creator: i.creator_id === user.id,
      }));
  } catch { /* ignore */ }

  // 获取项目表结构摘要（用户可访问的项目）
  let projectTableSummaries: string[] = [];
  try {
    const accessibleProjects = projectContext.filter((p) => p.is_member || user.role !== "user");
    for (const p of accessibleProjects.slice(0, 10)) {
      // 使用项目实际的 project_schema，或从 project_code 推导
      const origProject = projects.find((op: any) => op.id === p.id);
      const schema = (origProject as any)?.project_schema ||
        `yuansu_${String(origProject?.project_code || "").toLowerCase()}`;
      if (!schema || schema.length < 3) continue;
      try {
        const { data: tables } = await client.rpc("execute_sql", {
          p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' ORDER BY table_name`,
        });
        const tableNames = ((tables as any[]) || []).map((t: any) => t.table_name);
        if (tableNames.length > 0) {
          projectTableSummaries.push(`${p.name}(schema:${schema}) 表:${tableNames.join(", ")}`);
        }
      } catch { /* schema not found */ }
    }
  } catch { /* ignore */ }

  return {
    projects: projectContext,
    taskInstances,
    taskDefs: taskDefs.map((d: any) => ({
      id: d.id, task_name: d.task_name, task_mode: d.task_mode,
      time_type: d.time_type, status: d.status, created_at: d.created_at,
      form_columns: d.form_columns || [],
    })),
    issues,
    projectTableSummaries,
    taskCount: taskInstances.length,
    issueTodoCount: issues.filter((i: any) => i.is_handler && ["pending", "accepted", "processing"].includes(i.status)).length,
  };
}

// ==================== AI 工具定义 ====================
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_my_tasks",
      description: "获取当前用户的待办任务列表，包含任务名称、状态、截止日期、需要填写的表单字段等详细信息",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_issues",
      description: "获取当前用户相关的工单列表（处理或提交的），包含标题、状态、处理人等信息",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_tables",
      description: "获取指定项目的所有数据表名称和结构信息，用于分析项目时了解有哪些表可以查询",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "项目ID" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_table_data",
      description: "读取项目某个数据表的内容（最多20行），包含所有列的实际数据。用于分析项目进度、成本、风险等",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "项目ID" },
          table_name: { type: "string", description: "表名（从 get_project_tables 获取）" },
        },
        required: ["project_id", "table_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_detail",
      description: "获取指定项目的详细信息（基本信息、客户、成员等）",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "项目ID" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "获取用户资料信息",
      parameters: {
        type: "object",
        properties: { user_id: { type: "string", description: "用户ID，不传则查当前用户" } },
        required: [],
      },
    },
  },
];

async function executeToolCall(fnName: string, args: any, user: any, ctx: any) {
  const client = await createServerClient();
  try {
    switch (fnName) {
      case "get_my_tasks": {
        const tasks = ctx.taskInstances.map((t: any) => {
          const formFields = (t.form_columns || []).filter((c: any) => c.label).map((c: any) => `${c.label}(${c.type}${c.required ? "/必填" : ""}${c.options?.length ? `/选项:${c.options.join("|")}` : ""})`).join("; ");
          const nodes = (t.workflow_nodes || []).map((n: any) => ` 节点${n.order}:${n.name}(处理人:${n.handler_name || "未指定"})`).join("");
          return {
            task_name: t.task_name,
            status: t.status,
            due_date: t.due_date,
            project_name: t.project_name,
            task_mode: t.task_mode,
            form_fields: formFields || "无自定义字段",
            workflow: nodes || "无工作流",
            current_step: t.current_node_index,
            assignee: t.assignee_name,
          };
        });
        return { count: tasks.length, tasks };
      }
      case "get_my_issues": {
        const issues = ctx.issues.map((i: any) => ({
          title: i.title,
          status: i.status,
          handler_name: i.handler_name,
          urgency: i.urgency_id,
          category: i.category_id,
          project_name: i.project_name,
          role: i.is_handler ? "处理人" : "提交人",
          created_at: i.created_at,
        }));
        return { count: issues.length, issues };
      }
      case "get_project_detail": {
        const { data } = await client.rpc("dp_select", { p_table: "projects" });
        const projects = (data as any[]) || [];
        const p = projects.find((pr: any) => pr.id === args.project_id);
        if (!p) return { error: "项目不存在" };
        const members = (p.members || []).map((m: any) => `${m.name || m.user_name}(${m.role_type || "成员"})`).join(", ");
        return {
          name: p.project_name,
          code: p.project_code,
          type: p.project_type,
          stage: p.project_stage,
          status: p.status || p.project_status,
          department: p.department,
          description: p.description,
          members: members || "无",
          customer_info: p.customer_info,
          created_at: p.created_at,
        };
      }
      case "get_project_tables": {
        const { data } = await client.rpc("dp_select", { p_table: "projects" });
        const projects = (data as any[]) || [];
        const p = projects.find((pr: any) => pr.id === args.project_id);
        if (!p) return { error: "项目不存在" };
        const schema = (p as any).project_schema || `yuansu_${String(p.project_code || "").toLowerCase()}`;
        try {
          const { data: tables } = await client.rpc("execute_sql", {
            p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
          });
          const tableNames = ((tables as any[]) || []).map((t: any) => t.table_name);
          // 获取每个表的列信息
          const tableDetails = [];
          for (const tn of tableNames.slice(0, 15)) {
            try {
              const { data: cols } = await client.rpc("execute_sql", {
                p_sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${tn}' ORDER BY ordinal_position`,
              });
              const colList = ((cols as any[]) || []).map((c: any) => c.column_name).join(", ");
              tableDetails.push(`${tn}(${colList})`);
            } catch {
              tableDetails.push(tn);
            }
          }
          return { project: p.project_name, schema, tables: tableDetails, count: tableDetails.length };
        } catch {
          return { error: `无法访问项目 schema: ${schema}` };
        }
      }
      case "get_table_data": {
        const { data } = await client.rpc("dp_select", { p_table: "projects" });
        const projects = (data as any[]) || [];
        const p = projects.find((pr: any) => pr.id === args.project_id);
        if (!p) return { error: "项目不存在" };
        const schema = (p as any).project_schema || `yuansu_${String(p.project_code || "").toLowerCase()}`;
        const tableName = args.table_name;
        try {
          const { data: rows } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM "${schema}"."${tableName}" LIMIT 20`,
          });
          const resultRows = (rows as any[]) || [];
          return {
            project: p.project_name,
            table: tableName,
            row_count: resultRows.length,
            columns: resultRows.length > 0 ? Object.keys(resultRows[0]) : [],
            rows: resultRows,
          };
        } catch (e: any) {
          return { error: `读取表数据失败: ${e.message || e}` };
        }
      }
      case "get_user_profile": {
        const targetId = args.user_id || user.id;
        const { data: users } = await client.rpc("dp_select", { p_table: "users" });
        const users_ = (users as any[]) || [];
        const u = users_.find((ur: any) => ur.id === targetId);
        if (!u) return { error: "用户不存在" };
        return {
          name: u.name, username: u.username,
          department: u.department, position: u.position,
          phone: u.phone, email: u.email,
          role: u.role,
        };
      }
      default:
        return { error: `未知工具: ${fnName}` };
    }
  } catch (e: any) {
    return { error: `工具执行失败: ${e.message || e}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAITables();
    await ensureConvTables();

    // 1. 验证用户
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }

    // 2. 权限校验
    const canUseAI = await getRoleFeaturePermission(user.role, "ai_assistant");
    if (!canUseAI) {
      return NextResponse.json({ error: "您没有使用 AI 助手的权限" }, { status: 403 });
    }

    // 3. 解析请求
    const body = await request.json();
    const { conversation_id, message, context } = body;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    const client = await createServerClient();

    // 4. 加载或创建会话
    let convId = conversation_id;
    if (convId) {
      // 验证会话归属
      const { data: convData } = await client.rpc("dp_select", { p_table: "design_public.ai_conversations" });
      const convs = (convData as any[]) || [];
      const conv = convs.find((c: any) => c.id === convId);
      if (!conv || conv.user_id !== user.id) {
        return NextResponse.json({ error: "会话不存在" }, { status: 404 });
      }
    } else {
      // 创建新会话
      const title = message.slice(0, 30) + (message.length > 30 ? "..." : "");
      const result = await client.rpc("dp_insert", {
        p_table: "design_public.ai_conversations",
        p_data: { user_id: user.id, title },
      });
      const raw: any = result;
      const inserted = Array.isArray(raw?.data) ? raw.data[0] : raw?.data;
      convId = (inserted as any)?.id;
    }

    // 5. 加载历史消息
    const { data: msgData } = await client.rpc("dp_select", { p_table: "design_public.ai_messages" });
    const allMsgs = (msgData as any[]) || [];
    const historyMsgs = allMsgs
      .filter((m: any) => m.conversation_id === convId)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // 6. 获取用户上下文
    const userContext = await getUserContext(user);

    // 7. 构建系统提示 + 工具定义
    const projectSummary = userContext.projects.map((p: any) =>
      `- ${p.name} [${p.type}/${p.stage}] ${p.is_member ? "成员" : "非成员"} 权限:[${p.permissions.join(",")}]`
    ).join("\n");

    const taskList = userContext.taskInstances.map((t: any) => {
      const statusLabel: Record<string, string> = { pending: "待处理", in_progress: "进行中" };
      const formFields = (t.form_columns || []).filter((c: any) => c.label).map((c: any) => `${c.label}(${c.type}${c.required ? "/必填" : ""})`).join(", ");
      return `- [${statusLabel[t.status] || t.status}] ${t.task_name} | 项目:${t.project_name || "无"} | 截止:${t.due_date || "无"}${formFields ? ` | 字段:${formFields}` : ""}`;
    }).join("\n");

    const issueList = userContext.issues.map((i: any) => {
      const statusLabel: Record<string, string> = { pending: "待受理", accepted: "已受理", processing: "处理中", completed: "已完结", rejected: "已驳回", closed: "已关闭" };
      const role = i.is_handler ? "处理人" : "提交人";
      return `- [${statusLabel[i.status] || i.status}] ${i.title} | 项目:${i.project_name || "无"} | ${role}`;
    }).join("\n");

    const systemPrompt = `你是项目管理系统中的智能助理。用中文回复。

当前用户：${user.name}（${user.role}），部门：${user.department || "未设置"}
待办${userContext.taskCount}个，工单${userContext.issues.length}个
项目：${projectSummary || "无"}

你有两种能力，务必区分清楚：

【能力一：查询工具】（在对话过程中调用，获取数据）
以下工具可以随时调用，获取实时数据：
- get_my_tasks — 查待办任务详情（名称/状态/字段/工作流）
- get_my_issues — 查工单详情
- get_project_detail(project_id) — 查项目基本信息
- get_project_tables(project_id) — 列出项目的所有数据表
- get_table_data(project_id, table_name) — 读取表数据（最多20行）
- get_user_profile(user_id?) — 查用户资料

【能力二：写入操作】（在最终回复的 actions 数组中返回，系统自动执行）
你不需要工具来创建/修改数据！只需在最终JSON的actions中列出即可，系统会执行：

- create_task — 创建任务。data必须包含：task_name, time_type(one_time|periodic), task_mode(process|project), form_columns(至少填[])
- create_issue — 发起工单。data必须包含：title, description
- create_project — 新建项目。data必须包含：project_name, project_type
- edit_project — 编辑项目。data必须包含：id + 要改的字段
- edit_profile — 修改资料。data包含要改的字段(name/phone/email/department/position)

【核心流程】
1. 用户说一段话 → 先用查询工具获取需要的数据（可选）
2. 数据收集完毕后 → 在最终JSON的actions中放入要执行的写入操作
3. 系统会把 actions 展示给用户确认，确认后自动执行
4. 如果只是查询问题（不需要创建/修改），actions 留空数组[]

【重要规则】
- 你有完整的写入能力！不要说"没有接口"或"无法执行"，不要在reply里写"建议手动创建"
- 提取数据后直接放入actions，reply里说"请确认以下信息，点击确认即可执行"之类的话
- 如果信息不完整也要提取已知字段，缺失的列在missing_fields中
- form_columns中每个字段必须有label和type，name会自动生成

回复格式（纯JSON）：
{"intent":"query_task|create_task|create_issue|create_project|edit_project|edit_profile|chat","actions":[{"type":"create_task","confidence":0.9,"data":{"task_name":"具体名称","time_type":"one_time","task_mode":"process","form_columns":[]},"missing_fields":[],"clarify_question":""}],"reply":"自然语言回复（不用#号标题，用【】和列表）","warnings":[]}`;

    // 构建初始消息
    const toolMessages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }> = [
      { role: "system", content: systemPrompt },
      ...historyMsgs
        .filter((m: any) => m.role !== "system")
        .slice(-10)  // 只保留最近10条历史，防止上下文溢出
        .map((m: any) => ({ role: m.role as string, content: m.content as string })),
      { role: "user", content: message },
    ];

    // 8. 代理循环：调用 DeepSeek → 执行工具 → 反馈结果 → 重复
    let finalContent = "";
    let finalParsed: any = null;
    let totalTokens = 0;
    const MAX_ITERATIONS = 5;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const { content, toolCalls, tokens } = await chatCompletion(toolMessages, {
        maxTokens: 4096,
        tools: AI_TOOLS,
      });
      totalTokens += tokens;

      if (toolCalls && toolCalls.length > 0) {
        // AI 想调用工具
        toolMessages.push({ role: "assistant", content: content || "", tool_calls: toolCalls });

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          const fnArgs = JSON.parse(tc.function?.arguments || "{}");
          const result = await executeToolCall(fnName, fnArgs, user, userContext);
          toolMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue; // 下一轮
      }

      // AI 返回了最终文本回复
      finalContent = content;
      break;
    }

    if (!finalContent && !finalParsed) {
      finalContent = "抱歉，处理时间较长，请简化你的问题再试一次。";
    }

    // 9. 解析 AI 最终回复
    let parsed: any = null;
    try {
      let jsonStr = finalContent;
      const jsonMatch = finalContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      else {
        const braceMatch = finalContent.match(/\{[\s\S]*\}/);
        if (braceMatch) jsonStr = braceMatch[0];
      }
      parsed = JSON.parse(jsonStr);
      if (!parsed.reply || !parsed.reply.trim()) {
        parsed.reply = finalContent.replace(/\{[\s\S]*\}/, "").trim() || finalContent.slice(0, 500);
      }
    } catch {
      parsed = { intent: "chat", actions: [], reply: finalContent, warnings: [] };
    }

    // 判断是否有写入操作
    const isWriteAction = (type: string) => type && !type.startsWith("query_") && type !== "chat";
    const hasWriteAction = (parsed.actions || []).some((a: any) => isWriteAction(a.type));

    // 10. 保存消息（捕获数据库 ID）
    await client.rpc("dp_insert", {
      p_table: "design_public.ai_messages",
      p_data: { conversation_id: convId, role: "user", content: message },
    });
    const actions = parsed.actions || [];
    const primaryAction = actions[0];
    const saveResult: any = await client.rpc("dp_insert", {
      p_table: "design_public.ai_messages",
      p_data: {
        conversation_id: convId,
        role: "assistant",
        content: parsed.reply || finalContent,
        intent: parsed.intent || "chat",
        structured_data: primaryAction?.data || null,
        action_type: primaryAction?.type || null,
        action_status: primaryAction && isWriteAction(primaryAction.type) ? "pending_confirm" : "none",
      },
    });
    const savedMsgId = Array.isArray(saveResult?.data) ? saveResult.data[0]?.id : saveResult?.data?.id;

    // 11. 更新会话
    await client.rpc("execute_sql", {
      p_sql: `UPDATE design_public.ai_conversations SET updated_at = NOW() WHERE id = '${convId}'`,
    });
    if (historyMsgs.length === 0) {
      const title = (parsed.intent && parsed.intent !== "chat")
        ? `${intentLabel(parsed.intent)}${primaryAction?.data?.project_name || primaryAction?.data?.task_name || primaryAction?.data?.title || ""}`
        : message.slice(0, 40);
      await client.rpc("execute_sql", {
        p_sql: `UPDATE design_public.ai_conversations SET title = '${title.replace(/'/g, "''")}' WHERE id = '${convId}'`,
      });
    }

    // 12. 日志
    logAIUsage({ userId: user.id, userName: user.name, feature: "ai-assistant", tokensUsed: totalTokens });

    return NextResponse.json({
      success: true,
      conversation_id: convId,
      message_id: savedMsgId || undefined,
      reply: parsed.reply || finalContent.slice(0, 500),
      actions: parsed.actions || [],
      warnings: parsed.warnings || [],
      intent: parsed.intent || "chat",
    });
  } catch (err: any) {
    if (err.message === "API Key 未配置") {
      return NextResponse.json({ error: "AI 服务未配置，请在系统设置中配置 DeepSeek API Key" }, { status: 503 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function intentLabel(intent: string): string {
  const map: Record<string, string> = {
    query_project: "查询项目", create_project: "创建项目", edit_project: "编辑项目",
    query_task: "查询任务", create_task: "创建任务",
    query_issue: "查询工单", create_issue: "创建工单",
    query_profile: "查询资料", edit_profile: "编辑资料",
    edit_table_data: "编辑数据", mixed: "综合操作", chat: "对话",
  };
  return map[intent] || "";
}
