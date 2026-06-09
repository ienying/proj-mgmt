import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    const client = await createServerClient();

    const u = userId.replace(/'/g, "''");

    // Count pending + in_progress instances assigned to current user
    const { data: myTodos } = await client.rpc("execute_sql", {
      p_sql: `SELECT COUNT(*) as cnt FROM public.task_center_instances WHERE assignee_id = '${u}' AND status IN ('pending', 'in_progress')`,
    });

    // Count total instances published by current user (via defs)
    const { data: myPublished } = await client.rpc("execute_sql", {
      p_sql: `SELECT COUNT(*) as cnt FROM public.task_center_defs WHERE created_by = '${u}' AND status = 'active'`,
    });

    // Count returned tasks for current user
    const { data: returned } = await client.rpc("execute_sql", {
      p_sql: `SELECT COUNT(*) as cnt FROM public.task_center_instances i JOIN public.task_center_defs d ON i.def_id = d.id WHERE d.created_by = '${u}' AND i.status = 'returned'`,
    });

    const todoCount = (myTodos as any[])?.[0]?.cnt ? Number((myTodos as any[])[0].cnt) : 0;
    const publishedCount = (myPublished as any[])?.[0]?.cnt ? Number((myPublished as any[])[0].cnt) : 0;
    const returnedCount = (returned as any[])?.[0]?.cnt ? Number((returned as any[])[0].cnt) : 0;

    return NextResponse.json({
      data: {
        tasks: todoCount,
        published: publishedCount,
        returned: returnedCount,
      },
    });
  } catch (error) {
    console.error("获取任务统计数据失败:", error);
    return NextResponse.json({ error: "获取任务统计数据失败" }, { status: 500 });
  }
}
