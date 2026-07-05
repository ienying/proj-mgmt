import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const COLUMN_TYPE_SQL: Record<string, string> = {
  text: "TEXT",
  number: "NUMERIC",
  date: "DATE",
  datetime: "TIMESTAMP WITH TIME ZONE",
  boolean: "BOOLEAN",
  select: "TEXT",
  textarea: "TEXT",
  json: "JSONB",
};

function getSchemaName(timeType: string, taskMode: string): string {
  return `design_task_center_${taskMode}_${timeType}`;
}

function buildPhysicalTableSQL(schema: string, table: string, formColumns: any[], boardRecords: any[]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE IF NOT EXISTS ${schema}."${table}" (`);
  lines.push(`  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  instance_id VARCHAR(36),`);
  lines.push(`  project_id VARCHAR(36),`);
  lines.push(`  submitted_by VARCHAR(36),`);
  lines.push(`  node_id VARCHAR(36),`);
  lines.push(`  _source_ref_id VARCHAR(36),`);
  lines.push(`  _source_schema VARCHAR(100),`);
  lines.push(`  _source_table VARCHAR(100),`);
  lines.push(`  _source_record_id VARCHAR(36),`);
  lines.push(`  sort_order INTEGER DEFAULT 0,`);
  lines.push(`  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),`);
  lines.push(`  updated_at TIMESTAMP WITH TIME ZONE`);

  // Form columns
  for (const col of formColumns) {
    const colType = COLUMN_TYPE_SQL[col.type] || "TEXT";
    lines.push(`,  "${col.name}" ${colType}`);
  }

  // Board record expanded columns
  if (boardRecords) {
    for (const ref of boardRecords) {
      for (const cc of ref.copy_columns || []) {
        lines.push(`,  "${cc.target_col}" TEXT`);
      }
      for (const fc of ref.feedback_columns || []) {
        const colType = COLUMN_TYPE_SQL[fc.type] || "TEXT";
        lines.push(`,  "${fc.target_col}" ${colType}`);
      }
    }
  }

  lines.push(`)`);
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status") || "active";

    const client = await createServerClient();

    let sql: string;
    if (userId) {
      if (status === "draft") {
        sql = `SELECT * FROM public.task_center_defs WHERE created_by = '${userId.replace(/'/g, "''")}' AND status = 'draft' ORDER BY created_at DESC`;
      } else if (status === "all") {
        sql = `SELECT * FROM public.task_center_defs WHERE created_by = '${userId.replace(/'/g, "''")}' ORDER BY created_at DESC`;
      } else {
        sql = `SELECT * FROM public.task_center_defs WHERE created_by = '${userId.replace(/'/g, "''")}' AND status = '${status.replace(/'/g, "''")}' ORDER BY created_at DESC`;
      }
    } else {
      sql = `SELECT * FROM public.task_center_defs WHERE status = '${status.replace(/'/g, "''")}' ORDER BY created_at DESC`;
    }

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("获取任务定义列表失败:", error);
    return NextResponse.json({ error: "获取任务定义列表失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_name, time_type, task_mode, periodic_config, form_columns, workflow_nodes, assignee_config, board_records, deadline_config, created_by, created_by_name, status } = body;

    if (!task_name || !time_type || !task_mode || !form_columns || !created_by) {
      return NextResponse.json({ error: "缺少必填字段: task_name, time_type, task_mode, form_columns, created_by" }, { status: 400 });
    }

    if (!["one_time", "periodic"].includes(time_type)) {
      return NextResponse.json({ error: "time_type 必须为 one_time 或 periodic" }, { status: 400 });
    }
    if (!["process", "project"].includes(task_mode)) {
      return NextResponse.json({ error: "task_mode 必须为 process 或 project" }, { status: 400 });
    }

    const schemaName = getSchemaName(time_type, task_mode);
    const tableName = `task_${Date.now()}`;
    const isDraft = status === "draft";

    const client = await createServerClient();

    if (!isDraft) {
      // Active task: create schema and physical table
      const { error: schemaError } = await client.rpc("execute_sql", {
        p_sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName}`,
      });
      if (schemaError) {
        return NextResponse.json({ error: `创建 schema 失败: ${schemaError.message}` }, { status: 500 });
      }

      const createSQL = buildPhysicalTableSQL(schemaName, tableName, form_columns, board_records);
      const { error: tableError } = await client.rpc("execute_sql", { p_sql: createSQL });
      if (tableError) {
        return NextResponse.json({ error: `创建物理表失败: ${tableError.message}` }, { status: 500 });
      }
    }

    // Insert definition
    const { data: def, error: defError } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: {
        task_name,
        time_type,
        task_mode,
        periodic_config: periodic_config || null,
        form_columns,
        workflow_nodes: workflow_nodes || null,
        assignee_config: assignee_config || null,
        board_records: board_records || null,
        deadline_config: deadline_config || null,
        schema_name: isDraft ? null : schemaName,
        table_name: isDraft ? null : tableName,
        status: isDraft ? "draft" : "active",
        created_by,
        created_by_name: created_by_name || null,
      },
    });
    if (defError) {
      if (!isDraft) {
        await client.rpc("execute_sql", { p_sql: `DROP TABLE IF EXISTS ${schemaName}."${tableName}"` });
      }
      return NextResponse.json({ error: `创建任务定义失败: ${defError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: def });
  } catch (error) {
    console.error("创建任务定义失败:", error);
    return NextResponse.json({ error: "创建任务定义失败" }, { status: 500 });
  }
}
