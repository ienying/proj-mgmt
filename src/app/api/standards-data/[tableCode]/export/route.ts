import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import * as XLSX from "xlsx";

interface ColumnConfig {
  key: string;
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  readonly?: boolean;
}

// 导出数据为 Excel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();

    const tableName = `std_definition_${tableCode}`;

    // 获取列定义（用于表头映射）
    const { data: tableDefs } = await client.rpc("dp_select", { p_table: "data_table_definitions" });
    const def = (tableDefs as Array<{ table_code: string; columns_config: ColumnConfig[] }>)?.find(
      (d) => d.table_code === tableCode
    );
    const columns = def?.columns_config || [];

    // 排除系统字段
    const systemFields = ["id", "created_at", "updated_at", "sort_order", "data_source", "allow_delete"];
    const dataColumns = columns.filter((c) => !systemFields.includes(c.name));

    // 获取所有数据
    const { data, error } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (SELECT * FROM design_public.${tableName} ORDER BY sort_order) t`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = data as Record<string, unknown>[];

    // 构建表头映射：列名 -> 显示名(label或name)
    const headerMap: Record<string, string> = {};
    for (const col of dataColumns) {
      headerMap[col.name] = col.label || col.name;
    }

    // 转换数据：用显示名作为列头，处理特殊类型
    const rows = records.map((record) => {
      const row: Record<string, unknown> = {};
      for (const col of dataColumns) {
        const headerName = headerMap[col.name];
        let value = record[col.name];

        // 处理文件类型（显示文件名而非 JSON）
        if (["office", "pdf", "md", "image", "archive"].includes(col.type) && value) {
          try {
            const files = JSON.parse(String(value));
            if (Array.isArray(files)) {
              value = files.map((f: { name?: string }) => f.name || "").join(", ");
            }
          } catch {
            // 保留原始值
          }
        }

        // 处理多选/数组类型
        if (col.type === "multiple_select" && Array.isArray(value)) {
          value = value.join(", ");
        }

        // 处理采购模块类型
        if (col.type === "procurement_module" && value) {
          try {
            const parsed = JSON.parse(String(value));
            if (Array.isArray(parsed)) {
              value = parsed.join(", ");
            }
          } catch {
            // 保留原始值
          }
        }

        row[headerName] = value ?? "";
      }
      return row;
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header: dataColumns.map((c) => headerMap[c.name]) });

    // 设置列宽
    const colWidths = dataColumns.map((col) => {
      const header = headerMap[col.name];
      const maxLen = Math.max(
        header.length,
        ...rows.map((r) => String(r[header] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "数据");

    // 生成 Excel Buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(tableCode)}_export.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
