import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

interface ProjectRow {
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  project_schema: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  role_project_manager: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TableDef {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  columns_config: Array<{ name: string; type: string; required?: boolean }>;
  apply_project_types: string[];
  apply_project_stages: string[];
  is_active: boolean;
}

interface TableStat {
  table_code: string;
  table_name: string;
  module: string;
  record_count: number;
}

interface ProjectWarning {
  project_id: string;
  project_name: string;
  level: "error" | "warning" | "info";
  type: string;
  message: string;
}

interface ProjectStats {
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  status: string;
  role_project_manager: string | null;
  start_date: string | null;
  end_date: string | null;
  member_count: number;
  stats: {
    total_records: number;
    schedule_records: number;
    table_stats: TableStat[];
  };
}

function safeSchema(schema: string) {
  return schema.includes("-") ? `"${schema}"` : schema;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdsParam = searchParams.get("project_ids");
    const moduleFilter = searchParams.get("module");
    const requestedIds = projectIdsParam
      ? projectIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const client = await createServerClient();

    // 1. 获取所有项目
    const { data: projectRows, error: projErr } = await client.rpc("dp_select", {
      p_table: "projects",
    });
    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }
    let projects = (projectRows as ProjectRow[]) || [];

    if (requestedIds && requestedIds.length > 0) {
      projects = projects.filter((p) => requestedIds.includes(p.id));
    }

    // 2. 获取数据表定义（含模块信息）
    const { data: defRows } = await client.rpc("dp_select", {
      p_table: "data_table_definitions",
    });
    const allDefs = ((defRows as Record<string, unknown>[]) || [])
      .filter((d) => !String(d.table_code || "").startsWith("task_"))
      .map((d) => ({
        id: d.id as string,
        table_code: d.table_code as string,
        table_name: d.table_name as string,
        module_type: (d.module_type as string[]) || [],
        columns_config: (d.columns_config as Array<{ name: string; type: string; required?: boolean }>) || [],
        apply_project_types: (d.apply_project_types as string[]) || [],
        apply_project_stages: (d.apply_project_stages as string[]) || [],
        is_active: Boolean(d.is_active),
      })) as TableDef[];

    const activeDefs = allDefs.filter((d) => d.is_active);

    // 3. 对每个项目，统计各表记录数
    const projectStatsList: ProjectStats[] = [];
    const allWarnings: ProjectWarning[] = [];
    let globalTotalRecords = 0;
    let globalScheduleRecords = 0;

    for (const project of projects) {
      const schema = safeSchema(project.project_schema);
      const now = new Date();
      const warnings: ProjectWarning[] = [];

      // --- 第一层预警：项目元数据 ---
      if (!project.role_project_manager || project.role_project_manager.trim() === "") {
        warnings.push({
          project_id: project.id,
          project_name: project.project_name,
          level: "warning",
          type: "no_manager",
          message: "未指定项目经理",
        });
      }

      if (project.end_date) {
        const endDate = new Date(project.end_date);
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0 && project.status !== "completed") {
          warnings.push({
            project_id: project.id,
            project_name: project.project_name,
            level: "error",
            type: "overdue",
            message: `项目已超过截止日期 ${Math.abs(daysLeft)} 天`,
          });
        } else if (daysLeft >= 0 && daysLeft <= 30 && project.status !== "completed") {
          warnings.push({
            project_id: project.id,
            project_name: project.project_name,
            level: "warning",
            type: "near_deadline",
            message: `项目将在 ${daysLeft} 天后到期`,
          });
        }
      }

      if (project.updated_at) {
        const updatedAt = new Date(project.updated_at);
        if ((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24) > 60) {
          warnings.push({
            project_id: project.id,
            project_name: project.project_name,
            level: "warning",
            type: "stale",
            message: "项目超过 60 天未更新",
          });
        }
      }

      // --- 成员数 ---
      let memberCount = 0;
      try {
        const { data: memberRows } = await client.rpc("execute_sql", {
          p_sql: `SELECT COUNT(*) as cnt FROM project_members WHERE project_id = '${project.id}'`,
        });
        memberCount = Number((memberRows as Array<{ cnt: string }>)?.[0]?.cnt) || 0;
      } catch { /* ignore */ }

      if (memberCount === 0) {
        warnings.push({
          project_id: project.id,
          project_name: project.project_name,
          level: "info",
          type: "no_members",
          message: "项目暂无成员",
        });
      }

      // --- 第二层预警：Schema 表数据统计 ---
      let tableStats: TableStat[] = [];

