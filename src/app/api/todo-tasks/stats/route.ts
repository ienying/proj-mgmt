import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/todo-tasks/stats?assignee_id=xxx&project_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assignee_id");
    const projectId = searchParams.get("project_id");

    // 获取所有实例
    const { data: instances, error } = await client.rpc("dp_select", {
      p_table: "todo_task_instances",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = (instances || []) as Record<string, unknown>[];

    if (assigneeId) {
      items = items.filter((r) => String(r.assignee_id) === assigneeId);
    }
    if (projectId) {
      items = items.filter((r) => String(r.project_id) === projectId);
    }

    // 概览统计
    const total = items.length;
    const completed = items.filter((r) => String(r.status) === "completed").length;
    const inProgress = items.filter((r) => String(r.status) === "in_progress").length;
    const overdue = items.filter((r) => String(r.status) === "overdue").length;
    const pending = items.filter((r) => String(r.status) === "pending").length;
    const lateCompleted = items.filter((r) => String(r.status) === "completed" && r.is_late === true).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 按人员统计
    const byAssignee: Record<string, { name: string; total: number; completed: number; overdue: number; late: number; rate: number }> = {};
    for (const item of items) {
      const aid = String(item.assignee_id || "unknown");
      if (!byAssignee[aid]) {
        byAssignee[aid] = {
          name: String(item.assignee_name || "未知"),
          total: 0,
          completed: 0,
          overdue: 0,
          late: 0,
          rate: 0,
        };
      }
      byAssignee[aid].total++;
      if (String(item.status) === "completed") byAssignee[aid].completed++;
      if (String(item.status) === "overdue") byAssignee[aid].overdue++;
      if (item.is_late === true) byAssignee[aid].late++;
    }
    for (const key of Object.keys(byAssignee)) {
      const a = byAssignee[key];
      a.rate = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
    }

    // 按项目统计
    const byProject: Record<string, { name: string; total: number; completed: number; overdue: number; rate: number }> = {};
    for (const item of items) {
      const pid = String(item.project_id || "none");
      if (!byProject[pid]) {
        byProject[pid] = {
          name: String(item.project_name || "个人待办"),
          total: 0,
          completed: 0,
          overdue: 0,
          rate: 0,
        };
      }
      byProject[pid].total++;
      if (String(item.status) === "completed") byProject[pid].completed++;
      if (String(item.status) === "overdue") byProject[pid].overdue++;
    }
    for (const key of Object.keys(byProject)) {
      const p = byProject[key];
      p.rate = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
    }

    // 按任务定义统计
    const { data: defs } = await client.rpc("dp_select", {
      p_table: "todo_task_defs",
    });
    const defMap = new Map<string, string>();
    if (defs) {
      for (const d of defs as Record<string, unknown>[]) {
        defMap.set(String(d.id), String(d.title));
      }
    }

    const byTask: Record<string, { title: string; total: number; completed: number; overdue: number; rate: number }> = {};
    for (const item of items) {
      const did = String(item.definition_id);
      if (!byTask[did]) {
        byTask[did] = {
          title: defMap.get(did) || "未知任务",
          total: 0,
          completed: 0,
          overdue: 0,
          rate: 0,
        };
      }
      byTask[did].total++;
      if (String(item.status) === "completed") byTask[did].completed++;
      if (String(item.status) === "overdue") byTask[did].overdue++;
    }
    for (const key of Object.keys(byTask)) {
      const t = byTask[key];
      t.rate = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
    }

    return NextResponse.json({
      data: {
        overview: { total, completed, inProgress, overdue, pending, lateCompleted, completionRate },
        byAssignee: Object.values(byAssignee).sort((a, b) => b.rate - a.rate),
        byProject: Object.values(byProject).sort((a, b) => b.rate - a.rate),
        byTask: Object.values(byTask).sort((a, b) => b.rate - a.rate),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
