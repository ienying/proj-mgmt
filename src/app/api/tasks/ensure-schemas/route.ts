import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const SCHEMAS = [
  "design_task_center_process_one_time",
  "design_task_center_process_periodicity",
  "design_task_center_project_one_time",
  "design_task_center_project_periodicity",
];

export async function POST() {
  try {
    const client = await createServerClient();

    // 1. Create 4 schemas
    for (const schema of SCHEMAS) {
      const { error } = await client.rpc("execute_sql", {
        p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema}`,
      });
      if (error) {
        return NextResponse.json({ error: `创建 schema ${schema} 失败: ${error.message}` }, { status: 500 });
      }
    }

    // 2. Create task_center_defs table in public schema
    const { error: defsError } = await client.rpc("execute_sql", {
      p_sql: `CREATE TABLE IF NOT EXISTS public.task_center_defs (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        task_name VARCHAR(255) NOT NULL,
        time_type VARCHAR(20) NOT NULL,
        task_mode VARCHAR(20) NOT NULL,
        periodic_config JSONB,
        form_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
        workflow_nodes JSONB,
        assignee_config JSONB,
        board_records JSONB,
        deadline_config JSONB,
        schema_name VARCHAR(100) NOT NULL,
        table_name VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by VARCHAR(36) NOT NULL,
        created_by_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE
      )`,
    });
    if (defsError) {
      return NextResponse.json({ error: `创建 task_center_defs 失败: ${defsError.message}` }, { status: 500 });
    }

    // 3. Create task_center_instances table in public schema
    const { error: instError } = await client.rpc("execute_sql", {
      p_sql: `CREATE TABLE IF NOT EXISTS public.task_center_instances (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        def_id VARCHAR(36) NOT NULL,
        period_label VARCHAR(50),
        assignee_id VARCHAR(36),
        assignee_name VARCHAR(100),
        current_node_id VARCHAR(36),
        current_node_index INTEGER DEFAULT 0,
        node_history JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        project_id VARCHAR(36),
        project_name VARCHAR(255),
        due_date VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE
      )`,
    });
    if (instError) {
      return NextResponse.json({ error: `创建 task_center_instances 失败: ${instError.message}` }, { status: 500 });
    }

    // 4. Create indexes if not exist (idempotent via DO block)
    await client.rpc("execute_sql", {
      p_sql: `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'task_center_defs_status_idx') THEN
          CREATE INDEX task_center_defs_status_idx ON public.task_center_defs(status);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'task_center_defs_created_by_idx') THEN
          CREATE INDEX task_center_defs_created_by_idx ON public.task_center_defs(created_by);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'task_center_instances_def_id_idx') THEN
          CREATE INDEX task_center_instances_def_id_idx ON public.task_center_instances(def_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'task_center_instances_assignee_idx') THEN
          CREATE INDEX task_center_instances_assignee_idx ON public.task_center_instances(assignee_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'task_center_instances_status_idx') THEN
          CREATE INDEX task_center_instances_status_idx ON public.task_center_instances(status);
        END IF;
      END $$`,
    });

    return NextResponse.json({ data: { schemas: SCHEMAS, tables: ["task_center_defs", "task_center_instances"] } });
  } catch (error) {
    console.error("初始化任务中心 schema 失败:", error);
    return NextResponse.json({ error: "初始化失败" }, { status: 500 });
  }
}
