import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';

export async function GET(request: NextRequest) {
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

    const client = await createServerClient();

    // Check session in database
    const { data: sessions } = await client.rpc('dp_select', { p_table: 'user_sessions' });
    if (sessions) {
      const session = (sessions as Record<string, unknown>[]).find(
        (s: Record<string, unknown>) => s.token === token
      );
      if (!session) {
        return NextResponse.json({ error: '会话不存在' }, { status: 401 });
      }
      // Check if session expired
      const expiresAt = new Date(session.expires_at as string);
      if (expiresAt < new Date()) {
        await client.rpc('dp_delete', { p_table: 'user_sessions', p_id: session.id });
        return NextResponse.json({ error: '会话已过期' }, { status: 401 });
      }
    }

    // Get user info
    const { data: user, error } = await client.rpc('dp_get_by_id', {
      p_table: 'users',
      p_id: decoded.userId,
    });

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const userRecord = user as Record<string, unknown>;
    if (!userRecord.is_active) {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
    }

    const userInfo = {
      id: userRecord.id,
      username: userRecord.username || userRecord.name,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      department: userRecord.department,
      role: userRecord.role || 'user',
      position: userRecord.position,
    };

    return NextResponse.json({ data: userInfo });
  } catch (err) {
    console.error('Auth me error:', err);
    return NextResponse.json({ error: '认证失败' }, { status: 500 });
  }
}
