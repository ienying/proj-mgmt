import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "default_user";

    // 使用 RPC 查询所有 todo，然后在前端过滤
    const { data, error } = await client.rpc("dp_select", {
      p_table: "todo_items",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 按 user_id 过滤
    const filteredData = Array.isArray(data)
      ? data.filter(
          (item: Record<string, unknown>) => item.user_id === userId
        )
      : [];

    return NextResponse.json({ data: filteredData });
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
      user_id = "default_user",
      title,
      description,
      priority = "medium",
      due_date,
    } = body;

    const insertData: Record<string, unknown> = {
      user_id,
      title,
      description,
      priority,
      due_date,
      is_completed: false,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "todo_items",
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
