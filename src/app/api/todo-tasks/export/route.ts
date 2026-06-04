import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import * as XLSX from "xlsx";

// GET /api/todo-tasks/export?definition_id=xxx  OR  ?definition_ids=id1,id2,id3
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const defId = searchParams.get("definition_id");
    const defIds = searchParams.get("definition_ids");

    const targetIds = defIds ? defIds.split(",").filter(Boolean) : (defId ? [defId] : []);
    if (targetIds.length === 0) return NextResponse.json({ error: "缺少 definition_id" }, { status: 400 });

    const { data: defs } = await client.rpc("dp_select", { p_table: "todo_task_defs" });
    const { data: stdDefs } = await client.rpc("dp_select", { p_table: "data_table_definitions" });

    const wb = XLSX.utils.book_new();

    for (const id of targetIds) {
      const taskDef = (defs as Record<string, unknown>[])?.find((d) => d.id === id);
      if (!taskDef) continue;
      const tableCode = taskDef.form_table_code as string;
      if (!tableCode) continue;

      const stdDef = (stdDefs as Record<string, unknown>[])?.find((d) => d.table_code === tableCode);
      const columnsConfig = (stdDef?.columns_config || []) as Array<Record<string, unknown>>;

      const tableName = `design_public.std_definition_${tableCode}`;
      const { data: rows } = await client.rpc("execute_sql", {
        p_sql: `SELECT * FROM ${tableName} ORDER BY sort_order, created_at`,
      });

      const headers = columnsConfig.map((c) => String(c.name || ""));
      const sheetData = [headers];
      (rows as Record<string, unknown>[])?.forEach((row) => {
        const record = columnsConfig.map((col) => {
          const key = String(col.name || "").toLowerCase().replace(/\s+/g, "_");
          const val = row[key];
          return val !== null && val !== undefined ? String(val) : "";
        });
        sheetData.push(record);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const title = String(taskDef.name || taskDef.title || "任务").substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, title);
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="任务数据导出_${targetIds.length}个.xlsx"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
