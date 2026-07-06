import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 获取包含指定表的项目列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const tableCode = searchParams.get("tableCode");
    const showAll = searchParams.get("showAll") === "true";

    if (!tableCode) {
      return NextResponse.json({ error: "缺少 tableCode 参数" }, { status: 400 });
    }

    // 获取所有有 project_schema 的项目
    const { data: projects, error: projError } = await supabase.rpc("dp_select", {
      p_table: "projects",
    });

    if (projError) throw projError;

    const results = [];

    for (const project of projects || []) {
      const schema = project.project_schema;
      if (!schema) continue;

      if (showAll) {
        // 显示所有项目模式：不过滤，全部列出，同时标注是否已有该表
        const { data: tableCheck, error: checkError } = await supabase.rpc("execute_sql", {
          p_sql: `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
          ) as exists`,
        });
        const hasTable = !checkError && (tableCheck?.[0]?.exists === true);
        results.push({
          project_id: project.id,
          project_name: project.project_name,
          project_code: project.project_code,
          schema: schema,
          has_table: hasTable,
        });
        continue;
      }

      // 默认模式：检查该 Schema 中是否存在此表
      const { data: tableExists, error: checkError } = await supabase.rpc("execute_sql", {
        p_sql: `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
        ) as exists`,
      });

      if (checkError) continue;

      const hasTable = tableExists?.[0]?.exists === true;
      if (hasTable) {
        results.push({
          project_id: project.id,
          project_name: project.project_name,
          project_code: project.project_code,
          schema: schema,
          has_table: true,
        });
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取项目列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 同步列结构和/或数据到指定项目
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { tableCode, projectIds, syncSchema, syncData, syncDataMode = "overwrite" } = body;

    if (!tableCode || !projectIds || projectIds.length === 0) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 校验 syncDataMode
    if (syncData && syncDataMode !== "overwrite" && syncDataMode !== "append") {
      return NextResponse.json({ error: "syncDataMode 只支持 overwrite 或 append" }, { status: 400 });
    }

    // 获取表定义
    const { data: definitions, error: defError } = await supabase.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (defError) throw defError;

    const tableDef = (definitions || []).find(
      (d: Record<string, unknown>) => d.table_code === tableCode
    );

    if (!tableDef) {
      return NextResponse.json({ error: "表定义不存在" }, { status: 404 });
    }

    const columnsConfig = tableDef.columns_config || [];
    const sourceTable = `std_definition_${tableCode}`;

    // 获取所有项目
    const { data: projects, error: projError } = await supabase.rpc("dp_select", {
      p_table: "projects",
    });

    if (projError) throw projError;

    const targetProjects = (projects || []).filter(
      (p: Record<string, unknown>) => projectIds.includes(p.id) && p.project_schema
    );

    const results: { project: string; schema: boolean; data: boolean; errors: string[] }[] = [];

    for (const project of targetProjects) {
      const schema = project.project_schema as string;
      const result = { project: project.project_name as string, schema: false, data: false, errors: [] as string[] };

      try {
        // 0. 确保表存在：如果项目 Schema 中不存在此表，则先创建
        const { data: tableCheck } = await supabase.rpc("execute_sql", {
          p_sql: `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
          ) AS exists_flag`,
        });
        const tableExistsInProject =
          (tableCheck as Array<Record<string, unknown>>)?.[0]?.exists_flag === true;

        if (!tableExistsInProject && syncSchema) {
          // 表不存在且需要同步结构 → 自动建表
          const createColDefs = (columnsConfig as Array<Record<string, unknown>>).map((col) => {
            const colName = (col.key || col.name) as string;
            const sqlType = mapColumnTypeForCreate((col.type as string) || "text");
            return `"${colName}" ${sqlType}`;
          });

          // 添加标准列
          createColDefs.push("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
          createColDefs.push("sort_order INT DEFAULT 0");
          createColDefs.push("created_at TIMESTAMP WITH TIME ZONE DEFAULT now()");
          createColDefs.push("updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()");
          createColDefs.push("created_by VARCHAR(36)");
          createColDefs.push("allow_delete BOOLEAN DEFAULT true");
          createColDefs.push('"_readonly" BOOLEAN DEFAULT false');
          createColDefs.push("data_source TEXT DEFAULT 'standard'");

          const createSQL = `CREATE TABLE IF NOT EXISTS ${schema}."${tableCode}" (${createColDefs.join(", ")})`;

          const { error: createError } = await supabase.rpc("execute_sql", {
            p_sql: createSQL,
          });

          if (createError) {
            result.errors.push(`建表失败: ${createError.message}`);
            results.push(result);
            continue; // 建表失败则跳过后续同步
          }
        }

        // 1. 同步列结构
        if (syncSchema) {
          const { data: existingCols, error: colError } = await supabase.rpc("execute_sql", {
            p_sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${tableCode}'`,
          });

          if (colError) {
            result.errors.push(`获取列信息失败: ${colError.message}`);
          } else {
            const existingColNames = new Set(
              (existingCols || []).map((c: Record<string, unknown>) => c.column_name as string)
            );

            // 添加缺失的列
            for (const col of columnsConfig as Array<Record<string, unknown>>) {
              const colName = (col.key || col.name) as string;
              if (!existingColNames.has(colName)) {
                const pgType = mapColumnType((col.type as string) || "text");
                const { error: alterError } = await supabase.rpc("execute_sql", {
                  p_sql: `ALTER TABLE ${schema}."${tableCode}" ADD COLUMN IF NOT EXISTS "${colName}" ${pgType}`,
                });
                if (alterError) {
                  result.errors.push(`添加列 ${colName} 失败: ${alterError.message}`);
                }
              }
            }

            // 确保权限控制列存在
            const permissionCols = [
              { name: "allow_delete", type: "BOOLEAN DEFAULT TRUE" },
              { name: "_readonly", type: "BOOLEAN DEFAULT FALSE" },
              { name: "data_source", type: "TEXT DEFAULT 'standard'" },
            ];
            for (const pc of permissionCols) {
              if (!existingColNames.has(pc.name)) {
                const { error: alterError } = await supabase.rpc("execute_sql", {
                  p_sql: `ALTER TABLE ${schema}."${tableCode}" ADD COLUMN IF NOT EXISTS "${pc.name}" ${pc.type}`,
                });
                if (alterError) {
                  result.errors.push(`添加列 ${pc.name} 失败: ${alterError.message}`);
                }
              }
            }
            result.schema = true;
          }
        }

        // 2. 同步数据
        if (syncData) {
          // 获取目标表的列信息
          const { data: targetCols, error: tgtColError } = await supabase.rpc("execute_sql", {
            p_sql: `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${tableCode}'`,
          });

          if (tgtColError) {
            result.errors.push(`获取目标表列信息失败: ${tgtColError.message}`);
          } else {
            const targetColNames = new Set(
              (targetCols || []).map((c: Record<string, unknown>) => c.column_name as string)
            );

            const { data: sourceRows, error: srcError } = await supabase.rpc("execute_sql", {
              p_sql: `SELECT * FROM design_public."${sourceTable}" ORDER BY sort_order, created_at`,
            });

            if (srcError) {
              result.errors.push(`获取源数据失败: ${srcError.message}`);
            } else {
              // 覆盖模式：先清空目标表，再插入源数据
              if (syncDataMode === "overwrite") {
                const { error: truncateError } = await supabase.rpc("execute_sql", {
                  p_sql: `TRUNCATE TABLE ${schema}."${tableCode}"`,
                });

                if (truncateError) {
                  result.errors.push(`清空目标表失败: ${truncateError.message}`);
                }
              }

              for (const row of (sourceRows || []) as Array<Record<string, unknown>>) {
                const filteredRow: Record<string, unknown> = {};
                const systemCols = ["id", "created_at", "updated_at", "sort_order"];
                for (const [key, value] of Object.entries(row)) {
                  // 跳过系统列和目标表中不存在的列
                  if (!systemCols.includes(key) && targetColNames.has(key)) {
                    filteredRow[key] = value;
                  }
                }

                if (Object.keys(filteredRow).length > 0) {
                  const cols = Object.keys(filteredRow).map((k) => `"${k}"`).join(", ");
                  const vals = Object.values(filteredRow)
                    .map((v) => {
                      if (v === null || v === undefined) return "NULL";
                      if (typeof v === "number") return v.toString();
                      if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
                      return `'${String(v).replace(/'/g, "''")}'`;
                    })
                    .join(", ");

                  const { error: insertError } = await supabase.rpc("execute_sql", {
                    p_sql: `INSERT INTO ${schema}."${tableCode}" (${cols}) VALUES (${vals})`,
                  });

                  if (insertError) {
                    result.errors.push(`插入数据失败: ${insertError.message}`);
                  }
                }
              }
              result.data = true;
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "未知错误";
        result.errors.push(message);
      }

      results.push(result);
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "同步失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapColumnType(type: string): string {
  const typeMap: Record<string, string> = {
    text: "TEXT",
    number: "NUMERIC",
    date: "DATE",
    datetime: "TIMESTAMP WITH TIME ZONE",
    boolean: "BOOLEAN",
    select: "TEXT",
    multiple_select: "TEXT",
    textarea: "TEXT",
  };
  return typeMap[type] || "TEXT";
}

// 建表时的类型映射（与 ensure-table 保持一致）
function mapColumnTypeForCreate(type: string): string {
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
