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

    const shareToken = post.share_token as string;
    const shareUrl = shareToken
      ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/info-square/share/${shareToken}`
      : null;

    return NextResponse.json({
      data: {
        share_token: shareToken,
        share_url: shareUrl,
        share_password: (post.share_password as string) || "",
        has_password: !!(post.share_password as string),
      },
    });
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
    const password = (body.password as string) || "";
    const client = await createServerClient();

    // Get current post
    const { data: current } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
    });
    const currentPost = (current as Record<string, unknown>[])?.[0];
    if (!currentPost) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Regenerate share token when setting password for the first time
    let shareToken = currentPost.share_token as string;
    if (!shareToken) {
      shareToken = randomUUID().replace(/-/g, "");
    }

    let { error } = await client.rpc("dp_update", {
      p_table: "design_info_square.knowledge_posts",
      p_id: id,
      p_data: {
        share_token: shareToken,
        share_password: password || null,
      },
    });

    // If column doesn't exist, create it and retry
    if (error && error.message?.includes("share_password")) {
      await client.rpc("execute_sql", {
        p_sql: "ALTER TABLE design_info_square.knowledge_posts ADD COLUMN IF NOT EXISTS share_password VARCHAR(100)",
      });
      const retry = await client.rpc("dp_update", {
        p_table: "design_info_square.knowledge_posts",
        p_id: id,
        p_data: {
          share_token: shareToken,
          share_password: password || null,
        },
      });
      error = retry.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/info-square/share/${shareToken}`;
    return NextResponse.json({
      data: {
        share_token: shareToken,
        share_url: shareUrl,
        has_password: !!password,
        share_password: password,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
