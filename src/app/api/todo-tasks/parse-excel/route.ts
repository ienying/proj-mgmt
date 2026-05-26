import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// POST /api/todo-tasks/parse-excel
// Accepts multipart form with .xlsx/.xls file
// Returns parsed column structure + preview data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请上传Excel文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // 使用第一个 Sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json({ error: "Excel文件为空" }, { status: 400 });
    }

    // 转为二维数组
    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rawData.length < 2) {
      return NextResponse.json({ error: "Excel至少需要包含表头行和一行数据" }, { status: 400 });
    }

    // 首行作为表头
    const headers = rawData[0].map((h: unknown) => String(h).trim()).filter(Boolean);
    const dataRows = rawData.slice(1).filter((row: string[]) => row.some((cell: string) => String(cell).trim() !== ""));

    // 推断字段类型
    const columns = headers.map((header: string, colIndex: number) => {
      const colData = dataRows.map((row: string[]) => String(row[colIndex] || "").trim()).filter(Boolean);
      const inferred = inferColumnType(header, colData);

      return {
        name: header,
        type: inferred.type,
        options: inferred.options,
        required: false,
        description: "",
        sample_data: colData.slice(0, 3),
      };
    });

    // 预览前5行
    const preview = dataRows.slice(0, 5).map((row: string[]) => {
      const record: Record<string, string> = {};
      headers.forEach((h: string, i: number) => {
        record[h] = String(row[i] || "").trim();
      });
      return record;
    });

    return NextResponse.json({
      data: {
        sheet_name: sheetName,
        sheet_names: workbook.SheetNames,
        columns,
        preview,
        total_rows: dataRows.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to parse Excel file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface InferResult {
  type: string;
  options?: string[];
}

function inferColumnType(header: string, sampleData: string[]): InferResult {
  const lower = header.toLowerCase();

  // 基于列名关键词推断
  if (/数量|人数|个数|金额|年龄|面积|带宽|价格|总额/.test(lower)) {
    return { type: "number" };
  }
  if (/时间|日期|年限|截止|期限/.test(lower)) {
    return { type: "date" };
  }
  if (/是否|有无|已建|启用/.test(lower)) {
    return { type: "select", options: ["是", "否"] };
  }
  if (/详情|说明|描述|备注|需求|内容|主要/.test(lower)) {
    return { type: "textarea" };
  }
  if (/电话|手机|联系方式/.test(lower)) {
    return { type: "text" };
  }

  // 基于数据内容推断
  if (sampleData.length > 0) {
    const allNumbers = sampleData.every((v) => /^\d+(\.\d+)?$/.test(v));
    if (allNumbers) {
      return { type: "number" };
    }

    const allDates = sampleData.every((v) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v));
    if (allDates) {
      return { type: "date" };
    }

    const uniqueValues = [...new Set(sampleData)];
    if (uniqueValues.length <= 5 && sampleData.length >= 3) {
      return { type: "select", options: uniqueValues };
    }

    const avgLen = sampleData.reduce((sum, v) => sum + v.length, 0) / sampleData.length;
    if (avgLen > 30) {
      return { type: "textarea" };
    }
  }

  return { type: "text" };
}
