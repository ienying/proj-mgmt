import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issue-config/external-receivers
export async function GET() {
  try {
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_external_receivers",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/issue-config/external-receivers
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { user_id, user_name } = body;

    if (!user_id) {
      return NextResponse.json({ error: "缺少 user_id" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_external_receivers",
      p_data: {
        user_id,
        user_name: user_name || "",
        is_enabled: true,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT /api/issue-config/external-receivers?id=xxx
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const body = await request.json();

    const { data, error } = await client.rpc("dp_update", {
      p_table: "issue_mgmt_external_receivers",
      p_id: id,
      p_data: body,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/issue-config/external-receivers?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const { error } = await client.rpc("dp_delete", {
      p_table: "issue_mgmt_external_receivers",
      p_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
