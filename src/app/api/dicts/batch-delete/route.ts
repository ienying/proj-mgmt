import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

const VALID_TYPES: Record<string, string> = {
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
  todo_statuses: "todo_statuses",
};

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { type, ids } = await request.json();

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Type and non-empty ids array required" },
        { status: 400 }
      );
    }

    const tableName = VALID_TYPES[type];
    if (!tableName) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      const { error } = await client.rpc("dp_delete", {
        p_table: tableName,
        p_id: id,
      });
      if (error) {
        failed.push({ id, error: error.message });
      } else {
        deleted.push(id);
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
