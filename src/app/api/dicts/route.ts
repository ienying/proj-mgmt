import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 获取字典数据
export async function GET(request: Request) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "project_types";

    let tableName = "";
    switch (type) {
      case "project_types":
        tableName = "project_types";
        break;
      case "project_stages":
        tableName = "project_stages";
        break;
      case "product_module_types":
        tableName = "product_module_types";
        break;
      case "member_role_types":
        tableName = "member_role_types";
        break;
      case "product_categories":
        tableName = "product_categories";
        break;
      case "product_vendors":
        tableName = "product_vendors";
        break;
      case "product_scopes":
        tableName = "product_scopes";
        break;
      case "customer_types":
        tableName = "customer_types";
        break;
      case "deployment_modes":
        tableName = "deployment_modes";
        break;
      case "project_statuses":
        tableName = "project_statuses";
        break;
      case "departments":
        tableName = "departments";
        break;
      case "todo_statuses":
        tableName = "todo_statuses";
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 使用 RPC 函数查询 design_public 中的数据
    const { data, error } = await client.rpc("dp_select", {
      p_table: tableName,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let result = data || [];

    // 如果是采购模块，关联类别名称
    if (type === "product_module_types" && Array.isArray(result)) {
      const categoriesRes = await client.rpc("dp_select", {
        p_table: "product_categories",
      });

      const categoriesMap: Record<string, string> = {};
      if (categoriesRes.data && Array.isArray(categoriesRes.data)) {
        categoriesRes.data.forEach((cat: Record<string, unknown>) => {
          categoriesMap[cat.id as string] = cat.name as string;
        });
      }

      result = result.map((item: Record<string, unknown>) => ({
        ...item,
        category_name: item.category
          ? categoriesMap[item.category as string] || "-"
          : "-",
      }));
    }

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
