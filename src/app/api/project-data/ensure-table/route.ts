import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * POST: 确保项目 Schema 中存在指定表（不存在则创建）
 * 参数: projectSchema, tableCode
 */
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema, tableCode } = body;

    if (!projectSchema || !tableCode) {
      return NextResponse.json({ error: "projectSchema and tableCode required" }, { status: 400 });
    }

    // 1. 检查表是否已存在
    const { data: tableCheck, error: checkError } = await client.rpc("execute_sql", {
      p_sql: `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = '${projectSchema}' AND table_name = '${tableCode}'
      ) AS exists_flag`,
    });

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if ((tableCheck as Array<Record<string, unknown>>)?.[0]?.exists_flag) {
      // 表已存在，检查并补充缺失的 _module_code 列
      await ensureModuleCodeColumn(client, projectSchema, tableCode);
      return NextResponse.json({ existed: true });
    }

    // 2. 从 data_table_definitions 获取列配置
    const { data: definitions, error: defError } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (defError) {
      return NextResponse.json({ error: defError.message }, { status: 500 });
    }

    const tableDef = (definitions as Record<string, unknown>[])?.find(
      (d: Record<string, unknown>) => d.table_code === tableCode
    );

    if (!tableDef) {
      return NextResponse.json({ error: "规范表定义不存在" }, { status: 404 });
    }

    // 3. 构建建表 SQL
    const columnsConfig = (tableDef.columns_config || []) as Array<{
      name: string;
      type: string;
    }>;

    const columnDefs = columnsConfig.map((col) => {
      const sqlType = mapColumnTypeToSQL(col.type);
      return `"${col.name}" ${sqlType}`;
    });

    // 添加标准列
    columnDefs.push("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    columnDefs.push("sort_order INT DEFAULT 0");
    columnDefs.push("created_at TIMESTAMP WITH TIME ZONE DEFAULT now()");
    columnDefs.push("updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()");
    columnDefs.push("created_by VARCHAR(36)");
    columnDefs.push("allow_delete BOOLEAN DEFAULT true");
    columnDefs.push("data_source TEXT DEFAULT 'standard'");

    // 如果有 procurement_record 类型列，添加 _module_code
    const hasProcurementRecord = columnsConfig.some((col) => col.type === "procurement_record");
    if (hasProcurementRecord) {
      columnDefs.push('"_module_code" VARCHAR(255)');
    }

    const createSQL = `CREATE TABLE IF NOT EXISTS ${projectSchema}."${tableCode}" (${columnDefs.join(", ")})`;

    const { error: createError } = await client.rpc("execute_sql", {
      p_sql: createSQL,
    });

    if (createError) {
      console.error("创建表失败:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ created: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 确保表有 _module_code 列（如果有 procurement_record 列）
 */
async function ensureModuleCodeColumn(
  client: ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never,
  projectSchema: string,
  tableCode: string
) {
  try {
    // 检查是否有 procurement_record 类型列
    const { data: definitions } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    const tableDef = (definitions as Record<string, unknown>[])?.find(
      (d: Record<string, unknown>) => d.table_code === tableCode
    );

    if (!tableDef) return;

    const columnsConfig = (tableDef.columns_config || []) as Array<{ type: string }>;
    if (!columnsConfig.some((col) => col.type === "procurement_record")) return;

    // 检查是否已有 _module_code 列
    const { data: colCheck } = await client.rpc("execute_sql", {
      p_sql: `SELECT column_name FROM information_schema.columns 
              WHERE table_schema = '${projectSchema}' AND table_name = '${tableCode}' AND column_name = '_module_code'`,
    });

    if (!colCheck || (colCheck as Array<unknown>).length === 0) {
      await client.rpc("execute_sql", {
        p_sql: `ALTER TABLE ${projectSchema}."${tableCode}" ADD COLUMN "_module_code" VARCHAR(255)`,
      });
    }
  } catch {
    // 忽略补列错误，不影响主流程
  }
}

function mapColumnTypeToSQL(type: string): string {
  switch (type) {
    case "text":
    case "textarea":
      return "TEXT";
    case "number":
      return "NUMERIC";
    case "date":
      return "DATE";
    case "select":
    case "procurement_record":
      return "VARCHAR(255)";
    case "video":
      return "JSONB";
    default:
      return "TEXT";
  }
}
