import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/customers/[id]/modules — 获取客户所有模块（可按科室筛选）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get("department_code") || "";

    let sql = `
      SELECT cm.*, cd.department_name, cd.department_code
      FROM design_case_center.customer_modules cm
      JOIN design_case_center.customer_departments cd ON cm.customer_department_id = cd.id
      WHERE cm.customer_id = '${id}'
    `;
    if (departmentCode) {
      sql += ` AND cd.department_code = '${departmentCode.replace(/'/g, "''")}'`;
    }
    sql += " ORDER BY cd.sort_order, cm.sort_order";

    const { data, error } = await client.rpc("execute_sql", { p_sql: sql });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/case-center/customers/[id]/modules — 新增单个模块
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id: customerId } = await params;
    const body = await request.json();

    const { customer_department_id, module_code, module_name, status, usage_rate, active_users, effect, issues, current_practice, collaborating_departments, materials } = body;

    if (!customer_department_id || !module_code || !module_name) {
      return NextResponse.json({ error: "科室ID、模块编码和模块名称为必填项" }, { status: 400 });
    }

    const moduleData: Record<string, unknown> = {
      customer_department_id,
      customer_id: customerId,
      module_code,
      module_name,
      status: status || "未购",
      usage_rate: usage_rate || 0,
      active_users: active_users || 0,
      effect: effect || "",
      issues: issues || "",
      current_practice: current_practice || "",
      collaborating_departments: collaborating_departments || [],
      materials: materials || [],
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "design_case_center.customer_modules",
      p_data: moduleData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/case-center/customers/[id]/modules — 批量 upsert 模块
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id: customerId } = await params;
    const body = await request.json();

    const modules = body.modules as Array<Record<string, unknown>>;
    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json({ error: "modules 数组为必填项" }, { status: 400 });
    }

    const results = [];

    for (const mod of modules) {
      const moduleId = mod.id as string | undefined;
      const deptId = mod.customer_department_id as string;
      const moduleCode = mod.module_code as string;
      const moduleName = mod.module_name as string;

      if (!deptId || !moduleCode || !moduleName) continue;

      const moduleFields: Record<string, unknown> = {
        customer_department_id: deptId,
        customer_id: customerId,
        module_code: moduleCode,
        module_name: moduleName,
        status: mod.status || "未购",
        usage_rate: mod.usage_rate !== undefined ? Number(mod.usage_rate) : 0,
        active_users: mod.active_users !== undefined ? Number(mod.active_users) : 0,
        effect: mod.effect || "",
        issues: mod.issues || "",
        current_practice: mod.current_practice || "",
        collaborating_departments: mod.collaborating_departments || [],
        materials: mod.materials || [],
        updated_at: new Date().toISOString(),
      };

      if (moduleId) {
        // 更新已有模块
        const { data, error } = await client.rpc("dp_update", {
          p_table: "design_case_center.customer_modules",
          p_id: moduleId,
          p_data: moduleFields,
        });
        if (!error && data) results.push(data);
      } else {
        // 检查是否已存在相同科室+模块编码
        const { data: existing } = await client.rpc("execute_sql", {
          p_sql: `SELECT id FROM design_case_center.customer_modules WHERE customer_department_id = '${deptId}' AND module_code = '${moduleCode.replace(/'/g, "''")}' LIMIT 1`,
        });
        if (Array.isArray(existing) && existing.length > 0) {
          const existingId = (existing[0] as Record<string, unknown>).id as string;
          const { data, error } = await client.rpc("dp_update", {
            p_table: "design_case_center.customer_modules",
            p_id: existingId,
            p_data: moduleFields,
          });
          if (!error && data) results.push(data);
        } else {
          const { data, error } = await client.rpc("dp_insert", {
            p_table: "design_case_center.customer_modules",
            p_data: moduleFields,
          });
          if (!error && data) results.push(data);
        }
      }
    }

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/case-center/customers/[id]/modules — 删除模块（通过查询参数 module_id）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("module_id");

    if (!moduleId) {
      return NextResponse.json({ error: "module_id 为必填项" }, { status: 400 });
    }

    const { error } = await client.rpc("dp_delete", {
      p_table: "design_case_center.customer_modules",
      p_id: moduleId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
