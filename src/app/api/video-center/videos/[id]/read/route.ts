import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const userId = body.user_id;
    if (!userId) return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });

    const client = await createServerClient();
    await client.rpc("dp_insert", {
      p_table: "video_center.reads",
      p_data: { video_id: id, user_id: userId },
    });

    return NextResponse.json({ success: true });
  } catch {
    // 重复插入（已读）也返回成功
    return NextResponse.json({ success: true });
  }
}
