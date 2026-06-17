import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_select', { p_table: 'design_info_square.knowledge_categories' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const items = (data as Record<string, unknown>[]) || [];
    const sorted = items.sort((a, b) => ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0));
    return NextResponse.json({ data: sorted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { data, error } = await client.rpc('dp_insert', {
      p_table: 'design_info_square.knowledge_categories',
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
