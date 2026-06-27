import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 批量查询：一次请求查多个表的关联流程，大幅减少数据库连接数
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get("schema");
    const tables = searchParams.get("tables"); // 逗号分隔的表名列表

    if (!schema || !tables) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const tableList = tables.split(",").map(t => t.trim()).filter(Boolean);
    if (tableList.length === 0) {
      return NextResponse.json({ data: {} });
    }

    const client = await createServerClient();
    const escSchema = schema.replace(/'/g, "''");

    // 构建 IN 子句
    const tablePlaceholders = tableList.map(t => `'${t.replace(/'/g, "''")}'`).join(", ");

    const sql = `
      SELECT d.id as def_id, d.task_name, d.task_mode, d.workflow_nodes, d.board_records,
             i.id as instance_id, i.status, i.current_node_index, i.node_history, i.current_node_id,
             br->>'source_table' as source_table, br->>'source_record_id' as source_record_id
      FROM public.task_center_defs d
      LEFT JOIN public.task_center_instances i ON i.def_id = d.id
      CROSS JOIN LATERAL jsonb_array_elements(d.board_records) AS br
      WHERE d.board_records IS NOT NULL
        AND br->>'source_schema' = '${escSchema}'
        AND br->>'source_table' IN (${tablePlaceholders})
      ORDER BY d.task_name, i.created_at DESC
    `;

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按 table + def_id 分组
    const resultMap: Record<string, Record<string, { def_id: string; task_name: string; task_mode: string; workflow_nodes: any; referenced_record_ids: string[]; instances: any[] }>> = {};

    const rows = (data || []) as any[];
    for (const row of rows) {
      const tableName = row.source_table;
      const defId = row.def_id;

      if (!resultMap[tableName]) resultMap[tableName] = {};

      if (!resultMap[tableName][defId]) {
        resultMap[tableName][defId] = {
          def_id: row.def_id,
          task_name: row.task_name,
          task_mode: row.task_mode,
          workflow_nodes: row.workflow_nodes,
          referenced_record_ids: [],
          instances: [],
        };
      }

      if (row.source_record_id && !resultMap[tableName][defId].referenced_record_ids.includes(row.source_record_id)) {
        resultMap[tableName][defId].referenced_record_ids.push(row.source_record_id);
      }

      if (row.instance_id) {
        // 去重 instance
        const exists = resultMap[tableName][defId].instances.some((inst: any) => inst.instance_id === row.instance_id);
        if (!exists) {
          resultMap[tableName][defId].instances.push({
            instance_id: row.instance_id,
            status: row.status,
            current_node_index: row.current_node_index,
            node_history: row.node_history,
            current_node_id: row.current_node_id,
          });
        }
      }
    }

    // 转换为数组格式
    const finalMap: Record<string, any[]> = {};
    for (const [tableName, defs] of Object.entries(resultMap)) {
      finalMap[tableName] = Object.values(defs);
    }

    return NextResponse.json({ data: finalMap });
  } catch (error) {
    console.error("批量查询关联流程失败:", error);
    return NextResponse.json({ error: "查询关联流程失败" }, { status: 500 });
  }
}
