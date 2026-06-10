import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await createServerClient();

    // 1. Get instance
    const { data: instance, error } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (error || !instance) {
      return NextResponse.json({ error: "任务实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, any>;

    // 2. Get definition
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: inst.def_id,
    });

    let physRow = null;
    if (def) {
      const d = def as Record<string, any>;
      const { data: rows } = await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${d.schema_name}."${d.table_name}" WHERE instance_id = '${String(inst.id).replace(/'/g, "''")}' LIMIT 1`,
      });
      if (rows && Array.isArray(rows) && rows.length > 0) {
        physRow = rows[0];
      }
    }

    return NextResponse.json({ data: { ...inst, def, phys_row: physRow } });
  } catch (error) {
    console.error("获取任务实例失败:", error);
    return NextResponse.json({ error: "获取任务实例失败" }, { status: 500 });
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

    // 1. Get instance
    const { data: instance, error: fetchError } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (fetchError || !instance) {
      return NextResponse.json({ error: "任务实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, any>;

    // 2. Get definition
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: inst.def_id,
    });
    if (!def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;

    // 3. Save draft: update physical table row
    if (body.phys_data && Object.keys(body.phys_data).length > 0) {
      const physId = body.phys_data._phys_id || body.phys_id;
      const schemaName = d.schema_name;
      const tableName = d.table_name;

      if (physId) {
        // Update existing row — strip _phys_id (not a column in physical table)
        const { _phys_id: _p, ...cleanData } = body.phys_data || {};
        if (Object.keys(cleanData).length === 0) {
          return NextResponse.json({ data: { saved: true } });
        }
        const { error: updateError } = await client.rpc("dp_update", {
          p_table: `${schemaName}.${tableName}`,
          p_id: physId,
          p_data: cleanData,
        });
        if (updateError) {
          return NextResponse.json({ error: `保存数据失败: ${updateError.message}` }, { status: 500 });
        }
      }
    }

    // 4. Update instance metadata (e.g., due_date)
    const instanceUpdates: Record<string, any> = {};
    if (body.due_date !== undefined) instanceUpdates.due_date = body.due_date;
    if (body.status !== undefined) instanceUpdates.status = body.status;

    if (Object.keys(instanceUpdates).length > 0) {
      const { error: instError } = await client.rpc("dp_update", {
        p_table: "public.task_center_instances",
        p_id: id,
        p_data: instanceUpdates,
      });
      if (instError) {
        return NextResponse.json({ error: instError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { saved: true } });
  } catch (error) {
    console.error("更新任务实例失败:", error);
    return NextResponse.json({ error: "更新任务实例失败" }, { status: 500 });
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

    // 1. Get instance
    const { data: instance, error: fetchError } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (fetchError || !instance) {
      return NextResponse.json({ error: "任务实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, any>;

    // 2. Check permission: only def.created_by can hard delete
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: inst.def_id,
    });
    if (!def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;
    if (userId && d.created_by !== userId) {
      return NextResponse.json({ error: "仅发起人可删除实例" }, { status: 403 });
    }

    // 3. Delete physical row
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM ${d.schema_name}."${d.table_name}" WHERE instance_id = '${String(inst.id).replace(/'/g, "''")}'`,
    });

    // 4. Delete instance
    const { error: delError } = await client.rpc("dp_delete", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("删除任务实例失败:", error);
    return NextResponse.json({ error: "删除任务实例失败" }, { status: 500 });
  }
}
