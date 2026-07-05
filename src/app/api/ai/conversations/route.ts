import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { ensureConvTables } from "@/lib/ai-settings";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "project-management-secret-key-2026";

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const client = await createServerClient();
    const { data: users } = await client.rpc("dp_select", { p_table: "users" });
    const rows = (users as Record<string, unknown>[]) || [];
    const user = rows.find((u) => u.id === decoded.userId);
    if (!user) return null;
    return { id: String(user.id || ""), name: String(user.name || ""), role: String(user.role || "user") };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    await ensureConvTables();
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }

    const client = await createServerClient();
    const { data } = await client.rpc("dp_select", { p_table: "design_public.ai_conversations" });
    const convs = (data as any[]) || [];

    // 只返回当前用户的会话，按 updated_at 倒序
    const userConvs = convs
      .filter((c: any) => c.user_id === user.id)
      .sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .map((c: any) => ({
        id: c.id,
        title: c.title || "新对话",
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

    return NextResponse.json({ data: userConvs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
