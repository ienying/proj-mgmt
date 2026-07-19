import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { rmSync, existsSync } from "fs";
import path from "path";

function mapColumnTypeToSQL(type: string): string {
  const typeMap: Record<string, string> = {
    text: "VARCHAR(255)",
    number: "INTEGER",
    date: "DATE",
    select: "VARCHAR(255)",
    radio: "VARCHAR(255)",
    multiselect: "TEXT",
    textarea: "TEXT",
    "procurement-single": "VARCHAR(255)",
    "procurement-multi": "TEXT",
    video: "JSONB",
    procurement_record: "VARCHAR(255)",
  };
  return typeMap[type] || "VARCHAR(255)";
}

/**
 * 同步采购模块记录：遍历所有含 procurement_record 列的规范表，为缺失的模块插入记录
 */
async function syncProcurementModuleRecords(
  client: ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never,
  projectSchema: string,
  procurementModules: string[]
) {
  if (!procurementModules || procurementModules.length === 0) return;

  // 获取产品目录详情
  const { data: moduleTypes } = await client.rpc("dp_select", {
    p_table: "product_module_types",
  });
  const moduleDetailMap = new Map<string, { name: string; code: string; sort: number; product_category: string; product_name: string; vendor: string }>();
  if (moduleTypes) {
    for (const mod of moduleTypes as Record<string, unknown>[]) {
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

  // 获取所有含 procurement_record 列的规范表定义
  const { data: allDefs } = await client.rpc("dp_select", {
    p_table: "data_table_definitions",
  });
  if (!allDefs || !Array.isArray(allDefs)) return;

  const pmrTables = (allDefs as Record<string, unknown>[]).filter(
    (def) => {
      const cols = def.columns_config as Array<{ type: string }> | null;
      return cols && cols.some((col) => col.type === "procurement_record");
    }
  );

  for (const tableDef of pmrTables) {
    const tableCode = tableDef.table_code as string;
    const columnsConfig = tableDef.columns_config as Array<{ name: string; type: string }>;
    const pmrCol = columnsConfig.find((col) => col.type === "procurement_record");
    if (!pmrCol) continue;

    // 检查项目 schema 中该表是否存在
    const { data: tableCheck } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${projectSchema}' AND table_name = '${tableCode}' LIMIT 1`,
    });
    if (!tableCheck || !Array.isArray(tableCheck) || tableCheck.length === 0) continue;

    const columnNames = columnsConfig.map((col) => col.name);

    // 按排序顺序生成记录
    const sortedModules = [...procurementModules]
      .map((code: string) => {
        const detail = moduleDetailMap.get(code);
        return {
          code,
          name: detail?.name || code,
          sort: detail?.sort ?? 999,
          product_category: detail?.product_category || "",
          product_name: detail?.product_name || "",
          vendor: detail?.vendor || "",
        };
      })
      .sort((a, b) => a.sort - b.sort);

    // 检查并添加 _module_code 列（旧表可能缺少此列）
    const { data: colCheck } = await client.rpc("execute_sql", {
      p_sql: `SELECT column_name FROM information_schema.columns WHERE table_schema = '${projectSchema}' AND table_name = '${tableCode}' AND column_name = '_module_code'`,
    });
    if (!colCheck || !Array.isArray(colCheck) || colCheck.length === 0) {
      try {
        await client.rpc("execute_sql", {
          p_sql: `ALTER TABLE ${projectSchema}."${tableCode}" ADD COLUMN "_module_code" VARCHAR(255)`,
        });
      } catch (alterErr) {
        console.error(`添加 _module_code 列到 ${tableCode} 失败:`, alterErr);
      }
    }

    // 获取现有记录的 _module_code
    const { data: existingRows } = await client.rpc("execute_sql", {
      p_sql: `SELECT "_module_code" FROM ${projectSchema}."${tableCode}" WHERE "_module_code" IS NOT NULL`,
    });
    const existingCodes = new Set<string>();
    if (existingRows && Array.isArray(existingRows)) {
      for (const row of existingRows as Record<string, unknown>[]) {
        if (row._module_code) existingCodes.add(String(row._module_code));
      }
    }

    for (let i = 0; i < sortedModules.length; i++) {
      const mod = sortedModules[i];
      if (existingCodes.has(mod.code)) continue;

      // 构建自动填充列
      const autoFillColumns: Record<string, string> = {
        [pmrCol.name]: mod.name,
        "_module_code": mod.code,
      };

      for (const colName of columnNames) {
        if (colName === pmrCol.name || colName === "_module_code") continue;
        const lowerName = colName.toLowerCase();
        if (lowerName.includes("模块名") || lowerName === "module_name") {
          autoFillColumns[colName] = mod.name;
        } else if (lowerName.includes("产品类别") || lowerName === "product_category") {
          autoFillColumns[colName] = mod.product_category;
        } else if (lowerName.includes("产品名称") || lowerName === "product_name") {
          autoFillColumns[colName] = mod.product_name;
        } else if (lowerName.includes("厂商") || lowerName === "vendor") {
          autoFillColumns[colName] = mod.vendor;
        }
      }

      const insertCols = Object.keys(autoFillColumns).map((c) => `"${c}"`).join(", ");
      const insertVals = Object.values(autoFillColumns).map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

      const insertSQL = `
        INSERT INTO ${projectSchema}."${tableCode}" 
          (${insertCols}, "allow_delete", "data_source", "sort_order", "created_at")
        VALUES 
          (${insertVals}, false, 'procurement_module', ${i}, NOW())
      `;
      try {
        await client.rpc("execute_sql", { p_sql: insertSQL });
      } catch (err) {
        console.error(`插入采购模块记录 ${mod.name} 到 ${tableCode} 失败:`, err);
      }
    }

    console.log(`已为 ${tableCode} 同步 ${sortedModules.filter(m => !existingCodes.has(m.code)).length} 条新采购模块记录`);
  }
}

