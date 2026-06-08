import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/todo-tasks/defs?created_by=xxx&is_enabled=true
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get("created_by");
    const isEnabled = searchParams.get("is_enabled");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "todo_task_defs",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = (data || []) as Record<string, unknown>[];

    if (createdBy) {
      items = items.filter((r) => String(r.created_by) === createdBy);
    }
    if (isEnabled !== null && isEnabled !== undefined) {
      const enabled = isEnabled === "true";
      items = items.filter((r) => r.is_enabled === enabled);
    }

    items.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    // Map DB column names to frontend-expected field names
    const mapped = items.map((r) => {
      const periodConfig = (r.period_config || {}) as Record<string, unknown>;
      return {
        ...r,
        title: r.name,
        // Extract nested fields from period_config JSONB
        task_mode: periodConfig.task_mode || r.task_mode,
        form_source: periodConfig.form_source || null,
        form_table_code: periodConfig.form_table_code || null,
        form_table_name: periodConfig.form_table_name || null,
        created_by_name: periodConfig.created_by_name || null,
        assignee_ids: periodConfig.assignee_ids || [],
        project_ids: periodConfig.project_ids || [],
        deadline_config: periodConfig.deadline_config || null,
        reminder_enabled: periodConfig.reminder_enabled ?? true,
        reminder_before_days: periodConfig.reminder_before_days ?? 3,
        allow_late_complete: periodConfig.allow_late_complete ?? true,
      };
    });

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch task definitions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/todo-tasks/defs
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      title,
      description,
      task_type = "one_time",
      assignee_ids = [],
      project_ids = [],
      task_mode,
      form_source = "none",
      form_table_code,
      form_table_name,
      form_fields_config,
      periodic_type,
      periodic_config,
      deadline_config,
      reminder_enabled = true,
      reminder_before_days = 3,
      allow_late_complete = true,
      created_by,
      created_by_name,
      workflow_nodes,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 });
    }

    const extraConfig: Record<string, unknown> = {
      form_source,
      form_table_code: form_table_code || null,
      form_table_name: form_table_name || null,
      task_mode: task_mode || null,
      form_fields_config: form_fields_config || null,
      assignee_ids,
      project_ids,
      periodic_type: periodic_type || null,
      deadline_config: deadline_config || null,
      reminder_enabled,
      reminder_before_days,
      allow_late_complete,
      created_by_name: created_by_name || null,
      workflow_nodes: workflow_nodes || null,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "todo_task_defs",
      p_data: {
        name: title,
        description,
        task_type,
        assignee_id: assignee_ids.length > 0 ? assignee_ids[0] : null,
        assignee_name: created_by_name || null,
        project_id: project_ids.length > 0 ? project_ids[0] : null,
        period_config: { ...(periodic_config || {}), ...extraConfig },
        created_by: created_by || null,
        status: "active",
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 创建任务定义后，自动生成初始实例
    const defId = data && typeof data === "object" && "id" in (data as Record<string, unknown>)
      ? (data as Record<string, unknown>).id
      : null;

    if (defId) {
      await generateInstances(client, {
        definition_id: String(defId),
        title,
        task_type,
        task_mode: task_mode || null,
        assignee_ids,
        project_ids,
        workflow_nodes: workflow_nodes || null,
        periodic_type,
        deadline_config,
      });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task definition";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 根据任务定义生成实例
async function generateInstances(
  client: Awaited<ReturnType<typeof createServerClient>>,
  params: {
    definition_id: string;
    title: string;
    task_type: string;
    task_mode?: string | null;
    assignee_ids: string[];
    project_ids: string[];
    workflow_nodes?: unknown[] | null;
    periodic_type?: string;
    deadline_config?: Record<string, unknown>;
  }
) {
  const { definition_id, title, task_type, task_mode, assignee_ids, project_ids, workflow_nodes, periodic_type, deadline_config } = params;

  // 计算周期标签和截止日期
  const now = new Date();
  let periodLabel = "";
  let dueDate: string | null = null;

  if (task_type === "periodic") {
    periodLabel = getPeriodLabel(now, periodic_type || "monthly");
    dueDate = calculateDueDate(now, periodic_type || "monthly", deadline_config);
  } else {
    // 普通任务
    if (deadline_config?.specific_date) {
      dueDate = String(deadline_config.specific_date);
    }
  }

  // 获取项目信息
  const { data: projects } = await client.rpc("dp_select", { p_table: "projects" });
  const projectMap = new Map<string, Record<string, unknown>>();
  if (projects) {
    for (const p of projects as Record<string, unknown>[]) {
      projectMap.set(String(p.id), p);
    }
  }

  // 获取用户信息
  const { data: users } = await client.rpc("dp_select", { p_table: "users" });
  const userMap = new Map<string, Record<string, unknown>>();
  if (users) {
    for (const u of users as Record<string, unknown>[]) {
      userMap.set(String(u.id), u);
    }
  }

  // 获取项目成员（项目经理）
  const { data: members } = await client.rpc("dp_select", { p_table: "project_members" });
  const memberMap = new Map<string, string>(); // project_id -> user_id
  if (members) {
    for (const m of members as Record<string, unknown>[]) {
      if (String(m.role_type) === "project_manager" && m.project_id) {
        memberMap.set(String(m.project_id), String(m.user_id));
      }
    }
  }

  const instances: Array<Record<string, unknown>> = [];

  // 流程型任务：从工作流节点提取处理人
  if (task_mode === "approval" && workflow_nodes && Array.isArray(workflow_nodes) && workflow_nodes.length > 0) {
    const firstNode = workflow_nodes[0] as Record<string, unknown>;
    const handlerIds: string[] = Array.isArray(firstNode.handler_ids) ? firstNode.handler_ids as string[] : [];
    const projectId = project_ids.length > 0 ? project_ids[0] : null;
    const project = projectId ? projectMap.get(projectId) : null;
    const projectName = project ? String(project.project_name) : null;

    for (const handlerId of handlerIds) {
      const user = userMap.get(handlerId);
      const assigneeName = user ? String(user.name) : "";
      instances.push({
        def_id: definition_id,
        name: periodLabel ? `${periodLabel} ${title}` : title,
        assignee_id: handlerId,
        assignee_name: assigneeName,
        project_id: projectId,
        project_name: projectName,
        status: "pending",
        due_date: dueDate,
        period_label: periodLabel || null,
        current_node_id: firstNode.id ? String(firstNode.id) : null,
        current_node_index: 0,
      });
    }

    // 保存工作流模板和节点到专用表
    await saveWorkflowTemplate(client, definition_id, workflow_nodes as Record<string, unknown>[]);
  } else if (project_ids && project_ids.length > 0) {
    // 按项目指派
    for (const projectId of project_ids) {
      const project = projectMap.get(projectId);
      const projectName = project ? String(project.project_name) : "";
      const managerId = memberMap.get(projectId);

      // 优先用项目经理，否则用 assignee_ids 中的第一个人
      const assigneeId = managerId || (assignee_ids.length > 0 ? assignee_ids[0] : null);
      if (!assigneeId) continue;

      const user = userMap.get(assigneeId);
      const assigneeName = user ? String(user.name) : "";

      instances.push({
        def_id: definition_id,
        name: periodLabel ? `${periodLabel} ${title}` : title,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        project_id: projectId,
        project_name: projectName,
        status: "pending",
        due_date: dueDate,
        period_label: periodLabel || null,
      });
    }
  } else if (assignee_ids && assignee_ids.length > 0) {
    // 按人员指派（无项目）
    for (const assigneeId of assignee_ids) {
      const user = userMap.get(assigneeId);
      const assigneeName = user ? String(user.name) : "";

      instances.push({
        def_id: definition_id,
        name: periodLabel ? `${periodLabel} ${title}` : title,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        project_id: null,
        project_name: null,
        status: "pending",
        due_date: dueDate,
        period_label: periodLabel || null,
      });
    }
  }

  // 批量写入实例
  for (const instance of instances) {
    await client.rpc("dp_insert", {
      p_table: "todo_task_instances",
      p_data: instance,
    });
  }
}

async function saveWorkflowTemplate(
  client: Awaited<ReturnType<typeof createServerClient>>,
  taskDefId: string,
  nodes: Record<string, unknown>[],
) {
  // 删除旧模板
  const { data: oldTmpls } = await client.rpc("dp_select", { p_table: "workflow_templates" });
  const oldTmpl = (oldTmpls as Array<Record<string, unknown>>)?.find(t => t.task_def_id === taskDefId);
  if (oldTmpl) {
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.workflow_nodes WHERE template_id = '${oldTmpl.id}'`,
    });
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.workflow_templates WHERE id = '${oldTmpl.id}'`,
    });
  }

  // 创建新模板
  const tmplId = crypto.randomUUID();
  await client.rpc("execute_sql", {
    p_sql: `INSERT INTO design_public.workflow_templates (id, task_def_id, allow_forward, allow_return)
            VALUES ('${tmplId}', '${taskDefId}', true, true)`,
  });

  // 创建节点
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const nodeId = n.id || crypto.randomUUID();
    const handlerIds = (n.handler_ids as string[]) || [];
    const fillableFields = (n.fillable_fields as string[]) || [];
    await client.rpc("execute_sql", {
      p_sql: `INSERT INTO design_public.workflow_nodes (id, template_id, name, order_index, handler_ids, handler_mode, deadline_days, reminder_hours, fillable_fields)
              VALUES ('${nodeId}', '${tmplId}', '${String(n.name || "").replace(/'/g, "''")}', ${i},
                      ARRAY[${handlerIds.map((h: string) => "'" + h + "'").join(",")}],
                      '${n.handler_mode || "any_one"}', ${n.deadline_days || 2}, ${n.reminder_hours || 24},
                      ARRAY[${fillableFields.map((f: string) => "'" + f + "'").join(",")}])`,
    });
  }
}

