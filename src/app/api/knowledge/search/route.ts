import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const postType = searchParams.get('post_type');

    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_select', { p_table: 'design_info_square.knowledge_posts' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = ((data as Record<string, unknown>[]) || []).filter((i) => i.is_enabled !== false);

    if (postType) items = items.filter((i) => i.post_type === postType);
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) =>
          String(i.title || '').toLowerCase().includes(kw) ||
          String(i.content || '').toLowerCase().includes(kw)
      );
    }

    items.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
    });

    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
