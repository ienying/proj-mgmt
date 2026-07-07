import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// POST /api/issues/external - 外部扫码提交工单
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const {
      project_name,
      customer_name,
      contact_person,
      contact_title,
      contact_info,
      description,
      evidence_files,
    } = body;

    if (!project_name && !customer_name) {
      return NextResponse.json(
        { error: "请填写客户名称或所属项目" },
        { status: 400 }
      );
    }
    if (!contact_person) {
      return NextResponse.json(
        { error: "请填写客户姓名" },
        { status: 400 }
      );
    }
    if (!contact_info) {
      return NextResponse.json(
        { error: "请填写联系方式" },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: "请填写详细问题描述" },
        { status: 400 }
      );
    }

    const title = `外部工单-${customer_name || contact_person}-${project_name || ""}`;

    // 1. 创建 issue 记录
    const issueData: Record<string, unknown> = {
      title,
      source: "external",
      project_name: project_name || "",
      department: "外部客户",
      customer_name: customer_name || "",
      contact_person: contact_person || "",
      contact_title: contact_title || "",
      contact_info: contact_info || "",
      reporter_name: contact_person || "",
      reporter_phone: contact_info || "",
      description: description || "",
      status: "pending",
      creator_id: "external",
      evidence_files: evidence_files || [],
      is_major: false,
      is_first_report: true,
      has_similar_history: false,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issues",
      p_data: issueData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as Record<string, unknown> | Array<Record<string, unknown>> | null;
    const issueId = (
      result && !Array.isArray(result) ? result.id : Array.isArray(result) ? result[0]?.id : null
    ) as string | null;

    if (!issueId) {
      return NextResponse.json({ error: "创建工单失败" }, { status: 500 });
    }

    // 2. 创建处理流水记录
    await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issue_processing_records",
      p_data: {
        issue_id: issueId,
        action_type: "external_submit",
        operator_id: "external",
        operator_name: contact_person || "外部客户",
        comment: "外部扫码提交",
      },
    });

    // 外部工单不自动推送给接收人，直接进入工单池等待分配或认领
    return NextResponse.json({
      data: { id: issueId },
      success: true,
      message: "工单提交成功",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
