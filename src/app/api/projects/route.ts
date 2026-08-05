import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { getCached, TTL, invalidateCacheByPrefix } from "@/lib/cache";
import { verifyAuth } from "@/lib/auth-utils";

// 兼容 procurement_modules 新旧格式，统一转为 code 字符串数组
function normalizeModules(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return modules
    .map((m: unknown) => {
      if (typeof m === "string") return m;
      if (m && typeof m === "object") {
        const obj = m as Record<string, unknown>;
        return String(obj.code || obj.module_code || "");
      }
      return "";
    })
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "0", 10);

    // 项目列表缓存 30 秒
    const cacheKey = `projects:list:${page}:${pageSize}`;
    const result = await getCached(cacheKey, 30_000, async () => {
      const client = await createServerClient();

      // 列表查询字段
      const LIST_COLUMNS = [
        "id","project_name","project_code","project_type","project_stage",
        "project_schema","status","department","entry_date",
        "initial_acceptance_date","final_acceptance_date","required_date",
        "created_at","updated_at","created_by",
        "role_sales","role_presales","role_market_product","role_project_manager",
        "project_status","customer_type","deployment_mode","final_customer",
        "implementation_unit","description",
        "customer_location","longitude","latitude",
        "procurement_amount","software_amount","hardware_amount",
        "procurement_modules","module_quantities",
        "integration_list","custom_dev_info","channel_info","customer_info",
      ].join(", ");

      // 先查总数
      const { data: countResult } = await client.rpc("execute_sql", {
        p_sql: "SELECT COUNT(*) as total FROM public.projects",
      });
      const total = countResult && Array.isArray(countResult)
        ? Number((countResult[0] as Record<string, unknown>).total) : 0;

      // 查分页数据
      let sql = `SELECT ${LIST_COLUMNS} FROM public.projects ORDER BY entry_date DESC NULLS LAST`;
      if (pageSize > 0) {
        sql += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
      }

      const { data, error } = await client.rpc("execute_sql", { p_sql: sql });
      if (error) throw new Error(error.message);

      let rows = (data || []) as Array<Record<string, unknown>>;

      if (rows.length > 0) {
        for (const p of rows) {
          (p as Record<string, unknown>).procurement_modules = normalizeModules(p.procurement_modules);
        }

        const projectIds = rows.map((p) => `'${String(p.id).replace(/'/g, "''")}'`).join(",");
        const { data: allMembers } = await client.rpc("execute_sql", {
          p_sql: `SELECT project_id, user_id, role_type, name, phone, email FROM public.project_members WHERE project_id IN (${projectIds}) ORDER BY project_id`,
        });
        const membersByProject = new Map<string, Array<Record<string, unknown>>>();
        if (Array.isArray(allMembers)) {
          for (const m of allMembers as Array<Record<string, unknown>>) {
            const pid = String(m.project_id || "");
            if (!membersByProject.has(pid)) membersByProject.set(pid, []);
            membersByProject.get(pid)!.push(m);
          }
        }
        for (const p of rows) {
          const pid = String(p.id || "");
          (p as Record<string, unknown>).members = membersByProject.get(pid) || [];
        }
      }
      return { data: rows, total, page, pageSize };
    });

    return NextResponse.json(result);
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
      module_quantities,
      procurement_amount,
      software_amount,
      hardware_amount,
      tenant_id,
      login_url,
      login_username,
      login_password,
      integration_list,
      custom_dev_info,
      construction_units_info,
      final_customer,
      required_date,
      implementation_unit,
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

    // 0.5 检查是否有匹配的 Schema 规则
    const { data: rules } = await client.rpc("dp_select", { p_table: "project_schema_rules" });
    const enabledRules = ((rules as Record<string, unknown>[]) || []).filter(r => r.is_enabled === true);
    const hasMatchingRule = enabledRules.some(rule => {
      // 类型阶段规则
      if (rule.rule_type !== "module" && rule.project_type === project_type) {
        const ruleStatus = (rule as Record<string, unknown>).project_status as string | null;
        if (!ruleStatus || ruleStatus === (project_status || null)) return true;
      }
      // 产品规则：采购模块有交集 + 类型匹配
      if (rule.rule_type === "module" && rule.project_type === project_type) {
        const ruleStatus = (rule as Record<string, unknown>).project_status as string | null;
        if (ruleStatus && ruleStatus !== (project_status || null)) return false;
        const moduleCodes = (rule.module_codes as string[]) || [];
        const procModules = (procurement_modules as string[]) || [];
        if (moduleCodes.some(code => procModules.includes(code))) return true;
      }
      return false;
    });

    if (!hasMatchingRule) {
      return NextResponse.json(
        { error: "未匹配到任何 Schema 规则。请检查「系统设置 → 项目 Schema 规则配置」中是否配置了对应的项目类型和状态的规则，或联系管理人员进行配置后再试。" },
        { status: 400 }
      );
    }

    // 1. 生成项目 Schema 名称: yuansu_proj_时间戳_项目编号小写
    const projectSchema = `yuansu_proj_${Date.now().toString(36)}_${project_code.toLowerCase()}`;

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
      module_quantities: module_quantities || {},
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
      custom_dev_info: custom_dev_info || [],
      integration_list: integration_list || [],
      construction_units_info: construction_units_info || [],
      final_customer: final_customer || null,
      required_date: required_date || null,
      implementation_unit: implementation_unit || null,
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
    const copyResult = await copyTableDefinitionsToSchema(
      client,
      project_type,
      projectSchema,
      procurement_modules as string[] || [],
      project_status || null
    );

    // 6. 创建项目专属表
    const projectTables = [
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.progress_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_name VARCHAR(100),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.operation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_name VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(100),
        target_name VARCHAR(255),
        detail TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.integration_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_name TEXT,
        product_module TEXT,
        integration_type TEXT,
        brief_description TEXT,
        in_contract TEXT DEFAULT '是',
        contract_note TEXT,
        our_req_contact TEXT,
        our_req_contact_phone TEXT,
        our_product_contact TEXT,
        our_product_contact_phone TEXT,
        our_dev_contact TEXT,
        our_dev_contact_phone TEXT,
        our_responsibility TEXT,
        their_req_contact TEXT,
        their_req_contact_phone TEXT,
        their_req_contact_position TEXT,
        their_req_contact_note TEXT,
        their_product_contact TEXT,
        their_product_contact_phone TEXT,
        their_product_contact_position TEXT,
        their_product_contact_note TEXT,
        their_dev_contact TEXT,
        their_dev_contact_phone TEXT,
        their_dev_contact_position TEXT,
        their_dev_contact_note TEXT,
        their_responsibility TEXT,
        integration_docs JSONB DEFAULT '[]'::jsonb,
        remark TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.custom_dev_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_module TEXT,
        custom_content TEXT,
        in_contract TEXT DEFAULT '是',
        contract_note TEXT,
        customer_req_contact TEXT,
        customer_req_contact_phone TEXT,
        customer_req_contact_position TEXT,
        customer_req_contact_note TEXT,
        internal_req_contact TEXT,
        internal_req_contact_phone TEXT,
        internal_product_contact TEXT,
        internal_product_contact_phone TEXT,
        req_docs JSONB DEFAULT '[]'::jsonb,
        remark TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`,
    ];
    for (const sql of projectTables) {
      try { await client.rpc("execute_sql", { p_sql: sql }); } catch (e) { console.error("建表失败:", e); }
    }

    // 7. 保存对接信息到项目 Schema
    if (Array.isArray(integration_list) && integration_list.length > 0) {
      for (const item of integration_list as Record<string, unknown>[]) {
        const { id, integration_docs, ...rest } = item;
        const columns = Object.keys(rest).filter(k => rest[k] !== undefined);
        const values = columns.map(k => {
          const v = rest[k];
          if (v === null) return 'NULL';
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        const docsJson = integration_docs
          ? `'${JSON.stringify(integration_docs).replace(/'/g, "''")}'`
          : `'[]'`;
        try {
          await client.rpc("execute_sql", {
            p_sql: `INSERT INTO ${projectSchema}.integration_info (${columns.join(", ")}, integration_docs)
              VALUES (${values.join(", ")}, ${docsJson})`,
          });
        } catch (e) { console.error("保存对接信息到项目Schema失败:", e); }
      }
    }

    // 8. 保存定制开发信息到项目 Schema
    if (Array.isArray(custom_dev_info) && custom_dev_info.length > 0) {
      for (const item of custom_dev_info as Record<string, unknown>[]) {
        const { id, req_docs, ...rest } = item;
        const columns = Object.keys(rest).filter(k => rest[k] !== undefined);
        const values = columns.map(k => {
          const v = rest[k];
          if (v === null) return 'NULL';
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        const docsJson = req_docs
          ? `'${JSON.stringify(req_docs).replace(/'/g, "''")}'`
          : `'[]'`;
        try {
          await client.rpc("execute_sql", {
            p_sql: `INSERT INTO ${projectSchema}.custom_dev_info (${columns.join(", ")}, req_docs)
              VALUES (${values.join(", ")}, ${docsJson})`,
          });
        } catch (e) { console.error("保存定制化信息到项目Schema失败:", e); }
      }
    }

    if (!copyResult.matched) {
      return NextResponse.json(
        {
          data,
          warning: "项目已创建，但未匹配到任何 Schema 规则，未复制规范表。请检查「系统配置 → 项目 Schema 规则配置」中是否配置了对应的规则。",
        },
        { status: 201 }
      );
    }

    invalidateCacheByPrefix("projects");
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 根据项目类型、阶段、状态和模块查找匹配的规则，复制规范表到项目 Schema
 * 返回匹配结果：{ matched: boolean, tableCount: number }
 */
async function copyTableDefinitionsToSchema(
  client: Awaited<ReturnType<typeof createServerClient>>,
  projectType: string,
  projectSchema: string,
  procurementModules: string[] = [],
  projectStatus: string | null = null
): Promise<{ matched: boolean; tableCount: number }> {
  try {
    // 查询所有启用的规则
    const { data: rules, error } = await client.rpc("dp_select", {
      p_table: "project_schema_rules",
    });

    if (error || !rules) {
      console.error("查询规则失败:", error);
      return { matched: false, tableCount: 0 };
    }

    // 过滤启用的规则
    const enabledRules = (rules as Record<string, unknown>[])
      .filter((r) => r.is_enabled === true)
      .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0));

    // 收集所有匹配规则的表定义
    const allTableDefinitions = new Set<string>();

    // 1. 匹配类型阶段规则（type_stage）
    // type + status 匹配（status 为空时匹配所有状态），不再按阶段过滤
    // 表的阶段归属由 data_table_definitions.apply_project_stages 决定
    const typeStageRules = enabledRules.filter((r) => r.rule_type !== 'module');

    for (const rule of typeStageRules) {
      const ruleType = rule.project_type as string | null;
      const ruleStatus = (rule as Record<string, unknown>).project_status as string | null;

      // type 必匹配；status 为空时匹配所有，否则精确匹配
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
        if (rule.rule_type === 'module' && rule.module_codes) {
          const moduleCodes = rule.module_codes as string[];
          const hasModuleMatch = moduleCodes.some((code) => procurementModules.includes(code));
          if (!hasModuleMatch) continue;

          // 严格匹配项目类型（多选）
          const typeList = (rule as Record<string, unknown>).project_type_list as string[] | null;
          if (typeList && typeList.length > 0 && !typeList.includes(projectType)) continue;
          // 兼容旧字段 project_type
          if ((!typeList || typeList.length === 0) && rule.project_type && rule.project_type !== projectType) continue;
          // 严格匹配项目状态（多选）
          const statusList = (rule as Record<string, unknown>).project_status_list as string[] | null;
          if (statusList && statusList.length > 0 && projectStatus && !statusList.includes(projectStatus)) continue;
          // 兼容旧字段 project_status
          if ((!statusList || statusList.length === 0) && rule.project_status && rule.project_status !== projectStatus) continue;

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

    const tableDefinitions = Array.from(allTableDefinitions);
    console.log("需要复制的表:", tableDefinitions);

    // 查询规范表定义（可能已在上面查过，但这里统一获取用于复制）
    const { data: allDefinitions } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });

    if (!allDefinitions) {
      console.log("未找到规范表定义");
      return { matched: false, tableCount: 0 };
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
      columnDefs.push(`"_readonly" BOOLEAN DEFAULT false`);

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

        // 确保源表有 _readonly 列（兼容旧表）
        try {
          await client.rpc("execute_sql", {
            p_sql: `ALTER TABLE ${sourceTable} ADD COLUMN IF NOT EXISTS _readonly BOOLEAN DEFAULT FALSE`,
          });
        } catch { /* ignore */ }

        // 获取源表实际存在的列
        let sourceColumns: string[] = [];
        try {
          const { data: cols } = await client.rpc("execute_sql", {
            p_sql: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'design_public' AND table_name = 'std_definition_${tableCode}'`,
          });
          if (Array.isArray(cols)) sourceColumns = cols.map((c: Record<string, unknown>) => String(c.column_name));
        } catch {}

        // 只复制源表中存在的用户列
        const userColumns = columnsConfig
          .map((col) => col.name)
          .filter((name) => sourceColumns.includes(name));

        if (userColumns.length > 0) {
          try {
            // 文件附件列的值清空（旧项目文件key新项目无效）
            const columnsList = userColumns.map((col) => {
              const colDef = columnsConfig.find((c: any) => c.name === col);
              return (colDef && (colDef.type === "attachment" || colDef.type === "video")) ? `'' as "${col}"` : `"${col}"`;
            }).join(", ");
            const insertCols = userColumns.map((c) => `"${c}"`).join(", ");
            const copyDataSQL = `
              INSERT INTO ${projectSchema}."${tableCode}"
                (${insertCols}, _readonly, allow_delete, data_source, sort_order, created_at)
              SELECT
                ${columnsList},
                COALESCE(_readonly, false) as _readonly,
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
            console.error(`复制 ${tableCode} 表数据失败:`, copyErr);
          }
        } else {
          console.log(`表 ${tableCode} 在源表中没有匹配列，跳过数据复制`);
        }
      } catch (err) {
        console.error(`创建表 ${tableCode} 失败:`, err);
      }
    }

    console.log(`成功复制 ${tablesToCopy.length} 个表到 ${projectSchema}`);

    // 6. 为含有采购模块记录类型的表自动生成采购模块记录行
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

        console.log(`已为 ${tableCode} 生成 ${sortedModules.length} 条采购模块记录`);
      }
    }

    return { matched: true, tableCount: tablesToCopy.length };
  } catch (err) {
    console.error("复制规范表失败:", err);
    return { matched: false, tableCount: 0 };
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
