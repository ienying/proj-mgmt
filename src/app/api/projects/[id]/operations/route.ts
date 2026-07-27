import { createServerClient } from "@/storage/database/pg-client";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth-utils";

async function getProjectSchema(client: Awaited<ReturnType<typeof createServerClient>>, projectId: string): Promise<string | null> {
  try {
    const { data } = await client.rpc("dp_get_by_id", { p_table: "projects", p_id: projectId });
    return (data as Record<string, unknown>)?.project_schema as string || null;
  } catch { return null; }
}

// GET: 获取项目操作记录
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const client = await createServerClient();

    const projectSchema = await getProjectSchema(client, projectId);
    if (!projectSchema) return NextResponse.json({ data: [] });

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${projectSchema}.operation_logs ORDER BY created_at DESC LIMIT 50`,
    });

    if (error) { console.error("Get operation logs error:", error); return NextResponse.json({ data: [] }); }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error("Get operation logs error:", err);
    return NextResponse.json({ data: [] });
  }
}

// POST: 写入操作记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 鉴权 ──
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id: projectId } = await params;
    const client = await createServerClient();
    const body = await request.json();
    const { action, target_type, target_name, detail } = body;

    const projectSchema = await getProjectSchema(client, projectId);
    if (!projectSchema) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

    // 兜底建表
    await client.rpc("execute_sql", {
      p_sql: `CREATE TABLE IF NOT EXISTS ${projectSchema}.operation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID, user_name VARCHAR(100), action VARCHAR(50) NOT NULL,
        target_type VARCHAR(100), target_name VARCHAR(255), detail TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
    });

    const { data, error } = await client.rpc("dp_insert", {
      p_table: `${projectSchema}.operation_logs`,
      p_data: {
        action: action || "update",
        target_type: target_type || null,
        target_name: target_name || null,
        detail: detail || null,
        user_id: authResult.userId,
        user_name: authResult.userName,
      },
    });

    if (error) { console.error("Create operation log error:", error); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("Create operation log error:", err);
    return NextResponse.json({ error: "记录操作失败" }, { status: 500 });
  }
}
