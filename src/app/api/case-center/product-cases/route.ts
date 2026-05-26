import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/product-cases - 跨 schema 查询产品案例卡片数据
// Query params: ?search=xxx&filter_field=xxx&filter_value=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filterField = searchParams.get("filter_field") || "";
    const filterValue = searchParams.get("filter_value") || "";

    const client = await createServerClient();

    // 1. Get product_case config
    const { data: configs } = await client.rpc("dp_select", {
      p_table: "case_center_config",
    });

    const config = (configs as Record<string, unknown>[])?.find(
      (item) => item.type === "product_case" && item.is_enabled === true
    );

    if (!config) {
      return NextResponse.json({
        data: [],
        config: null,
        message: "未配置产品案例",
      });
    }

    const tableCode = config.table_code as string;
    const titleField = config.title_field as string;
    const subtitleField = config.subtitle_field as string;
    const descriptionField = config.description_field as string;
    const imageField = config.image_field as string;
    const tagsField = config.tags_field as string;

    // 2. Get all active projects with schemas
    const { data: projects } = await client.rpc("dp_select", {
      p_table: "projects",
    });

    const activeProjects = (
      (projects as Record<string, unknown>[]) || []
    ).filter((p) => p.project_schema && p.project_status === "active");

    // 3. Parallel query each project schema for the related table
    const queryPromises = activeProjects.map(
      async (project: Record<string, unknown>) => {
        const schema = project.project_schema as string;
        const projectName = project.project_name as string;
        const projectCode = project.project_code as string;
        const projectId = project.id as string;

        try {
          // Check if the table exists in this schema
          const { data: tableCheck } = await client.rpc("execute_sql", {
            p_sql: `SELECT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = '${schema}' AND table_name = '${tableCode}'
            ) as exists_flag`,
          });

          const existsFlag = (
            tableCheck as Record<string, unknown>[]
          )?.[0]?.exists_flag;
          if (!existsFlag) return [];

          // Query the table data
          const { data, error } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${schema}."${tableCode}" ORDER BY sort_order, created_at`,
          });

          if (error || !data) return [];

          return ((data as Record<string, unknown>[]) || []).map((row) => ({
            ...row,
            _project_name: projectName,
            _project_code: projectCode,
            _project_id: projectId,
            _schema: schema,
          }));
        } catch {
          return [];
        }
      }
    );

    const allResults = await Promise.all(queryPromises);
    let allCards: Array<Record<string, unknown>> = allResults.flat();

    // 4. Apply search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      allCards = allCards.filter((card) => {
        const title = String(card[titleField] || "").toLowerCase();
        const subtitle = subtitleField
          ? String(card[subtitleField] || "").toLowerCase()
          : "";
        const desc = descriptionField
          ? String(card[descriptionField] || "").toLowerCase()
          : "";
        return (
          title.includes(lowerSearch) ||
          subtitle.includes(lowerSearch) ||
          desc.includes(lowerSearch)
        );
      });
    }

    // 5. Apply field filter (for drill-down from stats)
    if (filterField && filterValue) {
      allCards = allCards.filter((card) => {
        const val = card[filterField];
        if (Array.isArray(val)) {
          return val.includes(filterValue);
        }
        return String(val || "") === filterValue;
      });
    }

    return NextResponse.json({
      data: allCards,
      config: {
        title_field: titleField,
        subtitle_field: subtitleField,
        description_field: descriptionField,
        image_field: imageField,
        tags_field: tagsField,
        stat_fields: config.stat_fields,
        table_code: tableCode,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "查询产品案例失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
