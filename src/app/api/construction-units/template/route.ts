import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = [
    "名称(name)",
    "单位负责人(contact_person)",
    "电话(phone)",
    "描述(description)",
    "排序(sort_order)",
    "启用(is_enabled)",
  ];

  const sampleRow = [
    "示例施工单位",
    "张三",
    "13800138000",
    "示例描述",
    0,
    "是",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "施工单位导入模板");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="construction_units_import_template.xlsx"; filename*=UTF-8''${encodeURIComponent("施工单位导入模板.xlsx")}`,
    },
  });
}
