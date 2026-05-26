import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';
const DEFAULT_PASSWORD = 'yuansu0718';

/** POST /api/users/[id]/reset-password - 重置用户密码为默认密码 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Verify caller is admin
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

    if (!['super_admin', 'sub_admin'].includes(decoded.role)) {
      return NextResponse.json({ error: '仅管理员可重置密码' }, { status: 403 });
    }

    const client = await createServerClient();

    const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await client.rpc('dp_update', {
      p_table: 'users',
      p_id: userId,
      p_data: { password_hash: newHash },
    });

    return NextResponse.json({ data: { message: `密码已重置为 ${DEFAULT_PASSWORD}` } });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: '密码重置失败' }, { status: 500 });
  }
}
