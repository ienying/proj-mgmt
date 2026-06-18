import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Upsert read record
    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_insert', {
      p_table: 'design_info_square.knowledge_reads',
      p_data: {
        post_id: id,
        user_id: body.user_id,
        user_name: body.user_name,
      },
    });
    if (error) {
      // If already exists, just return ok
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return NextResponse.json({ data: { read: true } });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment view count
    const { data: postData } = await client.rpc('dp_get_by_id', {
      p_table: 'design_info_square.knowledge_posts',
      p_id: id,
    });
    const post = postData as Record<string, unknown> | null;
    if (post) {
      await client.rpc('dp_update', {
        p_table: 'design_info_square.knowledge_posts',
        p_id: id,
        p_data: { view_count: ((post.view_count as number) || 0) + 1 },
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
