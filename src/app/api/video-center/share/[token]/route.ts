import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_select", {
      p_table: "video_center.videos",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const videos = ((data as Record<string, unknown>[]) || []).filter(
      (v) => String(v.share_token) === token && v.is_deleted !== true
    );

    if (videos.length === 0) {
      return NextResponse.json({ error: "链接无效或已过期" }, { status: 404 });
    }

    const video = videos[0];
    const vid = String(video.id);

    // Get attachments
    const { data: atts } = await client.rpc("dp_select", {
      p_table: "video_center.attachments",
    });
    const attachments = ((atts as Record<string, unknown>[]) || []).filter(
      (a) => String(a.video_id) === vid
    );

    // Increment download count (track share access)
    await client.rpc("dp_update", {
      p_table: "video_center.videos",
      p_id: vid,
      p_data: { download_count: ((video.download_count as number) || 0) + 1 },
    });

    return NextResponse.json({
      data: { ...video, attachments },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
