import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET /api/issues - 查询问题列表
// 支持筛选: status, creator_id, handler_id, department, category_id, urgency_id, search
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);

    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_issues",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let issues = (data || []) as Record<string, unknown>[];

    // 前端筛选
    const status = searchParams.get("status");
    if (status) {
      // 支持 status=pending,accepted 形式的多状态筛选
      const statuses = status.split(",");
      issues = issues.filter((i) => statuses.includes(String(i.status)));
    }

    const creatorId = searchParams.get("creator_id");
    if (creatorId) {
      issues = issues.filter((i) => String(i.creator_id) === creatorId);
    }

    const handlerId = searchParams.get("handler_id");
    if (handlerId) {
      issues = issues.filter((i) => String(i.handler_id) === handlerId);
    }

    const department = searchParams.get("department");
    if (department) {
      issues = issues.filter((i) => String(i.department) === department);
    }

    const categoryId = searchParams.get("category_id");
    if (categoryId) {
      issues = issues.filter((i) => String(i.category_id) === categoryId);
    }

    const urgencyId = searchParams.get("urgency_id");
    if (urgencyId) {
      issues = issues.filter((i) => String(i.urgency_id) === urgencyId);
    }

    const search = searchParams.get("search");
    if (search) {
      const s = search.toLowerCase();
      issues = issues.filter(
        (i) =>
          String(i.title).toLowerCase().includes(s) ||
          String(i.project_name).toLowerCase().includes(s) ||
          String(i.reporter_name).toLowerCase().includes(s) ||
          String(i.handler_name || "").toLowerCase().includes(s)
      );
    }

    // 按创建时间倒序
    issues.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() -
        new Date(String(a.created_at)).getTime()
    );

    return NextResponse.json({ data: issues });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/issues - 创建问题
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      title,
      project_id,
      project_name,
      department,
      reporter_id,
      reporter_name,
      reporter_phone,
      handler_id,
      handler_name,
      handler_phone,
      category_id,
      product_module_id,
      is_major,
      urgency_id,
      warranty_status_id,
      description,
      is_first_report,
      has_similar_history,
      remarks,
      expected_handle_time,
      creator_id,
      notify_users,
    } = body;

    // 1. 创建问题主记录
    const issueData: Record<string, unknown> = {
      title,
      project_id: project_id || null,
      project_name: project_name || "",
      department: department || "",
      reporter_id,
      reporter_name: reporter_name || "",
      reporter_phone: reporter_phone || "",
      handler_id: handler_id || null,
      handler_name: handler_name || null,
      handler_phone: handler_phone || null,
      category_id,
      product_module_id: product_module_id || null,
      is_major: is_major || false,
      urgency_id,
      warranty_status_id: warranty_status_id || null,
      description: description || "",
      is_first_report: is_first_report !== undefined ? is_first_report : true,
      has_similar_history: has_similar_history || false,
      remarks: remarks || null,
      expected_handle_time: expected_handle_time || null,
      status: "pending",
      creator_id,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issues",
      p_data: issueData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const issueId = data?.id || (Array.isArray(data) ? data[0]?.id : null);

    // 2. 创建处理流水记录 - 提交
    if (issueId) {
      await client.rpc("dp_insert", {
        p_table: "issue_mgmt_issue_processing_records",
        p_data: {
          issue_id: issueId,
          action_type: "submit",
          operator_id: creator_id,
          operator_name: reporter_name || "",
          comment: "提交问题",
        },
      });

      // 3. 创建知会抄送记录
      if (notify_users && Array.isArray(notify_users) && notify_users.length > 0) {
        for (const nu of notify_users) {
          await client.rpc("dp_insert", {
            p_table: "issue_mgmt_issue_notifications",
            p_data: {
              issue_id: issueId,
              user_id: nu.user_id,
              user_name: nu.user_name || "",
            },
          });
        }
      }

      // 4. 如果指定了处理人，创建受理流水
      if (handler_id) {
        await client.rpc("dp_insert", {
          p_table: "issue_mgmt_issue_processing_records",
          p_data: {
            issue_id: issueId,
            action_type: "assign",
            operator_id: creator_id,
            operator_name: reporter_name || "",
            to_user_id: handler_id,
            to_user_name: handler_name || "",
            comment: "指派处理人",
          },
        });
      }

      // 5. 为处理人写入待办任务实例
      const todoAssigneeId = handler_id || creator_id;
      const todoAssigneeName = handler_name || reporter_name || "";
      if (todoAssigneeId) {
        await client.rpc("dp_insert", {
          p_table: "todo_task_instances",
          p_data: {
            def_id: null,
            name: title,
            description: description ? String(description).replace(/<[^>]*>/g, "").slice(0, 200) : "",
            assignee_id: todoAssigneeId,
            assignee_name: todoAssigneeName,
            project_id: project_id || null,
            project_name: null,
            priority: is_major ? "urgent" : (urgency_id ? "high" : "medium"),
            status: "pending",
            due_date: expected_handle_time || null,
            is_read: false,
          },
        });
      }

      // 6. 知会人员 - 已通过步骤4 issue_mgmt_issue_notifications 处理
    }

    return NextResponse.json({ data: { id: issueId }, success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
