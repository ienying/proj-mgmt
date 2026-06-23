import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 将字段类型映射为 PostgreSQL 类型
function mapColumnType(type: string): string {
  const typeMap: Record<string, string> = {
    text: "TEXT",
    number: "NUMERIC",
    date: "DATE",
    datetime: "TIMESTAMP WITH TIME ZONE",
    boolean: "BOOLEAN",
    select: "TEXT",
    textarea: "TEXT",
    json: "JSONB",
  };
  return typeMap[type] || "TEXT";
}

// 构建创建物理表的 SQL
function buildCreateTableSQL(tableCode: string, columnsConfig: Array<{name: string; type: string}>): string {
  const physicalTableName = `std_definition_${tableCode}`;

  const columnDefs: string[] = [
    "id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()",
    "project_id VARCHAR(36)",
    "sort_order INTEGER DEFAULT 0",
    "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
    "updated_at TIMESTAMP WITH TIME ZONE",
    "created_by VARCHAR(36)",
    "allow_delete BOOLEAN DEFAULT TRUE",
    "data_source TEXT DEFAULT 'standard'",
  ];

  if (columnsConfig && Array.isArray(columnsConfig)) {
    for (const col of columnsConfig) {
      if (col.name) {
        const pgType = mapColumnType(col.type || "text");
        const safeName = col.name.replace(/"/g, '""');
        columnDefs.push(`"${safeName}" ${pgType}`);
      }
    }
  }

  return `CREATE TABLE IF NOT EXISTS design_public.${physicalTableName} (\n      ${columnDefs.join(",\n      ")}\n    )`;
}

export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const includeTaskTables = searchParams.get("include_task_tables") === "true";

    const { data, error } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 默认过滤掉任务表单自动生成的 task_ 临时表
    const rows = (data || []) as Array<Record<string, unknown>>;
    const filtered = includeTaskTables
      ? rows
      : rows.filter(
          (d) => !String(d.table_code || "").startsWith("task_")
        );

    // 按 sort_order 排序
    const sortedData = filtered.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0)
    );

    return NextResponse.json({ data: sortedData });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      table_code,
      table_name,
      module_type,
      description,
      columns_config,
      apply_project_types,
      apply_project_stages,
      sort_order = 0,
      is_active = true,
    } = body;

    // 验证表代码格式（只允许小写字母、数字、下划线）
    if (!/^[a-z][a-z0-9_]*$/.test(table_code)) {
      return NextResponse.json(
        { error: "表代码只能包含小写字母、数字和下划线，且必须以字母开头" },
        { status: 400 }
      );
    }

    // 检查表代码是否已存在
    const { data: existingData } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (existingData && Array.isArray(existingData)) {
      const existing = existingData.find(
        (item: Record<string, unknown>) => item.table_code === table_code
      );
      if (existing) {
        return NextResponse.json({ error: "表代码已存在" }, { status: 400 });
      }
    }

    // 1. 在 data_table_definitions 表中插入元数据
    const insertData: Record<string, unknown> = {
      table_code,
      table_name,
      module_type: module_type || [],
      description,
      columns_config: columns_config || [],
      references_config: body.references_config || [],
      apply_project_types: apply_project_types || [],
      apply_project_stages: apply_project_stages || [],
      sort_order,
      is_active,
      allow_add: body.allow_add !== undefined ? body.allow_add : true,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "data_table_definitions",
      p_data: insertData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. 创建物理表 std_definition_{table_code}
    const createTableSQL = buildCreateTableSQL(table_code, columns_config || []);

    const { error: createError } = await client.rpc("execute_sql", {
      p_sql: createTableSQL,
    });

    if (createError) {
      console.error("创建物理表失败:", createError);
      // 不回滚元数据插入，因为表定义已保存，可以稍后手动创建物理表
    }

    return NextResponse.json({ data, physicalTable: `std_definition_${table_code}` }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 重建物理表（用于修复因列名特殊字符导致建表失败的情况）
export async function PATCH(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { table_code } = body;

    if (!table_code) {
      return NextResponse.json({ error: "缺少 table_code" }, { status: 400 });
    }

    // 查找定义
    const { data: existingData } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });
    const rows = existingData as Array<Record<string, unknown>> | null;
    const def = rows?.find((r) => r.table_code === table_code);
    if (!def) {
      return NextResponse.json({ error: "表定义不存在" }, { status: 404 });
    }

    const columnsConfig = (def.columns_config as Array<{name: string; type: string}>) || [];
    const createTableSQL = buildCreateTableSQL(table_code, columnsConfig);

    const { error: createError } = await client.rpc("execute_sql", {
      p_sql: createTableSQL,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, physicalTable: `std_definition_${table_code}` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
