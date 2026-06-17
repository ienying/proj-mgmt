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
    const issues: any[] = issueResult.data || [];
    const issueCount = issues.filter(
      (i: any) => i.handler_id === userId && (i.status === "pending" || i.status === "accepted" || i.status === "processing")
    ).length;

    // 计算信息广场未读角标
    // 先查所有帖子，再减去已读
    const knowledgePostsResult = await supabase.rpc("dp_select", { p_table: "design_info_square.knowledge_posts" });
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
        issues: issueCount,
        messages: unreadCount,
      },
    });
  } catch (error) {
    console.error("获取角标数据失败:", error);
    return NextResponse.json({ error: "获取角标数据失败" }, { status: 500 });
  }
}
