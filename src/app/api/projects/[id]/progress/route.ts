import { createServerClient } from "@/storage/database/pg-client";
import { NextRequest, NextResponse } from "next/server";

// 辅助: 根据 project_id 获取 project_schema
async function getProjectSchema(client: Awaited<ReturnType<typeof createServerClient>>, projectId: string): Promise<string | null> {
  try {
    const { data } = await client.rpc("dp_get_by_id", {
      p_table: "projects",
      p_id: projectId,
    });
    return (data as Record<string, unknown>)?.project_schema as string || null;
  } catch {
    return null;
  }
}

// GET: 获取项目进展同步记录，按创建时间倒序
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const client = await createServerClient();

    const projectSchema = await getProjectSchema(client, projectId);
    if (!projectSchema) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${projectSchema}.progress_updates ORDER BY created_at DESC`,
    });

    if (error) {
      console.error("Get progress updates error:", error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: (data as Record<string, unknown>[]) || [] });
  } catch (err) {
    console.error("Get progress updates error:", err);
    return NextResponse.json({ data: [] });
  }
}

// POST: 创建新的进展同步记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const client = await createServerClient();
    const body = await request.json();
    const { content, user_id, user_name } = body;

    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const projectSchema = await getProjectSchema(client, projectId);
    if (!projectSchema) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 确保表存在（兜底）
    await client.rpc("execute_sql", {
      p_sql: `CREATE TABLE IF NOT EXISTS ${projectSchema}.progress_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_name VARCHAR(100),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
    });

    const { data, error } = await client.rpc("dp_insert", {
      p_table: `${projectSchema}.progress_updates`,
      p_data: {
        content,
        user_id: user_id || null,
        user_name: user_name || "",
      },
    });

    if (error) {
      console.error("Create progress update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("Create progress update error:", err);
    return NextResponse.json({ error: "创建进展记录失败" }, { status: 500 });
  }
}
