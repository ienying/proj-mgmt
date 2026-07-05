"use client";
import * as XLSX from "xlsx";

/**
 * 导出数据为 Excel (.xlsx) 并触发浏览器下载
 * @param sheets - { 工作表名: { headers: string[], rows: string[][] } }
 * @param filename - 文件名（不含扩展名）
 */
export function exportExcel(
  sheets: Record<string, { headers: string[]; rows: string[][] }>,
  filename: string,
) {
  const wb = XLSX.utils.book_new();

  for (const [name, sheet] of Object.entries(sheets)) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-width columns
    const colWidths = sheet.headers.map((h, ci) => {
      let maxLen = h.length;
      for (const row of sheet.rows) {
        const cellLen = String(row[ci] ?? "").length;
        if (cellLen > maxLen) maxLen = cellLen;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 10), 50) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel sheet name max 31 chars
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
