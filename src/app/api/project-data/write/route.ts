import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { verifyAuth } from "@/lib/auth-utils";
import { canEditProjectBySchema } from "@/lib/project-permission";

// POST /api/project-data/write
// 关联文本回写：更新目标项目表中的记录字段
export async function POST(request: NextRequest) {
  try {
    // ── 鉴权 + 权限检查 ──
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const client = await createServerClient();
    const body = await request.json();
    const { projectCode, tableCode, recordId, columnName, value } = body;

    if (!projectCode || !tableCode || !recordId || !columnName) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const schema = `yuansu_${String(projectCode)}`;

    const permCheck = await canEditProjectBySchema(schema, authResult.userId, authResult.role, authResult.userName);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason || "无权限编辑该项目数据" }, { status: 403 });
    }
    // ── 权限检查结束 ──
    const safeVal = String(value || "").replace(/'/g, "''");
    const safeCol = String(columnName).replace(/'/g, "''");

    const { error } = await client.rpc("execute_sql", {
      p_sql: `UPDATE ${schema}."${tableCode}" SET "${safeCol}" = '${safeVal}' WHERE id = '${String(recordId)}'`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
