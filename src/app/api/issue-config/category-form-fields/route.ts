import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// PUT /api/issue-config/category-form-fields?category_id=xxx
// Save form_fields config for a specific category
export async function PUT(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    if (!categoryId) {
      return NextResponse.json({ error: "缺少 category_id" }, { status: 400 });
    }

    const body = await request.json();
    const { form_fields } = body;

    if (!Array.isArray(form_fields)) {
      return NextResponse.json({ error: "form_fields 必须是数组" }, { status: 400 });
    }

    const { data, error } = await client.rpc("dp_update", {
      p_table: "issue_mgmt_issue_categories",
      p_id: categoryId,
      p_data: { form_fields },
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
