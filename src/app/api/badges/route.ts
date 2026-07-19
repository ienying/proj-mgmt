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

    // 计算信息广场未读角标 — 基于最后访问时间
    const { data: lastVisitRows } = await supabase.rpc("execute_sql", {
      p_sql: `SELECT last_visit_at FROM design_info_square.user_last_visit WHERE user_id = '${userId.replace(/'/g, "''")}'`,
    });
    const lastVisitAt = ((lastVisitRows as Array<Record<string,unknown>>)?.[0]?.last_visit_at as string) || "1970-01-01";
    const knowledgePostsResult = await supabase.rpc("execute_sql", {
      p_sql: `SELECT id FROM design_info_square.knowledge_posts WHERE is_deleted IS NOT TRUE AND is_enabled IS NOT FALSE AND created_at > '${lastVisitAt}'`,
    });
    const unreadPosts = (knowledgePostsResult.data || []) as any[];
    const unreadCount = unreadPosts.length;

    // 视频中心未读数
    const videoResult = await supabase.rpc("dp_select", { p_table: "video_center_videos" });
    const videoReadsResult = await supabase.rpc("dp_select", { p_table: "video_center_reads" });
    const videos = (videoResult.data || []) as any[];
    const videoReads = (videoReadsResult.data || []) as any[];
    const readVideoIds = new Set(
      videoReads.filter((r: any) => r.user_id === userId).map((r: any) => r.video_id)
    );
    const unreadVideos = videos.filter(
      (v: any) => !readVideoIds.has(v.id) && v.is_deleted !== true
    ).length;

    return NextResponse.json({
      data: {
        issues: issueCount + externalCount,
        messages: unreadCount,
        videos: unreadVideos,
      },
    });
  } catch (error) {
    console.error("获取角标数据失败:", error);
    return NextResponse.json({ error: "获取角标数据失败" }, { status: 500 });
  }
}
