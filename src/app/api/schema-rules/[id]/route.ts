import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // 根据 rule_type 清理不相关的字段
    if (updateData.rule_type === 'module') {
      updateData.project_type = null;
      updateData.project_type_list = null;
      updateData.project_status = null;
      updateData.project_status_list = null;
      updateData.deployment_mode_list = null;
    } else {
      updateData.module_codes = [];
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "project_schema_rules",
      p_id: id,
      p_data: updateData,
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

export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { error } = await client.rpc("dp_delete", {
      p_table: "project_schema_rules",
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
