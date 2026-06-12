import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { CUSTOMER_TYPE_DEPARTMENTS, ALL_DEPARTMENTS } from "@/lib/case-center-constants";

// GET /api/case-center/customers — 客户列表（支持搜索/筛选）
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const customerType = searchParams.get("customer_type") || "";
    const locationQuery = searchParams.get("location") || "";

    let conditions: string[] = [];
    if (q) {
      const safeQ = q.replace(/'/g, "''");
      conditions.push(`c.school_name ILIKE '%${safeQ}%'`);
    }
    if (customerType) {
      const safeType = customerType.replace(/'/g, "''");
      conditions.push(`c.customer_types @> to_jsonb(ARRAY['${safeType}'])`);
    }
    if (locationQuery) {
      const safeLocation = locationQuery.replace(/'/g, "''");
      conditions.push(`(c.location->>'province' ILIKE '%${safeLocation}%' OR c.location->>'city' ILIKE '%${safeLocation}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM design_case_center.customer_departments WHERE customer_id = c.id) as department_count,
        (SELECT COUNT(*) FROM design_case_center.customer_modules WHERE customer_id = c.id) as module_count,
        (SELECT COUNT(*) FROM design_case_center.customer_modules WHERE customer_id = c.id AND status = '已落地') as landed_count
      FROM design_case_center.customers c
      ${whereClause}
      ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
    `;

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/case-center/customers — 创建客户（自动生成科室）
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { school_name, customer_types, location, description, campus_mode, campuses } = body;

    if (!school_name || !customer_types || !Array.isArray(customer_types) || customer_types.length === 0) {
      return NextResponse.json({ error: "学校名称和客户类型为必填项" }, { status: 400 });
    }

    // 1. 插入客户
    const customerData: Record<string, unknown> = {
      school_name,
      customer_types: customer_types,
      location: location || {},
      description: description || "",
      hardware_info: body.hardware_info || {},
      network_info: body.network_info || {},
      campus_mode: campus_mode || "single",
      campuses: campuses || [],
      created_by: body.created_by || "system",
    };

    const { data: customer, error: insertErr } = await client.rpc("dp_insert", {
      p_table: "design_case_center.customers",
      p_data: customerData,
    });

    if (insertErr || !customer) {
      return NextResponse.json({ error: insertErr?.message || "创建客户失败" }, { status: 500 });
    }

    const customerId = (customer as Record<string, unknown>).id as string;

    // 2. 根据客户类型合并生成科室
    const deptSeen = new Set<string>();
    const deptList: { name: string; code: string }[] = [];
    for (const ct of customer_types) {
      const names = CUSTOMER_TYPE_DEPARTMENTS[ct] || [];
      for (const name of names) {
        if (!deptSeen.has(name)) {
          deptSeen.add(name);
          const deptDef = ALL_DEPARTMENTS.find((d) => d.name === name);
          deptList.push({ name, code: deptDef?.code || name });
        }
      }
    }
    const departmentRecords = deptList.map((d, index) => ({
      customer_id: customerId,
      department_code: d.code,
      department_name: d.name,
      sort_order: index,
    }));

    for (const dept of departmentRecords) {
      await client.rpc("dp_insert", {
        p_table: "design_case_center.customer_departments",
        p_data: dept as unknown as Record<string, unknown>,
      });
    }

    // 3. 生成初始版本快照
    const fullCustomer = await fetchCustomerTree(client, customerId);
    const snapshot = {
      customer: fullCustomer.customer || customerData,
      departments: fullCustomer?.departments || [],
      modules: [],
    };

    const { data: existingVersions } = await client.rpc("execute_sql", {
      p_sql: `SELECT COUNT(*) as cnt FROM design_case_center.profile_versions WHERE customer_id = '${customerId}'`,
    });
    const versionCount = Array.isArray(existingVersions)
      ? parseInt(String((existingVersions[0] as Record<string, unknown>).cnt || "0"), 10)
      : 0;

    await client.rpc("dp_insert", {
      p_table: "design_case_center.profile_versions",
      p_data: {
        customer_id: customerId,
        version_number: versionCount + 1,
        change_summary: "初始创建",
        changed_fields: JSON.stringify(["基础信息", "科室列表"]),
        snapshot: JSON.stringify(snapshot),
        operator: body.created_by || "system",
      },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 辅助函数：获取完整客户树
async function fetchCustomerTree(client: Awaited<ReturnType<typeof createServerClient>>, customerId: string) {
  const { data: customer } = await client.rpc("dp_get_by_id", {
    p_table: "design_case_center.customers",
    p_id: customerId,
  });

  const { data: departments } = await client.rpc("execute_sql", {
    p_sql: `SELECT * FROM design_case_center.customer_departments WHERE customer_id = '${customerId}' ORDER BY sort_order`,
  });

  const { data: modules } = await client.rpc("execute_sql", {
    p_sql: `SELECT * FROM design_case_center.customer_modules WHERE customer_id = '${customerId}'`,
  });

  return { customer, departments, modules };
}
