import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get("module");
    const keyword = searchParams.get("keyword");
    const tags = searchParams.get("tags");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "50");

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "video_center.videos",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = ((data as Record<string, unknown>[]) || []).filter(
      (item) => item.is_deleted !== true
    );

    if (moduleName) {
      items = items.filter((i) => {
        const modules = String(i.module_name || "").split(",").map((m) => m.trim());
        return modules.includes(moduleName);
      });
    }
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
      items = items.filter((i) => {
        const itemTags = String(i.tags || "").toLowerCase();
        return tagList.some((t) => itemTags.includes(t));
      });
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) =>
          String(i.title || "").toLowerCase().includes(kw) ||
          String(i.description || "").toLowerCase().includes(kw) ||
          String(i.tags || "").toLowerCase().includes(kw)
      );
    }

    items.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    // Attach attachment count and comment count
    const { data: allAtts } = await client.rpc("dp_select", {
      p_table: "video_center.attachments",
    });
    const { data: allComments } = await client.rpc("dp_select", {
      p_table: "video_center.comments",
    });
    const attachments = (allAtts as Record<string, unknown>[]) || [];
    const comments = (allComments as Record<string, unknown>[]) || [];

    const enriched = paged.map((video) => {
      const vid = String(video.id);
      return {
        ...video,
        attachment_count: attachments.filter((a) => String(a.video_id) === vid).length,
        comment_count: comments.filter(
          (c) => String(c.video_id) === vid && c.is_deleted !== true
        ).length,
      };
    });

    return NextResponse.json({ data: enriched, total, page, page_size: pageSize });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await createServerClient();

    const shareToken = randomUUID().replace(/-/g, "");

    const payload = {
      ...body,
      share_token: shareToken,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "video_center.videos",
      p_data: payload,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: (data as Record<string, unknown>[])?.[0] || data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
