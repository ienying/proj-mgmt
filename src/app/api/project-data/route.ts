import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * GET: 查询项目 Schema 中的表数据
 * 参数: projectSchema, tableCode
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema");
    const tableCode = searchParams.get("tableCode");

    if (!projectSchema || !tableCode) {
      return NextResponse.json({ error: "projectSchema and tableCode required" }, { status: 400 });
    }

    const client = await createServerClient();

    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;

    // 查询项目 Schema 中的表数据
    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${safeSchema}."${tableCode}" ORDER BY sort_order, created_at`,
    });

    if (error) {
      // 表不存在(42P01)时静默返回空数据，其他错误才记录日志
      if ((error as { code?: string }).code !== '42P01') {
        console.error("查询表数据失败:", error);
      }
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: 新增记录到项目 Schema 表
 */
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema, tableCode, data } = body;

    if (!projectSchema || !tableCode || !data) {
      return NextResponse.json({ error: "projectSchema, tableCode and data required" }, { status: 400 });
    }

    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;

    // 如果调用方未指定 data_source/allow_delete，则设置默认值
    const dataWithMeta = { 
      ...data, 
      data_source: data.data_source || "manual", 
      allow_delete: data.allow_delete !== undefined ? data.allow_delete : true 
    };

    // 构建插入 SQL
    const columns = Object.keys(dataWithMeta).map(k => `"${k}"`);
    const values = Object.values(dataWithMeta).map((v) => {
      if (v === null || v === undefined || v === "") return "NULL";
      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
      if (typeof v === "number") return String(v);
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
        return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
      }
      return `'${String(v).replace(/'/g, "''")}'`;
    });

    const insertSQL = `
      INSERT INTO ${safeSchema}."${tableCode}" (${columns.join(", ")})
      VALUES (${values.join(", ")})
      RETURNING *
    `;

    const { data: result, error } = await client.rpc("execute_sql", {
      p_sql: insertSQL,
    });

    if (error) {
      console.error("新增记录 SQL 错误:", { sql: insertSQL, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (result as Array<Record<string, unknown>>)?.[0] || data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: 更新项目 Schema 表中的记录
 */
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema, tableCode, rowId, data } = body;

    if (!projectSchema || !tableCode || !rowId || !data) {
      return NextResponse.json({ error: "projectSchema, tableCode, rowId and data required" }, { status: 400 });
    }

    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;

    // 构建更新 SQL
    const setClauses = Object.entries(data).map(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return `"${key}" = NULL`;
      }
      if (typeof value === "boolean") {
        return `"${key}" = ${value ? "TRUE" : "FALSE"}`;
      }
      if (typeof value === "number") {
        return `"${key}" = ${value}`;
      }
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        return `"${key}" = '${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }
      return `"${key}" = '${String(value).replace(/'/g, "''")}'`;
    });

    const updateSQL = `
      UPDATE ${safeSchema}."${tableCode}"
      SET ${setClauses.join(", ")}, updated_at = NOW()
      WHERE id = '${rowId}'
      RETURNING *
    `;

    const { data: result, error } = await client.rpc("execute_sql", {
      p_sql: updateSQL,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 编辑时同步引用关系：检查被更新的表是否有引用关系
    try {
      await syncEditReferences(client, safeSchema, tableCode, rowId, data);
    } catch (e) {
      console.error('[syncEditReferences] error:', e);
      // 引用同步失败不影响主更新流程
    }

    return NextResponse.json({ data: (result as Array<Record<string, unknown>>)?.[0] || data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 删除项目 Schema 表中的记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema");
    const tableCode = searchParams.get("tableCode");
    const rowId = searchParams.get("rowId");

    if (!projectSchema || !tableCode || !rowId) {
      return NextResponse.json({ error: "projectSchema, tableCode and rowId required" }, { status: 400 });
    }

    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;

    const deleteSQL = `
      DELETE FROM ${safeSchema}."${tableCode}"
      WHERE id = '${rowId}'
    `;

    const { error } = await client.rpc("execute_sql", {
      p_sql: deleteSQL,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 编辑时同步引用关系：将被更新的列的值同步到引用表
 */
async function syncEditReferences(
  client: Awaited<ReturnType<typeof createServerClient>>,
  safeSchema: string,
  tableCode: string,
  rowId: string,
  updateData: Record<string, unknown>
) {
  // 获取所有表定义
  const { data: definitions } = await client.rpc("dp_select", {
    p_table: "data_table_definitions",
  });

  if (!definitions) return;

  const tableDefs = definitions as Array<{
    table_code: string;
    references_config?: Array<{
      id: string;
      source_table_code: string;
      match_condition: { target_column: string; source_column: string };
      column_mapping: Array<{ target_column: string; source_column: string }>;
      bidirectional: boolean;
      entry_column: string;
    }>;
  }>;

  // 查找当前表是否有引用关系（作为目标表）
  const currentDef = tableDefs.find(d => d.table_code === tableCode);
  if (currentDef?.references_config) {
    // 获取当前行数据
    const { data: currentRows } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM ${safeSchema}."${tableCode}" WHERE id = '${rowId}'`,
    });
    const rows = currentRows as Array<Record<string, unknown>>;
    if (!rows || rows.length === 0) return;
    const currentRow = rows[0];

    for (const ref of currentDef.references_config) {
      // 检查是否有更新的列在 column_mapping 中
      const mappedCols = ref.column_mapping.filter(m => updateData.hasOwnProperty(m.target_column));
      if (mappedCols.length === 0) continue;

      // 获取匹配字段值
      const matchValue = currentRow[ref.match_condition.target_column];
      if (!matchValue) continue;

      // 在源表中找匹配行
      const srcRows = (await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${safeSchema}."${ref.source_table_code}" WHERE "${ref.match_condition.source_column}" = '${String(matchValue).replace(/'/g, "''")}'`,
      })).data as Array<Record<string, unknown>>;
      if (!srcRows || srcRows.length === 0) continue;

      // 同步到源表
      const updates: Record<string, unknown> = {};
      for (const m of mappedCols) {
        updates[m.source_column] = currentRow[m.target_column];
      }
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.entries(updates).map(([key, value]) => {
          if (value === null || value === undefined) return `"${key}" = NULL`;
          if (typeof value === "boolean") return `"${key}" = ${value ? "TRUE" : "FALSE"}`;
          if (typeof value === "number") return `"${key}" = ${value}`;
          return `"${key}" = '${String(value).replace(/'/g, "''")}'`;
        });
        await client.rpc("execute_sql", {
          p_sql: `UPDATE ${safeSchema}."${ref.source_table_code}" SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = '${srcRows[0].id}'`,
        });
      }
    }
  }

  // 查找当前表是否作为其他表的源表
  for (const def of tableDefs) {
    if (!def.references_config) continue;
    for (const ref of def.references_config) {
      if (ref.source_table_code !== tableCode) continue;

      // 检查被更新的列是否是该引用关系的 source_column
      const mappedCols = ref.column_mapping.filter(m => updateData.hasOwnProperty(m.source_column));
      if (mappedCols.length === 0) continue;

      // 获取被更新行的匹配字段值
      const sRows = (await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${safeSchema}."${tableCode}" WHERE id = '${rowId}'`,
      })).data as Array<Record<string, unknown>>;
      if (!sRows || sRows.length === 0) continue;
      const sourceRow = sRows[0];
      const matchValue = sourceRow[ref.match_condition.source_column];
      if (!matchValue) continue;

      // 在目标表中找匹配行
      const tgtRows = (await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${safeSchema}."${def.table_code}" WHERE "${ref.match_condition.target_column}" = '${String(matchValue).replace(/'/g, "''")}'`,
      })).data as Array<Record<string, unknown>>;
      if (!tgtRows || tgtRows.length === 0) continue;

      // 同步到目标表
      const updates: Record<string, unknown> = {};
      for (const m of mappedCols) {
        updates[m.target_column] = sourceRow[m.source_column];
      }
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.entries(updates).map(([key, value]) => {
          if (value === null || value === undefined) return `"${key}" = NULL`;
          if (typeof value === "boolean") return `"${key}" = ${value ? "TRUE" : "FALSE"}`;
          if (typeof value === "number") return `"${key}" = ${value}`;
          return `"${key}" = '${String(value).replace(/'/g, "''")}'`;
        });
        await client.rpc("execute_sql", {
          p_sql: `UPDATE ${safeSchema}."${def.table_code}" SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = '${tgtRows[0].id}'`,
        });
      }
    }
  }
}
