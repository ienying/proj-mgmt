import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import type { ColumnConfig } from "@/storage/database/shared/schema";

// 获取表数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();

    // 表名格式: std_definition_{tableCode}
    const tableName = `std_definition_${tableCode}`;

    // 使用 query_to_jsonb 查询数据，按 sort_order 排序
    const { data, error } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (SELECT * FROM design_public.${tableName} ORDER BY sort_order, created_at DESC) t`,
    });

    if (error) {
      // 如果查询失败，可能表不存在
      return NextResponse.json({ data: [], error: error.message });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 添加记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();
    const body = await request.json();

    const tableName = `std_definition_${tableCode}`;

    // 获取表的列类型信息，用于空字符串转 null
    const { data: colInfo } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT jsonb_object_agg(column_name, data_type) FROM information_schema.columns WHERE table_schema = 'design_public' AND table_name = '${tableName}'`,
    });
    const columnTypes = (colInfo as Record<string, string>) || {};

    // 非字符串类型的列，空字符串转为 null
    const cleanedBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value === "" && columnTypes[key] && !["text", "character varying", "varchar"].includes(columnTypes[key])) {
        cleanedBody[key] = null;
      } else {
        cleanedBody[key] = value;
      }
    }

    // 获取当前最大 sort_order
    const { data: maxOrderData } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM design_public.${tableName}`,
    });
    const maxOrder = (maxOrderData as { max_order: number })?.max_order || 0;

    // 添加 sort_order 和 data_source
    const dataWithOrder = { ...cleanedBody, sort_order: maxOrder + 1, data_source: cleanedBody.data_source || "standard" };

    // 使用 dp_insert_generic RPC 函数插入数据
    const { data, error } = await client.rpc("dp_insert_generic", {
      p_schema: "design_public",
      p_table: tableName,
      p_data: dataWithOrder,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 更新记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();
    const body = await request.json();
    const { id, data: updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少记录 ID" }, { status: 400 });
    }

    const tableName = `std_definition_${tableCode}`;

    // 获取表定义，找出只读字段
    const { data: tableDef } = await client.rpc("dp_select", { p_table: "data_table_definitions" });
    const def = (tableDef as Array<{ table_code: string; columns_config: ColumnConfig[] }>)?.find(
      (t) => t.table_code === tableCode
    );
    
    // 获取只读字段列表
    const readonlyColumns = def?.columns_config
      ?.filter((col) => col.readonly)
      ?.map((col) => col.name) || [];

    // 系统字段也是只读的
    const systemReadonlyColumns = ["id", "created_at", "created_by", "updated_at", "sort_order", "data_source"];
    const allReadonlyColumns = [...readonlyColumns, ...systemReadonlyColumns];

    // 过滤掉只读字段
    const filteredData = { ...updateData };
    allReadonlyColumns.forEach((col) => delete filteredData[col]);

    // 获取表的列类型信息，用于空字符串转 null
    const { data: colInfo } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT jsonb_object_agg(column_name, data_type) FROM information_schema.columns WHERE table_schema = 'design_public' AND table_name = '${tableName}'`,
    });
    const columnTypes = (colInfo as Record<string, string>) || {};

    // 使用 execute_sql 更新数据
    const setClauses = Object.entries(filteredData)
      .filter(([key]) => !allReadonlyColumns.includes(key))
      .map(([key, value]) => {
        const quotedKey = `"${key}"`;
        if (value === null || value === undefined) {
          return `${quotedKey} = NULL`;
        }
        // 非字符串类型的空字符串转为 NULL
        if (value === "" && columnTypes[key] && !["text", "character varying", "varchar"].includes(columnTypes[key])) {
          return `${quotedKey} = NULL`;
        }
        if (typeof value === "string") {
          return `${quotedKey} = '${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === "boolean") {
          return `${quotedKey} = ${value ? "TRUE" : "FALSE"}`;
        }
        return `${quotedKey} = ${value}`;
      })
      .join(", ");

    if (!setClauses) {
      return NextResponse.json({ error: "没有要更新的数据" }, { status: 400 });
    }

    const updateSQL = `UPDATE design_public.${tableName} SET ${setClauses}, updated_at = NOW() WHERE id = '${id}'`;

    const { error } = await client.rpc("execute_sql", { p_sql: updateSQL });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 删除记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少记录 ID" }, { status: 400 });
    }

    const tableName = `std_definition_${tableCode}`;

    const deleteSQL = `DELETE FROM design_public.${tableName} WHERE id = '${id}'`;

    const { error } = await client.rpc("execute_sql", { p_sql: deleteSQL });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 调整记录顺序
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();
    const body = await request.json();

    const tableName = `std_definition_${tableCode}`;

    // 拖拽排序模式：传入 fromIndex 和 toIndex
    if (body.fromIndex !== undefined && body.toIndex !== undefined) {
      const { fromIndex, toIndex } = body;
      if (fromIndex === toIndex) {
        return NextResponse.json({ success: true });
      }

      // 获取所有记录按 sort_order 排序
      const { data: allRecordsRaw } = await client.rpc("dp_select", {
        p_table: tableName.replace('std_definition_', 'std_definition_'),
      });
      // dp_select 返回 design_public 的表，需要带 schema 前缀
      // 改用 execute_sql 直接查询
      const { data: sqlResult } = await client.rpc("execute_sql", {
        p_sql: `SELECT id, sort_order FROM design_public.${tableName} ORDER BY sort_order`,
      });

      const records = ((sqlResult || []) as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        sort_order: Number(r.sort_order),
      }));
      if (fromIndex < 0 || fromIndex >= records.length || toIndex < 0 || toIndex >= records.length) {
        return NextResponse.json({ error: "索引越界" }, { status: 400 });
      }

      // 从 fromIndex 移出，插入到 toIndex
      const [moved] = records.splice(fromIndex, 1);
      records.splice(toIndex, 0, moved);

      // 批量更新 sort_order
      const cases = records.map((r, i) => `WHEN id = '${r.id}' THEN ${i}`).join("\n        ");
      const ids = records.map((r) => `'${r.id}'`).join(", ");
      const updateSQL = `
        UPDATE design_public.${tableName} SET sort_order = CASE
          ${cases}
        END
        WHERE id IN (${ids})
      `;

      const { error } = await client.rpc("execute_sql", { p_sql: updateSQL });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // 旧模式：up/down 移动（兼容保留）
    const { id, direction } = body;
    if (!id || !direction) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const { data: sqlResultOld } = await client.rpc("execute_sql", {
      p_sql: `SELECT id, sort_order FROM design_public.${tableName} ORDER BY sort_order`,
    });
    const allRecords = ((sqlResultOld || []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      sort_order: Number(r.sort_order),
    }));

    const records = allRecords as Array<{ id: string; sort_order: number }>;
    const currentIndex = records.findIndex((r) => r.id === id);

    if (currentIndex === -1) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= records.length) {
      return NextResponse.json({ error: "无法移动" }, { status: 400 });
    }

    const currentRecord = records[currentIndex];
    const targetRecord = records[targetIndex];

    const updateSQL = `
      UPDATE design_public.${tableName} SET sort_order = CASE 
        WHEN id = '${currentRecord.id}' THEN ${targetRecord.sort_order}
        WHEN id = '${targetRecord.id}' THEN ${currentRecord.sort_order}
        ELSE sort_order
      END
      WHERE id IN ('${currentRecord.id}', '${targetRecord.id}')
    `;

    const { error } = await client.rpc("execute_sql", { p_sql: updateSQL });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
