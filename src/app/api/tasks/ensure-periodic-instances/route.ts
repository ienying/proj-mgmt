import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import crypto from "crypto";

function getPeriodLabel(periodType: string, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  switch (periodType) {
    case "daily": return `${y}-${m}-${d}`;
    case "weekly": {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay() + 1); // Monday
      const sm = String(start.getMonth() + 1).padStart(2, "0");
      const sd = String(start.getDate()).padStart(2, "0");
      return `${y}-${sm}-${sd}`;
    }
    case "monthly": return `${y}-${m}`;
    case "yearly": return `${y}`;
    default: return `${y}-${m}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const defId = body.def_id; // optional: only process one def

    const client = await createServerClient();

    // 1. Find active periodic defs
    let defQuery = `SELECT * FROM public.task_center_defs WHERE status = 'active' AND time_type = 'periodic'`;
    if (defId) {
      defQuery += ` AND id = '${String(defId).replace(/'/g, "''")}'`;
    }
    const { data: defs } = await client.rpc("execute_sql", { p_sql: defQuery });
    if (!defs || !Array.isArray(defs)) {
      return NextResponse.json({ data: { created: 0 } });
    }

    const results: any[] = [];

    for (const def of defs as any[]) {
      const d = def;
      const periodicConfig = d.periodic_config || {};
      const periodType = periodicConfig.type || "monthly";
      const workflowNodes = d.workflow_nodes || [];
      const formColumns = d.form_columns || [];
      const boardRecords = d.board_records || [];
      const schemaName = d.schema_name;
      const tableName = d.table_name;

      // Determine which periods need instances
      const today = new Date();
      const periodsToCheck: { label: string; date: Date }[] = [];

      // Check current + next period
      periodsToCheck.push({ label: getPeriodLabel(periodType, today), date: today });

      // Also check previous period (catch-up)
      const prevDate = new Date(today);
      switch (periodType) {
        case "daily": prevDate.setDate(prevDate.getDate() - 1); break;
        case "weekly": prevDate.setDate(prevDate.getDate() - 7); break;
        case "monthly": prevDate.setMonth(prevDate.getMonth() - 1); break;
        case "yearly": prevDate.setFullYear(prevDate.getFullYear() - 1); break;
      }
      periodsToCheck.push({ label: getPeriodLabel(periodType, prevDate), date: prevDate });

      for (const period of periodsToCheck) {
        // Check if instance already exists for this period
        const { data: existing } = await client.rpc("execute_sql", {
          p_sql: `SELECT id FROM public.task_center_instances WHERE def_id = '${String(d.id).replace(/'/g, "''")}' AND period_label = '${String(period.label).replace(/'/g, "''")}' LIMIT 1`,
        });
        if (existing && Array.isArray(existing) && existing.length > 0) {
          continue; // Already exists
        }

        // Create instance for this period
        let assigneeId: string | null = null;
        let assigneeName: string | null = null;
        let currentNodeId: string | null = null;
        let isParallelFirstNode = false;
        let parallelGroupId: string | null = null;

        if (d.task_mode === "process" && workflowNodes.length > 0) {
          const firstNode = workflowNodes[0];
          currentNodeId = firstNode.id;
          if (firstNode.node_type === "parallel" && firstNode.handler_ids?.length > 0) {
            isParallelFirstNode = true;
            parallelGroupId = crypto.randomUUID();
          } else {
            assigneeId = firstNode.handler_id || null;
            assigneeName = firstNode.handler_name || null;
          }
        }

        try {
          if (isParallelFirstNode) {
            const firstNode = workflowNodes[0];
            for (let hi = 0; hi < firstNode.handler_ids.length; hi++) {
              const hid = firstNode.handler_ids[hi];
              const hname = firstNode.handler_names?.[hi] || "";
              const rowData: Record<string, any> = { submitted_by: hid };
              for (const col of formColumns) {
                if (col.default_value != null && col.default_value !== "") {
                  rowData[col.name] = col.default_value;
                }
              }
              const { data: physRow } = await client.rpc("dp_insert_generic", {
                p_schema: schemaName, p_table: tableName, p_data: rowData,
              });
              const { data: inst } = await client.rpc("dp_insert", {
                p_table: "public.task_center_instances",
                p_data: {
                  def_id: d.id, assignee_id: hid, assignee_name: hname,
                  current_node_id: currentNodeId, current_node_index: 0,
                  node_history: [], status: "pending", period_label: period.label,
                  due_date: d.deadline_config?.due_date || null,
                  parallel_group_id: parallelGroupId,
                },
              });
              if (inst && physRow) {
                const pid = (physRow as any)?.id;
                if (pid) await client.rpc("execute_sql", {
                  p_sql: `UPDATE ${schemaName}."${tableName}" SET instance_id = '${String((inst as any).id).replace(/'/g, "''")}' WHERE id = '${String(pid).replace(/'/g, "''")}'`,
                });
              }
            }
          } else {
            const rowData: Record<string, any> = {};
            for (const col of formColumns) {
              if (col.default_value != null && col.default_value !== "") {
                rowData[col.name] = col.default_value;
              }
            }
            const { data: physRow } = await client.rpc("dp_insert_generic", {
              p_schema: schemaName, p_table: tableName, p_data: rowData,
            });
            const { data: inst } = await client.rpc("dp_insert", {
              p_table: "public.task_center_instances",
              p_data: {
                def_id: d.id, assignee_id: assigneeId, assignee_name: assigneeName,
                current_node_id: currentNodeId, current_node_index: 0,
                node_history: [], status: "pending", period_label: period.label,
                due_date: d.deadline_config?.due_date || null,
              },
            });
            if (inst && physRow) {
              const pid = (physRow as any)?.id;
              if (pid) await client.rpc("execute_sql", {
                p_sql: `UPDATE ${schemaName}."${tableName}" SET instance_id = '${String((inst as any).id).replace(/'/g, "''")}' WHERE id = '${String(pid).replace(/'/g, "''")}'`,
              });
            }
          }
          results.push({ def_id: d.id, task_name: d.task_name, period: period.label, created: true });
        } catch (e: any) {
          results.push({ def_id: d.id, task_name: d.task_name, period: period.label, created: false, error: e.message });
        }
      }
    }

    return NextResponse.json({ data: { created: results.filter(r => r.created).length, results } });
  } catch (error) {
    console.error("生成周期性实例失败:", error);
    return NextResponse.json({ error: "生成周期性实例失败" }, { status: 500 });
  }
}
