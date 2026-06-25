import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      type,
      code,
      name,
      description,
      sort_order = 0,
      is_enabled = true,
    } = body;

    let tableName = "";
    let insertData: Record<string, unknown> = {
      code,
      name,
      description,
      sort_order,
      is_enabled,
    };

    switch (type) {
      case "project_types":
        tableName = "project_types";
        break;
      case "project_stages":
        tableName = "project_stages";
        break;
      case "product_module_types":
        tableName = "product_module_types";
        insertData = {
          code,
          module_name: body.module_name || name,
          product_name: body.product_name || null,
          product_category: body.product_category || null,
          description,
          sort_order,
          is_enabled,
          tech_specs: body.tech_specs || null,
          bidding_instructions: body.bidding_instructions || null,
          software_name: body.software_name || null,
          vendor: body.vendor || null,
          scope: body.scope || null,
          category: body.category || null,
          remarks: body.remarks || null,
        };
        break;
      case "member_role_types":
        tableName = "member_role_types";
        break;
      case "product_categories":
        tableName = "product_categories";
        break;
      case "product_vendors":
        tableName = "product_vendors";
        insertData = {
          ...insertData,
          contact_person: body.contact_person || null,
          contact_phone: body.contact_phone || null,
          contact_email: body.contact_email || null,
          address: body.address || null,
        };
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
        insertData = {
          ...insertData,
          color: body.color || null,
          description: body.description || null,
        };
        break;
      case "departments":
        tableName = "departments";
        break;
      case "construction_units":
        tableName = "construction_units";
        insertData = {
          ...insertData,
          contact_person: body.contact_person || null,
          phone: body.phone || null,
          cooperation_level: body.cooperation_level || null,
        };
        break;
      case "todo_statuses":
        tableName = "todo_statuses";
        insertData = {
          ...insertData,
          color: body.color || null,
          description: body.description || null,
        };
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // 检查代码是否已存在
    const { data: existingData } = await client.rpc("dp_select", {
      p_table: tableName,
    });

    if (existingData && Array.isArray(existingData)) {
      const existing = existingData.find(
        (item: Record<string, unknown>) => item.code === code
      );
      if (existing) {
        return NextResponse.json({ error: "代码已存在" }, { status: 400 });
      }
    }

    // 使用 RPC 插入
    const { data, error } = await client.rpc("dp_insert", {
      p_table: tableName,
      p_data: insertData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
