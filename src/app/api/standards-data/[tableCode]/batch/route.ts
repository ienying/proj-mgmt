import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const body = await request.json();
    const { ids, data } = body as { ids: string[]; data: Record<string, unknown> };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择至少一条记录" }, { status: 400 });
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无更新数据" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const tableName = `std_definition_${tableCode}`;

    // 清理数据：空字符串转 null
    const cleanData: Record<string, unknown> = { ...data };
    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === "") cleanData[key] = null;
    }

    // 逐条更新（使用 dp_update_varchar 支持 varchar 类型的 id）
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const { error } = await supabase.rpc("dp_update_varchar", {
        p_table: tableName,
        p_id: id,
        p_data: cleanData,
      });

      if (error) {
        errors.push(`ID ${id.slice(0, 8)}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("批量更新失败:", error);
    return NextResponse.json({ error: "批量更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请选择至少一条记录" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const tableName = `std_definition_${tableCode}`;

    // 逐条删除（使用 dp_delete_varchar 支持 varchar 类型的 id）
    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const { error } = await supabase.rpc("dp_delete_varchar", {
        p_table: tableName,
        p_id: id,
      });

      if (error) {
        errors.push(`ID ${id.slice(0, 8)}: ${error.message}`);
      } else {
        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("批量删除失败:", error);
    return NextResponse.json({ error: "批量删除失败" }, { status: 500 });
  }
}
