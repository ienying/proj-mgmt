import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未提供Token' }, { status: 401 });
    }

    const client = await createServerClient();

    // Delete session from database
    const { data: sessions } = await client.rpc('dp_select', { p_table: 'user_sessions' });
    if (sessions) {
      const session = (sessions as Record<string, unknown>[]).find(
        (s: Record<string, unknown>) => s.token === token
      );
      if (session) {
        await client.rpc('dp_delete', { p_table: 'user_sessions', p_id: session.id });
      }
    }

    return NextResponse.json({ data: { message: '已退出登录' } });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: '退出登录失败' }, { status: 500 });
  }
}
