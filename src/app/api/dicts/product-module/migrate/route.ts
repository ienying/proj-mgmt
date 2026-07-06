import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 同步采购模块记录到项目 Schema 表
async function syncProjectModules(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectSchema: string,
  procurementModules: string[]
) {
  if (!procurementModules || procurementModules.length === 0) return;

  // 获取产品目录详情
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

  // 获取含 procurement_record 列的规范表定义
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
    const columnNames = columnsConfig.map((c) => c.name);

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

        // 自动填充匹配的列
        const rowData: Record<string, unknown> = {
          _module_code: mod.code,
          sort_order: i,
        };
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
        // 跳过插入失败的表
      }
    }
  }
}

// 单个迁移并删除
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { source_code, target_code } = body as { source_code: string; target_code: string };

    if (!source_code || !target_code) {
      return NextResponse.json({ error: "缺少 source_code 或 target_code" }, { status: 400 });
    }
    if (source_code === target_code) {
      return NextResponse.json({ error: "源模块和目标模块不能相同" }, { status: 400 });
    }

    // 验证模块存在
    const { data: modules } = await client.rpc("dp_select", {
      p_table: "product_module_types",
    });
    const mods = (modules as Array<Record<string, unknown>>) || [];
    const sourceMod = mods.find((m) => m.code === source_code);
    const targetMod = mods.find((m) => m.code === target_code);
    if (!sourceMod) {
      return NextResponse.json({ error: "源模块不存在" }, { status: 404 });
    }
    if (!targetMod) {
      return NextResponse.json({ error: "目标模块不存在" }, { status: 404 });
    }

    // 获取所有项目
    const { data: projects, error: projError } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    if (projError) throw projError;

    let updatedProjects = 0;
    let updatedRecords = 0;
    const affectedProjectSchemas: { schema: string; modules: string[] }[] = [];

    for (const project of (projects || []) as Array<Record<string, unknown>>) {
      const procurementModules = (project.procurement_modules as string[] | null) || [];
      if (!procurementModules.includes(source_code)) continue;

      const schema = project.project_schema as string | null;

      // 更新 procurement_modules 数组
      const newModules = procurementModules
        .map((m) => (m === source_code ? target_code : m))
        .filter((m, i, arr) => arr.indexOf(m) === i); // 去重

      await client.rpc("dp_update", {
        p_table: "projects",
        p_id: project.id as string,
        p_data: { procurement_modules: newModules },
      });
      updatedProjects++;

      // 更新 schema 表中的 _module_code
      if (schema) {
        affectedProjectSchemas.push({ schema, modules: newModules });
        try {
          const { data: tablesWithModuleCode } = await client.rpc("execute_sql", {
            p_sql: `SELECT table_name FROM information_schema.columns
                    WHERE table_schema = '${schema}' AND column_name = '_module_code'`,
          });
          if (tablesWithModuleCode && Array.isArray(tablesWithModuleCode)) {
            for (const t of tablesWithModuleCode as Array<Record<string, unknown>>) {
              const tableName = t.table_name as string;
              const { data: updateResult } = await client.rpc("execute_sql", {
                p_sql: `UPDATE ${schema}."${tableName}" SET "_module_code" = '${target_code}' WHERE "_module_code" = '${source_code}'`,
              });
              // execute_sql 不返回 affected rows，我们通过查询统计
              const { data: cntResult } = await client.rpc("execute_sql", {
                p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${tableName}" WHERE "_module_code" = '${target_code}'`,
              });
              // 不累加，后面统一处理
            }
          }
        } catch (e) {
          console.error(`更新 schema 表失败 (${schema}):`, e);
        }
      }
    }

    // 统计记录数（迁移后 target 的 _module_code 行数）
    for (const { schema } of affectedProjectSchemas) {
      try {
        const { data: tablesWithModuleCode } = await client.rpc("execute_sql", {
          p_sql: `SELECT table_name FROM information_schema.columns
                  WHERE table_schema = '${schema}' AND column_name = '_module_code'`,
        });
        if (tablesWithModuleCode && Array.isArray(tablesWithModuleCode)) {
          for (const t of tablesWithModuleCode as Array<Record<string, unknown>>) {
            const tableName = t.table_name as string;
            const { data: cntResult } = await client.rpc("execute_sql", {
              p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${tableName}" WHERE "_module_code" = '${target_code}'`,
            });
            const rows = cntResult as Array<{ cnt: number }>;
            updatedRecords += Number(rows?.[0]?.cnt || 0);
          }
        }
      } catch {
        // skip
      }
    }

    // 迁移后同步：确保 target 模块的 procurement_record 行存在
    for (const { schema, modules } of affectedProjectSchemas) {
      try {
        await syncProjectModules(client, schema, modules);
      } catch (e) {
        console.error(`同步采购模块记录失败 (${schema}):`, e);
      }
    }

    // 写入审计日志
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
    const { error: delError } = await client.rpc("dp_delete", {
      p_table: "product_module_types",
      p_id: sourceMod.id as string,
    });
    if (delError) {
      return NextResponse.json({ error: `删除源模块失败: ${delError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_projects: updatedProjects,
      updated_records: updatedRecords,
      deleted_module: source_code,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "迁移失败";
    console.error("迁移失败:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
