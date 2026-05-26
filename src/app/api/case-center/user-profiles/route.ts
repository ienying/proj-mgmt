import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/user-profiles - 查询用户画像学校列表
// 不再需要 projectSchema 参数 - 直接列出所有项目作为学校卡片
// Query params: ?search=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const client = await createServerClient();

    // 1. Get user_profile configs (system + project-level)
    const { data: configs } = await client.rpc("dp_select", {
      p_table: "case_center_config",
    });

    const allConfigs = (configs as Record<string, unknown>[]) || [];

    // System-level config (project_id is null)
    const config = allConfigs.find(
      (item) => item.type === "user_profile" && item.is_enabled === true && !item.project_id
    );

    // Build a map of project_id -> project-level config
    const projectConfigMap: Record<string, Record<string, unknown>> = {};
    for (const c of allConfigs) {
      if (c.type === "user_profile" && c.project_id) {
        projectConfigMap[c.project_id as string] = c;
      }
    }

    if (!config) {
      return NextResponse.json({
        data: [],
        config: null,
        message: "未配置用户画像",
      });
    }

    const modules = config.modules as Array<{ id: string; name: string; icon: string; table_code: string; display_type: string; fields: Array<{ column: string; label: string; render: string }> }> || [];
    const overviewMetrics = config.overview_metrics as Array<{ label: string; table_code: string; column?: string; filter_value?: string; calc: string }> || [];

    // Use the first module's table as the card listing source
    const firstModuleTable = modules.length > 0 ? modules[0].table_code : "";
    const tableCode = firstModuleTable || (config.table_code as string) || "";

    const titleField = (config.title_field as string) || "";
    const subtitleField = (config.subtitle_field as string) || "";
    const descriptionField = (config.description_field as string) || "";
    const imageField = (config.image_field as string) || "";
    const tagsField = (config.tags_field as string) || "";

    // 2. Get all projects
    const { data: projects, error: projectsError } = await client.rpc("dp_select", {
      p_table: "projects",
    });

    if (projectsError) {
      return NextResponse.json({ data: [], error: projectsError.message }, { status: 500 });
    }

    const projectList = (projects as Record<string, unknown>[]) || [];

    // 3. For each project with a schema, query the first module's table data
    const schoolCards: Record<string, unknown>[] = [];

    for (const project of projectList) {
      const projectSchema = project.project_schema as string;
      if (!projectSchema) continue;

      // Apply search filter on project name
      if (search) {
        const q = search.toLowerCase();
        const name = String(project.project_name || "").toLowerCase();
        const code = String(project.project_code || "").toLowerCase();
        if (!name.includes(q) && !code.includes(q)) continue;
      }

      if (!tableCode) {
        // No table configured, just show project info
        schoolCards.push({
          id: project.id,
          _project_name: project.project_name,
          _project_code: project.project_code,
          _project_id: project.id,
          _schema: projectSchema,
          ...(titleField ? { [titleField]: project.project_name } : {}),
          ...(subtitleField ? { [subtitleField]: project.project_type } : {}),
        });
        continue;
      }

      // Check if table exists in project schema
      const safeSchema = projectSchema.replace(/[^a-zA-Z0-9_]/g, "");
      const safeTable = tableCode.replace(/[^a-zA-Z0-9_]/g, "");

      try {
        const { data: tableCheck } = await client.rpc("execute_sql", {
          p_sql: `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = '${safeSchema}' AND table_name = '${safeTable}'
          ) as exists_flag`,
        });

        const existsFlag = (tableCheck as Record<string, unknown>[])?.[0]?.exists_flag;
        if (!existsFlag) {
          // Table doesn't exist, show project with empty data
          schoolCards.push({
            id: project.id,
            _project_name: project.project_name,
            _project_code: project.project_code,
            _project_id: project.id,
            _schema: projectSchema,
            ...(titleField ? { [titleField]: project.project_name } : {}),
          });
          continue;
        }

        // Query the table
        const { data: tableData } = await client.rpc("execute_sql", {
          p_sql: `SELECT * FROM "${safeSchema}"."${safeTable}" ORDER BY sort_order, created_at LIMIT 100`,
        });

        const rows = (tableData as Record<string, unknown>[]) || [];

        // For school cards, use the first row of data as the card data, plus project info
        if (rows.length > 0) {
          const firstRow = rows[0];
          schoolCards.push({
            ...firstRow,
            id: project.id,
            _project_name: project.project_name,
            _project_code: project.project_code,
            _project_id: project.id,
            _schema: projectSchema,
            _row_count: rows.length,
          });
        } else {
          schoolCards.push({
            id: project.id,
            _project_name: project.project_name,
            _project_code: project.project_code,
            _project_id: project.id,
            _schema: projectSchema,
            ...(titleField ? { [titleField]: project.project_name } : {}),
          });
        }
      } catch {
        schoolCards.push({
          id: project.id,
          _project_name: project.project_name,
          _project_code: project.project_code,
          _project_id: project.id,
          _schema: projectSchema,
          ...(titleField ? { [titleField]: project.project_name } : {}),
        });
      }
    }

    return NextResponse.json({
      data: schoolCards,
      config: {
        title_field: titleField,
        subtitle_field: subtitleField,
        description_field: descriptionField,
        image_field: imageField,
        tags_field: tagsField,
        table_code: tableCode,
        modules,
        overview_metrics: overviewMetrics,
      },
      projectConfigMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询用户画像失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
