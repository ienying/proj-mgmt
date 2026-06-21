import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('dp_select', { p_table: 'project_module_types' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const sorted = ((data as Array<Record<string, unknown>>) || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.sort_order as number) - (b.sort_order as number));
    return NextResponse.json({ data: sorted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { data, error } = await supabase.rpc('dp_insert', {
      p_table: 'project_module_types',
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });
    const { data, error } = await supabase.rpc('dp_update', {
      p_table: 'project_module_types',
      p_id: id,
      p_data: updateData,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 });
    const { data, error } = await supabase.rpc('dp_delete', {
      p_table: 'project_module_types',
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
