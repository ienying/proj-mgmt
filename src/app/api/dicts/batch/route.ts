import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const TABLE_MAP: Record<string, string> = {
  project_types: "project_types",
  project_stages: "project_stages",
  product_module_types: "product_module_types",
  member_role_types: "member_role_types",
  product_categories: "product_categories",
  product_vendors: "product_vendors",
  product_scopes: "product_scopes",
  customer_types: "customer_types",
  deployment_modes: "deployment_modes",
  project_statuses: "project_statuses",
  construction_units: "construction_units",
  custom_dev_types: "custom_dev_types",
  dev_integration_types: "dev_integration_types",
  todo_statuses: "todo_statuses",
};

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const typesParam = searchParams.get("types") || "";
    const types = typesParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // 如果没指定 types，返回全部
    const requestedTypes = types.length > 0 ? types : Object.keys(TABLE_MAP);

    const results: Record<string, unknown[]> = {};

    // 并行查询所有表
    const queries = requestedTypes.map(async (type) => {
      const tableName = TABLE_MAP[type];
      if (!tableName) {
        results[type] = [];
        return;
      }
      const { data, error } = await supabase.rpc("dp_select", {
        p_table: tableName,
      });
      if (error) {
        results[type] = [];
        return;
      }

      let result: unknown[] = (data as any[]) || [];

      // 产品模块关联类别名称
      if (type === "product_module_types" && Array.isArray(result)) {
        const categoriesRes = await supabase.rpc("dp_select", {
          p_table: "product_categories",
        });
        const categoriesMap: Record<string, string> = {};
        if (categoriesRes.data && Array.isArray(categoriesRes.data)) {
          categoriesRes.data.forEach((cat: Record<string, unknown>) => {
            categoriesMap[cat.id as string] = cat.name as string;
          });
        }
        result = (result as Record<string, unknown>[]).map((item: Record<string, unknown>) => ({
          ...item,
          category_name: item.category
            ? categoriesMap[item.category as string] || "-"
            : "-",
        }));
      }

      results[type] = result;
    });

    await Promise.allSettled(queries);

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
