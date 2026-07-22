import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * 批量查询用户对视频的已读状态
 * POST /api/video-center/read-status
 * body: { user_id: string, video_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.user_id as string;
    const videoIds = body.video_ids as string[];

    if (!userId || !videoIds?.length) {
      return NextResponse.json({ data: { read_ids: [] } });
    }

    const client = await createServerClient();
    const escIds = videoIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    const { data: rows } = await client.rpc("execute_sql", {
      p_sql: `SELECT video_id FROM video_center.reads WHERE user_id = '${userId.replace(/'/g, "''")}' AND video_id IN (${escIds})`,
    });

    const readIds = ((rows || []) as Array<{ video_id: string }>).map((r) => r.video_id);
    return NextResponse.json({ data: { read_ids: readIds } });
  } catch {
    return NextResponse.json({ data: { read_ids: [] } });
  }
}
