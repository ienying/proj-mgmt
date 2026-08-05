import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectSchema: ps } = body as { projectId?: string; projectSchema?: string };

    if (!projectId && !ps) {
      return NextResponse.json({ error: "projectId or projectSchema required" }, { status: 400 });
    }

    const client = await createServerClient();

    // 用 execute_sql 直接查 projects 表，确保拿到 integration_list 和 custom_dev_info
    const where = projectId
      ? `id = '${projectId.replace(/'/g, "''")}'`
      : `project_schema = '${(ps || "").replace(/'/g, "''")}'`;
    const { data: rows } = await client.rpc("execute_sql", {
      p_sql: `SELECT id, project_schema, integration_list, custom_dev_info FROM public.projects WHERE ${where}`,
    });
    const projects = (rows as Array<Record<string, unknown>>) || [];
    if (projects.length === 0) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    const p = projects[0];
    if (!p.project_schema) {
      return NextResponse.json({ error: "项目 Schema 未配置" }, { status: 400 });
    }
    const projectSchema = String(p.project_schema);

    // 处理 integration_list: 可能是 JSON 字符串或已解析的对象
    let integrationList: Array<Record<string, unknown>> | null = null;
    const rawInt = p.integration_list;
    if (Array.isArray(rawInt)) {
      integrationList = rawInt as Array<Record<string, unknown>>;
    } else if (typeof rawInt === "string" && rawInt.trim()) {
      try { const parsed = JSON.parse(rawInt); if (Array.isArray(parsed)) integrationList = parsed; } catch { /* ignore */ }
    }

    let customDevInfo: Array<Record<string, unknown>> | null = null;
    const rawCd = p.custom_dev_info;
    if (Array.isArray(rawCd)) {
      customDevInfo = rawCd as Array<Record<string, unknown>>;
    } else if (typeof rawCd === "string" && rawCd.trim()) {
      try { const parsed = JSON.parse(rawCd); if (Array.isArray(parsed)) customDevInfo = parsed; } catch { /* ignore */ }
    }

    // 建表
    const createSQLs = [
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.integration_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_name TEXT, product_module TEXT, integration_type TEXT,
        brief_description TEXT, in_contract TEXT DEFAULT '是', contract_note TEXT,
        our_req_contact TEXT, our_req_contact_phone TEXT,
        our_product_contact TEXT, our_product_contact_phone TEXT,
        our_dev_contact TEXT, our_dev_contact_phone TEXT,
        our_responsibility TEXT,
        their_req_contact TEXT, their_req_contact_phone TEXT,
        their_req_contact_position TEXT, their_req_contact_note TEXT,
        their_product_contact TEXT, their_product_contact_phone TEXT,
        their_product_contact_position TEXT, their_product_contact_note TEXT,
        their_dev_contact TEXT, their_dev_contact_phone TEXT,
        their_dev_contact_position TEXT, their_dev_contact_note TEXT,
        their_responsibility TEXT,
        integration_docs JSONB DEFAULT '[]'::jsonb,
        remark TEXT, created_at TIMESTAMPTZ DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS ${projectSchema}.custom_dev_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_module TEXT, custom_content TEXT,
        in_contract TEXT DEFAULT '是', contract_note TEXT,
        customer_req_contact TEXT, customer_req_contact_phone TEXT,
        customer_req_contact_position TEXT, customer_req_contact_note TEXT,
        internal_req_contact TEXT, internal_req_contact_phone TEXT,
        internal_product_contact TEXT, internal_product_contact_phone TEXT,
        req_docs JSONB DEFAULT '[]'::jsonb,
        remark TEXT, created_at TIMESTAMPTZ DEFAULT now()
      )`,
    ];
    for (const sql of createSQLs) {
      await client.rpc("execute_sql", { p_sql: sql });
    }

    // 从 projects 表 JSONB 迁移已有数据
    if (integrationList && integrationList.length > 0) {
      // 先检查表是否已有数据
      const { data: existing } = await client.rpc("execute_sql", {
        p_sql: `SELECT COUNT(*) as cnt FROM ${projectSchema}.integration_info`,
      });
      const cnt = Number(((existing as Array<Record<string, unknown>>)?.[0]?.cnt) || 0);
      if (cnt === 0) {
        for (const item of integrationList) {
          const { id, integration_docs, created_at, updated_at, ...rest } = item as Record<string, unknown>;
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
          } catch (e) { /* skip */ }
        }
      }
    }

    if (customDevInfo && customDevInfo.length > 0) {
      const { data: existing } = await client.rpc("execute_sql", {
        p_sql: `SELECT COUNT(*) as cnt FROM ${projectSchema}.custom_dev_info`,
      });
      const cnt = Number(((existing as Array<Record<string, unknown>>)?.[0]?.cnt) || 0);
      if (cnt === 0) {
        for (const item of customDevInfo) {
          const { id, req_docs, created_at, updated_at, ...rest } = item as Record<string, unknown>;
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
          } catch (e) { /* skip */ }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
