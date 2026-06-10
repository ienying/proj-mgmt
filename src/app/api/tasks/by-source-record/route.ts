import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get("schema");
    const table = searchParams.get("table");

    if (!schema || !table) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const client = await createServerClient();
    const escSchema = schema.replace(/'/g, "''");
    const escTable = table.replace(/'/g, "''");

    const sql = `
      SELECT d.id as def_id, d.task_name, d.task_mode, d.workflow_nodes, d.board_records,
             i.id as instance_id, i.status, i.current_node_index, i.node_history, i.current_node_id
      FROM public.task_center_defs d
      LEFT JOIN public.task_center_instances i ON i.def_id = d.id
      WHERE d.board_records IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(d.board_records) AS br
          WHERE br->>'source_schema' = '${escSchema}'
            AND br->>'source_table' = '${escTable}'
        )
      ORDER BY d.task_name, i.created_at DESC
    `;

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by def + map referenced record_ids
    const defMap: Record<string, any> = {};
    const rows = (data || []) as any[];

    for (const row of rows) {
      if (!defMap[row.def_id]) {
        const boardRecords = row.board_records || [];
        const referencedIds = boardRecords
          .filter((br: any) => br.source_schema === schema && br.source_table === table)
          .map((br: any) => br.source_record_id);
        defMap[row.def_id] = {
          def_id: row.def_id,
          task_name: row.task_name,
          task_mode: row.task_mode,
          workflow_nodes: row.workflow_nodes,
          referenced_record_ids: referencedIds,
          instances: [] as any[],
        };
      }
      if (row.instance_id) {
        defMap[row.def_id].instances.push({
          instance_id: row.instance_id,
          status: row.status,
          current_node_index: row.current_node_index,
          node_history: row.node_history,
          current_node_id: row.current_node_id,
        });
      }
    }

    return NextResponse.json({ data: Object.values(defMap) });
  } catch (error) {
    console.error("查询关联流程失败:", error);
    return NextResponse.json({ error: "查询关联流程失败" }, { status: 500 });
  }
}
