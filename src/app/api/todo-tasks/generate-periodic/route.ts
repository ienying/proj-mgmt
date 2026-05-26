import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// POST /api/todo-tasks/generate-periodic
// 手动触发周期任务实例生成（也可定时调用）
export async function POST() {
  try {
    const client = await createServerClient();

    // 获取所有启用的周期任务定义
    const { data: defs, error } = await client.rpc("dp_select", {
      p_table: "todo_task_defs",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const periodicDefs = ((defs || []) as Record<string, unknown>[]).filter(
      (d) => d.is_enabled === true && String(d.task_type) === "periodic"
    );

    if (periodicDefs.length === 0) {
      return NextResponse.json({ data: { generated: 0, message: "没有启用的周期任务" } });
    }

    // 获取所有已有实例
    const { data: existingInstances } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });
    const instanceList = (existingInstances || []) as Record<string, unknown>[];

    // 获取项目信息和用户信息
    const { data: projects } = await client.rpc("dp_select", { p_table: "projects" });
    const projectMap = new Map<string, Record<string, unknown>>();
    if (projects) {
      for (const p of projects as Record<string, unknown>[]) {
        projectMap.set(String(p.id), p);
      }
    }

    const { data: users } = await client.rpc("dp_select", { p_table: "users" });
    const userMap = new Map<string, Record<string, unknown>>();
    if (users) {
      for (const u of users as Record<string, unknown>[]) {
        userMap.set(String(u.id), u);
      }
    }

    const { data: members } = await client.rpc("dp_select", { p_table: "project_members" });
    const memberMap = new Map<string, string>();
    if (members) {
      for (const m of members as Record<string, unknown>[]) {
        if (String(m.role_type) === "project_manager" && m.project_id) {
          memberMap.set(String(m.project_id), String(m.user_id));
        }
      }
    }

    let generated = 0;
    const now = new Date();

    for (const def of periodicDefs) {
      const defId = String(def.id);
      const title = String(def.title);
      const periodicType = String(def.periodic_type || "monthly");
      const periodicConfig = (def.periodic_config || {}) as Record<string, unknown>;
      const deadlineConfig = (def.deadline_config || {}) as Record<string, unknown>;
      const assigneeIds = (def.assignee_ids || []) as string[];
      const projectIds = (def.project_ids || []) as string[];

      const periodLabel = getPeriodLabel(now, periodicType);

      // 检查当前周期是否已有实例
      const hasExisting = instanceList.some(
        (inst) =>
          String(inst.definition_id) === defId &&
          String(inst.period_label) === periodLabel
      );

      if (hasExisting) continue;

      const dueDate = calculateDueDate(now, periodicType, periodicConfig, deadlineConfig);

      // 生成实例
      if (projectIds && projectIds.length > 0) {
        for (const projectId of projectIds) {
          const project = projectMap.get(projectId);
          const projectName = project ? String(project.project_name) : "";
          const managerId = memberMap.get(projectId);
          const assigneeId = managerId || (assigneeIds.length > 0 ? assigneeIds[0] : null);
          if (!assigneeId) continue;

          const user = userMap.get(assigneeId);
          const assigneeName = user ? String(user.name) : "";

          await client.rpc("dp_insert", {
            p_table: "todo_task_instances",
            p_data: {
              definition_id: defId,
              title: `${periodLabel} ${title}`,
              assignee_id: assigneeId,
              assignee_name: assigneeName,
              project_id: projectId,
              project_name: projectName,
              status: "pending",
              due_date: dueDate,
              period_label: periodLabel,
              is_late: false,
            },
          });

          generated++;
        }
      } else if (assigneeIds && assigneeIds.length > 0) {
        for (const assigneeId of assigneeIds) {
          const user = userMap.get(assigneeId);
          const assigneeName = user ? String(user.name) : "";

          await client.rpc("dp_insert", {
            p_table: "todo_task_instances",
            p_data: {
              definition_id: defId,
              title: `${periodLabel} ${title}`,
              assignee_id: assigneeId,
              assignee_name: assigneeName,
              project_id: null,
              project_name: null,
              status: "pending",
              due_date: dueDate,
              period_label: periodLabel,
              is_late: false,
            },
          });

          generated++;
        }
      }
    }

    // 同时检查逾期状态
    await checkOverdue(client);

    return NextResponse.json({ data: { generated, message: `生成了 ${generated} 个任务实例` } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate periodic tasks";
    return NextResponse.json({ error: message }, { status: 500 });
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
  periodicType: string,
  periodicConfig: Record<string, unknown>,
  deadlineConfig: Record<string, unknown>
): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (periodicType) {
    case "monthly": {
      const dayOfMonth = periodicConfig.day_of_month ? Number(periodicConfig.day_of_month) : 28;
      const dueDay = new Date(year, month + 1, dayOfMonth);
      return dueDay.toISOString().split("T")[0];
    }
    case "weekly": {
      const dayOfWeek = periodicConfig.day_of_week ? Number(periodicConfig.day_of_week) : 5;
      const currentDay = date.getDay();
      const diff = dayOfWeek - currentDay;
      const dueDay = new Date(date);
      dueDay.setDate(dueDay.getDate() + (diff > 0 ? diff : diff + 7));
      return dueDay.toISOString().split("T")[0];
    }
    case "yearly": {
      const monthOfYear = periodicConfig.month_of_year ? Number(periodicConfig.month_of_year) : 12;
      const dayOfMonth = periodicConfig.day_of_month ? Number(periodicConfig.day_of_month) : 31;
      const dueDay = new Date(year, monthOfYear - 1, dayOfMonth);
      return dueDay.toISOString().split("T")[0];
    }
    case "daily":
      return date.toISOString().split("T")[0];
    default:
      return new Date(year, month + 1, 0).toISOString().split("T")[0];
  }
}

async function checkOverdue(
  client: Awaited<ReturnType<typeof createServerClient>>
) {
  const { data: instances } = await client.rpc("dp_select", {
    p_table: "todo_task_instances",
  });

  if (!instances) return;

  const today = new Date().toISOString().split("T")[0];

  for (const inst of instances as Record<string, unknown>[]) {
    if (
      (String(inst.status) === "pending" || String(inst.status) === "in_progress") &&
      inst.due_date &&
      String(inst.due_date) < today
    ) {
      await client.rpc("dp_update", {
        p_table: "todo_task_instances",
        p_id: String(inst.id),
        p_data: { status: "overdue" },
      });
    }
  }
}
