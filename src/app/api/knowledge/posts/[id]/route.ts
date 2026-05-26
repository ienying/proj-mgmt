import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await createServerClient();
    const { data: postData, error } = await client.rpc('dp_get_by_id', {
      p_table: 'knowledge_posts',
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const post = (postData as Record<string, unknown>[])?.[0];
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get attachments
    const { data: attData } = await client.rpc('dp_select', { p_table: 'knowledge_attachments' });
    const attachments = ((attData as Record<string, unknown>[]) || []).filter(
      (a) => String(a.post_id) === id
    );

    // Get read count
    const { data: readData } = await client.rpc('dp_select', { p_table: 'knowledge_reads' });
    const reads = ((readData as Record<string, unknown>[]) || []).filter(
      (r) => String(r.post_id) === id
    );

    // Get comment count
    const { data: commentData } = await client.rpc('dp_select', { p_table: 'knowledge_comments' });
    const comments = ((commentData as Record<string, unknown>[]) || []).filter(
      (c) => String(c.post_id) === id
    );

    return NextResponse.json({
      data: {
        ...post,
        _attachments: attachments,
        _readCount: reads.length,
        _reads: reads,
        _comments: comments,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { attachments, ...postData } = body;

    const client = await createServerClient();
    const { data, error } = await client.rpc('dp_update', {
      p_table: 'knowledge_posts',
      p_id: id,
      p_data: postData,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Handle attachment updates if provided
    if (attachments && Array.isArray(attachments)) {
      // Delete existing attachments for this post
      const { data: existingAtts } = await client.rpc('dp_select', { p_table: 'knowledge_attachments' });
      const existing = ((existingAtts as Record<string, unknown>[]) || []).filter(
        (a) => String(a.post_id) === id
      );
      for (const att of existing) {
        await client.rpc('dp_delete', {
          p_table: 'knowledge_attachments',
          p_id: String(att.id),
        });
      }
      // Insert new attachments
      for (const att of attachments) {
        await client.rpc('dp_insert', {
          p_table: 'knowledge_attachments',
          p_data: {
            post_id: id,
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
      p_table: 'knowledge_posts',
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
