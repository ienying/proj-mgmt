import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { data } = await client.rpc("execute_sql", {
      p_sql: `SELECT r.user_id, r.created_at as read_at, u.name as user_name FROM video_center.reads r LEFT JOIN users u ON r.user_id = u.id WHERE r.video_id = '${id.replace(/'/g, "''")}' ORDER BY r.created_at DESC`,
    });
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
