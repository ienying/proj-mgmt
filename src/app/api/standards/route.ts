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
    const physicalTableName = `std_definition_${table_code}`;
    
    // 构建列定义 SQL
    const columnDefs: string[] = [
      "id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()",
      "project_id VARCHAR(36)", // 关联项目
      "sort_order INTEGER DEFAULT 0", // 排序字段
      "created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
      "updated_at TIMESTAMP WITH TIME ZONE",
      "created_by VARCHAR(36)", // 创建人
      "allow_delete BOOLEAN DEFAULT TRUE", // 是否允许项目删除
      "data_source TEXT DEFAULT 'standard'", // 数据来源: standard/manual
    ];

    // 添加用户定义的列
    if (columns_config && Array.isArray(columns_config)) {
      for (const col of columns_config) {
        if (col.name) {
          const pgType = mapColumnType(col.type || "text");
          const nullable = ""; // 必填校验在前端处理，数据库层不加 NOT NULL
          const colName = col.name.toLowerCase().replace(/\s+/g, "_");
          columnDefs.push(`${colName} ${pgType}${nullable}`);
        }
      }
    }

    const createTableSQL = `CREATE TABLE IF NOT EXISTS design_public.${physicalTableName} (
      ${columnDefs.join(",\n      ")}
    )`;

    // 执行创建表
    const { error: createError } = await client.rpc("execute_sql", {
      p_sql: createTableSQL,
    });

    if (createError) {
      console.error("创建物理表失败:", createError);
      // 不回滚元数据插入，因为表定义已保存，可以稍后手动创建物理表
    }

    return NextResponse.json({ data, physicalTable: physicalTableName }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
