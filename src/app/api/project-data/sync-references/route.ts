import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * POST: 双向同步引用关系
 * 参数: projectSchema
 * 流程:
 *   1. 查询表定义，找出所有有 references_config 的表
 *   2. 对每个引用关系：
 *      a. 获取目标表和源表的数据
 *      b. 对目标表每一行，用 match_condition 在源表中找匹配行
 *      c. 如果 bidirectional = true：对比两侧 updated_at，较新的值同步到较旧的一侧
 *      d. 如果 bidirectional = false：仅源→目标
 */
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { projectSchema } = body;

    if (!projectSchema) {
      return NextResponse.json({ error: "projectSchema required" }, { status: 400 });
    }

    const safeSchema = projectSchema.includes('-') ? `"${projectSchema}"` : projectSchema;

    // 1. 获取所有表定义
    const { data: definitions, error: defError } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (defError) {
      return NextResponse.json({ error: defError.message }, { status: 500 });
    }

    const tableDefs = (definitions || []) as Array<{
      table_code: string;
      references_config?: Array<{
        id: string;
        name: string;
        source_table_code: string;
        match_condition: { target_column: string; source_column: string };
        column_mapping: Array<{ target_column: string; source_column: string }>;
        bidirectional: boolean;
        entry_column: string;
        filter_condition?: Array<{ column: string; operator: string; value: string }>;
      }>;
    }>;

    const results: Array<{ table: string; ref: string; synced: number; errors: string[] }> = [];

    // 2. 遍历每个表的引用关系
    for (const tableDef of tableDefs) {
      if (!tableDef.references_config || tableDef.references_config.length === 0) continue;

      for (const ref of tableDef.references_config) {
        const result = { table: tableDef.table_code, ref: ref.name, synced: 0, errors: [] as string[] };

        try {
          // 检查目标表和源表是否存在
          const targetTableExists = await checkTableExists(client, safeSchema.replace(/"/g, ''), tableDef.table_code);
          const sourceTableExists = await checkTableExists(client, safeSchema.replace(/"/g, ''), ref.source_table_code);

          if (!targetTableExists || !sourceTableExists) {
            result.errors.push(`表不存在: target=${tableDef.table_code}, source=${ref.source_table_code}`);
            results.push(result);
            continue;
          }

          // 获取目标表和源表数据
          const { data: targetRows } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${safeSchema}."${tableDef.table_code}"`,
          });

          const { data: sourceRows } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${safeSchema}."${ref.source_table_code}"`,
          });

          if (!targetRows || targetRows.length === 0) {
            results.push(result);
            continue;
          }

          // 构建源表匹配索引：key = match_condition.source_column value, value = row
          const sourceIndex: Record<string, Array<Record<string, unknown>>> = {};
          for (const row of (sourceRows || [])) {
            const key = String(row[ref.match_condition.source_column] ?? "");
            if (!key) continue;
            if (!sourceIndex[key]) sourceIndex[key] = [];
            sourceIndex[key].push(row);
          }

          // 应用过滤条件
          let filteredSourceIndex = sourceIndex;
          if (ref.filter_condition && ref.filter_condition.length > 0) {
            filteredSourceIndex = {};
            for (const [key, rows] of Object.entries(sourceIndex)) {
              const matchedRows = rows.filter(row =>
                ref.filter_condition!.every(fc => {
                  const val = row[fc.column];
                  switch (fc.operator) {
                    case '=': return String(val) === fc.value;
                    case '!=': return String(val) !== fc.value;
                    case '>': return Number(val) > Number(fc.value);
                    case '<': return Number(val) < Number(fc.value);
                    case 'contains': return String(val).includes(fc.value);
                    default: return true;
                  }
                })
              );
              if (matchedRows.length > 0) filteredSourceIndex[key] = matchedRows;
            }
          }

          // 对目标表每一行执行同步
          for (const targetRow of targetRows) {
            const matchKey = String(targetRow[ref.match_condition.target_column] ?? "");
            if (!matchKey) continue;

            const matchedSources = filteredSourceIndex[matchKey] || [];
            if (matchedSources.length === 0) continue;

            // 使用第一条匹配的记录
            const sourceRow = matchedSources[0];

            if (ref.bidirectional) {
              // 双向同步：对比 updated_at，较新的值同步到较旧的一侧
              const targetUpdated = targetRow.updated_at ? new Date(targetRow.updated_at as string).getTime() : 0;
              const sourceUpdated = sourceRow.updated_at ? new Date(sourceRow.updated_at as string).getTime() : 0;

              if (sourceUpdated > targetUpdated) {
                // 源表较新：同步到目标表
                const updates: Record<string, unknown> = {};
                for (const m of ref.column_mapping) {
                  updates[m.target_column] = sourceRow[m.source_column];
                }
                if (Object.keys(updates).length > 0) {
                  await executeUpdate(client, safeSchema, tableDef.table_code, targetRow.id as string, updates);
                  result.synced++;
                }
              } else if (targetUpdated > sourceUpdated) {
                // 目标表较新：同步到源表
                const updates: Record<string, unknown> = {};
                for (const m of ref.column_mapping) {
                  updates[m.source_column] = targetRow[m.target_column];
                }
                if (Object.keys(updates).length > 0) {
                  await executeUpdate(client, safeSchema, ref.source_table_code, sourceRow.id as string, updates);
                  result.synced++;
                }
              } else if (targetUpdated === 0 && sourceUpdated === 0) {
                // 双方都无更新时间：源→目标填充空值
                const updates: Record<string, unknown> = {};
                for (const m of ref.column_mapping) {
                  const targetVal = targetRow[m.target_column];
                  const sourceVal = sourceRow[m.source_column];
                  if ((targetVal === null || targetVal === undefined || targetVal === '') && sourceVal !== null && sourceVal !== undefined) {
                    updates[m.target_column] = sourceVal;
                  }
                }
                if (Object.keys(updates).length > 0) {
                  await executeUpdate(client, safeSchema, tableDef.table_code, targetRow.id as string, updates);
                  result.synced++;
                }
              }
            } else {
              // 单向：源→目标
              const updates: Record<string, unknown> = {};
              for (const m of ref.column_mapping) {
                const sourceVal = sourceRow[m.source_column];
                const targetVal = targetRow[m.target_column];
                if (sourceVal !== targetVal) {
                  updates[m.target_column] = sourceVal;
                }
              }
              if (Object.keys(updates).length > 0) {
                await executeUpdate(client, safeSchema, tableDef.table_code, targetRow.id as string, updates);
                result.synced++;
              }
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "同步失败";
          result.errors.push(message);
        }

        results.push(result);
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "同步失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function checkTableExists(
  client: Awaited<ReturnType<typeof createServerClient>>,
  schema: string,
  tableCode: string
): Promise<boolean> {
  const { data } = await client.rpc("execute_sql", {
    p_sql: `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
    ) AS exists_flag`,
  });
  return data?.[0]?.exists_flag === true;
}

async function executeUpdate(
  client: Awaited<ReturnType<typeof createServerClient>>,
  schema: string,
  tableCode: string,
  rowId: string,
  updates: Record<string, unknown>
) {
  const setClauses = Object.entries(updates).map(([key, value]) => {
    if (value === null || value === undefined) return `"${key}" = NULL`;
    if (typeof value === "boolean") return `"${key}" = ${value ? "TRUE" : "FALSE"}`;
    if (typeof value === "number") return `"${key}" = ${value}`;
    return `"${key}" = '${String(value).replace(/'/g, "''")}'`;
  });

  if (setClauses.length === 0) return;

  await client.rpc("execute_sql", {
    p_sql: `UPDATE ${schema}."${tableCode}" SET ${setClauses.join(", ")} WHERE id = '${rowId}'`,
  });
}
