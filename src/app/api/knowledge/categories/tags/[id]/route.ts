import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const TABLE = "design_info_square.knowledge_attachment_tags";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_update", {
      p_table: TABLE,
      p_id: id,
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { error } = await client.rpc("dp_delete", {
      p_table: TABLE,
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
