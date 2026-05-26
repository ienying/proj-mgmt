import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未提供Token' }, { status: 401 });
    }

    // Verify JWT
    let decoded: { userId: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch {
      return NextResponse.json({ error: 'Token已过期或无效' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请输入旧密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度不能少于6位' }, { status: 400 });
    }

    const client = await createServerClient();

    // Get user
    const { data: user, error } = await client.rpc('dp_get_by_id', {
      p_table: 'users',
      p_id: decoded.userId,
    });

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const userRecord = user as Record<string, unknown>;
    const passwordHash = userRecord.password_hash as string;

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 401 });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await client.rpc('dp_update', {
      p_table: 'users',
      p_id: decoded.userId,
      p_data: { password_hash: newHash },
    });

    return NextResponse.json({ data: { message: '密码修改成功' } });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: '密码修改失败' }, { status: 500 });
  }
}
