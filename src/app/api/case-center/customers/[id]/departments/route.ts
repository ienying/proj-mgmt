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

// POST /api/case-center/customers/[id]/departments — 创建自定义科室
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await createServerClient();
    const { id } = await params;
    const body = await request.json();

    const insertData: Record<string, unknown> = {
      customer_id: id,
      department_code: body.department_code || "",
      department_name: body.department_name || "",
      personnel: body.personnel || [],
      daily_work: body.daily_work || "",
      workflow: body.workflow || "",
      pain_points: body.pain_points || "",
      tools: body.tools || "",
      expectations: body.expectations || "",
      group_names: body.group_names || "",
      department_summary: body.department_summary || "",
      dept_scope: body.dept_scope || "school_wide",
      campus_id: body.campus_id || "",
      sort_order: 99,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "design_case_center.customer_departments",
      p_data: insertData,
    });

    if (error) {
      // 如果 group_names 列不存在，回退重试
      if (error.message?.includes("does not exist")) {
        const safe = { ...insertData };
        delete safe.group_names;
        delete safe.dept_scope;
        delete safe.campus_id;
        const retry = await client.rpc("dp_insert", {
          p_table: "design_case_center.customer_departments",
          p_data: safe,
        });
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
        return NextResponse.json({ data: retry.data }, { status: 201 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
