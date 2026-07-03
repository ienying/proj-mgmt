import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params;
    const client = await createServerClient();

    // Get instance to find schema/table
    const { data: instance } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_instances",
      p_id: id,
    });
    if (!instance) {
      return NextResponse.json({ error: "实例不存在" }, { status: 404 });
    }

    const inst = instance as Record<string, any>;

    // Get definition
    const { data: def } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: inst.def_id,
    });
    if (!def) {
      return NextResponse.json({ error: "定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;

    // Delete physical row
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM ${d.schema_name}."${d.table_name}" WHERE id = '${String(recordId).replace(/'/g, "''")}' AND instance_id = '${String(id).replace(/'/g, "''")}'`,
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("删除填写记录失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
