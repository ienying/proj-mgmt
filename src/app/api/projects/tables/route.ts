import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 硬编码：项目 Schema 中特殊表的列定义（不在 data_table_definitions 中）
const HARDCODED_TABLE_DEFS: Record<string, { tableName: string; columns: Array<{ name: string; label: string }> }> = {
  integration_info: {
    tableName: "对接信息",
    columns: [
      { name: "vendor_name", label: "对接厂商" },
      { name: "product_module", label: "产品目录" },
      { name: "integration_type", label: "对接类型" },
      { name: "brief_description", label: "简述" },
      { name: "in_contract", label: "是否在合同内" },
      { name: "contract_note", label: "合同备注" },
      { name: "our_req_contact", label: "我方需求对接人" },
      { name: "our_req_contact_phone", label: "联系方式" },
      { name: "our_product_contact", label: "我方产品负责人" },
      { name: "our_product_contact_phone", label: "联系方式" },
      { name: "our_dev_contact", label: "我方开发负责人" },
      { name: "our_dev_contact_phone", label: "联系方式" },
      { name: "our_responsibility", label: "我方负责内容" },
      { name: "their_req_contact", label: "对方需求对接人" },
      { name: "their_req_contact_phone", label: "联系方式" },
      { name: "their_req_contact_position", label: "职位" },
      { name: "their_req_contact_note", label: "备注" },
      { name: "their_product_contact", label: "对方产品负责人" },
      { name: "their_product_contact_phone", label: "联系方式" },
      { name: "their_product_contact_position", label: "职位" },
      { name: "their_product_contact_note", label: "备注" },
      { name: "their_dev_contact", label: "对方开发负责人" },
      { name: "their_dev_contact_phone", label: "联系方式" },
      { name: "their_dev_contact_position", label: "职位" },
      { name: "their_dev_contact_note", label: "备注" },
      { name: "their_responsibility", label: "对方负责内容" },
      { name: "integration_docs", label: "附件" },
      { name: "remark", label: "备注" },
    ],
  },
  custom_dev_info: {
    tableName: "定制化信息",
    columns: [
      { name: "product_module", label: "产品目录" },
      { name: "custom_content", label: "定制内容" },
      { name: "in_contract", label: "是否在合同内" },
      { name: "contract_note", label: "合同备注" },
      { name: "customer_req_contact", label: "客户需求提出人" },
      { name: "customer_req_contact_phone", label: "联系方式" },
      { name: "customer_req_contact_position", label: "职位" },
      { name: "customer_req_contact_note", label: "备注" },
      { name: "internal_req_contact", label: "内部需求对接人" },
      { name: "internal_req_contact_phone", label: "联系方式" },
      { name: "internal_product_contact", label: "内部产品负责人" },
      { name: "internal_product_contact_phone", label: "联系方式" },
      { name: "req_docs", label: "需求文档" },
      { name: "remark", label: "备注" },
    ],
  },
};

const SYSTEM_TABLES = ["progress_updates", "operation_logs"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIds = searchParams.get("projectIds") || "";
    const ids = projectIds.split(",").filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ tables: [] });
    }

    const client = await createServerClient();

    // 1. 获取项目的 schema
    const safeIds = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(",");
    const { data: projects } = await client.rpc("execute_sql", {
      p_sql: `SELECT id, project_schema FROM public.projects WHERE id IN (${safeIds})`,
    });
    const schemas = (projects as Array<Record<string, string>> || []).map(p => p.project_schema).filter(Boolean);

    if (schemas.length === 0) {
      return NextResponse.json({ tables: [] });
    }

    // 2. 查询所有 schema 中的表（取并集，去重）
    const schemaConditions = schemas.map(s => {
      const safe = s.includes('-') ? s : s.toLowerCase();
      return `table_schema = '${safe.replace(/'/g, "''")}'`;
    }).join(" OR ");

    const { data: schemaTables } = await client.rpc("execute_sql", {
      p_sql: `SELECT DISTINCT table_name FROM information_schema.tables WHERE (${schemaConditions}) AND table_name NOT IN ('${SYSTEM_TABLES.join("','")}') ORDER BY table_name`,
    });
    const tableNames = (schemaTables as Array<{ table_name: string }> || []).map(t => t.table_name);

    // 3. 获取 data_table_definitions 中的中文表名和列定义
    const { data: defs } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_code, table_name, columns_config FROM public.data_table_definitions`,
    });
    const defMap = new Map<string, { tableName: string; columns: Array<{ name: string; label: string }> }>();
    (defs as Array<Record<string, unknown>> || []).forEach(d => {
      const code = String(d.table_code || "");
      const name = String(d.table_name || code);
      const cols = (d.columns_config as Array<{ name: string; label: string }>) || [];
      defMap.set(code, { tableName: name, columns: cols.map(c => ({ name: c.name, label: c.label || c.name })) });
    });

    // 4. 构建返回结果
    const tables = tableNames.map(tc => {
      const hardcoded = HARDCODED_TABLE_DEFS[tc];
      if (hardcoded) return { tableCode: tc, tableName: hardcoded.tableName, columns: hardcoded.columns };

      const def = defMap.get(tc);
      return {
        tableCode: tc,
        tableName: def?.tableName || tc,
        columns: (def?.columns || []).filter(c => !c.name.startsWith("_") && c.name !== "id" && c.name !== "created_at" && c.name !== "updated_at" && c.name !== "created_by" && c.name !== "sort_order" && c.name !== "allow_delete" && c.name !== "data_source"),
      };
    });

    return NextResponse.json({ tables });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
