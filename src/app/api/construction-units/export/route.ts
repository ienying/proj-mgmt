import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const client = await createServerClient();
    const { data } = await client.rpc("dp_select", { p_table: "construction_units" });
    const units = (data as Record<string, unknown>[]) || [];

    const headers = ["名称", "单位负责人", "电话", "描述", "排序", "启用"];
    const rows = units
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map((d) => [
        d.name,
        d.contact_person || "",
        d.phone || "",
        d.description || "",
        d.sort_order ?? 0,
        d.is_enabled ? "是" : "否",
      ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "施工单位");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="construction_units_export.xlsx"; filename*=UTF-8''${encodeURIComponent("施工单位导出.xlsx")}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
