import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// DELETE: 移除项目成员
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId } = await params;
    const client = await createServerClient();

    // 查找成员记录
    const { data: members } = await client.rpc("dp_select", {
      p_table: "project_members",
    });

    if (!members || !Array.isArray(members)) {
      return NextResponse.json({ error: "未找到成员" }, { status: 404 });
    }

    const member = (members as Record<string, unknown>[]).find(
      (m: Record<string, unknown>) => m.project_id === projectId && (m.user_id === userId || m.id === userId)
    );

    if (!member) {
      return NextResponse.json({ error: "未找到成员" }, { status: 404 });
    }

    // 删除成员
    const { error } = await client.rpc("dp_delete", {
      p_table: "project_members",
      p_id: member.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 同时删除该成员的权限记录
    const { data: perms } = await client.rpc("dp_select", {
      p_table: "project_member_permissions",
    });

    if (perms && Array.isArray(perms)) {
      const memberPerms = (perms as Record<string, unknown>[]).filter(
        (p: Record<string, unknown>) => p.project_id === projectId && p.user_id === userId
      );
      for (const p of memberPerms) {
        await client.rpc("dp_delete", {
          p_table: "project_member_permissions",
          p_id: p.id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove project member error:", err);
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 });
  }
}
