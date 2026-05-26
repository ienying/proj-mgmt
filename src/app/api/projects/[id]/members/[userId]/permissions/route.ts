import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'project-management-secret-key-2026';

/** GET /api/projects/[id]/members/[userId]/permissions - 获取用户在项目中的权限 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId } = await params;
    const client = await createServerClient();

    // Get permissions for this user in this project
    const { data: allPerms, error } = await client.rpc('dp_select', {
      p_table: 'project_member_permissions',
    });

    if (error) {
      return NextResponse.json({ error: '获取权限失败' }, { status: 500 });
    }

    const permissions = (allPerms as Record<string, unknown>[])
      .filter((p: Record<string, unknown>) => p.project_id === projectId && p.user_id === userId)
      .map((p: Record<string, unknown>) => p.permission_key as string);

    // Also get user's global role
    const { data: user } = await client.rpc('dp_get_by_id', {
      p_table: 'users',
      p_id: userId,
    });

    const globalRole = (user as Record<string, unknown>)?.role || 'user';

    // Super admin and sub admin have all permissions
    const allPermissionKeys = [
      'project_edit', 'member_manage', 'module_manage', 'task_manage',
      'issue_handle', 'issue_report', 'data_view', 'data_export',
    ];

    const effectivePermissions = ['super_admin', 'sub_admin'].includes(globalRole as string)
      ? allPermissionKeys
      : permissions;

    return NextResponse.json({
      data: {
        globalRole,
        projectPermissions: permissions,
        effectivePermissions,
      },
    });
  } catch (err) {
    console.error('Get permissions error:', err);
    return NextResponse.json({ error: '获取权限失败' }, { status: 500 });
  }
}

/** PUT /api/projects/[id]/members/[userId]/permissions - 更新用户在项目中的权限 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId } = await params;

    // Verify caller is admin or project manager
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

    // Only super_admin and sub_admin can manage permissions
    if (!['super_admin', 'sub_admin'].includes(decoded.role)) {
      // Check if caller is project manager
      const client = await createServerClient();
      const { data: members } = await client.rpc('dp_select', { p_table: 'project_members' });
      const memberList = members as Record<string, unknown>[];
      const callerMember = memberList?.find(
        (m: Record<string, unknown>) =>
          m.project_id === projectId && m.user_id === decoded.userId
      );
      const callerPerms = memberList ? await getMemberPermissions(client, projectId, decoded.userId) : [];
      if (!callerPerms.includes('member_manage') && !['super_admin', 'sub_admin'].includes(decoded.role)) {
        return NextResponse.json({ error: '无权管理项目成员权限' }, { status: 403 });
      }
    }

    const { permissions } = await request.json();
    const client = await createServerClient();

    // Delete existing permissions for this user in this project
    const { data: allPerms } = await client.rpc('dp_select', {
      p_table: 'project_member_permissions',
    });

    if (allPerms) {
      const existingPerms = (allPerms as Record<string, unknown>[]).filter(
        (p: Record<string, unknown>) => p.project_id === projectId && p.user_id === userId
      );
      for (const perm of existingPerms) {
        await client.rpc('dp_delete', {
          p_table: 'project_member_permissions',
          p_id: perm.id,
        });
      }
    }

    // Insert new permissions
    for (const permKey of permissions as string[]) {
      await client.rpc('dp_insert', {
        p_table: 'project_member_permissions',
        p_data: {
          project_id: projectId,
          user_id: userId,
          permission_key: permKey,
        },
      });
    }

    return NextResponse.json({ data: { message: '权限更新成功' } });
  } catch (err) {
    console.error('Update permissions error:', err);
    return NextResponse.json({ error: '权限更新失败' }, { status: 500 });
  }
}

async function getMemberPermissions(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectId: string,
  userId: string
): Promise<string[]> {
  const { data: allPerms } = await client.rpc('dp_select', {
    p_table: 'project_member_permissions',
  });
  if (!allPerms) return [];
  return (allPerms as Record<string, unknown>[])
    .filter((p: Record<string, unknown>) => p.project_id === projectId && p.user_id === userId)
    .map((p: Record<string, unknown>) => p.permission_key as string);
}
