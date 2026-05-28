import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = [
    "部门编码(code)",
    "部门名称(name)",
    "描述(description)",
    "排序(sort_order)",
    "启用(is_enabled)",
  ];

  const sampleRow = [
    "tech_dept",
    "技术部",
    "技术研发部门",
    0,
    "是",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "部门导入模板");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="departments_import_template.xlsx"; filename*=UTF-8''${encodeURIComponent("部门导入模板.xlsx")}`,
    },
  });
}
