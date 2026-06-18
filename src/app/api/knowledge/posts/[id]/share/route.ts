import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { randomUUID } from "crypto";

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

    const post = (postData as Record<string, unknown>[])?.[0];
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get attachments
    const { data: attData } = await client.rpc("dp_select", {
      p_table: "design_info_square.knowledge_attachments",
    });
    const attachments = ((attData as Record<string, unknown>[]) || []).filter(
      (a) => String(a.post_id) === id && a.is_deleted !== true
    );

    const shareToken = post.share_token as string;
    const shareUrl = shareToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/info-square/share/${shareToken}`
      : null;

    return NextResponse.json({
      data: {
        share_token: shareToken,
        share_url: shareUrl,
        post: { ...post, attachments },
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: regenerate share token
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const newToken = randomUUID().replace(/-/g, "");

    const { data, error } = await client.rpc("dp_update", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
      p_data: { share_token: newToken },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/info-square/share/${newToken}`;
    return NextResponse.json({ data: { share_token: newToken, share_url: shareUrl } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
