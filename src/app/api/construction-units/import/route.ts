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
      if (h.includes("名称") && !h.includes("单位负责人")) colMap.name = i;
      else if (h.includes("单位负责人")) colMap.contact_person = i;
      else if (h.includes("电话")) colMap.phone = i;
      else if (h.includes("合作等级")) colMap.cooperation_level = i;
      else if (h.includes("施工质量")) colMap.quality_rating = i;
      else if (h.includes("描述")) colMap.description = i;
      else if (h.includes("排序")) colMap.sort_order = i;
      else if (h.includes("启用")) colMap.is_enabled = i;
    }

    if (colMap.name === undefined) {
      return NextResponse.json({ error: "缺少「名称」列" }, { status: 400 });
    }

    const client = await createServerClient();

    const { data: existingData } = await client.rpc("dp_select", { p_table: "construction_units" });
    const existingUnits = (existingData as Record<string, unknown>[]) || [];
    const existingNames = new Set(existingUnits.map((d) => d.name as string));

    const results: { row: number; name: string; status: string; error?: string }[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const name = (colMap.name !== undefined ? row[colMap.name] : "")?.toString().trim();
      if (!name) continue;

      const code = `CU_${Date.now()}_${i}`;

      if (existingNames.has(name)) {
        skipped++;
        results.push({ row: i + 1, name, status: "跳过", error: "名称已存在" });
        continue;
      }

      const contact_person = (colMap.contact_person !== undefined ? row[colMap.contact_person] : "")?.toString().trim() || null;
      const phone = (colMap.phone !== undefined ? row[colMap.phone] : "")?.toString().trim() || null;
      const cooperation_level = (colMap.cooperation_level !== undefined ? row[colMap.cooperation_level] : "")?.toString().trim() || null;
      const quality_rating = (colMap.quality_rating !== undefined ? row[colMap.quality_rating] : "")?.toString().trim() || null;
      const description = (colMap.description !== undefined ? row[colMap.description] : "")?.toString().trim() || null;
      const sortOrder = colMap.sort_order !== undefined ? parseInt(row[colMap.sort_order] as string, 10) : 0;
      const isEnabledRaw = colMap.is_enabled !== undefined ? row[colMap.is_enabled]?.toString().trim() : "是";
      const isEnabled = ["是", "true", "1", "yes"].includes(isEnabledRaw?.toLowerCase());

      try {
        const { error } = await client.rpc("dp_insert", {
          p_table: "construction_units",
          p_data: {
            code,
            name,
            contact_person,
            phone,
            cooperation_level,
            quality_rating,
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
          existingNames.add(name);
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
