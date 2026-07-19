import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 缓存表名和列名映射
const tableMetaCache = new Map<string, { name: string; colLabels: Record<string, string> }>();
async function getTableMeta(client: Awaited<ReturnType<typeof createServerClient>>, tableCode: string): Promise<{ name: string; colLabels: Record<string, string> }> {
  if (tableMetaCache.has(tableCode)) return tableMetaCache.get(tableCode)!;
  try {
    const { data } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name, columns_config FROM data_table_definitions WHERE table_code = '${tableCode.replace(/'/g, "''")}' LIMIT 1`,
    });
    const row = (data as Array<Record<string, unknown>>)?.[0];
    const name = row?.table_name as string || tableCode;
    const cols = (row?.columns_config as Array<{ name: string; label: string }>) || [];
    const colLabels: Record<string, string> = {};
    cols.forEach(c => { if (c.label) colLabels[c.name] = c.label; });
    const meta = { name, colLabels };
    tableMetaCache.set(tableCode, meta);
    return meta;
  } catch { return { name: tableCode, colLabels: {} }; }
}

// 记录操作日志（写入项目 schema）
async function logOperation(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectSchema: string,
  action: string,
  targetType: string,
  targetName: string,
  userName?: string,
  detail?: string,
) {
  try {
    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;
    const { error: createErr } = await client.rpc("execute_sql", {
      p_sql: `CREATE TABLE IF NOT EXISTS ${safeSchema}.operation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID, user_name VARCHAR(100), action VARCHAR(50) NOT NULL,
        target_type VARCHAR(100), target_name VARCHAR(255), detail TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
    });
    if (createErr) { console.error("建表失败:", createErr); return; }
    const { error: insertErr } = await client.rpc("dp_insert", {
      p_table: `${projectSchema}.operation_logs`,
      p_data: { action, target_type: targetType, target_name: targetName, detail: detail || null, user_name: userName || "" },
    });
    if (insertErr) console.error("插入日志失败:", insertErr);
  } catch (e) { console.error("logOperation 失败:", e); }
}

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

    const postMeta = await getTableMeta(client, tableCode);
    const userName1 = body.user_name as string || "";
    await logOperation(client, projectSchema, "create", tableCode, `新建了记录到「${postMeta.name}」`, userName1);
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

    // 只读防护：根据表定义的 readonly_mode 过滤被锁定列
    let filteredData = data;
    try {
      const { data: tableDef } = await client.rpc("dp_select", { p_table: "data_table_definitions" });
      const def = (tableDef as Array<{ table_code: string; columns_config: Array<{ name: string; readonly?: boolean }>; readonly_mode?: string }>)?.find(
        (t) => t.table_code === tableCode
      );
      if (def) {
        const readonlyMode = (def as Record<string, unknown>).readonly_mode || "and";
        const isOrMode = readonlyMode === "or";
        const readonlyColNames = (def.columns_config || []).filter(c => c.readonly).map(c => c.name);

        // 获取当前记录的行只读状态
        let rowReadonly = false;
        try {
          const { data: rowData } = await client.rpc("execute_sql", {
            p_sql: `SELECT "_readonly" FROM ${safeSchema}."${tableCode}" WHERE id = '${String(rowId).replace(/'/g, "''")}'`,
          });
          const rows = rowData as Array<Record<string, unknown>>;
          rowReadonly = rows?.[0]?._readonly === true;
        } catch { /* _readonly 列不存在则忽略 */ }

        // 决定锁定列
        const lockedColumns = (() => {
          if (isOrMode) {
            if (rowReadonly) return (def.columns_config || []).map(c => c.name);
            return readonlyColNames;
          }
          return rowReadonly ? readonlyColNames : [];
        })();

        // 从更新数据中移除被锁定的列
        if (lockedColumns.length > 0) {
          filteredData = { ...data };
          lockedColumns.forEach(c => delete filteredData[c]);
        }
      }
    } catch { /* 只读防护失败不影响主流程 */ }

    // 构建更新 SQL
    const setClauses = Object.entries(filteredData).map(([key, value]) => {
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

    const putMeta = await getTableMeta(client, tableCode);
    const changedCols = Object.keys(data).map(c => {
      const label = putMeta.colLabels[c] || c;
      const val = data[c];
      const valStr = typeof val === "string" ? (val.length > 50 ? val.slice(0, 50) + "..." : val) : String(val ?? "");
      return valStr ? `${label}: ${valStr}` : label;
    }).join("、");
    const detail = changedCols ? `修改了 ${changedCols}` : undefined;
    const userName2 = body.user_name as string || "";
    await logOperation(client, projectSchema, "update", tableCode, `编辑了「${putMeta.name}」中的记录`, userName2, detail);
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

    const delMeta = await getTableMeta(client, tableCode);
    const userName3 = searchParams.get("user_name") || "";
    await logOperation(client, projectSchema, "delete", tableCode, `删除了「${delMeta.name}」中的记录`, userName3);
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
