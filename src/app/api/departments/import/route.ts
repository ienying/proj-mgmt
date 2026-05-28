import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传 Excel 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    if (rows.length < 2) {
      return NextResponse.json({ error: "Excel 文件为空或无数据行" }, { status: 400 });
    }

    const headerRow = rows[0] as string[];
    const colMap: Record<string, number> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i]?.toString().trim();
      if (h.includes("部门编码")) colMap.code = i;
      else if (h.includes("部门名称")) colMap.name = i;
      else if (h.includes("描述")) colMap.description = i;
      else if (h.includes("排序")) colMap.sort_order = i;
      else if (h.includes("启用")) colMap.is_enabled = i;
    }

    if (colMap.code === undefined || colMap.name === undefined) {
      return NextResponse.json({ error: "缺少「部门编码」或「部门名称」列" }, { status: 400 });
    }

    const client = await createServerClient();

    const { data: existingData } = await client.rpc("dp_select", { p_table: "departments" });
    const existingDepts = (existingData as Record<string, unknown>[]) || [];
    const existingCodes = new Set(existingDepts.map((d) => d.code as string));

    const results: { row: number; name: string; status: string; error?: string }[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const code = (row[colMap.code] || "").toString().trim();
      const name = (row[colMap.name] || "").toString().trim();
      if (!code || !name) continue;

      if (existingCodes.has(code)) {
        skipped++;
        results.push({ row: i + 1, name, status: "跳过", error: "部门编码已存在" });
        continue;
      }

      const description = (colMap.description !== undefined ? row[colMap.description] : "")?.toString().trim() || null;
      const sortOrder = colMap.sort_order !== undefined ? parseInt(row[colMap.sort_order] as string, 10) : 0;
      const isEnabledRaw = colMap.is_enabled !== undefined ? row[colMap.is_enabled]?.toString().trim() : "是";
      const isEnabled = ["是", "true", "1", "yes"].includes(isEnabledRaw?.toLowerCase());

      try {
        const { error } = await client.rpc("dp_insert", {
          p_table: "departments",
          p_data: {
            code,
            name,
            description,
            sort_order: isNaN(sortOrder) ? 0 : sortOrder,
            is_enabled: isEnabled,
          },
        });

        if (error) {
          failed++;
          results.push({ row: i + 1, name, status: "失败", error: error.message });
        } else {
          created++;
          results.push({ row: i + 1, name, status: "成功" });
          existingCodes.add(code);
        }
      } catch (err) {
        failed++;
        results.push({ row: i + 1, name, status: "失败", error: String(err) });
      }
    }

    return NextResponse.json({
      data: { created, skipped, failed, total: created + skipped + failed, results },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
