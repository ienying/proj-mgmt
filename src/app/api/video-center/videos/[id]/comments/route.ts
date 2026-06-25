import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "video_center.comments",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const comments = ((data as Record<string, unknown>[]) || [])
      .filter((c) => String(c.video_id) === id && c.is_deleted !== true)
      .sort(
        (a, b) =>
          new Date(String(a.created_at)).getTime() -
          new Date(String(b.created_at)).getTime()
      );

    // Organize into threaded structure
    const topLevel = comments.filter((c) => !c.parent_id);
    const replies = comments.filter((c) => !!c.parent_id);

    const threaded = topLevel.map((c) => ({
      ...c,
      replies: replies.filter((r) => String(r.parent_id) === String(c.id)),
    }));

    return NextResponse.json({ data: threaded });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_insert", {
      p_table: "video_center.comments",
      p_data: {
        video_id: id,
        content: body.content,
        user_id: body.user_id,
        user_name: body.user_name,
        parent_id: body.parent_id || null,
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
