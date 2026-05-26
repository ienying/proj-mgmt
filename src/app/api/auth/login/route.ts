import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';
const TOKEN_EXPIRY = '24h';
const TOKEN_EXPIRY_REMEMBER = '7d';

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { username, password, remember } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    // Auto-ensure super_admin exists (for fresh deployments)
    await ensureSuperAdmin(client);

    // Query user by name or email
    const { data: users, error } = await client.rpc('dp_select', { p_table: 'users' });
    if (error) {
      return NextResponse.json({ error: '登录失败' }, { status: 500 });
    }

    const user = (users as Record<string, unknown>[]).find(
      (u: Record<string, unknown>) => u.username === username || u.name === username || u.email === username
    );

    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: '账号已被禁用，请联系管理员' }, { status: 403 });
    }

    const passwordHash = user.password_hash as string;
    if (!passwordHash) {
      return NextResponse.json({ error: '账号未设置密码，请联系管理员' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // Generate JWT token
    const expiresIn = remember ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY;
    const token = jwt.sign(
      { userId: user.id, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn } as jwt.SignOptions
    );

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (remember ? 168 : 24));

    await client.rpc('dp_insert', {
      p_table: 'user_sessions',
      p_data: {
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      },
    });

    // Update last_login_at
    await client.rpc('dp_update', {
      p_table: 'users',
      p_id: user.id,
      p_data: { last_login_at: new Date().toISOString() },
    });

    // Return user info (without password)
    const userInfo = {
      id: user.id,
      username: user.username || user.name,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role || 'user',
      position: user.position,
    };

    return NextResponse.json({
      data: { token, user: userInfo },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}

/**
 * Auto-ensure super_admin user exists (for fresh deployments).
 * If no super_admin found, create one with default password.
 */
async function ensureSuperAdmin(client: ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never) {
  try {
    const { data: users } = await client.rpc('dp_select', { p_table: 'users' });
    const userList = (users || []) as Array<Record<string, unknown>>;
    const hasAdmin = userList.some((u: Record<string, unknown>) => u.role === 'super_admin');
    if (!hasAdmin && userList.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('yuansu0718', 10);
      await client.rpc('dp_insert', {
        p_table: 'users',
        p_data: {
          username: 'super_admin',
          name: 'super_admin',
          email: 'admin@element.tech',
          role: 'super_admin',
          is_active: true,
          is_enabled: true,
          password_hash: hash,
        },
      });
      console.info('Auto-created super_admin user for fresh deployment');
    }
  } catch {
    // Silently ignore - initialization is best-effort
  }
}
