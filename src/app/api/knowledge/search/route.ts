import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// Parse tags from any storage format (same logic as tag-utils.ts but inlined for API)
function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === "string") {
    const s = tags.trim();
    if (!s) return [];
    try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean); } catch {}
    if (s.startsWith("{") && s.endsWith("}")) return s.slice(1, -1).split(",").map(t => t.trim()).filter(Boolean);
    return s.split(",").map(t => t.trim()).filter(Boolean);
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || "";
    const categoryId = searchParams.get("category_id");
    const categoryType = searchParams.get("category_type");
    const tag = searchParams.get("tag") || "";

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_posts",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = ((data as Record<string, unknown>[]) || []).filter(
      (i) => i.is_deleted !== true && i.is_enabled !== false
    );

    if (categoryId) items = items.filter((i) => i.category_id === categoryId);

    if (categoryType) {
      const { data: cats } = await client.rpc("dp_select", {
        p_table: "design_info_square.knowledge_categories",
      });
      const catList = (cats as Record<string, unknown>[]) || [];
      const matchingIds = new Set(
        catList
          .filter((c) => c.category_type === categoryType)
          .map((c) => String(c.id))
      );
      items = items.filter((i) => matchingIds.has(String(i.category_id || "")));
    }

    // Filter by post tag
    if (tag) {
      items = items.filter((i) => {
        const postTags = parseTags(i.tags);
        return postTags.some((t) => t === tag);
      });
    }

    // Search across title, content, and attachment file names
    if (keyword) {
      const { data: attData } = await client.rpc("dp_select", {
        p_table: "design_info_square.knowledge_attachments",
      });
      const allAtts = (attData as Record<string, unknown>[]) || [];
      const kw = keyword.toLowerCase();

      items = items.filter((i) => {
        const titleMatch = String(i.title || "").toLowerCase().includes(kw);
        const contentMatch = String(i.content || "").toLowerCase().includes(kw);
        const postId = String(i.id);
        const attachmentMatch = allAtts.some(
          (a) =>
            String(a.post_id) === postId &&
            a.is_deleted !== true &&
            String(a.file_name || "").toLowerCase().includes(kw)
        );
        return titleMatch || contentMatch || attachmentMatch;
      });
    }

    items.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
    });

    // Attach attachments
    const { data: allAtts2 } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_attachments",
    });
    const allAttachments = (allAtts2 as Record<string, unknown>[]) || [];
    const enriched = items.map((post) => {
      const pid = String(post.id);
      return {
        ...post,
        attachments: allAttachments.filter(
          (a) => String(a.post_id) === pid && a.is_deleted !== true
        ),
      };
    });

    // 同时搜索视频
    let videoResults: Array<Record<string, unknown>> = [];
    if (keyword) {
      try {
        const { data: videoData } = await client.rpc("dp_select", { p_table: "video_center_videos" });
        const videos = ((videoData as Record<string, unknown>[]) || []).filter(v => v.is_deleted !== true);
        const kw2 = keyword.toLowerCase();
        videoResults = videos.filter(v =>
          String(v.title || "").toLowerCase().includes(kw2) ||
          String(v.file_name || "").toLowerCase().includes(kw2) ||
          String(v.tags || "").toLowerCase().includes(kw2) ||
          String(v.description || "").toLowerCase().includes(kw2)
        ).map(v => ({ ...v, _type: "video" }));
      } catch {}
    }

    // 合并：帖子在前，视频在后
    const allResults: Array<Record<string, unknown>> = [
      ...enriched.map(p => ({ ...p, _type: "post" })),
      ...videoResults,
    ];

    return NextResponse.json({ data: allResults, total: allResults.length, videoCount: videoResults.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
