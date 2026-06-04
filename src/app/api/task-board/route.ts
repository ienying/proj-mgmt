import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET: 获取看板记录和补充列数据
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const taskInstanceId = searchParams.get("task_instance_id");
    const taskDefId = searchParams.get("task_def_id");

    if (taskDefId) {
      // 获取补充列定义
      const { data: cols } = await client.rpc("dp_select", { p_table: "task_extra_columns" });
      const defCols = (cols as Array<Record<string, unknown>>)?.filter(c => c.task_def_id === taskDefId)
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      return NextResponse.json({ data: { columns: defCols || [] } });
    }

    if (taskInstanceId) {
      // 获取看板记录和补充列数据
      const { data: records } = await client.rpc("dp_select", { p_table: "task_board_records" });
      const boardRecords = (records as Array<Record<string, unknown>>)?.filter(r => r.task_instance_id === taskInstanceId)
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

      const { data: extraData } = await client.rpc("dp_select", { p_table: "task_extra_data" });
      const allData = extraData as Array<Record<string, unknown>> || [];

      // 组装数据
      const result = (boardRecords || []).map(r => ({
        ...r,
        extra: allData.filter(d => d.board_record_id === r.id),
      }));

      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ data: [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: 保存看板记录
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { task_instance_id, records } = body;

    // 删除旧的
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.task_board_records WHERE task_instance_id = '${task_instance_id}'`,
    });

    for (let i = 0; i < (records || []).length; i++) {
      const r = records[i];
      const id = crypto.randomUUID();
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.task_board_records (id, task_instance_id, sort_order, source_project_schema, source_table_code, source_record_id, source_label, source_data)
                VALUES ('${id}', '${task_instance_id}', ${i},
                        '${String(r.source_project_schema || "").replace(/'/g, "''")}',
                        '${String(r.source_table_code || "").replace(/'/g, "''")}',
                        '${String(r.source_record_id || "").replace(/'/g, "''")}',
                        '${String(r.source_label || "").replace(/'/g, "''")}',
                        '${JSON.stringify(r.source_data || {}).replace(/'/g, "''")}'::jsonb)`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT: 更新补充列定义
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { task_def_id, columns } = body;

    // 删除旧的
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.task_extra_columns WHERE task_def_id = '${task_def_id}'`,
    });

    for (let i = 0; i < (columns || []).length; i++) {
      const c = columns[i];
      const id = crypto.randomUUID();
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.task_extra_columns (id, task_def_id, name, type, options, writeback_column, fillable_by, sort_order)
                VALUES ('${id}', '${task_def_id}',
                        '${String(c.name || "").replace(/'/g, "''")}',
                        '${String(c.type || "text").replace(/'/g, "''")}',
                        ARRAY[${(c.options || []).map((o: string) => `'${o}'`).join(",")}],
                        '${String(c.writeback_column || "").replace(/'/g, "''")}',
                        '${String(c.fillable_by || "anyone").replace(/'/g, "''")}',
                        ${i})`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
