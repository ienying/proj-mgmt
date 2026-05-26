import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_update', {
      p_table: 'knowledge_categories',
      p_id: id,
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_delete', {
      p_table: 'knowledge_categories',
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
