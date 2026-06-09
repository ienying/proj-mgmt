import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("获取任务定义失败:", error);
    return NextResponse.json({ error: "获取任务定义失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await createServerClient();

    // Only allow updating certain fields
    const allowedUpdates: Record<string, any> = {};
    const allowedFields = ["task_name", "periodic_config", "form_columns", "workflow_nodes", "assignee_config", "board_records", "deadline_config", "status"];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        allowedUpdates[field] = body[field];
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "public.task_center_defs",
      p_id: id,
      p_data: allowedUpdates,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("更新任务定义失败:", error);
    return NextResponse.json({ error: "更新任务定义失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const client = await createServerClient();

    // 1. Fetch the definition
    const { data: def, error: fetchError } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: id,
    });
    if (fetchError || !def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;

    // 2. Only created_by can hard delete
    if (userId && d.created_by !== userId) {
      return NextResponse.json({ error: "仅发起人可删除任务" }, { status: 403 });
    }

    // 3. Delete physical rows for all instances
    const schema = d.schema_name;
    const table = d.table_name;
    const { data: instances } = await client.rpc("execute_sql", {
      p_sql: `SELECT id FROM public.task_center_instances WHERE def_id = '${(id as string).replace(/'/g, "''")}'`,
    });

    if (instances && Array.isArray(instances)) {
      for (const inst of instances) {
        const instId = (inst as Record<string, any>).id;
        await client.rpc("execute_sql", {
          p_sql: `DELETE FROM ${schema}."${table}" WHERE instance_id = '${String(instId).replace(/'/g, "''")}'`,
        });
      }
    }

    // 4. Drop physical table
    await client.rpc("execute_sql", {
      p_sql: `DROP TABLE IF EXISTS ${schema}."${table}"`,
    });

    // 5. Delete all instances
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM public.task_center_instances WHERE def_id = '${(id as string).replace(/'/g, "''")}'`,
    });

    // 6. Delete definition
    const { error: delError } = await client.rpc("dp_delete", {
      p_table: "public.task_center_defs",
      p_id: id,
    });
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("删除任务定义失败:", error);
    return NextResponse.json({ error: "删除任务定义失败" }, { status: 500 });
  }
}
