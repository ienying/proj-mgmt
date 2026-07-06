import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

type MigrationItem = { source_code: string; target_code: string };
type DeleteItem = string; // module code

// 同步采购模块记录（与 migrate/route.ts 中相同逻辑，复用）
async function syncProjectModules(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectSchema: string,
  procurementModules: string[]
) {
  if (!procurementModules || procurementModules.length === 0) return;

  const { data: moduleTypes } = await client.rpc("dp_select", {
    p_table: "product_module_types",
  });
  const moduleDetailMap = new Map<
    string,
    { name: string; code: string; sort: number; product_category: string; product_name: string; vendor: string }
  >();
  if (moduleTypes) {
    for (const mod of moduleTypes as Array<Record<string, unknown>>) {
      const modCode = String(mod.code || "");
      moduleDetailMap.set(modCode, {
        name: String(mod.module_name || ""),
        code: modCode,
        sort: Number(mod.sort_order || 0),
        product_category: String(mod.category || ""),
        product_name: String(mod.product_name || ""),
        vendor: String(mod.vendor || ""),
      });
    }
  }

  const { data: allDefs } = await client.rpc("dp_select", {
    p_table: "data_table_definitions",
  });
  const defsWithPMR = (allDefs as Array<Record<string, unknown>>)?.filter((d) => {
    const cols = (d.columns_config as Array<{ type: string }>) || [];
    return cols.some((col) => col.type === "procurement_record");
  }) || [];

  for (const def of defsWithPMR) {
    const tableCode = def.table_code as string;
    const columnsConfig = (def.columns_config as Array<{ name: string; type: string }>) || [];
    const sortedModules = [...procurementModules]
      .map((code) => {
        const detail = moduleDetailMap.get(code);
        return { code, name: detail?.name || code, sort: detail?.sort ?? 999 };
      })
      .sort((a, b) => a.sort - b.sort);

    for (let i = 0; i < sortedModules.length; i++) {
      const mod = sortedModules[i];
      try {
        const { data: existing } = await client.rpc("execute_sql", {
          p_sql: `SELECT id FROM ${projectSchema}."${tableCode}" WHERE "_module_code" = '${mod.code}'`,
        });
        if (existing && Array.isArray(existing) && existing.length > 0) continue;

        const rowData: Record<string, unknown> = { _module_code: mod.code, sort_order: i };
        for (const col of columnsConfig) {
          if (col.name === "_module_code") continue;
          const lower = col.name.toLowerCase();
          if (lower === "module_name" || lower === "name") {
            rowData[col.name] = mod.name;
          } else if (lower === "product_category" || lower === "category") {
            rowData[col.name] = moduleDetailMap.get(mod.code)?.product_category || "";
          } else if (lower === "product_name") {
            rowData[col.name] = moduleDetailMap.get(mod.code)?.product_name || "";
          } else if (lower === "vendor") {
            rowData[col.name] = moduleDetailMap.get(mod.code)?.vendor || "";
          }
        }

        const cols = Object.keys(rowData).map((k) => `"${k}"`).join(", ");
        const vals = Object.values(rowData)
          .map((v) => {
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number") return String(v);
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(", ");
        await client.rpc("execute_sql", {
          p_sql: `INSERT INTO ${projectSchema}."${tableCode}" (${cols}) VALUES (${vals})`,
        });
      } catch {
        // skip
      }
    }
  }
}

// 批量迁移并删除
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { migrations = [], direct_delete = [] } = body as {
      migrations: MigrationItem[];
      direct_delete: DeleteItem[];
    };

    if (migrations.length === 0 && direct_delete.length === 0) {
      return NextResponse.json({ error: "没有要处理的操作" }, { status: 400 });
    }

    // 获取模块数据
    const { data: modules } = await client.rpc("dp_select", {
      p_table: "product_module_types",
    });
    const mods = (modules as Array<Record<string, unknown>>) || [];

    // 获取所有项目
    const { data: projects, error: projError } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    if (projError) throw projError;
    const allProjects = (projects || []) as Array<Record<string, unknown>>;

    // 跟踪需要同步的项目（去重）
    const syncQueue = new Map<string, string[]>(); // schema -> modules

    const results: Array<Record<string, unknown>> = [];

    // 处理每对迁移
    for (const mig of migrations) {
      const { source_code, target_code } = mig;
      try {
        const sourceMod = mods.find((m) => m.code === source_code);
        const targetMod = mods.find((m) => m.code === target_code);
        if (!sourceMod || !targetMod) {
          results.push({ source_code, target_code, status: "error", error: "模块不存在" });
          continue;
        }

        let updatedProjects = 0;
        let updatedRecords = 0;

        for (const project of allProjects) {
          const procurementModules = (project.procurement_modules as string[] | null) || [];
          if (!procurementModules.includes(source_code)) continue;

          const schema = project.project_schema as string | null;

          // 更新 procurement_modules
          const newModules = procurementModules
            .map((m) => (m === source_code ? target_code : m))
            .filter((m, i, arr) => arr.indexOf(m) === i);
          await client.rpc("dp_update", {
            p_table: "projects",
            p_id: project.id as string,
            p_data: { procurement_modules: newModules },
          });
          updatedProjects++;

          if (schema) {
            syncQueue.set(schema, newModules);

            try {
              const { data: tablesWithModuleCode } = await client.rpc("execute_sql", {
                p_sql: `SELECT table_name FROM information_schema.columns
                        WHERE table_schema = '${schema}' AND column_name = '_module_code'`,
              });
              if (tablesWithModuleCode && Array.isArray(tablesWithModuleCode)) {
                for (const t of tablesWithModuleCode as Array<Record<string, unknown>>) {
                  await client.rpc("execute_sql", {
                    p_sql: `UPDATE ${schema}."${t.table_name}" SET "_module_code" = '${target_code}' WHERE "_module_code" = '${source_code}'`,
                  });
                }
              }
            } catch (e) {
              console.error(`更新 schema 表失败:`, e);
            }
          }
        }

        // 统计记录数
        for (const [schema] of syncQueue) {
          try {
            const { data: tablesWithModuleCode } = await client.rpc("execute_sql", {
              p_sql: `SELECT table_name FROM information_schema.columns
                      WHERE table_schema = '${schema}' AND column_name = '_module_code'`,
            });
            if (tablesWithModuleCode && Array.isArray(tablesWithModuleCode)) {
              for (const t of tablesWithModuleCode as Array<Record<string, unknown>>) {
                const { data: cntResult } = await client.rpc("execute_sql", {
                  p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${t.table_name}" WHERE "_module_code" = '${target_code}'`,
                });
                const rows = cntResult as Array<{ cnt: number }>;
                updatedRecords += Number(rows?.[0]?.cnt || 0);
              }
            }
          } catch {
            // skip
          }
        }

        // 审计日志
        await client.rpc("dp_insert", {
          p_table: "module_migration_log",
          p_data: {
            source_code: sourceMod.code as string,
            source_name: sourceMod.module_name as string,
            target_code: targetMod.code as string,
            target_name: targetMod.module_name as string,
            operator: "",
            affected_projects: updatedProjects,
            affected_records: updatedRecords,
          },
        });

        // 删除源模块
        await client.rpc("dp_delete", {
          p_table: "product_module_types",
          p_id: sourceMod.id as string,
        });

        results.push({
          source_code,
          target_code,
          status: "ok",
          updated_projects: updatedProjects,
          updated_records: updatedRecords,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        results.push({ source_code, target_code, status: "error", error: msg });
      }
    }

    // 处理直接删除
    for (const code of direct_delete) {
      try {
        const mod = mods.find((m) => m.code === code);
        if (!mod) {
          results.push({ source_code: code, status: "error", error: "模块不存在" });
          continue;
        }
        await client.rpc("dp_delete", {
          p_table: "product_module_types",
          p_id: mod.id as string,
        });
        results.push({ source_code: code, status: "deleted" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        results.push({ source_code: code, status: "error", error: msg });
      }
    }

    // 迁移后同步所有受影响的项目
    for (const [schema, modules] of syncQueue) {
      try {
        await syncProjectModules(client, schema, modules);
      } catch (e) {
        console.error(`同步采购模块记录失败 (${schema}):`, e);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "批量迁移失败";
    console.error("批量迁移失败:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
