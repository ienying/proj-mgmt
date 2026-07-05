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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureConvTables();
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }

    const { id } = await params;
    const client = await createServerClient();

    // 验证会话归属
    const { data: convData } = await client.rpc("dp_select", { p_table: "design_public.ai_conversations" });
    const convs = (convData as any[]) || [];
    const conv = convs.find((c: any) => c.id === id);
    if (!conv) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    if (conv.user_id !== user.id) return NextResponse.json({ error: "无权访问此会话" }, { status: 403 });

    // 获取所有消息
    const { data: msgData } = await client.rpc("dp_select", { p_table: "design_public.ai_messages" });
    const msgs = (msgData as any[]) || [];
    const convMsgs = msgs
      .filter((m: any) => m.conversation_id === id)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.intent,
        structured_data: m.structured_data,
        action_type: m.action_type,
        action_status: m.action_status,
        execution_result: m.execution_result,
        created_at: m.created_at,
      }));

    return NextResponse.json({
      data: {
        id: conv.id,
        title: conv.title || "新对话",
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        messages: convMsgs,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureConvTables();
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
    }

    const { id } = await params;
    const client = await createServerClient();

    // 验证会话归属
    const { data: convData } = await client.rpc("dp_select", { p_table: "design_public.ai_conversations" });
    const convs = (convData as any[]) || [];
    const conv = convs.find((c: any) => c.id === id);
    if (!conv) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    if (conv.user_id !== user.id) return NextResponse.json({ error: "无权删除此会话" }, { status: 403 });

    // 删除消息（级联）
    const { data: msgData } = await client.rpc("dp_select", { p_table: "design_public.ai_messages" });
    const msgs = (msgData as any[]) || [];
    const convMsgs = msgs.filter((m: any) => m.conversation_id === id);
    for (const m of convMsgs) {
      await client.rpc("dp_delete", { p_table: "design_public.ai_messages", p_id: m.id });
    }

    // 删除会话
    await client.rpc("dp_delete", { p_table: "design_public.ai_conversations", p_id: id });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
