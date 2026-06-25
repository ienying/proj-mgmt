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

    const issueResult = await supabase.rpc("dp_select", { p_table: "issue_mgmt_issues" });
    const knowledgeResult = await supabase.rpc("dp_select", { p_table: "design_info_square.knowledge_reads" });

    // 计算工单角标
    const issues = (issueResult.data || []) as any[];
    const issueCount = issues.filter(
      (i: any) => i.handler_id === userId && (i.status === "pending" || i.status === "accepted" || i.status === "processing")
    ).length;

    // 额外统计外部工单待办：source=external 且无 handler，当前用户是接收人之一
    const todoResult = await supabase.rpc("dp_select", { p_table: "todo_task_instances" });
    const todos = (todoResult.data || []) as any[];
    const userExternalTodos = todos.filter(
      (t: any) =>
        String(t.source_type) === "issue" &&
        String(t.assignee_id) === userId &&
        String(t.status) === "pending"
    );
    const userExternalSourceIds = new Set(userExternalTodos.map((t: any) => String(t.source_id)));
    const externalCount = issues.filter(
      (i: any) =>
        String(i.source) === "external" &&
        !i.handler_id &&
        userExternalSourceIds.has(String(i.id))
    ).length;

    // 计算信息广场未读角标
    // 先查所有帖子，再减去已读
    const knowledgePostsResult = await supabase.rpc("dp_select", { p_table: "design_info_square.knowledge_posts" });
    const posts = (knowledgePostsResult.data || []) as any[];
    const reads = (knowledgeResult.data || []) as any[];
    const readPostIds = new Set(
      reads.filter((r: any) => r.user_id === userId).map((r: any) => r.post_id)
    );
    const unreadCount = posts.filter(
      (p: any) => !readPostIds.has(p.id) && p.post_type === "announcement"
    ).length;

    return NextResponse.json({
      data: {
        issues: issueCount + externalCount,
        messages: unreadCount,
      },
    });
  } catch (error) {
    console.error("获取角标数据失败:", error);
    return NextResponse.json({ error: "获取角标数据失败" }, { status: 500 });
  }
}
