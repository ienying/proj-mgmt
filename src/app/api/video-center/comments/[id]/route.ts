import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get("role");

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "只有系统管理员可以删除留言" }, { status: 403 });
    }

    const client = await createServerClient();

    // Soft delete the comment
    const { data, error } = await client.rpc("dp_update", {
      p_table: "video_center.comments",
      p_id: id,
      p_data: { is_deleted: true },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
