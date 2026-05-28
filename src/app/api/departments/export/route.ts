import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const client = await createServerClient();
    const { data } = await client.rpc("dp_select", { p_table: "departments" });
    const depts = (data as Record<string, unknown>[]) || [];

    const headers = ["部门编码", "部门名称", "描述", "排序", "启用"];
    const rows = depts
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map((d) => [
        d.code,
        d.name,
        d.description || "",
        d.sort_order ?? 0,
        d.is_enabled ? "是" : "否",
      ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "部门数据");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="departments_export.xlsx"; filename*=UTF-8''${encodeURIComponent("部门数据导出.xlsx")}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
