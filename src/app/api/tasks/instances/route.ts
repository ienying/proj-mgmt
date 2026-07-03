import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const defId = searchParams.get("def_id");
    const status = searchParams.get("status");
    const mode = searchParams.get("mode"); // "my_published" | "my_todos" | "all"

    const client = await createServerClient();
    const conditions: string[] = [];

    if (defId) {
      conditions.push(`i.def_id = '${defId.replace(/'/g, "''")}'`);
    }
    if (status) {
      conditions.push(`i.status = '${status.replace(/'/g, "''")}'`);
    }

    if (mode === "my_todos" && userId) {
      conditions.push(`i.assignee_id = '${userId.replace(/'/g, "''")}'`);
      conditions.push(`i.status IN ('pending', 'in_progress')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT i.*, d.task_name, d.time_type, d.task_mode, d.schema_name, d.table_name,
             d.created_by AS def_created_by, d.created_by_name AS def_created_by_name
      FROM public.task_center_instances i
      JOIN public.task_center_defs d ON i.def_id = d.id
      ${whereClause}
      ORDER BY i.created_at DESC
    `;

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If mode is "my_published", filter by def.created_by
    let result = data || [];
    if (mode === "my_published" && userId) {
      result = (result as any[]).filter((r: any) => r.def_created_by === userId);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("获取任务实例列表失败:", error);
    return NextResponse.json({ error: "获取任务实例列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { def_id, period_label, project_id, project_name, due_date } = body;

    if (!def_id) {
      return NextResponse.json({ error: "缺少 def_id" }, { status: 400 });
    }

    const client = await createServerClient();

    // 1. Fetch definition
    const { data: def, error: defError } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs",
      p_id: def_id,
    });
    if (defError || !def) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }

    const d = def as Record<string, any>;
    const taskMode = d.task_mode;
    const schemaName = d.schema_name;
    const tableName = d.table_name;
    const boardRecords = d.board_records || [];
    const workflowNodes = d.workflow_nodes || [];
    const formColumns = d.form_columns || [];

    // 2. Ensure parallel_group_id column exists
    await client.rpc("execute_sql", {
      p_sql: `ALTER TABLE public.task_center_instances ADD COLUMN IF NOT EXISTS parallel_group_id VARCHAR(36)`,
    }).catch(() => {});

    // 3. Determine initial assignee(s)
    let assigneeId: string | null = null;
    let assigneeName: string | null = null;
    let currentNodeId: string | null = null;
    let currentNodeIndex = 0;
    let isParallelFirstNode = false;
    let parallelGroupId: string | null = null;

    if (taskMode === "process" && workflowNodes.length > 0) {
      const firstNode = workflowNodes[0];
      currentNodeId = firstNode.id;
      currentNodeIndex = 0;

      if (firstNode.node_type === "parallel" && firstNode.handler_ids?.length > 0) {
        isParallelFirstNode = true;
        parallelGroupId = crypto.randomUUID();
      } else {
        assigneeId = firstNode.handler_id || null;
        assigneeName = firstNode.handler_name || null;
      }
    }

    // Helper: build physical table insert data
    const buildRowData = (handlerId?: string): Record<string, any> => {
      const rowData: Record<string, any> = {
        project_id: project_id || null,
        submitted_by: handlerId || null,
      };
      for (const col of formColumns) {
        if (col.default_value !== undefined && col.default_value !== null && col.default_value !== "") {
          rowData[col.name] = col.default_value;
        }
      }
      return rowData;
    };

    // Helper: copy board record data
    const copyBoardData = async (rowData: Record<string, any>) => {
      if (boardRecords.length > 0) {
        for (const ref of boardRecords) {
          try {
            const sourceSchema = ref.source_schema;
            const sourceTable = ref.source_table;
            const sourceRecordId = ref.source_record_id;
            const { data: sourceRows } = await client.rpc("execute_sql", {
              p_sql: `SELECT * FROM ${sourceSchema}."${sourceTable}" WHERE id = '${String(sourceRecordId).replace(/'/g, "''")}'`,
            });
            if (sourceRows && Array.isArray(sourceRows) && sourceRows.length > 0) {
              const sourceRow = sourceRows[0] as Record<string, any>;
              for (const cc of ref.copy_columns || []) {
                rowData[cc.target_col] = sourceRow[cc.source_col] ?? null;
              }
            }
          } catch (e) {
            console.warn(`复制看板记录 ${ref.ref_id} 失败:`, e);
          }
        }
      }
    };

    // Helper: create one instance + phys row
    const createOneInstance = async (handlerId: string | null, handlerName: string | null) => {
      const rowData = buildRowData(handlerId || undefined);
      await copyBoardData(rowData);

      const { data: physRow, error: physError } = await client.rpc("dp_insert_generic", {
        p_schema: schemaName,
        p_table: tableName,
        p_data: rowData,
      });
      if (physError) throw new Error(`写入物理表失败: ${physError.message}`);

      const { data: instance, error: instError } = await client.rpc("dp_insert", {
        p_table: "public.task_center_instances",
        p_data: {
          def_id,
          period_label: period_label || null,
          assignee_id: handlerId,
          assignee_name: handlerName,
          current_node_id: currentNodeId,
          current_node_index: currentNodeIndex,
          node_history: [],
          status: "pending",
          project_id: project_id || null,
          project_name: project_name || null,
          due_date: due_date || null,
          parallel_group_id: parallelGroupId,
        },
      });
      if (instError) throw new Error(`创建实例失败: ${instError.message}`);

      const physId = (physRow as Record<string, any>)?.id;
      if (physId) {
        await client.rpc("execute_sql", {
          p_sql: `UPDATE ${schemaName}."${tableName}" SET instance_id = '${String((instance as Record<string, any>).id).replace(/'/g, "''")}' WHERE id = '${String(physId).replace(/'/g, "''")}'`,
        });
      }
      return instance;
    };

    // 4. Create instances
    if (isParallelFirstNode) {
      const firstNode = workflowNodes[0];
      const instances: any[] = [];
      for (let idx = 0; idx < firstNode.handler_ids.length; idx++) {
        const handlerId = firstNode.handler_ids[idx];
        const handlerName = firstNode.handler_names?.[idx] || "";
        try {
          const inst = await createOneInstance(handlerId, handlerName);
          instances.push(inst);
        } catch (e: any) {
          console.error(`为 ${handlerName} 创建实例失败:`, e.message);
        }
      }
      return NextResponse.json({ data: instances, parallel_group_id: parallelGroupId });
    }

    // Sequential (original path)
    const instance = await createOneInstance(assigneeId, assigneeName);
    return NextResponse.json({ data: instance });
  } catch (error) {
    console.error("创建任务实例失败:", error);
    return NextResponse.json({ error: "创建任务实例失败" }, { status: 500 });
  }
}
