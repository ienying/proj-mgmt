import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if already liked
    const client = await createServerClient();
    const { data: existingLikes } = await client.rpc('dp_select', { p_table: 'knowledge_likes' });
    const likes = ((existingLikes as Record<string, unknown>[]) || []);
    const existing = likes.find(
      (l) => String(l.post_id) === id && String(l.user_id) === String(body.user_id) && l.action_type === 'like'
    );

    const post = await client.rpc('dp_get_by_id', { p_table: 'knowledge_posts', p_id: id });
    const postData = (post.data as Record<string, unknown>[])?.[0];
    const currentCount = (postData?.like_count as number) || 0;

    if (existing) {
      // Unlike: delete and decrement
      await client.rpc('dp_delete', {
        p_table: 'knowledge_likes',
        p_id: String(existing.id),
      });
      await client.rpc('dp_update', {
        p_table: 'knowledge_posts',
        p_id: id,
        p_data: { like_count: Math.max(0, currentCount - 1) },
      });
      return NextResponse.json({ data: { liked: false } });
    } else {
      // Like: insert and increment
      await client.rpc('dp_insert', {
        p_table: 'knowledge_likes',
        p_data: {
          post_id: id,
          user_id: body.user_id,
          action_type: 'like',
        },
      });
      await client.rpc('dp_update', {
        p_table: 'knowledge_posts',
        p_id: id,
        p_data: { like_count: currentCount + 1 },
      });
      return NextResponse.json({ data: { liked: true } });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
