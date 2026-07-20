import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const categoryType = searchParams.get("category_type");
    const keyword = searchParams.get("keyword");
    const isPinned = searchParams.get("is_pinned");
    const authorId = searchParams.get("author_id");
    const statusFilter = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "50");

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_posts",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = ((data as Record<string, unknown>[]) || []).filter(
      (item) => item.is_deleted !== true && item.is_enabled !== false
    );

    if (categoryId) items = items.filter((i) => i.category_id === categoryId);
    if (categoryType) {
      // categoryType maps to the categories table — resolve to category IDs
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
    if (isPinned === "true") items = items.filter((i) => i.is_pinned === true);
    if (authorId) items = items.filter((i) => i.created_by === authorId);
    if (statusFilter === "draft") items = items.filter((i) => i.status === "draft");
    else if (statusFilter === "published") items = items.filter((i) => i.status !== "draft");
    else items = items.filter((i) => i.status !== "draft"); // default: only published
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) =>
          String(i.title || "").toLowerCase().includes(kw) ||
          String(i.content || "").toLowerCase().includes(kw)
      );
    }

    // Sort: pinned first, then by created_at desc
    items.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
    });

    // Pagination
    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    // Attach attachments for each post (batch)
    const { data: allAtts } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_attachments",
    });
    const allAttachments = (allAtts as Record<string, unknown>[]) || [];
    const enriched = paged.map((post) => {
      const pid = String(post.id);
      // 列表页只返回内容前 500 字符摘要，减少传输和渲染压力
      const fullContent = String(post.content || "");
      const summary = fullContent.length > 500 ? fullContent.substring(0, 500) + "..." : fullContent;
      return {
        ...post,
        content: summary,
        _content_truncated: fullContent.length > 500,
        attachments: allAttachments.filter(
          (a) => String(a.post_id) === pid && a.is_deleted !== true
        ),
      };
    });

    return NextResponse.json({ data: enriched, total, page, page_size: pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attachments, ...postData } = body;

    const client = await createServerClient();

    // Generate share token
    const shareToken = randomUUID().replace(/-/g, "");

    // Normalize tags: convert array to comma-separated string
    if (Array.isArray(postData.tags)) {
      postData.tags = postData.tags.join(",");
    }

    const postPayload = {
      ...postData,
      version: 1,
      content_type: postData.content_type || "rich_text",
      share_token: shareToken,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "design_info_square.knowledge_posts",
      p_data: postPayload,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const post = (data as Record<string, unknown>[])?.[0] || data;
    const postId = (post as Record<string, unknown>)?.id as string;

    // Create initial version record
    await client.rpc("dp_insert", {
      p_table: "design_info_square.knowledge_versions",
      p_data: {
        post_id: postId,
        version: 1,
        title: postPayload.title,
        content: postPayload.content,
        content_type: postPayload.content_type,
        created_by: postPayload.created_by || postPayload.author_id,
        created_by_name: postPayload.created_by_name || postPayload.author_name,
      },
    });

    // Insert attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        await client.rpc("dp_insert", {
          p_table: "design_info_square.knowledge_attachments",
          p_data: {
            post_id: postId,
            file_name: att.file_name,
            file_url: att.file_url || att.file_path,
            file_size: att.file_size || 0,
            file_type: att.file_type,
            mime_type: att.mime_type,
            tags: Array.isArray(att.tags) ? att.tags.join(",") : att.tags || "",
            file_path: att.file_path || att.file_url,
          },
        });
      }
    }

    return NextResponse.json({ data: { ...(post as Record<string, unknown>), share_token: shareToken } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
