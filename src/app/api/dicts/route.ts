import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { getCached, TTL } from "@/lib/cache";

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
  departments: "departments",
  construction_units: "construction_units",
  custom_dev_types: "custom_dev_types",
  dev_integration_types: "dev_integration_types",
  todo_statuses: "todo_statuses",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "project_types";
    const tableName = TABLE_MAP[type];
    if (!tableName) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 字典数据缓存 5 分钟
    const result = await getCached(`dicts:${type}`, TTL.DICTS, async () => {
      const client = await createServerClient();
      const { data, error } = await client.rpc("dp_select", { p_table: tableName });

      if (error) throw new Error(error.message);

      const rows = (data || []) as Record<string, unknown>[];

      // 采购模块关联类别名称
      if (type === "product_module_types") {
        const catRes = await client.rpc("dp_select", { p_table: "product_categories" });
        const catMap: Record<string, string> = {};
        if (catRes.data && Array.isArray(catRes.data)) {
          (catRes.data as Record<string, unknown>[]).forEach(
            (cat) => (catMap[cat.id as string] = cat.name as string)
          );
        }
        return rows.map((item) => ({
          ...item,
          category_name: item.category ? catMap[item.category as string] || "-" : "-",
        }));
      }

      return rows;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
