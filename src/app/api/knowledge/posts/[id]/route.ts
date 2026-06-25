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

    // Update post with new data + incremented version
    const updatePayload = {
      ...postData,
      version: newVersion,
      updated_at: new Date().toISOString(),
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
