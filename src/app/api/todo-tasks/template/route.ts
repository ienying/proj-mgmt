import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// GET /api/todo-tasks/template
// Returns an Excel template file for task table creation
export async function GET() {
  const headers = ["名称", "类型", "数量", "截止日期", "是否完成", "备注"];
  const sampleRow = ["示例项目", "A类", 100, "2025-01-01", "是", "示例备注说明"];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  // Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="任务表单模板.xlsx"`,
    },
  });
}
