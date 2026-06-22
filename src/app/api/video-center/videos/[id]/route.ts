import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import fs from "fs";
import path from "path";

const VIDEO_DIR = path.join(process.cwd(), "data", "video-center", "videos");
const ATTACHMENT_DIR = path.join(process.cwd(), "data", "video-center", "attachments");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();

    const { data: videoData, error } = await client.rpc("dp_get_by_id", {
      p_table: "video_center.videos",
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!videoData) return NextResponse.json({ error: "视频不存在" }, { status: 404 });

    const video = videoData as Record<string, unknown>;

    // Increment view count
    await client.rpc("dp_update", {
      p_table: "video_center.videos",
      p_id: id,
      p_data: { view_count: ((video.view_count as number) || 0) + 1 },
    });

    // Get attachments
    const { data: atts } = await client.rpc("dp_select", {
      p_table: "video_center.attachments",
    });
    const attachments = ((atts as Record<string, unknown>[]) || []).filter(
      (a) => String(a.video_id) === id
    );

    // Get comments (threaded)
    const { data: comms } = await client.rpc("dp_select", {
      p_table: "video_center.comments",
    });
    const flatComments = ((comms as Record<string, unknown>[]) || [])
      .filter((c) => String(c.video_id) === id && c.is_deleted !== true)
      .sort(
        (a, b) =>
          new Date(String(a.created_at)).getTime() -
          new Date(String(b.created_at)).getTime()
      );

    const topLevel = flatComments.filter((c) => !c.parent_id);
    const replies = flatComments.filter((c) => !!c.parent_id);
    const comments = topLevel.map((c) => ({
      ...c,
      replies: replies.filter((r) => String(r.parent_id) === String(c.id)),
    }));

    return NextResponse.json({
      data: { ...video, attachments, comments, view_count: ((video.view_count as number) || 0) + 1 },
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
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_update", {
      p_table: "video_center.videos",
      p_id: id,
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
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
    const userId = searchParams.get("user_id");
    const userRole = searchParams.get("role");

    const client = await createServerClient();
    const { data: videoData } = await client.rpc("dp_get_by_id", {
      p_table: "video_center.videos",
      p_id: id,
    });
    if (!videoData) return NextResponse.json({ error: "视频不存在" }, { status: 404 });

    const video = videoData as Record<string, unknown>;
    const isCreator = userId && String(video.created_by) === userId;
    const isAdmin = userRole === "super_admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: "只有创建人和超级管理员可以删除" }, { status: 403 });
    }

    // Hard delete: remove video file from filesystem
    const filePath = String(video.file_path || "");
    if (filePath) {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), "data", "video-center", "videos", path.basename(filePath));
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch { /* file already gone */ }
    }

    // Delete attachments from filesystem
    const { data: atts } = await client.rpc("dp_select", {
      p_table: "video_center.attachments",
    });
    const attachments = ((atts as Record<string, unknown>[]) || []).filter(
      (a) => String(a.video_id) === id
    );
    for (const att of attachments) {
      const attPath = String(att.file_path || "");
      if (attPath) {
        const fullAttPath = path.isAbsolute(attPath)
          ? attPath
          : path.join(process.cwd(), "data", "video-center", "attachments", path.basename(attPath));
        try {
          if (fs.existsSync(fullAttPath)) fs.unlinkSync(fullAttPath);
        } catch { /* already gone */ }
      }
      await client.rpc("dp_delete", {
        p_table: "video_center.attachments",
        p_id: String(att.id),
      });
    }

    // Delete comments
    const { data: comms } = await client.rpc("dp_select", {
      p_table: "video_center.comments",
    });
    const comments = ((comms as Record<string, unknown>[]) || []).filter(
      (c) => String(c.video_id) === id
    );
    for (const c of comments) {
      await client.rpc("dp_delete", {
        p_table: "video_center.comments",
        p_id: String(c.id),
      });
    }

    // Delete video record
    await client.rpc("dp_delete", {
      p_table: "video_center.videos",
      p_id: id,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
