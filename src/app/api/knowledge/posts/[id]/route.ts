import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { deleteFile } from "@/storage/local-filesystem";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();

    const { data: postData, error } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const post = postData as Record<string, unknown> | null;
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get attachments
    const { data: attData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_attachments",
    });
    const attachments = ((attData as Record<string, unknown>[]) || []).filter(
      (a) => String(a.post_id) === id && a.is_deleted !== true
    );

    // Get versions
    const { data: verData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_versions",
    });
    const versions = ((verData as Record<string, unknown>[]) || [])
      .filter((v) => String(v.post_id) === id)
      .sort((a, b) => (b.version as number) - (a.version as number));

    // Get download counts per attachment
    const { data: dlData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_downloads",
    });
    const allDownloads = (dlData as Record<string, unknown>[]) || [];
    const attachmentsWithDownloads = attachments.map((att) => {
      const downloads = allDownloads.filter(
        (d) => String(d.attachment_id) === String(att.id)
      );
      return { ...att, download_count: downloads.length, downloads };
    });

    // Get reads
    const { data: readData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_reads",
    });
    const reads = ((readData as Record<string, unknown>[]) || []).filter(
      (r) => String(r.post_id) === id
    );

    // Get comments
    const { data: commentData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_comments",
    });
    const comments = ((commentData as Record<string, unknown>[]) || [])
      .filter((c) => String(c.post_id) === id)
      .sort(
        (a, b) =>
          new Date(String(a.created_at)).getTime() -
          new Date(String(b.created_at)).getTime()
      );

    return NextResponse.json({
      data: {
        post,
        attachments: attachmentsWithDownloads,
        versions,
        reads,
        comments,
        _readCount: reads.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { attachments, ...postData } = body;

    const client = await createServerClient();

    // Get current post to determine new version
    const { data: current } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
    });
    const currentPost = current as Record<string, unknown> | null;
    if (!currentPost) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const oldVersion = (currentPost.version as number) || 1;
    const newVersion = oldVersion + 1;

    // Save current version to history
    await client.rpc("dp_insert", {
      p_table: "design_info_square.knowledge_versions",
      p_data: {
        post_id: id,
        version: oldVersion,
        title: currentPost.title,
        content: currentPost.content,
        content_type: currentPost.content_type || "rich_text",
        created_by: currentPost.created_by,
        created_by_name: currentPost.created_by_name,
      },
    });

    // Normalize tags: convert array to comma-separated string
    if (Array.isArray(postData.tags)) {
      postData.tags = postData.tags.join(",");
    }

    // Markdown → HTML 预渲染
    let contentHtml = null;
    if (postData.content_type === "markdown" && postData.content) {
      const md = postData.content as string;
      const lines = md.split("\n");
      const html: string[] = [];
      let inBlock = false, inList = false, i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.trim().startsWith("```")) { inBlock ? (html.push("</code></pre>"), inBlock=false) : (html.push("<pre class='bg-gray-100 rounded-lg p-4 overflow-x-auto my-3'><code>"), inBlock=true); i++; continue; }
        if (inBlock) { html.push(line+"\n"); i++; continue; }
        if (!line.trim()) { if(inList){html.push("</ul>");inList=false;} i++; continue; }
        const h4=line.match(/^#### (.+)/); if(h4){if(inList){html.push("</ul>");inList=false;}html.push(`<h4 class="text-base font-semibold mt-5 mb-2 text-gray-800" id="${h4[1].replace(/\s+/g,'-').slice(0,30)}">${h4[1]}</h4>`);i++;continue;}
        const h3=line.match(/^### (.+)/); if(h3){if(inList){html.push("</ul>");inList=false;}html.push(`<h3 class="text-lg font-bold mt-6 mb-2 text-gray-900" id="${h3[1].replace(/\s+/g,'-').slice(0,30)}">${h3[1]}</h3>`);i++;continue;}
        const h2=line.match(/^## (.+)/); if(h2){if(inList){html.push("</ul>");inList=false;}html.push(`<h2 class="text-xl font-bold mt-6 mb-3 text-gray-900 border-b pb-2" id="${h2[1].replace(/\s+/g,'-').slice(0,30)}">${h2[1]}</h2>`);i++;continue;}
        const h1=line.match(/^# (.+)/); if(h1){if(inList){html.push("</ul>");inList=false;}html.push(`<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-900" id="${h1[1].replace(/\s+/g,'-').slice(0,30)}">${h1[1]}</h1>`);i++;continue;}
        const ul=line.match(/^- (.+)/); if(ul){if(!inList){html.push("<ul class='list-disc pl-5 my-2 space-y-1'>");inList=true;}html.push(`<li class='text-gray-700'>${ul[1]}</li>`);i++;continue;}
        if(/^---+$/.test(line.trim())){if(inList){html.push("</ul>");inList=false;}html.push("<hr class='my-4 border-gray-200'>");i++;continue;}
        const bq=line.match(/^> (.+)/); if(bq){if(inList){html.push("</ul>");inList=false;}html.push(`<blockquote class='border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic'>${bq[1]}</blockquote>`);i++;continue;}
        if(inList){html.push("</ul>");inList=false;}
        const p=line.replace(/\!\[([^\]]*)\]\(([^)]+)\)/g,`<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />`).replace(/\[([^\]]+)\]\(([^)]+)\)/g,`<a href="$2" target="_blank" class="text-indigo-600 hover:underline">$1</a>`).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code class='bg-gray-100 px-1.5 py-0.5 rounded text-sm text-pink-600'>$1</code>").replace(/\*(.+?)\*/g,"<em>$1</em>");
        html.push(`<p class="my-1.5 text-gray-700 leading-relaxed">${p}</p>`); i++;
      }
      if(inList)html.push("</ul>");
      if(inBlock)html.push("</code></pre>");
      contentHtml = html.join("\n");
    }

    // Update post with new data + incremented version
    const updatePayload = {
      ...postData,
      version: newVersion,
      updated_at: new Date().toISOString(),
      content_html: contentHtml,
    };

    const { data, error } = await client.rpc("dp_update", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
      p_data: updatePayload,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Save new version record
    await client.rpc("dp_insert", {
      p_table: "design_info_square.knowledge_versions",
      p_data: {
        post_id: id,
        version: newVersion,
        title: postData.title || currentPost.title,
        content: postData.content || currentPost.content,
        content_type: postData.content_type || currentPost.content_type || "rich_text",
        change_summary: postData.change_summary || "",
        created_by: postData.created_by || currentPost.created_by,
        created_by_name: postData.created_by_name || currentPost.created_by_name,
      },
    });

    // Handle attachment updates
    if (attachments && Array.isArray(attachments)) {
      // Mark existing attachments as deleted
      const { data: existingAtts } = await client.rpc("dp_select", {
        p_table: "design_info_square.knowledge_attachments",
      });
      const existing = ((existingAtts as Record<string, unknown>[]) || []).filter(
        (a) => String(a.post_id) === id && a.is_deleted !== true
      );
      for (const att of existing) {
        await client.rpc("dp_update", {
          p_table: "design_info_square.knowledge_attachments",
          p_id: String(att.id),
          p_data: { is_deleted: true },
        });
      }

      // Insert new attachments
      for (const att of attachments) {
        await client.rpc("dp_insert", {
          p_table: "design_info_square.knowledge_attachments",
          p_data: {
            post_id: id,
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

    return NextResponse.json({ data: { ...(data as Record<string, unknown>), version: newVersion } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";
    const userId = searchParams.get("user_id");
    const userRole = searchParams.get("user_role");

    const client = await createServerClient();

    // Get the post
    const { data: postData } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
    });
    const post = postData as Record<string, unknown> | null;
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (hard) {
      // Hard delete: only super_admin or the post author
      const isAuthor = String(post.created_by || "") === String(userId || "");
      const isSuperAdmin = userRole === "super_admin";
      if (!isAuthor && !isSuperAdmin) {
        return NextResponse.json({ error: "无权限进行硬删除" }, { status: 403 });
      }

      // Delete attachment files from disk
      const { data: attData } = await client.rpc("dp_select", {
        p_table: "design_info_square.knowledge_attachments",
      });
      const attachments = ((attData as Record<string, unknown>[]) || []).filter(
        (a) => String(a.post_id) === id
      );
      for (const att of attachments) {
        const fp = att.file_path as string;
        if (fp) {
          try {
            await deleteFile(fp);
          } catch { /* file might not exist */ }
        }
      }

      // Delete associated records
      const tables = [
        "design_info_square.knowledge_attachments",
        "design_info_square.knowledge_versions",
        "design_info_square.knowledge_comments",
        "design_info_square.knowledge_likes",
        "design_info_square.knowledge_reads",
        "design_info_square.knowledge_downloads",
        "design_info_square.knowledge_posts",
      ];
      for (const table of tables) {
        // Delete all records associated with this post
        // For the main post we delete by id; for others we need to select first then delete
        if (table === "design_info_square.knowledge_posts") {
          await client.rpc("dp_delete", { p_table: table, p_id: id });
        } else {
          const { data: records } = await client.rpc("dp_select", { p_table: table });
          const related = ((records as Record<string, unknown>[]) || []).filter(
            (r) => String(r.post_id) === id
          );
          for (const rec of related) {
            await client.rpc("dp_delete", {
              p_table: table,
              p_id: String(rec.id),
            });
          }
        }
      }

      return NextResponse.json({ data: { deleted: true, hard: true } });
    }

    // Soft delete
    const { error } = await client.rpc("dp_update", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
      p_data: {
        is_deleted: true,
        deleted_by: userId,
        deleted_at: new Date().toISOString(),
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: { deleted: true, hard: false } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
