import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET() {
  try {
    const client = await createServerClient();

    const { data, error } = await client.rpc("dp_select", {
      p_table: "project_schema_rules",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按 sort_order 排序
    const sortedData = (data || []).sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0)
    );

    return NextResponse.json({ data: sortedData });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      rule_name,
      rule_type = 'type_stage',
      project_type,
      project_stage,
      project_status,
      project_type_list,
      project_status_list,
      deployment_mode_list,
      module_codes,
      table_definitions,
      is_enabled = true,
      sort_order = 0,
      description,
    } = body;

    const insertData: Record<string, unknown> = {
      rule_name,
      rule_type,
      project_type: rule_type === 'type_stage' ? (project_type || null) : null,
      project_stage: project_stage || null, // both rule types support stage filter
      project_status: project_status || null, // both rule types support status filter
      project_type_list: project_type_list || null,
      project_status_list: project_status_list || null,
      deployment_mode_list: deployment_mode_list || null,
      module_codes: rule_type === 'module' ? (module_codes || []) : [],
      table_definitions: table_definitions || [],
      is_enabled,
      sort_order,
      description,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "project_schema_rules",
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
