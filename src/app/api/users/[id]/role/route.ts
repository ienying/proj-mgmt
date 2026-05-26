import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';

/** PUT /api/users/[id]/role - 更新用户全局角色 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Verify caller is super_admin
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未提供Token' }, { status: 401 });
    }

    let decoded: { userId: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch {
      return NextResponse.json({ error: 'Token无效' }, { status: 401 });
    }

    if (decoded.role !== 'super_admin') {
      return NextResponse.json({ error: '仅超级管理员可修改用户角色' }, { status: 403 });
    }

    const { role } = await request.json();

    if (!['super_admin', 'sub_admin', 'user'].includes(role)) {
      return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
    }

    // Prevent removing the last super_admin
    if (role !== 'super_admin' && decoded.userId === userId) {
      return NextResponse.json({ error: '不能取消自己的超级管理员角色' }, { status: 400 });
    }

    const client = await createServerClient();

    await client.rpc('dp_update', {
      p_table: 'users',
      p_id: userId,
      p_data: { role },
    });

    return NextResponse.json({ data: { message: '角色更新成功' } });
  } catch (err) {
    console.error('Update role error:', err);
    return NextResponse.json({ error: '角色更新失败' }, { status: 500 });
  }
}
