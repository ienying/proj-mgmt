import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const password = (body.password as string) || "";

    const client = await createServerClient();
    const { data: postData, error } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const post = postData as Record<string, unknown> | null;
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const storedPassword = (post.share_password as string) || "";
    const verified = storedPassword === password;

    return NextResponse.json({ verified });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
