import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { randomUUID } from "crypto";

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
    const categoryId = searchParams.get("category_id");
    const categoryType = searchParams.get("category_type");
    const keyword = searchParams.get("keyword");
    const isPinned = searchParams.get("is_pinned");
    const authorId = searchParams.get("author_id");
    const statusFilter = searchParams.get("status");
    const tag = searchParams.get("tag") || "";
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
    if (tag) {
      items = items.filter((i) => {
        const postTags = parseTags(i.tags);
        return postTags.some((t: string) => t === tag);
      });
    }
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
      return {
        ...post,
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

    // Markdown → HTML 预渲染（方案 A：发布时转换，查看时零解析）
    let contentHtml = null;
    if (postData.content_type === "markdown" && postData.content) {
      const md = postData.content as string;
      const lines = md.split("\n");
      const html: string[] = [];
      let inCodeBlock = false;
      let inList = false;
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        // 代码块
        if (line.trim().startsWith("```")) {
          if (inCodeBlock) { html.push("</code></pre>"); inCodeBlock = false; }
          else { html.push("<pre class='bg-gray-100 rounded-lg p-4 overflow-x-auto my-3'><code>"); inCodeBlock = true; }
          i++; continue;
        }
        if (inCodeBlock) { html.push(line + "\n"); i++; continue; }
        // 空行
        if (!line.trim()) { if (inList) { html.push("</ul>"); inList = false; } i++; continue; }
        // 标题
        const h4 = line.match(/^#### (.+)/);
        if (h4) { if (inList) { html.push("</ul>"); inList = false; } html.push(`<h4 class="text-base font-semibold mt-5 mb-2 text-gray-800" id="${h4[1].replace(/\s+/g,"-").slice(0,30)}">${h4[1]}</h4>`); i++; continue; }
        const h3 = line.match(/^### (.+)/);
        if (h3) { if (inList) { html.push("</ul>"); inList = false; } html.push(`<h3 class="text-lg font-bold mt-6 mb-2 text-gray-900" id="${h3[1].replace(/\s+/g,"-").slice(0,30)}">${h3[1]}</h3>`); i++; continue; }
        const h2 = line.match(/^## (.+)/);
        if (h2) { if (inList) { html.push("</ul>"); inList = false; } html.push(`<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900 border-b pb-2" id="${h2[1].replace(/\s+/g,"-").slice(0,30)}">${h2[1]}</h2>`); i++; continue; }
        const h1 = line.match(/^# (.+)/);
        if (h1) { if (inList) { html.push("</ul>"); inList = false; } html.push(`<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900" id="${h1[1].replace(/\s+/g,"-").slice(0,30)}">${h1[1]}</h1>`); i++; continue; }
        // 无序列表
        const ul = line.match(/^- (.+)/);
        if (ul) { if (!inList) { html.push("<ul class='list-disc pl-5 my-2 space-y-1'>"); inList = true; } html.push(`<li class='text-gray-700'>${ul[1]}</li>`); i++; continue; }
        // 水平线
        if (/^---+$/.test(line.trim())) { if (inList) { html.push("</ul>"); inList = false; } html.push("<hr class='my-4 border-gray-200'>"); i++; continue; }
        // 引用
        const bq = line.match(/^> (.+)/);
        if (bq) { if (inList) { html.push("</ul>"); inList = false; } html.push(`<blockquote class='border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic'>${bq[1]}</blockquote>`); i++; continue; }
        // 普通段落
        if (inList) { html.push("</ul>"); inList = false; }
        const processed = line
          .replace(/\!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />`)
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" class="text-indigo-600 hover:underline">$1</a>`)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/`([^`]+)`/g, "<code class='bg-gray-100 px-1.5 py-0.5 rounded text-sm text-pink-600'>$1</code>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>");
        html.push(`<p class="my-1.5 text-gray-700 leading-relaxed">${processed}</p>`);
        i++;
      }
      if (inList) html.push("</ul>");
      if (inCodeBlock) html.push("</code></pre>");
      contentHtml = html.join("\n");
    }

    const postPayload = {
      ...postData,
      version: 1,
      content_type: postData.content_type || "rich_text",
      share_token: shareToken,
      content_html: contentHtml,
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
