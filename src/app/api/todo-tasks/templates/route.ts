import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/todo-tasks/templates?created_by=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get("created_by");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "form_column_templates",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let items = (data || []) as Record<string, unknown>[];

    if (createdBy) {
      items = items.filter((r) => String(r.created_by) === createdBy);
    }

    items.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    return NextResponse.json({ data: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/todo-tasks/templates
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { name, columns_config, created_by, created_by_name } = body;

    if (!name || !columns_config || !Array.isArray(columns_config) || columns_config.length === 0) {
      return NextResponse.json({ error: "模板名称和字段配置不能为空" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "form_column_templates",
      p_data: {
        name,
        columns_config,
        created_by: created_by || null,
        created_by_name: created_by_name || null,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
