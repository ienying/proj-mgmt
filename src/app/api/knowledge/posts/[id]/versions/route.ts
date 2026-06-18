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
      p_table: "design_info_square.knowledge_versions",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const versions = ((data as Record<string, unknown>[]) || [])
      .filter((v) => String(v.post_id) === id)
      .sort((a, b) => (b.version as number) - (a.version as number));

    return NextResponse.json({ data: versions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
