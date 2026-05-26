import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/config - 获取案例中心配置
// Query params: type=product_case|user_profile, project_id=uuid (optional)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const projectId = searchParams.get("project_id");

    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", {
      p_table: "case_center_config",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = data as Record<string, unknown>[];

    // Filter by type if specified
    if (type) {
      results = results.filter((item) => item.type === type);
    }

    // Filter by project_id if specified
    if (projectId) {
      results = results.filter((item) => item.project_id === projectId);
    }

    return NextResponse.json({ data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "获取配置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/case-center/config - 保存案例中心配置（upsert by type + project_id）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, is_enabled, sort_order, project_id } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type 为必填" },
        { status: 400 }
      );
    }

    const client = await createServerClient();

    // Check if config for this type + project_id already exists
    const { data: existing } = await client.rpc("dp_select", {
      p_table: "case_center_config",
    });

    const existingConfig = (existing as Record<string, unknown>[])?.find(
      (item) => item.type === type && (item.project_id || null) === (project_id || null)
    );

    const configData: Record<string, unknown> = {
      type,
      is_enabled: is_enabled !== undefined ? is_enabled : true,
      sort_order: sort_order || 0,
      project_id: project_id || null,
      updated_at: new Date().toISOString(),
    };

    if (type === "user_profile") {
      // 用户画像使用 modules + overview_metrics
      configData.modules = body.modules || [];
      configData.overview_metrics = body.overview_metrics || [];
      // 保留旧字段兼容 - table_code可为空，从modules中取第一个有值table_code
      const firstModuleTable = (body.modules || []).find((m: { table_code?: string }) => m.table_code)?.table_code;
      configData.table_code = body.table_code || firstModuleTable || "__none__";
      configData.title_field = body.title_field || null;
      configData.subtitle_field = null;
      configData.description_field = null;
      configData.image_field = null;
      configData.tags_field = null;
      configData.stat_fields = [];
    } else {
      // 产品案例使用字段映射
      if (!body.table_code || !body.title_field) {
        return NextResponse.json(
          { error: "table_code、title_field 为必填" },
          { status: 400 }
        );
      }
      configData.table_code = body.table_code;
      configData.title_field = body.title_field;
      configData.subtitle_field = body.subtitle_field || null;
      configData.description_field = body.description_field || null;
      configData.image_field = body.image_field || null;
      configData.tags_field = body.tags_field || null;
      configData.stat_fields = body.stat_fields || [];
      configData.modules = [];
      configData.overview_metrics = [];
    }

    let result;
    if (existingConfig) {
      result = await client.rpc("dp_update", {
        p_table: "case_center_config",
        p_id: existingConfig.id,
        p_data: configData,
      });
    } else {
      result = await client.rpc("dp_insert", {
        p_table: "case_center_config",
        p_data: configData,
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      message: existingConfig ? "配置更新成功" : "配置创建成功",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "保存配置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
