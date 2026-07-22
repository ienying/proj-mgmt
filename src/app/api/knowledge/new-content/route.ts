import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * 检查自上次访问以来的新内容数量。
 * GET /api/knowledge/new-content?user_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "anonymous";

    const client = await createServerClient();

    // 获取用户上次访问时间
    const { data: visitRows } = await client.rpc("execute_sql", {
      p_sql: `SELECT last_visit_at FROM design_info_square.user_last_visit WHERE user_id = '${userId.replace(/'/g, "''")}'`,
    });
    const lastVisit = ((visitRows as Array<{ last_visit_at: string }>)?.[0])?.last_visit_at;

    // 获取所有知识帖子
    const { data: posts } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_posts",
    });
    const postList = (posts || []) as Array<Record<string, unknown>>;

    // 获取所有视频
    const { data: videos } = await client.rpc("dp_select", {
      p_table: "video_center.videos",
    });
    const videoList = (videos || []) as Array<Record<string, unknown>>;

    let newPostCount = 0;
    let newVideoCount = 0;
    const newPostIds: string[] = [];
    const newVideoIds: string[] = [];

    if (lastVisit) {
      const lastVisitDate = new Date(lastVisit);
      // 新帖子：创建时间 > 上次访问，且非草稿，未删除
      for (const p of postList) {
        if (p.status === "draft" || p.is_deleted) continue;
        const createdAt = p.created_at ? new Date(p.created_at as string) : null;
        const updatedAt = p.updated_at ? new Date(p.updated_at as string) : null;
        // 新创建 或 有新版本更新
        if ((createdAt && createdAt > lastVisitDate) || (updatedAt && updatedAt > lastVisitDate)) {
          newPostCount++;
          newPostIds.push(p.id as string);
        }
      }
      // 新视频
      for (const v of videoList) {
        if (v.is_deleted) continue;
        const createdAt = v.created_at ? new Date(v.created_at as string) : null;
        if (createdAt && createdAt > lastVisitDate) {
          newVideoCount++;
          newVideoIds.push(v.id as string);
        }
      }
    } else {
      // 首次访问：所有公开内容都是新的
      newPostCount = postList.filter((p) => p.status !== "draft" && !p.is_deleted).length;
      newVideoCount = videoList.filter((v) => !v.is_deleted).length;
      for (const p of postList) {
        if (p.status !== "draft" && !p.is_deleted) newPostIds.push(p.id as string);
      }
      for (const v of videoList) {
        if (!v.is_deleted) newVideoIds.push(v.id as string);
      }
    }

    return NextResponse.json({
      data: {
        new_post_count: newPostCount,
        new_video_count: newVideoCount,
        new_post_ids: newPostIds,
        new_video_ids: newVideoIds,
        last_visit: lastVisit || null,
      },
    });
  } catch (err) {
    console.error("new-content error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
