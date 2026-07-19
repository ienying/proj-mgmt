import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json().catch(() => ({}));
    const userId = body.user_id || "anonymous";
    const now = new Date().toISOString();

    // 获取所有帖子
    const { data: posts } = await client.rpc("dp_select", { p_table: "design_info_square.knowledge_posts" });
    const allPosts = (posts as Array<Record<string, unknown>>) || [];

    // 获取该用户已有的读记录
    const { data: existingReads } = await client.rpc("dp_select", { p_table: "design_info_square.knowledge_reads" });
    const reads = (existingReads as Array<Record<string, unknown>>) || [];
    const readPostIds = new Set(reads.filter(r => r.user_id === userId).map(r => r.post_id));

    // 为未读帖子创建读记录
    let count = 0;
    for (const post of allPosts) {
      if (!readPostIds.has(post.id) && post.is_deleted !== true) {
        await client.rpc("dp_insert", {
          p_table: "design_info_square.knowledge_reads",
          p_data: { post_id: post.id, user_id: userId, read_at: now },
        });
        count++;
      }
    }

    return NextResponse.json({ data: { marked: count } });
  } catch (e) {
    return NextResponse.json({ data: { marked: 0 } });
  }
}
