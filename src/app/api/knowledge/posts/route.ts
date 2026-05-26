import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postType = searchParams.get('post_type');
    const categoryId = searchParams.get('category_id');
    const mediaType = searchParams.get('media_type');
    const authorId = searchParams.get('author_id');
    const keyword = searchParams.get('keyword');

    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_select', { p_table: 'knowledge_posts' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let items = ((data as Record<string, unknown>[]) || [])
      .filter((item) => item.is_enabled !== false);

    if (postType) items = items.filter((i) => i.post_type === postType);
    if (categoryId) items = items.filter((i) => i.category_id === categoryId);
    if (authorId) items = items.filter((i) => i.author_id === authorId);
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) =>
          String(i.title || '').toLowerCase().includes(kw) ||
          String(i.content || '').toLowerCase().includes(kw)
      );
    }

    // Media type filter: need to check attachments
    if (mediaType) {
      const { data: attachments } = await client.rpc('dp_select', { p_table: 'knowledge_attachments' });
      const atts = (attachments as Record<string, unknown>[]) || [];
      const postIdsWithMedia = new Set(
        atts.filter((a) => a.media_type === mediaType).map((a) => String(a.post_id))
      );
      items = items.filter((i) => postIdsWithMedia.has(String(i.id)));
    }

    // Sort: pinned first, then by created_at desc
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attachments, ...postData } = body;

    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_insert', {
      p_table: 'knowledge_posts',
      p_data: postData,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const post = (data as Record<string, unknown>[])?.[0] || data;

    // Insert attachments if any
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        await client.rpc('dp_insert', {
          p_table: 'knowledge_attachments',
          p_data: {
            post_id: typeof post === 'object' && post !== null ? post.id : undefined,
            file_name: att.file_name,
            file_url: att.file_url,
            file_size: att.file_size || 0,
            file_type: att.file_type,
            media_type: att.media_type || 'document',
            duration: att.duration || null,
          },
        });
      }
    }

    return NextResponse.json({ data: post });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
