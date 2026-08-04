import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/case-center/customers/[id]/departments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;

    const { data, error } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_case_center.customer_departments WHERE customer_id = '${id}' ORDER BY sort_order`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/case-center/customers/[id]/departments — 批量更新科室业务字段
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();

    // body 格式: { departments: [{ id, department_code, personnel, daily_work, workflow, pain_points, tools, expectations, department_summary }] }
    const departments = body.departments as Array<Record<string, unknown>>;
    if (!departments || !Array.isArray(departments)) {
      return NextResponse.json({ error: "departments 数组为必填项" }, { status: 400 });
    }

    const results = [];
    for (const dept of departments) {
      const deptId = dept.id as string;
      if (!deptId) continue;

      const updateFields: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      const textFields = [
        "daily_work", "workflow", "pain_points", "tools", "expectations", "group_names", "department_summary", "department_name",
      ];

      for (const field of textFields) {
        if (dept[field] !== undefined) {
          updateFields[field] = dept[field];
        }
      }

      if (dept.personnel !== undefined) {
        updateFields.personnel = dept.personnel;
      }

      if (dept.metrics !== undefined) {
        updateFields.metrics = dept.metrics;
      }

      if (dept.dept_scope !== undefined) {
        updateFields.dept_scope = dept.dept_scope;
      }

      if (dept.campus_id !== undefined) {
        updateFields.campus_id = dept.campus_id;
      }

      // 先尝试完整更新，如果新列不存在则回退去除新列
      let { data, error } = await client.rpc("dp_update", {
        p_table: "design_case_center.customer_departments",
        p_id: deptId,
        p_data: updateFields,
      });

      if (error && error.message?.includes("does not exist")) {
        const safeFields = { ...updateFields };
        delete safeFields.metrics;
        delete safeFields.dept_scope;
        delete safeFields.campus_id;
        delete safeFields.group_names;
        const retry = await client.rpc("dp_update", {
          p_table: "design_case_center.customer_departments",
          p_id: deptId,
          p_data: safeFields,
        });
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        results.push(data);
      }
    }

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
