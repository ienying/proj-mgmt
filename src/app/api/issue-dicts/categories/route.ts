import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issue-dicts/categories
export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_issue_categories",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const categories = ((data || []) as Record<string, unknown>[]).sort(
      (a, b) => Number(a.sort_order) - Number(b.sort_order)
    );
    return NextResponse.json({ data: categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/issue-dicts/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issue_categories",
      p_data: {
        name: body.name,
        code: body.code,
        parent_id: body.parent_id || null,
        sort_order: body.sort_order || 0,
        is_enabled: body.is_enabled !== undefined ? body.is_enabled : true,
      },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/issue-dicts/categories?id=xxx
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const body = await request.json();
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_update", {
      p_table: "issue_mgmt_issue_categories",
      p_id: id,
      p_data: {
        name: body.name,
        code: body.code,
        parent_id: body.parent_id || null,
        sort_order: body.sort_order || 0,
        is_enabled: body.is_enabled !== undefined ? body.is_enabled : true,
      },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/issue-dicts/categories?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_delete", {
      p_table: "issue_mgmt_issue_categories",
      p_id: id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
