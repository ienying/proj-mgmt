import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 检查单个产品目录模块的引用情况
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "缺少 code 参数" }, { status: 400 });
    }

    // 验证模块存在
    const { data: modules } = await client.rpc("dp_select", {
      p_table: "product_module_types",
    });
    const moduleExists = (modules as Array<Record<string, unknown>>)?.find(
      (m) => m.code === code
    );
    if (!moduleExists) {
      return NextResponse.json({ error: "模块不存在" }, { status: 404 });
    }

    // 获取所有项目
    const { data: projects, error: projError } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    if (projError) throw projError;

    const affectedProjects: Array<{
      id: string;
      project_name: string;
      project_code: string;
      project_schema: string;
    }> = [];
    let recordCount = 0;

    for (const project of (projects || []) as Array<Record<string, unknown>>) {
      const procurementModules = project.procurement_modules as string[] | null;
      if (!procurementModules || !procurementModules.includes(code)) continue;

      const schema = project.project_schema as string | null;
      affectedProjects.push({
        id: project.id as string,
        project_name: project.project_name as string,
        project_code: project.project_code as string,
        project_schema: schema || "",
      });

      // 统计该项目 schema 中各表引用该模块的记录数
      if (schema) {
        try {
          const { data: tablesWithModuleCode } = await client.rpc("execute_sql", {
            p_sql: `SELECT table_name FROM information_schema.columns
                    WHERE table_schema = '${schema}' AND column_name = '_module_code'`,
          });
          if (tablesWithModuleCode && Array.isArray(tablesWithModuleCode)) {
            for (const t of tablesWithModuleCode as Array<Record<string, unknown>>) {
              const tableName = t.table_name as string;
              const { data: countResult } = await client.rpc("execute_sql", {
                p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${tableName}" WHERE "_module_code" = '${code}'`,
              });
              const rows = countResult as Array<{ cnt: number }>;
              if (rows?.[0]?.cnt) {
                recordCount += Number(rows[0].cnt);
              }
            }
          }
        } catch {
          // 跳过查询失败的表
        }
      }
    }

    return NextResponse.json({
      project_count: affectedProjects.length,
      record_count: recordCount,
      projects: affectedProjects,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "检查引用失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
