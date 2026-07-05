import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

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

    // 3. Check max_records limit
    const workflowNodes = d.workflow_nodes || [];
    const currentNode = workflowNodes[inst.current_node_index];
    const maxRecords = currentNode?.max_records || 0;

    if (maxRecords > 0) {
      const { data: existingRows } = await client.rpc("execute_sql", {
        p_sql: `SELECT COUNT(*) as cnt FROM ${d.schema_name}."${d.table_name}" WHERE instance_id = '${String(id).replace(/'/g, "''")}' AND submitted_by = '${String(user_id || "").replace(/'/g, "''")}'`,
      });
      const cnt = (existingRows as any[])?.[0]?.cnt || 0;
      if (cnt >= maxRecords) {
        return NextResponse.json({ error: `已达上限（${maxRecords}条）` }, { status: 400 });
      }
    }

    // 4. Create new phys row
    const rowData: Record<string, any> = {
      instance_id: id,
      submitted_by: user_id || null,
      project_id: inst.project_id || null,
    };
    const { data: physRow, error: physError } = await client.rpc("dp_insert_generic", {
      p_schema: d.schema_name,
      p_table: d.table_name,
      p_data: rowData,
    });
    if (physError) {
      return NextResponse.json({ error: `创建记录失败: ${physError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: physRow });
  } catch (error) {
    console.error("创建填写记录失败:", error);
    return NextResponse.json({ error: "创建填写记录失败" }, { status: 500 });
  }
}
