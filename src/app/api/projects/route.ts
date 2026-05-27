import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET() {
  try {
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_select", {
      p_table: "projects",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
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
      project_name,
      project_code,
      project_type,
      project_stage,
      project_status,
      department,
      description,
      entry_date,
      initial_acceptance_date,
      final_acceptance_date,
      customer_info,
      customer_location,
      longitude,
      latitude,
      school_photos,
      customer_type,
      deployment_mode,
      channel_info,
      members,
      procurement_modules,
      procurement_amount,
      software_amount,
      hardware_amount,
      tenant_id,
      login_url,
      login_username,
      login_password,
      integration_list,
    } = body;

    // 0. 检查项目编号是否重复
    const { data: existing } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    const projects = (existing as Record<string, unknown>[]) || [];
    if (projects.some((p) => p.project_code === project_code)) {
      return NextResponse.json(
        { error: "项目编号已存在，请更换项目编号" },
        { status: 409 }
      );
    }

    // 1. 生成项目 Schema 名称
    const projectSchema = `yuansu_${project_code.toLowerCase()}`;

    // 2. 插入项目主表
    const insertData: Record<string, unknown> = {
      project_name,
      project_code,
      project_type,
      project_stage,
      project_schema: projectSchema,
      department: department || null,
      description,
      entry_date: entry_date || null,
      initial_acceptance_date: initial_acceptance_date || null,
      final_acceptance_date: final_acceptance_date || null,
      customer_info: customer_info || { company_name: "", contacts: [] },
      customer_location: customer_location || null,
      longitude: longitude || null,
      latitude: latitude || null,
      school_photos: school_photos || null,
      customer_type: customer_type || null,
      deployment_mode: deployment_mode || null,
      channel_info: channel_info || [],
      procurement_modules: procurement_modules || [],
      procurement_amount: procurement_amount ? parseFloat(procurement_amount as string) : null,
      software_amount: software_amount ? parseFloat(software_amount as string) : null,
      hardware_amount: hardware_amount ? parseFloat(hardware_amount as string) : null,
      tenant_id: tenant_id || null,
      login_url: login_url || null,
      login_username: login_username || null,
      login_password: login_password || null,
      project_status: project_status || null,
      role_sales: body.role_sales || null,
      role_presales: body.role_presales || null,
      role_market_product: body.role_market_product || null,
      role_project_manager: body.role_project_manager || null,
      status: "active",
      created_by: body.created_by || "system",
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "projects",
      p_data: insertData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const projectId = (data as Record<string, unknown>)?.id as string;

    // 3. 插入项目成员
    if (members && members.length > 0) {
      const memberRecords = members
        .filter((m: { role_type?: string; name?: string }) => m.role_type && m.name)
        .map((m: { role_type: string; user_id?: string; name: string; phone?: string }) => ({
          project_id: projectId,
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

    // 4. 创建项目 Schema
    try {
      await client.rpc("execute_sql", {
        p_sql: `CREATE SCHEMA IF NOT EXISTS ${projectSchema}`,
      });
    } catch {
      // Schema 可能已存在，忽略错误
    }

    // 5. 根据规则复制规范表到项目 Schema
    await copyTableDefinitionsToSchema(
      client, 
      project_type, 
      project_stage, 
      projectSchema,
      procurement_modules as string[] || []
    );

    // 5. 保存对接信息
    if (Array.isArray(integration_list) && integration_list.length > 0) {
      for (const item of integration_list as Record<string, unknown>[]) {
        const { id, ...rest } = item;
        await client.rpc("dp_insert", {
          p_table: "integration_info",
          p_data: { project_id: projectId, ...rest },
        });
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 根据项目类型、阶段和模块查找匹配的规则，复制规范表到项目 Schema
 */
async function copyTableDefinitionsToSchema(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectType: string,
  projectStage: string,
  projectSchema: string,
  procurementModules: string[] = []
) {
  try {
    // 查询所有启用的规则
    const { data: rules, error } = await client.rpc("dp_select", {
      p_table: "project_schema_rules",
    });

    if (error || !rules) {
      console.error("查询规则失败:", error);
      return;
    }

    // 过滤启用的规则
    const enabledRules = (rules as Record<string, unknown>[])
      .filter((r) => r.is_enabled === true)
      .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0));

    // 收集所有匹配规则的表定义
    const allTableDefinitions = new Set<string>();

    // 1. 匹配类型阶段规则
    // 先找精确匹配（类型+阶段都匹配）
    const exactMatch = enabledRules.find(
      (r) => r.rule_type !== 'module' && r.project_type === projectType && r.project_stage === projectStage
    );
    if (exactMatch?.table_definitions) {
      (exactMatch.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
    }

    // 找类型匹配
    const typeMatch = enabledRules.find(
      (r) => r.rule_type !== 'module' && r.project_type === projectType && r.project_stage === null
    );
    if (typeMatch?.table_definitions) {
      (typeMatch.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
    }

    // 找阶段匹配
    const stageMatch = enabledRules.find(
      (r) => r.rule_type !== 'module' && r.project_type === null && r.project_stage === projectStage
    );
    if (stageMatch?.table_definitions) {
      (stageMatch.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
    }

    // 找通用规则
    const genericMatch = enabledRules.find(
      (r) => r.rule_type !== 'module' && r.project_type === null && r.project_stage === null
    );
    if (genericMatch?.table_definitions) {
      (genericMatch.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
    }

    // 2. 匹配模块规则
    if (procurementModules && procurementModules.length > 0) {
      for (const rule of enabledRules) {
        if (rule.rule_type === 'module' && rule.module_codes) {
          const moduleCodes = rule.module_codes as string[];
          // 检查是否有交集
          const hasMatch = moduleCodes.some((code) => procurementModules.includes(code));
          if (hasMatch && rule.table_definitions) {
            (rule.table_definitions as string[]).forEach((t) => allTableDefinitions.add(t));
          }
        }
      }
    }

    // 3. 从 data_table_definitions 直接匹配：apply_project_types 和 apply_project_stages
    const { data: directDefinitions } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });
    if (directDefinitions) {
      for (const def of directDefinitions as Record<string, unknown>[]) {
        const applyTypes = (def.apply_project_types as string[]) || [];
        const applyStages = (def.apply_project_stages as string[]) || [];
        const tableCode = def.table_code as string;
        
        // 检查是否匹配：类型或阶段有交集即匹配
        const typeMatch = applyTypes.length === 0 || applyTypes.includes(projectType);
        const stageMatch = applyStages.length === 0 || applyStages.includes(projectStage);
        if (typeMatch && stageMatch && tableCode) {
          allTableDefinitions.add(tableCode);
        }
      }
    }

    // 4. 按模块配置匹配：从 project_type_stage_modules 获取启用的模块码，
    //    再从 data_table_definitions 中找到属于这些模块的表
    if (projectType && projectStage) {
      const { data: moduleConfigs } = await client.rpc("dp_select", {
        p_table: "project_type_stage_modules",
      });
      if (moduleConfigs) {
        const enabledModuleCodes = (moduleConfigs as Record<string, unknown>[])
          .filter((c) => c.project_type_code === projectType && c.project_stage_code === projectStage && c.is_enabled)
          .map((c) => c.module_code as string);
        
        if (enabledModuleCodes.length > 0 && directDefinitions) {
          for (const def of directDefinitions as Record<string, unknown>[]) {
            const moduleTypes = (def.module_type as string[]) || [];
            const tableCode = def.table_code as string;
            // 表的模块与启用的模块有交集
            if (moduleTypes.some((m: string) => enabledModuleCodes.includes(m)) && tableCode) {
              allTableDefinitions.add(tableCode);
            }
          }
        }
      }
    }

    if (allTableDefinitions.size === 0) {
      console.log("未找到匹配的规则或规范表定义");
      return;
    }

    const tableDefinitions = Array.from(allTableDefinitions);
    console.log("需要复制的表:", tableDefinitions);

    // 查询规范表定义（可能已在上面查过，但这里统一获取用于复制）
    const { data: allDefinitions } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (!allDefinitions) {
      console.log("未找到规范表定义");
      return;
    }

    // 过滤出需要复制的表
    const tablesToCopy = (allDefinitions as Record<string, unknown>[]).filter(
      (d) => tableDefinitions.includes(d.table_code as string)
    );

    // 创建项目 Schema（如果不存在）
    try {
      await client.rpc("execute_sql", {
        p_sql: `CREATE SCHEMA IF NOT EXISTS ${projectSchema}`,
      });
    } catch {
      // 忽略错误，Schema 可能已存在
    }

    // 复制每个表到项目 Schema
    for (const tableDef of tablesToCopy) {
      const tableCode = tableDef.table_code as string;
      const tableName = tableDef.table_name as string;
      const columnsConfig = tableDef.columns_config as Array<{ name: string; type: string; required: boolean }>;

      // 构建 CREATE TABLE SQL
      const columnDefs = columnsConfig.map((col) => {
        const sqlType = mapColumnTypeToSQL(col.type);
        const notNull = col.required ? " NOT NULL" : "";
        return `"${col.name}" ${sqlType}${notNull}`;
      });

      // 添加标准字段
      columnDefs.push(`"id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()`);
      columnDefs.push(`"sort_order" INTEGER DEFAULT 0`);
      columnDefs.push(`"created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
      columnDefs.push(`"updated_at" TIMESTAMP WITH TIME ZONE`);
      columnDefs.push(`"created_by" VARCHAR(36)`);
      columnDefs.push(`"allow_delete" BOOLEAN DEFAULT true`);

      // 采购模块记录类型：添加 _module_code 隐藏列
      const hasProcurementRecord = columnsConfig.some((col: { type: string }) => col.type === 'procurement_record');
      if (hasProcurementRecord) {
        columnDefs.push(`"_module_code" VARCHAR(255)`);
      }
      columnDefs.push(`"data_source" TEXT DEFAULT 'standard'`);

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${projectSchema}."${tableCode}" (
          ${columnDefs.join(",\n          ")}
        )
      `;

      try {
        // 1. 创建表结构
        await client.rpc("execute_sql", {
          p_sql: createTableSQL,
        });

        // 1.5 如果表已存在且缺少 _module_code 列，补充添加
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

        // 2. 复制数据（从 std_definition_{table_code} 表）
        const sourceTable = `design_public.std_definition_${tableCode}`;
        
        // 获取用户定义的列名（排除系统字段）
        const userColumns = columnsConfig.map((col) => col.name);
        
        // 直接尝试复制数据（如果源表不存在会失败，但可以忽略）
        if (userColumns.length > 0) {
          try {
            // 复制数据（包含 allow_delete 和 data_source）
            const columnsList = userColumns.map((col) => `"${col}"`).join(", ");
            const copyDataSQL = `
              INSERT INTO ${projectSchema}."${tableCode}" 
                (${columnsList}, allow_delete, data_source, sort_order, created_at)
              SELECT 
                ${columnsList}, 
                COALESCE(allow_delete, true) as allow_delete,
                COALESCE(data_source, 'standard') as data_source,
                0 as sort_order,
                NOW() as created_at
              FROM ${sourceTable}
            `;
            
            await client.rpc("execute_sql", {
              p_sql: copyDataSQL,
            });
            
            console.log(`已复制 ${tableCode} 表的数据到 ${projectSchema}`);
          } catch (copyErr) {
            // 源表可能不存在或没有数据，忽略错误
            console.log(`复制 ${tableCode} 表数据失败（可能源表不存在）:`, copyErr);
          }
        }
      } catch (err) {
        console.error(`创建表 ${tableCode} 失败:`, err);
      }
    }

    console.log(`成功复制 ${tablesToCopy.length} 个表到 ${projectSchema}`);

    // 6. 为含有采购模块记录类型的表自动生成采购模块记录行
    if (procurementModules && procurementModules.length > 0) {
      // 获取产品模块详情（含排序信息和属性）
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

        console.log(`已为 ${tableCode} 生成 ${sortedModules.length} 条采购模块记录`);
      }
    }
  } catch (err) {
    console.error("复制规范表失败:", err);
  }
}

/**
 * 映射列类型到 SQL 类型
 */
function mapColumnTypeToSQL(type: string): string {
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
