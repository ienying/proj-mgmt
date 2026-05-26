import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = await createServerClient();
    const { data: existingFavorites } = await client.rpc('dp_select', { p_table: 'knowledge_likes' });
    const favs = ((existingFavorites as Record<string, unknown>[]) || []);
    const existing = favs.find(
      (f) => String(f.post_id) === id && String(f.user_id) === String(body.user_id) && f.action_type === 'favorite'
    );

    if (existing) {
      await client.rpc('dp_delete', {
        p_table: 'knowledge_likes',
        p_id: String(existing.id),
      });
      return NextResponse.json({ data: { favorited: false } });
    } else {
      await client.rpc('dp_insert', {
        p_table: 'knowledge_likes',
        p_data: {
          post_id: id,
          user_id: body.user_id,
          action_type: 'favorite',
        },
      });
      return NextResponse.json({ data: { favorited: true } });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
