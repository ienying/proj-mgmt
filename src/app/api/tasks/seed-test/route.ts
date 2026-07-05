import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import crypto from "crypto";

const COLUMN_TYPE_SQL: Record<string, string> = {
  text: "TEXT", number: "NUMERIC", date: "DATE", boolean: "BOOLEAN",
  select: "TEXT", textarea: "TEXT", url: "TEXT",
};

function getSchemaName(timeType: string, taskMode: string): string {
  return `design_task_center_${taskMode}_${timeType}`;
}

function buildPhysSQL(schema: string, table: string, formColumns: any[], boardRecords: any[]): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE IF NOT EXISTS ${schema}."${table}" (`);
  lines.push(`  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),`);
  lines.push(`  instance_id VARCHAR(36), project_id VARCHAR(36), submitted_by VARCHAR(36),`);
  lines.push(`  node_id VARCHAR(36), _source_ref_id VARCHAR(36), _source_schema VARCHAR(100),`);
  lines.push(`  _source_table VARCHAR(100), _source_record_id VARCHAR(36),`);
  lines.push(`  sort_order INTEGER DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),`);
  lines.push(`  updated_at TIMESTAMP WITH TIME ZONE`);
  for (const col of formColumns) {
    lines.push(`,  "${col.name}" ${COLUMN_TYPE_SQL[col.type] || "TEXT"}`);
  }
  if (boardRecords) {
    for (const ref of boardRecords) {
      for (const cc of ref.copy_columns || []) lines.push(`,  "${cc.target_col}" TEXT`);
      for (const fc of ref.feedback_columns || []) lines.push(`,  "${fc.target_col}" ${COLUMN_TYPE_SQL[fc.type] || "TEXT"}`);
    }
  }
  lines.push(`)`);
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();

    // Clean up old test data (order: instances → tables → defs)
    const testNames = "('办公用品采购申请','年度需求收集','每周工作周报','里程碑进度跟踪','季度设备采购计划','待办事项收集(限2条)')";
    // Get old table info before deleting defs
    const { data: oldInfo } = await client.rpc("execute_sql", { p_sql: `SELECT schema_name, table_name FROM public.task_center_defs WHERE task_name IN ${testNames}` }).catch(() => ({ data: [] }));
    await client.rpc("execute_sql", { p_sql: `DELETE FROM public.task_center_instances WHERE def_id IN (SELECT id FROM public.task_center_defs WHERE task_name IN ${testNames})` }).catch(() => {});
    for (const s of (oldInfo as any[]) || []) {
      if (s.schema_name && s.table_name) {
        await client.rpc("execute_sql", { p_sql: `DROP TABLE IF EXISTS ${s.schema_name}."${s.table_name}"` }).catch(() => {});
      }
    }
    await client.rpc("execute_sql", { p_sql: `DELETE FROM public.task_center_defs WHERE task_name IN ${testNames}` }).catch(() => {});

    // Get existing users
    const { data: users } = await client.rpc("execute_sql", {
      p_sql: "SELECT id, name, department FROM public.users LIMIT 10",
    });
    const userList = (users as any[]) || [];
    if (userList.length < 3) {
      return NextResponse.json({ error: "至少需要 3 个用户" }, { status: 400 });
    }

    const u1 = userList[0]; // publisher
    const u2 = userList[1]; // handler 1
    const u3 = userList[2]; // handler 2
    const u4 = userList.length > 3 ? userList[3] : userList[0]; // handler 3

    const created: string[] = [];

    // ─── 1. 单人流程型任务 (one_time + process + sequential) ───
    const formCols1 = [
      { name: "item_name", label: "采购物品", type: "text", required: true },
      { name: "budget", label: "预算金额", type: "number", required: true },
      { name: "purchase_date", label: "采购日期", type: "date", required: false },
      { name: "category", label: "分类", type: "select", required: false, options: ["办公用品", "IT设备", "家具", "其他"] },
      { name: "urgent", label: "是否紧急", type: "boolean", required: false },
      { name: "detail_url", label: "参考链接", type: "url", required: false },
      { name: "remark", label: "备注说明", type: "textarea", required: false },
    ];
    const wf1 = [
      { id: `wf1_1`, name: "填写申请", order: 0, node_type: "sequential", handler_id: u2.id, handler_ids: [], handler_name: u2.name, handler_names: [], max_records: 0, editable_fields: ["item_name", "budget", "purchase_date", "category", "urgent", "detail_url", "remark"], required_fields: ["item_name", "budget"], deadline_hours: 48 },
      { id: `wf1_2`, name: "主管审批", order: 1, node_type: "sequential", handler_id: u3.id, handler_ids: [], handler_name: u3.name, handler_names: [], max_records: 0, editable_fields: [], required_fields: [], deadline_hours: 24 },
      { id: `wf1_3`, name: "确认归档", order: 2, node_type: "sequential", handler_id: u1.id, handler_ids: [], handler_name: u1.name, handler_names: [], max_records: 0, editable_fields: [], required_fields: [], deadline_hours: 48 },
    ];

    const schema1 = getSchemaName("one_time", "process");
    const table1 = `task_${Date.now()}`;
    await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema1}` });
    await client.rpc("execute_sql", { p_sql: buildPhysSQL(schema1, table1, formCols1, []) });
    const { data: def1 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "办公用品采购申请", time_type: "one_time", task_mode: "process", form_columns: formCols1, workflow_nodes: wf1, board_records: [], deadline_config: { due_date: "2026-07-20", remind_days: 3 }, status: "active", created_by: u1.id, created_by_name: u1.name, schema_name: schema1, table_name: table1 },
    });
    // Create instance
    const rowData1: Record<string, any> = { item_name: "笔记本电脑", budget: "8000" };
    const { data: pr1 } = await client.rpc("dp_insert_generic", { p_schema: schema1, p_table: table1, p_data: rowData1 });
    const { data: inst1 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_instances",
      p_data: { def_id: (def1 as any).id, assignee_id: u2.id, assignee_name: u2.name, current_node_id: wf1[0].id, current_node_index: 0, node_history: [], status: "in_progress", due_date: "2026-07-20" },
    });
    if (pr1 && inst1) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema1}."${table1}" SET instance_id = '${(inst1 as any).id}' WHERE id = '${(pr1 as any).id}'` });
    created.push("单人流程型: 办公用品采购申请");

    // ─── 2. 多人收集型任务 (one_time + process + parallel) ───
    const formCols2 = [
      { name: "project_name", label: "项目名称", type: "text", required: true },
      { name: "requirement", label: "需求描述", type: "textarea", required: true },
      { name: "estimated_cost", label: "预估费用", type: "number", required: false },
    ];
    const wf2 = [
      { id: `wf2_1`, name: "信息收集", order: 0, node_type: "parallel", handler_id: "", handler_ids: [u2.id, u3.id, u4.id], handler_name: "", handler_names: [u2.name, u3.name, u4.name], max_records: 0, editable_fields: ["project_name", "requirement", "estimated_cost"], required_fields: ["project_name", "requirement"], deadline_hours: 72 },
      { id: `wf2_2`, name: "汇总评估", order: 1, node_type: "sequential", handler_id: u1.id, handler_ids: [], handler_name: u1.name, handler_names: [], max_records: 0, editable_fields: [], required_fields: [], deadline_hours: 48 },
    ];

    const schema2 = getSchemaName("one_time", "process");
    const table2 = `task_${Date.now() + 1}`;
    await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema2}` });
    await client.rpc("execute_sql", { p_sql: buildPhysSQL(schema2, table2, formCols2, []) });
    const { data: def2 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "年度需求收集", time_type: "one_time", task_mode: "process", form_columns: formCols2, workflow_nodes: wf2, board_records: [], deadline_config: { due_date: "2026-07-25", remind_days: 5 }, status: "active", created_by: u1.id, created_by_name: u1.name, schema_name: schema2, table_name: table2 },
    });
    // Create parallel instances
    const gid2 = crypto.randomUUID();
    for (let hi = 0; hi < wf2[0].handler_ids.length; hi++) {
      const hid = wf2[0].handler_ids[hi];
      const hname = wf2[0].handler_names[hi];
      const rd2: Record<string, any> = { submitted_by: hid, project_name: hi === 0 ? "智能校园平台" : hi === 1 ? "OA系统升级" : "", requirement: hi === 0 ? "需要统一管理全校..." : hi === 1 ? "升级现有OA..." : "", estimated_cost: hi === 0 ? "500000" : hi === 1 ? "200000" : "" };
      const { data: pr2 } = await client.rpc("dp_insert_generic", { p_schema: schema2, p_table: table2, p_data: rd2 });
      const { data: inst2 } = await client.rpc("dp_insert", {
        p_table: "public.task_center_instances",
        p_data: { def_id: (def2 as any).id, assignee_id: hid, assignee_name: hname, current_node_id: wf2[0].id, current_node_index: 0, node_history: [], status: hi < 2 ? "in_progress" : "pending", due_date: "2026-07-25", parallel_group_id: gid2 },
      });
      if (pr2 && inst2) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema2}."${table2}" SET instance_id = '${(inst2 as any).id}' WHERE id = '${(pr2 as any).id}'` });
    }
    // Submit one as completed (张三已完成)
    const { data: grpInsts } = await client.rpc("execute_sql", { p_sql: `SELECT * FROM public.task_center_instances WHERE parallel_group_id = '${gid2}' AND assignee_id = '${u2.id}' LIMIT 1` });
    if (grpInsts && (grpInsts as any[]).length > 0) {
      const gi = (grpInsts as any[])[0];
      await client.rpc("dp_update", { p_table: "public.task_center_instances", p_id: gi.id, p_data: { status: "completed", node_history: [{ node_id: wf2[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date().toISOString() }] } });
      // Update phys row with filled data
      await client.rpc("execute_sql", { p_sql: `UPDATE ${schema2}."${table2}" SET node_id = '${wf2[0].id}', submitted_by = '${u2.id}', project_name = '智能校园平台', requirement = '需要统一管理全校信息化系统，包括教务、后勤、办公等模块', estimated_cost = '500000' WHERE instance_id = '${gi.id}'` });
    }
    created.push("多人收集: 年度需求收集 (张三已完成, 李四/王五待提交)");

    // ─── 3. 周期性任务 (periodic + process) ───
    const formCols3 = [
      { name: "report_content", label: "本周工作内容", type: "textarea", required: true },
      { name: "next_plan", label: "下周计划", type: "textarea", required: true },
      { name: "issues", label: "遇到的问题", type: "textarea", required: false },
      { name: "work_hours", label: "本周工时", type: "number", required: true },
    ];
    const wf3 = [
      { id: `wf3_1`, name: "填写周报", order: 0, node_type: "sequential", handler_id: u2.id, handler_ids: [], handler_name: u2.name, handler_names: [], max_records: 0, editable_fields: ["report_content", "next_plan", "issues", "work_hours"], required_fields: ["report_content", "next_plan", "work_hours"], deadline_hours: 48 },
      { id: `wf3_2`, name: "主管查阅", order: 1, node_type: "sequential", handler_id: u1.id, handler_ids: [], handler_name: u1.name, handler_names: [], max_records: 0, editable_fields: [], required_fields: [], deadline_hours: 24 },
    ];

    const schema3 = getSchemaName("periodic", "process");
    const table3 = `task_${Date.now() + 2}`;
    await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema3}` });
    await client.rpc("execute_sql", { p_sql: buildPhysSQL(schema3, table3, formCols3, []) });
    const { data: def3 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "每周工作周报", time_type: "periodic", task_mode: "process", periodic_config: { type: "weekly" }, form_columns: formCols3, workflow_nodes: wf3, board_records: [], deadline_config: { due_date: "2026-07-11", remind_days: 1 }, status: "active", created_by: u1.id, created_by_name: u1.name, schema_name: schema3, table_name: table3 },
    });
    // Create this week's instance
    const today = new Date();
    const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
    const periodLabel3 = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
    const rd3: Record<string, any> = { report_content: "完成模块A开发...", next_plan: "开始模块B...", issues: "数据库连接偶尔超时", work_hours: "40" };
    const { data: pr3 } = await client.rpc("dp_insert_generic", { p_schema: schema3, p_table: table3, p_data: rd3 });
    const { data: inst3 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_instances",
      p_data: { def_id: (def3 as any).id, period_label: periodLabel3, assignee_id: u2.id, assignee_name: u2.name, current_node_id: wf3[0].id, current_node_index: 0, node_history: [], status: "in_progress", due_date: "2026-07-11" },
    });
    if (pr3 && inst3) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema3}."${table3}" SET instance_id = '${(inst3 as any).id}' WHERE id = '${(pr3 as any).id}'` });
    // Also create last week's completed instance
    const lastMon = new Date(mon); lastMon.setDate(mon.getDate() - 7);
    const lastPeriodLabel = `${lastMon.getFullYear()}-${String(lastMon.getMonth() + 1).padStart(2, "0")}-${String(lastMon.getDate()).padStart(2, "0")}`;
    const rd3b: Record<string, any> = { report_content: "完成需求分析...", next_plan: "开始编码...", issues: "无", work_hours: "38" };
    const { data: pr3b } = await client.rpc("dp_insert_generic", { p_schema: schema3, p_table: table3, p_data: rd3b });
    const { data: inst3b } = await client.rpc("dp_insert", {
      p_table: "public.task_center_instances",
      p_data: { def_id: (def3 as any).id, period_label: lastPeriodLabel, assignee_id: u2.id, assignee_name: u2.name, current_node_id: wf3[1].id, current_node_index: 1, node_history: [{ node_id: wf3[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date(Date.now() - 7 * 86400000).toISOString() }], status: "in_progress", due_date: "2026-07-04" },
    });
    if (pr3b && inst3b) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema3}."${table3}" SET instance_id = '${(inst3b as any).id}' WHERE id = '${(pr3b as any).id}'` });
    created.push("周期性: 每周工作周报 (本周+上周两期)");

    // ─── 4. 项目型任务 (one_time + project) ───
    const { data: projects } = await client.rpc("execute_sql", { p_sql: "SELECT id, project_name, project_schema FROM public.projects LIMIT 1" });
    const proj = (projects as any[])?.[0];
    const formCols4 = [
      { name: "milestone", label: "里程碑名称", type: "text", required: true },
      { name: "target_date", label: "目标日期", type: "date", required: true },
      { name: "completion_pct", label: "完成百分比", type: "number", required: false },
    ];
    const schema4 = getSchemaName("one_time", "project");
    const table4 = `task_${Date.now() + 3}`;
    await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema4}` });
    await client.rpc("execute_sql", { p_sql: buildPhysSQL(schema4, table4, formCols4, []) });
    const { data: def4 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "里程碑进度跟踪", time_type: "one_time", task_mode: "project", form_columns: formCols4, workflow_nodes: null, assignee_config: proj ? { project_id: proj.id, project_name: proj.project_name } : null, board_records: [], deadline_config: { due_date: "2026-08-01", remind_days: 7 }, status: "active", created_by: u1.id, created_by_name: u1.name, schema_name: schema4, table_name: table4 },
    });
    const rd4: Record<string, any> = { milestone: "需求确认", target_date: "2026-07-15", completion_pct: "80" };
    const { data: pr4 } = await client.rpc("dp_insert_generic", { p_schema: schema4, p_table: table4, p_data: rd4 });
    const { data: inst4 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_instances",
      p_data: { def_id: (def4 as any).id, assignee_id: u2.id, assignee_name: u2.name, status: "in_progress", due_date: "2026-08-01", project_id: proj?.id || null, project_name: proj?.project_name || null },
    });
    if (pr4 && inst4) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema4}."${table4}" SET instance_id = '${(inst4 as any).id}' WHERE id = '${(pr4 as any).id}'` });
    created.push(`项目型: 里程碑进度跟踪 (${proj ? "已绑定项目" : "无项目"})`);

    // ─── 5. 草稿任务 ───
    const { data: def5 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "季度设备采购计划", time_type: "periodic", task_mode: "process", periodic_config: { type: "monthly" }, form_columns: [{ name: "equipment_name", label: "设备名称", type: "text", required: true }, { name: "quantity", label: "数量", type: "number", required: true }, { name: "reason", label: "采购理由", type: "textarea", required: true }], workflow_nodes: [{ id: "draft_wf1", name: "提交计划", order: 0, node_type: "parallel", handler_id: "", handler_ids: [u2.id, u3.id], handler_name: "", handler_names: [u2.name, u3.name], max_records: 5, editable_fields: ["equipment_name", "quantity", "reason"], required_fields: ["equipment_name", "quantity"], deadline_hours: 72 }], board_records: [], deadline_config: { due_date: "2026-07-30", remind_days: 3 }, status: "draft", created_by: u1.id, created_by_name: u1.name, schema_name: null, table_name: null },
    });
    created.push("草稿: 季度设备采购计划 (多人填写, 未发布)");

    // ─── 6. 多人任务(每人限填2条) ───
    const formCols6 = [
      { name: "task_desc", label: "任务描述", type: "text", required: true },
    ];
    const wf6 = [
      { id: `wf6_1`, name: "执行任务", order: 0, node_type: "parallel", handler_id: "", handler_ids: [u2.id, u3.id], handler_name: "", handler_names: [u2.name, u3.name], max_records: 2, editable_fields: ["task_desc"], required_fields: ["task_desc"], deadline_hours: 48 },
      { id: `wf6_2`, name: "确认完成", order: 1, node_type: "sequential", handler_id: u1.id, handler_ids: [], handler_name: u1.name, handler_names: [], max_records: 0, editable_fields: [], required_fields: [], deadline_hours: 24 },
    ];
    const schema6 = getSchemaName("one_time", "process");
    const table6 = `task_${Date.now() + 4}`;
    await client.rpc("execute_sql", { p_sql: `CREATE SCHEMA IF NOT EXISTS ${schema6}` });
    await client.rpc("execute_sql", { p_sql: buildPhysSQL(schema6, table6, formCols6, []) });
    const { data: def6 } = await client.rpc("dp_insert", {
      p_table: "public.task_center_defs",
      p_data: { task_name: "待办事项收集(限2条)", time_type: "one_time", task_mode: "process", form_columns: formCols6, workflow_nodes: wf6, board_records: [], deadline_config: { due_date: "2026-07-18", remind_days: 2 }, status: "active", created_by: u1.id, created_by_name: u1.name, schema_name: schema6, table_name: table6 },
    });
    const gid6 = crypto.randomUUID();
    for (let hi = 0; hi < wf6[0].handler_ids.length; hi++) {
      const hid = wf6[0].handler_ids[hi];
      const hname = wf6[0].handler_names[hi];
      const rd6: Record<string, any> = { submitted_by: hid, task_desc: hi === 0 ? "整理文档" : "修复Bug" };
      const { data: pr6 } = await client.rpc("dp_insert_generic", { p_schema: schema6, p_table: table6, p_data: rd6 });
      const { data: inst6 } = await client.rpc("dp_insert", {
        p_table: "public.task_center_instances",
        p_data: { def_id: (def6 as any).id, assignee_id: hid, assignee_name: hname, current_node_id: wf6[0].id, current_node_index: 0, node_history: [], status: "pending", due_date: "2026-07-18", parallel_group_id: gid6 },
      });
      if (pr6 && inst6) await client.rpc("execute_sql", { p_sql: `UPDATE ${schema6}."${table6}" SET instance_id = '${(inst6 as any).id}' WHERE id = '${(pr6 as any).id}'` });
    }
    created.push("多人限填: 待办事项收集(限2条) (每人最多填2条)");

    // ─── 模拟处理人提交数据 ───
    // 任务1: 将填写申请节点标记为已完成(提交到审批)
    if (inst1) {
      await client.rpc("execute_sql", {
        p_sql: `UPDATE ${schema1}."${table1}" SET item_name = '笔记本电脑', budget = '8000', purchase_date = '2026-07-20', category = 'IT设备', urgent = 'true', remark = '急需，请优先审批' WHERE instance_id = '${(inst1 as any).id}'`,
      });
      await client.rpc("dp_update", {
        p_table: "public.task_center_instances", p_id: (inst1 as any).id,
        p_data: { status: "in_progress", current_node_id: wf1[1].id, current_node_index: 1, assignee_id: u3.id, assignee_name: u3.name, node_history: [{ node_id: wf1[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date(Date.now() - 3600000).toISOString() }] },
      });
      created.push("处理人操作: 姜运提交了采购申请 → 流转到何玉东审批");
    }

    // 任务3(本周): 标记为已完成
    if (inst3) {
      await client.rpc("execute_sql", {
        p_sql: `UPDATE ${schema3}."${table3}" SET report_content = '1.完成用户管理模块后端开发\n2.完成权限控制中间件\n3.开始前端页面搭建', next_plan = '1.完成前端页面开发\n2.联调测试\n3.准备上线', issues = '数据库查询偶尔超时，已加索引优化', work_hours = '42' WHERE instance_id = '${(inst3 as any).id}'`,
      });
      await client.rpc("dp_update", {
        p_table: "public.task_center_instances", p_id: (inst3 as any).id,
        p_data: { status: "in_progress", current_node_id: wf3[1].id, current_node_index: 1, assignee_id: u1.id, assignee_name: u1.name, node_history: [{ node_id: wf3[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date(Date.now() - 7200000).toISOString() }] },
      });
      created.push("处理人操作: 姜运提交了本周周报 → 流转到 super_admin 查阅");
    }

    // 任务3(上周): 标记为已完成
    if (inst3b) {
      await client.rpc("dp_update", {
        p_table: "public.task_center_instances", p_id: (inst3b as any).id,
        p_data: { status: "completed", current_node_index: 2, node_history: [{ node_id: wf3[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date(Date.now() - 7 * 86400000).toISOString() }, { node_id: wf3[1].id, handler_id: u1.id, handler_name: u1.name, action: "submit", submitted_at: new Date(Date.now() - 5 * 86400000).toISOString() }] },
      });
      created.push("处理人操作: 上周周报已全部完成");
    }

    // 任务6: 模拟一人提交了数据
    if (gid6) {
      const { data: grp6Insts } = await client.rpc("execute_sql", { p_sql: `SELECT * FROM public.task_center_instances WHERE parallel_group_id = '${gid6}' AND assignee_id = '${u2.id}' LIMIT 1` });
      if (grp6Insts && (grp6Insts as any[]).length > 0) {
        const g6 = (grp6Insts as any[])[0];
        await client.rpc("execute_sql", {
          p_sql: `UPDATE ${schema6}."${table6}" SET task_desc = '整理API文档并更新接口说明' WHERE instance_id = '${g6.id}'`,
        });
        await client.rpc("dp_update", {
          p_table: "public.task_center_instances", p_id: g6.id,
          p_data: { status: "completed", node_history: [{ node_id: wf6[0].id, handler_id: u2.id, handler_name: u2.name, action: "submit", submitted_at: new Date(Date.now() - 1800000).toISOString() }] },
        });
        created.push("处理人操作: 姜运提交了待办事项(限2条)");
      }
    }

    return NextResponse.json({
      success: true,
      message: `已创建 ${created.length} 个测试任务`,
      publisher: u1.name,
      handlers: [u2.name, u3.name, u4.name],
      details: created,
    });
  } catch (error: any) {
    console.error("Seed test data failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
