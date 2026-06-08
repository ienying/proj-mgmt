import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// GET: 获取工作流模板及其节点
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const taskDefId = searchParams.get("task_def_id");

    if (taskDefId) {
      const { data: templates } = await client.rpc("dp_select", { p_table: "design_public.workflow_templates" });
      const tmpl = (templates as Array<Record<string, unknown>>)?.find(t => t.task_def_id === taskDefId);
      if (!tmpl) return NextResponse.json({ data: null });

      const { data: nodes } = await client.rpc("dp_select", { p_table: "design_public.workflow_nodes" });
      const tmplNodes = (nodes as Array<Record<string, unknown>>)?.filter(n => n.template_id === tmpl.id)
        .sort((a, b) => Number(a.order_index) - Number(b.order_index));

      return NextResponse.json({ data: { template: tmpl, nodes: tmplNodes } });
    }

    return NextResponse.json({ data: [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: 保存工作流模板和节点
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();
    const { task_def_id, nodes, allow_forward, allow_return } = body;

    // 删除旧模板
    const { data: oldTmpls } = await client.rpc("dp_select", { p_table: "design_public.workflow_templates" });
    const oldTmpl = (oldTmpls as Array<Record<string, unknown>>)?.find(t => t.task_def_id === task_def_id);
    if (oldTmpl) {
      await client.rpc("execute_sql", { p_sql: `DELETE FROM design_public.workflow_nodes WHERE template_id = '${oldTmpl.id}'` });
      await client.rpc("execute_sql", { p_sql: `DELETE FROM design_public.workflow_templates WHERE id = '${oldTmpl.id}'` });
    }

    // 创建新模板
    const tmplId = crypto.randomUUID();
    await client.rpc("execute_sql", {
      p_sql: `INSERT INTO design_public.workflow_templates (id, task_def_id, allow_forward, allow_return)
              VALUES ('${tmplId}', '${task_def_id}', ${allow_forward !== false}, ${allow_return !== false})`,
    });

    // 创建节点
    for (let i = 0; i < (nodes || []).length; i++) {
      const n = nodes[i];
      const nodeId = crypto.randomUUID();
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.workflow_nodes (id, template_id, name, order_index, handler_ids, handler_mode, deadline_days, reminder_hours, fillable_fields)
                VALUES ('${nodeId}', '${tmplId}', '${String(n.name || "").replace(/'/g, "''")}', ${i},
                        ARRAY[${(n.handler_ids || []).map((h: string) => `'${h}'`).join(",")}],
                        '${n.handler_mode || "any_one"}', ${n.deadline_days || 2}, ${n.reminder_hours || 24},
                        ARRAY[${(n.fillable_fields || []).map((f: string) => `'${f}'`).join(",")}])`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