      try {
        // 获取该项目 schema 下的所有表
        const { data: schemaTables } = await client.rpc("execute_sql", {
          p_sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${project.project_schema}' ORDER BY table_name`,
        });

        const tableNames = (schemaTables as Array<{ table_name: string }>) || [];

        if (tableNames.length === 0) {
          warnings.push({
            project_id: project.id,
            project_name: project.project_name,
            level: "info",
            type: "empty_schema",
            message: "项目 Schema 下暂无数据表",
          });
        }

        // 统计每个表的记录数
        for (const { table_name } of tableNames) {
          try {
            const { data: countRows } = await client.rpc("execute_sql", {
              p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${table_name}"`,
            });
            const recordCount = Number((countRows as Array<{ cnt: string }>)?.[0]?.cnt) || 0;

            // 匹配数据表定义获取 module 信息
            const def = activeDefs.find((d) => d.table_code === table_name);
            const moduleCode = def?.module_type?.[0] || "other";
            const displayName = def?.table_name || table_name;

            tableStats.push({
              table_code: table_name,
              table_name: displayName,
              module: moduleCode,
              record_count: recordCount,
            });

            // 检测必填字段缺失（仅对有列定义的表）
            if (def && recordCount > 0) {
              const requiredCols = def.columns_config.filter((c) => c.required);
              if (requiredCols.length > 0) {
                for (const col of requiredCols) {
                  try {
                    const { data: nullRows } = await client.rpc("execute_sql", {
                      p_sql: `SELECT COUNT(*) as cnt FROM ${schema}."${table_name}" WHERE "${col.name}" IS NULL OR "${col.name}" = ''`,
                    });
                    const nullCount = Number((nullRows as Array<{ cnt: string }>)?.[0]?.cnt) || 0;
                    if (nullCount > 0) {
                      warnings.push({
                        project_id: project.id,
                        project_name: project.project_name,
                        level: "warning",
                        type: "missing_required",
                        message: `「${displayName}」表中 ${nullCount} 条记录的「${col.name}」字段为空`,
                      });
                    }
                  } catch { /* column might not exist in this project's table yet */ }
                }
              }
            }

            // 检测表数据长期未更新
            try {
              const { data: staleRows } = await client.rpc("execute_sql", {
                p_sql: `SELECT MAX(updated_at) as last_updated FROM ${schema}."${table_name}"`,
              });
              const lastUpdated = (staleRows as Array<{ last_updated: string | null }>)?.[0]?.last_updated;
              if (lastUpdated && recordCount > 0) {
                const lastDate = new Date(lastUpdated);
                if ((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24) > 60) {
                  warnings.push({
                    project_id: project.id,
                    project_name: project.project_name,
                    level: "warning",
                    type: "table_stale",
                    message: `「${displayName}」表超过 60 天未更新`,
                  });
                }
              }
            } catch { /* table might not have updated_at column */ }
          } catch {
            // 表不存在或查询失败，跳过
          }
        }

        // 模块级预警：schedule 模块数据为空
        const scheduleStats = tableStats.filter((t) => t.module === "schedule");
        const totalScheduleRecords = scheduleStats.reduce((sum, t) => sum + t.record_count, 0);
        if (totalScheduleRecords === 0 && tableNames.length > 0) {
          warnings.push({
            project_id: project.id,
            project_name: project.project_name,
            level: "warning",
            type: "empty_schedule",
            message: "进度管理模块下无任何数据记录",
          });
        }

        // 按模块分组统计空模块
        const moduleMap = new Map<string, { total: number; names: string[] }>();
        for (const ts of tableStats) {
          if (!moduleMap.has(ts.module)) {
            moduleMap.set(ts.module, { total: 0, names: [] });
          }
          const m = moduleMap.get(ts.module)!;
          m.total += ts.record_count;
          m.names.push(ts.table_name);
        }
        for (const [mod, info] of moduleMap) {
          if (info.total === 0) {
            warnings.push({
              project_id: project.id,
              project_name: project.project_name,
              level: "info",
              type: "empty_module",
              message: `「${MODULE_NAME_MAP[mod] || mod}」模块下无数据记录`,
            });
          }
        }
      } catch (err) {
        console.error(`Failed to query schema ${project.project_schema}:`, err);
      }

      if (moduleFilter) {
        tableStats = tableStats.filter((t) => t.module === moduleFilter);
      }

      const totalRecords = tableStats.reduce((sum, t) => sum + t.record_count, 0);
      const scheduleRecords = tableStats
        .filter((t) => t.module === "schedule")
        .reduce((sum, t) => sum + t.record_count, 0);

      globalTotalRecords += totalRecords;
      globalScheduleRecords += scheduleRecords;

      projectStatsList.push({
        id: project.id,
        project_name: project.project_name,
        project_code: project.project_code,
        project_type: project.project_type,
        project_stage: project.project_stage,
        status: project.status,
        role_project_manager: project.role_project_manager || null,
        start_date: project.start_date,
        end_date: project.end_date,
        member_count: memberCount,
        stats: {
          total_records: totalRecords,
          schedule_records: scheduleRecords,
          table_stats: tableStats,
        },
      });

      allWarnings.push(...warnings);
    }

    return NextResponse.json({
      data: {
        projects: projectStatsList,
        warnings: allWarnings,
        summary: {
          total_projects: projects.length,
          active_projects: projects.filter((p) => p.status === "active").length,
          completed_projects: projects.filter((p) => p.status === "completed").length,
          total_records_all: globalTotalRecords,
          total_schedule_records: globalScheduleRecords,
          total_warnings: allWarnings.filter((w) => w.level !== "info").length,
          total_errors: allWarnings.filter((w) => w.level === "error").length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const MODULE_NAME_MAP: Record<string, string> = {
  scope: "范围管理",
  schedule: "进度管理",
  quality: "质量管理",
  cost: "成本管理",
  collaboration: "协同管理",
  communication: "沟通管理",
  risk: "风险管理",
  procurement: "采购管理",
  resource: "资源管理",
  document: "资料管理",
};
