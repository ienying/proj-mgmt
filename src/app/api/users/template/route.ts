import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = [
    "用户名(username)",
    "姓名(name)",
    "邮箱(email)",
    "电话(phone)",
    "部门(department)",
    "职位(position)",
    "角色(role)",
    "密码(password)",
  ];

  const sampleRow = [
    "zhangsan",
    "张三",
    "zhangsan@example.com",
    "13800138000",
    "技术部",
    "工程师",
    "user",
    "yuansu0718",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "用户导入模板");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="users_import_template.xlsx"; filename*=UTF-8''${encodeURIComponent("用户导入模板.xlsx")}`,
    },
  });
}