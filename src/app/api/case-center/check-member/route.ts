import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/check-member?project_id=xxx&user_name=xxx
// Check if a user is a member of a project
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const userName = searchParams.get("user_name");

    if (!projectId || !userName) {
      return NextResponse.json({ error: "project_id 和 user_name 为必填" }, { status: 400 });
    }

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "project_members",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const members = (data as Record<string, unknown>[]) || [];
    const isMember = members.some(
      (m) => m.project_id === projectId && (m.user_name === userName || m.user_id === userName)
    );

    return NextResponse.json({ isMember });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "检查成员失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
