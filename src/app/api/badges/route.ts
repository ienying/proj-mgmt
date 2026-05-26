import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 并行查询各模块角标数据
    const [
      todoTaskResult,
      issueResult,
      knowledgeResult,
    ] = await Promise.all([
      // 待办任务：我的待办中未完成的实例数
      supabase.rpc("dp_select", { p_table: "todo_task_instances" }),
      // 工单：分配给我的待受理+处理中的工单数
      supabase.rpc("dp_select", { p_table: "issue_mgmt_issues" }),
      // 信息广场：未读帖子数
      supabase.rpc("dp_select", { p_table: "knowledge_reads" }),
    ]);

    // 计算待办任务角标
    const taskInstances: any[] = todoTaskResult.data || [];
    const todoCount = taskInstances.filter(
      (i: any) => i.assignee_id === userId && (i.status === "pending" || i.status === "in_progress" || i.status === "in_progress_late")
    ).length;

    // 计算工单角标
    const issues: any[] = issueResult.data || [];
    const issueCount = issues.filter(
      (i: any) => i.handler_id === userId && (i.status === "pending" || i.status === "accepted" || i.status === "processing")
    ).length;

    // 计算信息广场未读角标
    // 先查所有帖子，再减去已读
    const knowledgePostsResult = await supabase.rpc("dp_select", { p_table: "knowledge_posts" });
    const posts: any[] = knowledgePostsResult.data || [];
    const reads: any[] = knowledgeResult.data || [];
    const readPostIds = new Set(
      reads.filter((r: any) => r.user_id === userId).map((r: any) => r.post_id)
    );
    const unreadCount = posts.filter(
      (p: any) => !readPostIds.has(p.id) && p.post_type === "announcement"
    ).length;

    return NextResponse.json({
      data: {
        todos: todoCount,
        issues: issueCount,
        messages: unreadCount,
      },
    });
  } catch (error) {
    console.error("获取角标数据失败:", error);
    return NextResponse.json({ error: "获取角标数据失败" }, { status: 500 });
  }
}
