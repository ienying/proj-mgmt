import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET() {
  try {
    const client = await createServerClient();

    // Load all data
    const [postsRes, catsRes, readsRes, dlsRes] = await Promise.all([
      client.rpc("dp_select", { p_table: "design_info_square.knowledge_posts" }),
      client.rpc("dp_select", { p_table: "design_info_square.knowledge_categories" }),
      client.rpc("dp_select", { p_table: "design_info_square.knowledge_reads" }),
      client.rpc("dp_select", { p_table: "design_info_square.knowledge_downloads" }),
    ]);

    const posts = ((postsRes.data as Record<string, unknown>[]) || []).filter(
      (p) => p.is_deleted !== true && p.is_enabled !== false
    );
    const categories = (catsRes.data as Record<string, unknown>[]) || [];
    const reads = (readsRes.data as Record<string, unknown>[]) || [];
    const downloads = (dlsRes.data as Record<string, unknown>[]) || [];

    const stats: Record<string, {
      category_name: string;
      category_type: string;
      post_count: number;
      view_count: number;
      like_count: number;
      comment_count: number;
      download_count: number;
      contributor_count: number;
      latest_post_at: string | null;
    }> = {};

    // Initialize stats per category type
    const typeMap: Record<string, string> = {};
    for (const cat of categories) {
      const type = String(cat.category_type || "");
      typeMap[String(cat.id)] = type;
      if (!stats[type]) {
        stats[type] = {
          category_name: String(cat.name || ""),
          category_type: type,
          post_count: 0,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          download_count: 0,
          contributor_count: 0,
          latest_post_at: null,
        };
      }
    }

    // Aggregate post stats
    const contributors = new Set<string>();
    const contribByType: Record<string, Set<string>> = {};

    for (const post of posts) {
      const catId = String(post.category_id || "");
      const type = typeMap[catId] || "unknown";
      if (!stats[type]) continue;

      stats[type].post_count++;
      stats[type].view_count += (post.view_count as number) || 0;
      stats[type].like_count += (post.like_count as number) || 0;
      stats[type].comment_count += (post.comment_count as number) || 0;

      const author = String(post.created_by || "");
      if (author) {
        contributors.add(author);
        if (!contribByType[type]) contribByType[type] = new Set();
        contribByType[type].add(author);
      }

      const createdAt = String(post.created_at || "");
      if (createdAt && (!stats[type].latest_post_at || createdAt > stats[type].latest_post_at!)) {
        stats[type].latest_post_at = createdAt;
      }
    }

    // Count contributors per type
    for (const type of Object.keys(contribByType)) {
      if (stats[type]) stats[type].contributor_count = contribByType[type].size;
    }

    // Aggregate downloads per category type
    for (const dl of downloads) {
      const postId = String(dl.post_id || "");
      const post = posts.find((p) => String(p.id) === postId);
      if (!post) continue;
      const type = typeMap[String(post.category_id || "")] || "unknown";
      if (stats[type]) stats[type].download_count++;
    }

    // Aggregate reads per category type
    for (const read of reads) {
      const postId = String(read.post_id || "");
      const post = posts.find((p) => String(p.id) === postId);
      if (!post) continue;
      const type = typeMap[String(post.category_id || "")] || "unknown";
      // reads already counted via view_count; add unique reader tracking if needed
    }

    const result = Object.values(stats).sort((a, b) => b.post_count - a.post_count);

    return NextResponse.json({
      data: {
        categories: result,
        total_posts: posts.length,
        total_views: result.reduce((s, c) => s + c.view_count, 0),
        total_likes: result.reduce((s, c) => s + c.like_count, 0),
        total_comments: result.reduce((s, c) => s + c.comment_count, 0),
        total_downloads: result.reduce((s, c) => s + c.download_count, 0),
        total_contributors: contributors.size,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
