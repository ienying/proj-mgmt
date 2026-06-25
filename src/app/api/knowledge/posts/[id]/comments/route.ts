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
        user_id: body.user_id,
        user_name: body.user_name,
        content: body.content,
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment comment count
    const { data: postData } = await client.rpc('dp_get_by_id', {
      p_table: 'design_info_square.knowledge_posts',
      p_id: id,
    });
    const post = postData as Record<string, unknown> | null;
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("comment_id");
    const userId = searchParams.get("user_id");
    const userRole = searchParams.get("user_role");

    if (!commentId) return NextResponse.json({ error: "缺少评论ID" }, { status: 400 });

    const client = await createServerClient();

    // Get the comment
    const { data: commentData } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_comments",
      p_id: commentId,
    });
    const comment = commentData as Record<string, unknown> | null;
    if (!comment) return NextResponse.json({ error: "评论不存在" }, { status: 404 });

    // Only author or super_admin can delete
    const isAuthor = String(comment.user_id || "") === String(userId || "");
    const isSuperAdmin = userRole === "super_admin";
    if (!isAuthor && !isSuperAdmin) {
      return NextResponse.json({ error: "无权限删除此评论" }, { status: 403 });
    }

    await client.rpc("dp_delete", {
      p_table: "design_info_square.knowledge_comments",
      p_id: commentId,
    });

    // Decrement comment count
    const { data: postData } = await client.rpc("dp_get_by_id", {
      p_table: "design_info_square.knowledge_posts",
      p_id: postId,
    });
    const post = postData as Record<string, unknown> | null;
    if (post) {
      await client.rpc("dp_update", {
        p_table: "design_info_square.knowledge_posts",
        p_id: postId,
        p_data: { comment_count: Math.max(0, ((post.comment_count as number) || 1) - 1) },
      });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