async function syncProjectSchema(
  client: ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never,
  projectSchema: string,
  projectType: string,
  procurementModules: string[],
  projectStatus?: string | null
): Promise<{ matched: boolean; tableCount: number }> {
  // 收集所有匹配的表定义
  const allTableDefinitions = new Set<string>();

  // 查询所有启用的规则
  const { data: rules } = await client.rpc("dp_select", {
    p_table: "project_schema_rules",
  });

  // 过滤启用的规则
  const enabledRules = ((rules as Record<string, unknown>[]) || [])
    .filter((r) => r.is_enabled === true)
    .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0));

  // 1. 匹配类型阶段规则（type_stage）
  // type + status 匹配，不再按阶段过滤
  const typeStageRules = enabledRules.filter((r) => r.rule_type !== "module");

  for (const rule of typeStageRules) {
    const ruleType = rule.project_type as string | null;
    const ruleStatus = (rule as Record<string, unknown>).project_status as string | null;

    if (ruleType === projectType) {
      const statusMatch = !ruleStatus || ruleStatus === projectStatus;
      if (statusMatch && rule.table_definitions) {
        (rule.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
      }
    }
  }

  // 2. 匹配模块规则（module）
  // 模块必须有交集（AND），type + status 匹配
  if (procurementModules && procurementModules.length > 0) {
    for (const rule of enabledRules) {
      if (rule.rule_type === "module" && rule.module_codes) {
        const moduleCodes = rule.module_codes as string[];
        const hasModuleMatch = moduleCodes.some((code) => procurementModules.includes(code));
        if (!hasModuleMatch) continue;

        if (rule.project_type !== projectType) continue;
        const ruleStatus = (rule as Record<string, unknown>).project_status as string | null;
        if (ruleStatus && ruleStatus !== projectStatus) continue;

        if (rule.table_definitions) {
          (rule.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
        }
      }
    }
  }

  // 无任何规则命中：返回未匹配状态，由调用方提示用户
  if (allTableDefinitions.size === 0) {
    console.log("未找到匹配的规则，不复制任何规范表");
    return { matched: false, tableCount: 0 };
  }

  // 查询规范表定义用于创建表
  const { data: allDefinitions } = await client.rpc("dp_select", {
    p_table: "data_table_definitions",
  });
  if (!allDefinitions) return { matched: false, tableCount: 0 };

  const tablesToCopy = (allDefinitions as Record<string, unknown>[]).filter(
    (d) => allTableDefinitions.has(d.table_code as string)
  );

  // 确保 Schema 存在
  try {
    await client.rpc("execute_sql", {
      p_sql: `CREATE SCHEMA IF NOT EXISTS ${projectSchema}`,
    });
  } catch {
    // Schema 可能已存在
  }

  // 创建缺失的表（IF NOT EXISTS 保证只增不删）
  for (const tableDef of tablesToCopy) {
    const tableCode = tableDef.table_code as string;
    const columnsConfig = tableDef.columns_config as Array<{ name: string; type: string; required: boolean }>;

    const columnDefs = columnsConfig.map((col) => {
      const sqlType = mapColumnTypeToSQL(col.type);
      const notNull = col.required ? " NOT NULL" : "";
      return `"${col.name}" ${sqlType}${notNull}`;
    });

    columnDefs.push(`"id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()`);
    columnDefs.push(`"sort_order" INTEGER DEFAULT 0`);
    columnDefs.push(`"created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
    columnDefs.push(`"updated_at" TIMESTAMP WITH TIME ZONE`);
    columnDefs.push(`"created_by" VARCHAR(36)`);
    columnDefs.push(`"allow_delete" BOOLEAN DEFAULT true`);
    columnDefs.push(`"data_source" TEXT DEFAULT 'standard'`);

    // 采购模块记录类型：添加 _module_code 隐藏列
    const hasProcurementRecord = columnsConfig.some((col) => col.type === 'procurement_record');
    if (hasProcurementRecord) {
      columnDefs.push(`"_module_code" VARCHAR(255)`);
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${projectSchema}."${tableCode}" (
        ${columnDefs.join(",\n        ")}
      )
    `;

    try {
      await client.rpc("execute_sql", { p_sql: createTableSQL });
    } catch (err) {
      console.error(`创建表 ${projectSchema}.${tableCode} 失败:`, err);
    }

    // 如果表已存在且缺少 _module_code 列，补充添加
    if (hasProcurementRecord) {
      try {
        const { data: colExists } = await client.rpc("execute_sql", {
          p_sql: `SELECT column_name FROM information_schema.columns WHERE table_schema = '${projectSchema}' AND table_name = '${tableCode}' AND column_name = '_module_code'`,
        });
        if (!colExists || !Array.isArray(colExists) || colExists.length === 0) {
          await client.rpc("execute_sql", {
            p_sql: `ALTER TABLE ${projectSchema}."${tableCode}" ADD COLUMN "_module_code" VARCHAR(255)`,
          });
        }
      } catch (alterErr) {
        console.error(`添加 _module_code 列到 ${tableCode} 失败:`, alterErr);
      }
    }
  }

  // 同步采购模块记录
  if (procurementModules && procurementModules.length > 0) {
    // 获取产品目录详情（含排序信息和属性）
    const { data: moduleTypes } = await client.rpc("dp_select", {
      p_table: "product_module_types",
    });
    // 用 code 作为 key，存储完整模块信息
    const moduleDetailMap = new Map<string, { name: string; code: string; sort: number; product_category: string; product_name: string; vendor: string }>();
    if (moduleTypes) {
      for (const mod of moduleTypes as Record<string, unknown>[]) {
        const modCode = String(mod.code || "");
        moduleDetailMap.set(modCode, {
          name: String(mod.module_name || ""),
          code: modCode,
          sort: Number(mod.sort_order || 0),
          product_category: String(mod.product_category || ""),
          product_name: String(mod.product_name || ""),
          vendor: String(mod.vendor || ""),
        });
      }
    }

    for (const tableDef of tablesToCopy) {
      const tableCode = tableDef.table_code as string;
      const columnsConfig = tableDef.columns_config as Array<{ name: string; type: string }>;
      const pmrCol = columnsConfig.find((col) => col.type === 'procurement_record');

      if (!pmrCol) continue;

      // 获取表的所有列名（用于自动填充匹配）
      const columnNames = columnsConfig.map(col => col.name);

      // 按排序顺序生成记录，procurementModules 存的是 code
      const sortedModules = [...procurementModules]
        .map((code: string) => {
          const detail = moduleDetailMap.get(code);
          return {
            code,
            name: detail?.name || code,
            sort: detail?.sort ?? 999,
            product_category: detail?.product_category || "",
            product_name: detail?.product_name || "",
            vendor: detail?.vendor || "",
          };
        })
        .sort((a, b) => a.sort - b.sort);

      for (let i = 0; i < sortedModules.length; i++) {
        const mod = sortedModules[i];

        // 检查是否已有该模块的记录（通过 _module_code 匹配）
        const checkSQL = `SELECT id FROM ${projectSchema}."${tableCode}" WHERE "_module_code" = '${mod.code.replace(/'/g, "''")}' LIMIT 1`;
        try {
          const { data: existing } = await client.rpc("execute_sql", {
            p_sql: checkSQL,
          });
          if (existing && Array.isArray(existing) && existing.length > 0) {
            continue; // 已存在则跳过
          }
        } catch { /* 表可能不存在，忽略 */ }

        // 构建自动填充列
        const autoFillColumns: Record<string, string> = {
          [pmrCol.name]: mod.name,     // 采购模块记录列填模块名称
          "_module_code": mod.code,     // 隐藏列填模块编码
        };

        // 按列名匹配自动填充：模块名称/产品类别/产品名称/厂商
        for (const colName of columnNames) {
          if (colName === pmrCol.name || colName === "_module_code") continue;
          const lowerName = colName.toLowerCase();
          if (lowerName.includes("模块名") || lowerName === "module_name") {
            autoFillColumns[colName] = mod.name;
          } else if (lowerName.includes("产品类别") || lowerName === "product_category") {
            autoFillColumns[colName] = mod.product_category;
          } else if (lowerName.includes("产品名称") || lowerName === "product_name") {
            autoFillColumns[colName] = mod.product_name;
          } else if (lowerName.includes("厂商") || lowerName === "vendor") {
            autoFillColumns[colName] = mod.vendor;
          }
        }

        // 构建插入SQL
        const insertCols = Object.keys(autoFillColumns).map(c => `"${c}"`).join(", ");
        const insertVals = Object.values(autoFillColumns).map(v => `'${v.replace(/'/g, "''")}'`).join(", ");

        const insertSQL = `
          INSERT INTO ${projectSchema}."${tableCode}" 
            (${insertCols}, "allow_delete", "data_source", "sort_order", "created_at")
          VALUES 
            (${insertVals}, false, 'procurement_module', ${i}, NOW())
        `;
        try {
          await client.rpc("execute_sql", {
            p_sql: insertSQL,
          });
        } catch (err) {
          console.error(`插入采购模块记录 ${mod.name} 到 ${tableCode} 失败:`, err);
        }
      }

      console.log(`已为 ${tableCode} 同步 ${sortedModules.length} 条采购模块记录`);
    }
  }

  return { matched: true, tableCount: tablesToCopy.length };
}

export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const { data, error } = await client.rpc("dp_get_by_id", {
        p_table: "projects",
        p_id: id,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "ID required" }, { status: 400 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { id, _sync_schema, members, integration_list, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // 更新项目数据（排除非项目表字段）
    const { data, error } = await client.rpc("dp_update", {
      p_table: "projects",
      p_id: id,
      p_data: updateData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 处理项目成员更新（先删后插）
    if (members && Array.isArray(members)) {
      // 删除旧成员
      await client.rpc("execute_sql", {
        p_sql: `DELETE FROM design_public.project_members WHERE project_id = '${id}'`,
      });
      // 插入新成员
      const memberRecords = members
        .filter((m: { role_type?: string; name?: string }) => m.role_type && m.name)
        .map((m: { role_type: string; user_id?: string; name: string; phone?: string }) => ({
          project_id: id,
          user_id: m.user_id || null,
          role_type: m.role_type,
          name: m.name,
          phone: m.phone || "",
        }));
      for (const record of memberRecords) {
        await client.rpc("dp_insert", {
          p_table: "project_members",
          p_data: record,
        });
      }
    }

    // 如果类型/阶段/状态变更需要同步 schema
    // 编辑保存时始终检查是否有新表需要同步（增量，不删已有表）
    let shouldSync = !!_sync_schema;
    const projectSchema = updateData.project_schema as string;
    const projectType = updateData.project_type as string;
    const projectStage = updateData.project_stage as string;
    const projectStatus = updateData.project_status as string | null;
    const procurementModules = (updateData.procurement_modules as string[]) || [];

    if (!shouldSync && projectSchema && projectType) {
      try {
        // 查当前 schema 中的表
        const { data: existingTables } = await client.rpc("execute_sql", {
          p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${projectSchema}'`,
        });
        const existingSet = new Set(((existingTables as Array<{ table_name: string }>) || []).map(t => t.table_name));
        // 查规则匹配到的表
        const { data: rules } = await client.rpc("dp_select", { p_table: "project_schema_rules" });
        const allRules = (rules as Record<string, unknown>[]) || [];
        const matchedCodes = new Set<string>();
        for (const rule of allRules) {
          if (!rule.is_enabled) continue;
          if (rule.rule_type !== "module" && rule.project_type === projectType) {
            const rs = (rule as Record<string, unknown>).project_status as string | null;
            if (!rs || rs === projectStatus) {
              ((rule.table_definitions as string[]) || []).forEach(c => matchedCodes.add(c));
            }
          }
        }
        // 有规则匹配到但 schema 中没有的表 → 需要同步
        for (const code of matchedCodes) {
          if (!existingSet.has(code)) { shouldSync = true; break; }
        }
      } catch { /* 检测失败不影响主流程 */ }
    }

    if (shouldSync) {
      if (projectSchema && (projectType || projectStage)) {
        try {
          const syncResult = await syncProjectSchema(client, projectSchema, projectType, procurementModules, projectStatus);
          if (!syncResult.matched) {
            return NextResponse.json({
              data,
              warning: "项目已更新，但未匹配到任何 Schema 规则，未同步规范表。请检查「系统配置 → 项目 Schema 规则配置」中是否配置了对应的规则。",
            });
          }
        } catch (syncErr) {
          console.error("同步Schema失败:", syncErr);
          return NextResponse.json({
            data,
            warning: "项目已更新，但Schema同步部分失败，请手动检查"
          });
        }
      }
    }

    // 确保项目专属表存在（方案 B）
    if (updateData.project_schema) {
      const tables = [
        `CREATE TABLE IF NOT EXISTS ${updateData.project_schema}.progress_updates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID, user_name VARCHAR(100), content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        )`,
        `CREATE TABLE IF NOT EXISTS ${updateData.project_schema}.operation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID, user_name VARCHAR(100), action VARCHAR(50) NOT NULL,
          target_type VARCHAR(100), target_name VARCHAR(255), detail TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        )`,
      ];
      for (const sql of tables) {
        try { await client.rpc("execute_sql", { p_sql: sql }); } catch (e) { /* ignore */ }
      }
    }

    // 采购模块变更时，同步采购模块记录（无论是否变更类型/阶段）
    if (updateData.procurement_modules && updateData.project_schema) {
      try {
        const projectSchema = updateData.project_schema as string;
        const procurementModules = updateData.procurement_modules as string[];
        await syncProcurementModuleRecords(client, projectSchema, procurementModules);
      } catch (pmErr) {
        console.error("同步采购模块记录失败:", pmErr);
        // 不阻塞主流程
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

    const { data: project, error: queryError } = await client.rpc("dp_get_by_id", {
      p_table: "projects",
      p_id: id,
    });

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const projectSchema = (project as Record<string, unknown>)?.project_schema as string;
    let uploadsCleaned = false;

    // 删除项目成员
    const { error: membersError } = await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.project_members WHERE project_id = '${id}'`,
    });
    
    if (membersError) {
      console.error("删除项目成员失败:", membersError);
    }

    // 删除项目 Schema
    if (projectSchema) {
      try {
        await client.rpc("execute_sql", {
          p_sql: `DROP SCHEMA IF EXISTS ${projectSchema} CASCADE`,
        });
      } catch (schemaError) {
        console.error("删除项目 Schema 失败:", schemaError);
      }
      // 删除项目上传的文件目录
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", projectSchema);
        if (existsSync(uploadDir)) { rmSync(uploadDir, { recursive: true, force: true }); uploadsCleaned = true; }
      } catch {}
    }

    // 删除项目主表记录
    const { error } = await client.rpc("dp_delete", {
      p_table: "projects",
      p_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedSchema: projectSchema || null,
      uploadsCleaned,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