function getPeriodLabel(date: Date, type: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  switch (type) {
    case "daily":
      return `${year}-${String(month).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    case "weekly": {
      const startOfYear = new Date(year, 0, 1);
      const diff = date.getTime() - startOfYear.getTime();
      const weekNum = Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${year}年第${weekNum}周`;
    }
    case "monthly":
      return `${year}年${month}月`;
    case "yearly":
      return `${year}年`;
    default:
      return `${year}年${month}月`;
  }
}

function calculateDueDate(
  date: Date,
  type: string,
  config?: Record<string, unknown>
): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (type) {
    case "monthly": {
      const dayOfMonth = config?.day_of_month ? Number(config.day_of_month) : 28;
      const dueDay = new Date(year, month + 1, dayOfMonth);
      return dueDay.toISOString().split("T")[0];
    }
    case "weekly": {
      const dayOfWeek = config?.day_of_week ? Number(config.day_of_week) : 5;
      const currentDay = date.getDay();
      const diff = dayOfWeek - currentDay;
      const dueDay = new Date(date);
      dueDay.setDate(dueDay.getDate() + (diff > 0 ? diff : diff + 7));
      return dueDay.toISOString().split("T")[0];
    }
    case "yearly": {
      const monthOfYear = config?.month_of_year ? Number(config.month_of_year) : 12;
      const dayOfMonth = config?.day_of_month ? Number(config.day_of_month) : 31;
      const dueDay = new Date(year, monthOfYear - 1, dayOfMonth);
      return dueDay.toISOString().split("T")[0];
    }
    case "daily":
      return date.toISOString().split("T")[0];
    default:
      return new Date(year, month + 1, 0).toISOString().split("T")[0];
  }
}
