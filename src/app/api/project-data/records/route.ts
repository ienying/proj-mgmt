import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/project-data/records?projectId=xxx
// 返回项目下所有数据表的记录，供 linked_text/linked_date 字段选择目标记录
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // 1. 获取项目信息
    const { data: project } = await client.rpc("dp_get_by_id", {
      p_table: "projects",
      p_id: projectId,
    });
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    const proj = project as Record<string, unknown>;
    const projectCode = String(proj.project_code || "");
    const projectName = String(proj.project_name || "");
    const schema = `yuansu_${projectCode.toLowerCase()}`;

    // 2. 列出项目 schema 下的所有表
    const { data: tables } = await client.rpc("execute_sql", {
      p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    });
    if (!tables || !Array.isArray(tables)) {
      return NextResponse.json({ data: [] });
    }

    // 3. 遍历每个表获取记录
    const allRecords: Array<{
      id: string;
      label: string;
      table_code: string;
      project_id: string;
      project_name: string;
    }> = [];

    for (const row of tables as Array<Record<string, unknown>>) {
      const tableCode = String(row.table_name || "");
      if (!tableCode) continue;
      try {
        const { data: rows } = await client.rpc("execute_sql", {
          p_sql: `SELECT * FROM ${schema}."${tableCode}" ORDER BY sort_order, created_at`,
        });
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

        // 查找第一个非系统字段作为标签
        const firstRow = rows[0] as Record<string, unknown>;
        const skipCols = new Set([
          "id", "project_id", "sort_order", "created_at", "updated_at",
          "created_by", "allow_delete", "data_source",
        ]);
        let labelCol = "";
        for (const k of Object.keys(firstRow)) {
          if (!skipCols.has(k.toLowerCase())) {
            labelCol = k;
            break;
          }
        }

        for (const rec of rows as Array<Record<string, unknown>>) {
          const recId = String(rec.id || "");
          if (!recId) continue;
          const label = labelCol ? String(rec[labelCol] || recId) : recId;
          allRecords.push({
            id: recId,
            label: `[${projectName}] ${label}`,
            table_code: tableCode,
            project_id: projectId,
            project_name: projectName,
          });
        }
      } catch {
        // 跳过无法访问的表
      }
    }

    return NextResponse.json({ data: allRecords });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch project records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
