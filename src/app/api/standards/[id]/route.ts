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

export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // 获取原有数据
    const { data: existingData } = await client.rpc("dp_get_by_id", {
      p_table: "data_table_definitions",
      p_id: id,
    });

    if (!existingData) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "data_table_definitions",
      p_id: id,
      p_data: updateData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 如果列配置变化，需要更新物理表结构（添加新列）
    if (updateData.columns_config && existingData.table_code) {
      const physicalTableName = `std_definition_${existingData.table_code}`;
      const existingColumns = existingData.columns_config || [];
      const newColumns = updateData.columns_config || [];

      // 找出新添加的列
      const existingColNames = new Set(
        existingColumns.map((c: { name: string }) => c.name.toLowerCase().replace(/\s+/g, "_"))
      );

      for (const col of newColumns) {
        const colName = col.name.toLowerCase().replace(/\s+/g, "_");
        if (!existingColNames.has(colName) && col.name) {
          const pgType = mapColumnType(col.type || "text");
          const alterSQL = `ALTER TABLE design_public.${physicalTableName} ADD COLUMN IF NOT EXISTS ${colName} ${pgType}`;
          
          await client.rpc("execute_sql", { p_sql: alterSQL });
        }
      }
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // 获取原有数据，以便删除物理表
    const { data: existingData } = await client.rpc("dp_get_by_id", {
      p_table: "data_table_definitions",
      p_id: id,
    });

    // 删除元数据
    const { error } = await client.rpc("dp_delete", {
      p_table: "data_table_definitions",
      p_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 删除物理表
    if (existingData && existingData.table_code) {
      const physicalTableName = `std_definition_${existingData.table_code}`;
      const dropSQL = `DROP TABLE IF EXISTS design_public.${physicalTableName}`;
      
      await client.rpc("execute_sql", { p_sql: dropSQL });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
