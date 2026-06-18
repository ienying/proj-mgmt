import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const TABLE = "design_info_square.knowledge_attachment_tags";

export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", { p_table: TABLE });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const items = ((data as Record<string, unknown>[]) || []).sort(
      (a, b) => ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0)
    );
    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await createServerClient();

    // Get max sort_order
    const { data: existing } = await client.rpc("dp_select", { p_table: TABLE });
    const items = (existing as Record<string, unknown>[]) || [];
    const maxOrder = items.reduce((max, item) => Math.max(max, (item.sort_order as number) || 0), 0);

    const { data, error } = await client.rpc("dp_insert", {
      p_table: TABLE,
      p_data: { ...body, sort_order: body.sort_order ?? maxOrder + 1 },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
