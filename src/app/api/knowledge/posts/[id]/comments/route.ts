import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_select', { p_table: 'design_info_square.knowledge_comments' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const comments = ((data as Record<string, unknown>[]) || [])
      .filter((c) => String(c.post_id) === id)
      .sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime());

    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_insert', {
      p_table: 'design_info_square.knowledge_comments',
      p_data: {
        post_id: id,
        parent_id: body.parent_id || null,
        author_id: body.author_id,
        author_name: body.author_name,
        content: body.content,
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment comment count
    const { data: postData } = await client.rpc('dp_get_by_id', {
      p_table: 'design_info_square.knowledge_posts',
      p_id: id,
    });
    const post = (postData as Record<string, unknown>[])?.[0];
    if (post) {
      await client.rpc('dp_update', {
        p_table: 'design_info_square.knowledge_posts',
        p_id: id,
        p_data: { comment_count: ((post.comment_count as number) || 0) + 1 },
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
