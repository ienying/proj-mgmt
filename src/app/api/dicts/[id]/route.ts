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
  todo_statuses: "todo_statuses",
};

export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const { type, id, ...updateData } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID required" },
        { status: 400 }
      );
    }

    const tableName = VALID_TYPES[type];
    if (!tableName) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 对于 product_module_types，移除不存在的 name 字段
    const finalUpdateData = { ...updateData };
    if (type === "product_module_types" && "name" in finalUpdateData) {
      delete finalUpdateData.name;
    }

    // 使用 RPC 更新
    const { data, error } = await client.rpc("dp_update", {
      p_table: tableName,
      p_id: id,
      p_data: finalUpdateData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const { id } = await params;

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type and ID required" },
        { status: 400 }
      );
    }

    const tableName = VALID_TYPES[type];
    if (!tableName) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 使用 RPC 删除
    const { error } = await client.rpc("dp_delete", {
      p_table: tableName,
      p_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
