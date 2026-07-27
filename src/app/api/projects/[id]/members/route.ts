import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { verifyAuth } from "@/lib/auth-utils";
import { canManageMembers } from "@/lib/project-permission";
import { invalidateCacheByPrefix } from "@/lib/cache";

// GET: 获取项目成员列表（公开查看）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_select", {
      p_table: "project_members",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const members = ((data as Record<string, unknown>[]) || []).filter(
      (m: Record<string, unknown>) => m.project_id === projectId
    );

    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("Get project members error:", err);
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 });
  }
}

// POST: 添加项目成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 鉴权 + 权限检查 ──
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id: projectId } = await params;
    const client = await createServerClient();
    const body = await request.json();
    const { user_id, role_type = "成员" } = body;

    const permCheck = await canManageMembers(projectId, authResult.userId, authResult.role, authResult.userName);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason || "无权限管理项目成员" }, { status: 403 });
    }
    // ── 权限检查结束 ──

    if (!user_id) {
      return NextResponse.json({ error: "请选择用户" }, { status: 400 });
    }

    // 检查是否已存在
    const { data: existing } = await client.rpc("dp_select", {
      p_table: "project_members",
    });

    if (existing && Array.isArray(existing)) {
      const dup = (existing as Record<string, unknown>[]).find(
        (m: Record<string, unknown>) => m.project_id === projectId && m.user_id === user_id
      );
      if (dup) {
        return NextResponse.json({ error: "该用户已是项目成员" }, { status: 400 });
      }
    }

    // 获取用户信息
    const { data: user } = await client.rpc("dp_get_by_id", {
      p_table: "users",
      p_id: user_id,
    });

    const userRecord = user as Record<string, unknown> | null;
    const memberName = userRecord?.name || "";
    const memberPhone = userRecord?.phone || "";

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "project_members",
      p_data: {
        project_id: projectId,
        user_id,
        name: memberName,
        role_type,
        phone: memberPhone,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 自动赋予默认权限：项目编辑
    try {
      await client.rpc("dp_insert", {
        p_table: "project_member_permissions",
        p_data: {
          project_id: projectId,
          user_id,
          permission_key: "project_edit",
        },
      });
    } catch { /* 权限插入失败不影响成员添加 */ }

    invalidateCacheByPrefix("projects");
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("Add project member error:", err);
    return NextResponse.json({ error: "添加成员失败" }, { status: 500 });
  }
}
