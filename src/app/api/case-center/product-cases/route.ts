import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/product-cases — 产品案例聚合查询
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get("department_code") || "";
    const moduleCode = searchParams.get("module_code") || "";
    const customerType = searchParams.get("customer_type") || "";
    const schoolType = searchParams.get("school_type") || "";
    const effectiveType = customerType || schoolType;

    // 构建 WHERE 条件
    const conditions: string[] = ["cm.status = '已落地'"];
    if (departmentCode) {
      conditions.push(`cd.department_code = '${departmentCode.replace(/'/g, "''")}'`);
    }
    if (moduleCode) {
      conditions.push(`cm.module_code = '${moduleCode.replace(/'/g, "''")}'`);
    }
    if (effectiveType) {
      conditions.push(`c.customer_types @> to_jsonb(ARRAY['${effectiveType.replace(/'/g, "''")}'])`);
    }
    const whereClause = conditions.join(" AND ");

    // 1. 按模块统计概览（已落地）
    const statsSql = `
      SELECT
        cm.module_code,
        cm.module_name,
        COUNT(DISTINCT cm.customer_id) as school_count,
        ROUND(AVG(cm.usage_rate)::numeric, 1) as avg_usage_rate,
        SUM(cm.active_users) as total_active_users,
        COUNT(DISTINCT cm.id) FILTER (WHERE jsonb_array_length(cm.materials) > 0) as material_school_count,
        (SELECT COUNT(*) FROM design_case_center.customer_modules m2
         JOIN design_case_center.customer_departments d2 ON m2.customer_department_id = d2.id
         JOIN design_case_center.customers c2 ON m2.customer_id = c2.id
         WHERE m2.status = '已落地'
         ${departmentCode ? `AND d2.department_code = '${departmentCode.replace(/'/g, "''")}'` : ""}
         ${effectiveType ? `AND c2.customer_types @> to_jsonb(ARRAY['${effectiveType.replace(/'/g, "''")}'])` : ""}
        ) as total_materials
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id
      JOIN design_case_center.customers c ON cm.customer_id = c.id
      WHERE ${whereClause}
      GROUP BY cm.module_code, cm.module_name
      ORDER BY school_count DESC
    `;

    // 1.1 产品模块使用排名（按模块聚合所有状态的学校数）
    const moduleRankingBaseConditions: string[] = [];
    if (departmentCode) {
      moduleRankingBaseConditions.push(`cd.department_code = '${departmentCode.replace(/'/g, "''")}'`);
    }
    if (effectiveType) {
      moduleRankingBaseConditions.push(`c.customer_types @> to_jsonb(ARRAY['${effectiveType.replace(/'/g, "''")}'])`);
    }
    const moduleRankingWhere = moduleRankingBaseConditions.length > 0
      ? `WHERE ${moduleRankingBaseConditions.join(" AND ")}`
      : "";

    const moduleRankingSql = `
      SELECT
        cm.module_code,
        cm.module_name,
        COUNT(DISTINCT cm.customer_id) as landed_schools,
        COUNT(DISTINCT cm.customer_id) FILTER (WHERE cm.status = '已落地') as active_schools,
        COUNT(DISTINCT cm.customer_id) FILTER (WHERE cm.status = '未落地') as trial_schools,
        COUNT(DISTINCT cm.customer_id) FILTER (WHERE cm.status = '未购') as not_purchased_schools,
        ROUND(
          COUNT(DISTINCT cm.customer_id) FILTER (WHERE cm.status = '已落地')::numeric
          / NULLIF(COUNT(DISTINCT cm.customer_id), 0) * 100, 1
        ) as coverage_rate,
        COUNT(DISTINCT cm.customer_id) as total_school_count
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id
      JOIN design_case_center.customers c ON cm.customer_id = c.id
      ${moduleRankingWhere}
      GROUP BY cm.module_code, cm.module_name
      ORDER BY landed_schools DESC
    `;

    // 2. 学校使用率排行
    const rankingSql = `
      SELECT
        c.id as school_id,
        c.school_name,
        c.customer_types,
        c.location,
        cm.usage_rate,
        cm.active_users,
        cm.effect,
        cm.materials,
        cd.department_name,
        cd.department_code,
        cm.module_name,
        cm.module_code
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id
      JOIN design_case_center.customers c ON cm.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY cm.usage_rate DESC
    `;

    // 3. 客户类型分布（展开 JSONB 数组）
    const typeDistSql = `
      SELECT
        ct as school_type,
        COUNT(DISTINCT c.id) as school_count
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customers c ON cm.customer_id = c.id
      CROSS JOIN LATERAL jsonb_array_elements_text(c.customer_types) AS ct
      ${departmentCode || moduleCode ? "JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id" : ""}
      WHERE ${whereClause}
      GROUP BY ct
      ORDER BY school_count DESC
    `;

    // 4. 省份画像分布
    const provinceDistSql = `
      SELECT
        COALESCE(c.location->>'province', '未知') as province,
        COUNT(DISTINCT c.id) as school_count
      FROM design_case_center.customers c
      JOIN design_case_center.customer_modules cm ON cm.customer_id = c.id
      WHERE ${whereClause}
      GROUP BY c.location->>'province'
      ORDER BY school_count DESC
    `;

    const [statsRes, rankingRes, typeDistRes, moduleRankingRes, provinceDistRes] = await Promise.all([
      client.rpc("execute_sql", { p_sql: statsSql }),
      client.rpc("execute_sql", { p_sql: rankingSql }),
      client.rpc("execute_sql", { p_sql: typeDistSql }),
      client.rpc("execute_sql", { p_sql: moduleRankingSql }),
      client.rpc("execute_sql", { p_sql: provinceDistSql }),
    ]);

    // 5. 可用筛选选项（从已有数据提取）
    const filterOptionsSql = `
      SELECT DISTINCT cd.department_code, cd.department_name
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id
      WHERE cm.status = '已落地'
      ORDER BY cd.department_name
    `;
    const { data: deptOptions } = await client.rpc("execute_sql", { p_sql: filterOptionsSql });

    const moduleOptionsSql = `
      SELECT DISTINCT cm.module_code, cm.module_name
      FROM design_case_center.customer_modules cm
      WHERE cm.status = '已落地'
      ${departmentCode ? `AND cm.customer_department_id IN (SELECT id FROM design_case_center.customer_departments WHERE department_code = '${departmentCode.replace(/'/g, "''")}')` : ""}
      ORDER BY cm.module_name
    `;
    const { data: moduleOptions } = await client.rpc("execute_sql", { p_sql: moduleOptionsSql });

    return NextResponse.json({
      data: {
        stats: statsRes.data || [],
        ranking: rankingRes.data || [],
        typeDistribution: typeDistRes.data || [],
        moduleRanking: moduleRankingRes.data || [],
        provinceDistribution: provinceDistRes.data || [],
        filterOptions: {
          departments: deptOptions || [],
          modules: moduleOptions || [],
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
