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

const COLUMN_TYPE_SQL: Record<string, string> = {
  text: "TEXT", number: "NUMERIC", date: "DATE", datetime: "TIMESTAMP WITH TIME ZONE",
  boolean: "BOOLEAN", select: "TEXT", textarea: "TEXT", json: "JSONB",
};

function getSchemaName(timeType: string, taskMode: string): string {
  return `design_task_center_${taskMode}_${timeType}`;
}

function buildPhysSQL(schema: string, table: string, formColumns: any[], boardRecords: any[]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE IF NOT EXISTS ${schema}."${table}" (`);
  lines.push(`  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  instance_id VARCHAR(36), project_id VARCHAR(36), submitted_by VARCHAR(36),`);
  lines.push(`  node_id VARCHAR(36), _source_ref_id VARCHAR(36), _source_schema VARCHAR(100), _source_table VARCHAR(100), _source_record_id VARCHAR(36),`);
  lines.push(`  sort_order INTEGER DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE`);
  for (const col of formColumns) {
    lines.push(`,  "${col.name}" ${COLUMN_TYPE_SQL[col.type] || "TEXT"}`);
  }
  if (boardRecords) {
    for (const ref of boardRecords) {
      for (const cc of ref.copy_columns || []) { lines.push(`,  "${cc.target_col}" TEXT`); }
      for (const fc of ref.feedback_columns || []) { lines.push(`,  "${fc.target_col}" ${COLUMN_TYPE_SQL[fc.type] || "TEXT"}`); }
    }
  }
  lines.push(`)`);
  return lines.join("\n");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await createServerClient();

    // Fetch current def
    const { data: currentDef } = await client.rpc("dp_get_by_id", {
      p_table: "public.task_center_defs", p_id: id,
    });
    if (!currentDef) {
      return NextResponse.json({ error: "任务定义不存在" }, { status: 404 });
    }
    const d = currentDef as Record<string, any>;
    const wasDraft = d.status === "draft";
    const isPublishing = wasDraft && body.status === "active";

    // If publishing a draft, create schema + physical table
    if (isPublishing || (wasDraft && body.time_type && body.task_mode && !d.schema_name)) {
      const taskMode = body.task_mode || d.task_mode;
      const timeType = body.time_type || d.time_type;
      const formColumns = body.form_columns || d.form_columns || [];
      const boardRecords = body.board_records || d.board_records || [];
      const schemaName = getSchemaName(timeType, taskMode);
      const tableName = `task_${Date.now()}`;

      await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName}` });
      const createSQL = buildPhysSQL(schemaName, tableName, formColumns, boardRecords);
      await client.rpc("execute_sql", { p_sql: createSQL });

      body.schema_name = schemaName;
      body.table_name = tableName;
      body.status = "active";

      // Create initial instances
      const workflowNodes = body.workflow_nodes || d.workflow_nodes || [];
      if (taskMode === "process" && workflowNodes.length > 0) {
        const firstNode = workflowNodes[0];
        if (firstNode.node_type === "parallel" && firstNode.handler_ids?.length > 0) {
          const crypto = await import("crypto");
          const gid = crypto.randomUUID();
          for (let hi = 0; hi < firstNode.handler_ids.length; hi++) {
            const hid = firstNode.handler_ids[hi];
            const hname = firstNode.handler_names?.[hi] || "";
            const rowData: Record<string, any> = { submitted_by: hid };
            for (const col of formColumns) {
              if (col.default_value != null && col.default_value !== "") rowData[col.name] = col.default_value;
            }
            const { data: pr } = await client.rpc("dp_insert_generic", { p_schema: schemaName, p_table: tableName, p_data: rowData });
            const { data: inst } = await client.rpc("dp_insert", {
              p_table: "public.task_center_instances",
              p_data: { def_id: id, assignee_id: hid, assignee_name: hname, current_node_id: firstNode.id, current_node_index: 0, node_history: [], status: "pending", due_date: (body.deadline_config || d.deadline_config)?.due_date || null, parallel_group_id: gid },
            });
            if (inst && pr) {
              const pid = (pr as any)?.id;
              if (pid) await client.rpc("execute_sql", { p_sql: `UPDATE ${schemaName}."${tableName}" SET instance_id = '${(inst as any).id}' WHERE id = '${pid}'` });
            }
          }
        } else {
          const rowData: Record<string, any> = {};
          for (const col of formColumns) {
            if (col.default_value != null && col.default_value !== "") rowData[col.name] = col.default_value;
          }
          const { data: pr } = await client.rpc("dp_insert_generic", { p_schema: schemaName, p_table: tableName, p_data: rowData });
          const { data: inst } = await client.rpc("dp_insert", {
            p_table: "public.task_center_instances",
            p_data: { def_id: id, assignee_id: firstNode.handler_id || null, assignee_name: firstNode.handler_name || null, current_node_id: firstNode.id, current_node_index: 0, node_history: [], status: "pending", due_date: (body.deadline_config || d.deadline_config)?.due_date || null },
          });
          if (inst && pr) {
            const pid = (pr as any)?.id;
            if (pid) await client.rpc("execute_sql", { p_sql: `UPDATE ${schemaName}."${tableName}" SET instance_id = '${(inst as any).id}' WHERE id = '${pid}'` });
          }
        }
      }
    }

    // Allow updating fields
    const allowedUpdates: Record<string, any> = {};
    const allowedFields = ["task_name", "time_type", "task_mode", "periodic_config", "form_columns", "workflow_nodes", "assignee_config", "board_records", "deadline_config", "status", "schema_name", "table_name"];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        allowedUpdates[field] = body[field];
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "public.task_center_defs", p_id: id, p_data: allowedUpdates,
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
