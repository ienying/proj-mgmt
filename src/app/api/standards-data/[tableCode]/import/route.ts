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
  options?: string[];
  multiple?: boolean;
}

// 导入 Excel 数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableCode: string }> }
) {
  try {
    const { tableCode } = await params;
    const client = await createServerClient();
    const tableName = `std_definition_${tableCode}`;

    // 获取列定义（用于表头反向映射和类型转换）
    const { data: tableDefs } = await client.rpc("dp_select", { p_table: "data_table_definitions" });
    const def = (tableDefs as Array<{ table_code: string; columns_config: ColumnConfig[] }>)?.find(
      (d) => d.table_code === tableCode
    );
    const columns = def?.columns_config || [];

    // 排除系统字段
    const systemFields = ["id", "created_at", "updated_at", "sort_order", "data_source", "allow_delete"];
    const dataColumns = columns.filter((c) => !systemFields.includes(c.name));

    // 构建反向映射：显示名 -> 列名
    const labelToName: Record<string, string> = {};
    const nameToColumn: Record<string, ColumnConfig> = {};
    for (const col of dataColumns) {
      labelToName[col.label || col.name] = col.name;
      nameToColumn[col.name] = col;
    }

    // 解析上传的文件
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未找到上传文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    // 读取第一个工作表
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel 文件中没有数据" }, { status: 400 });
    }

    // 获取当前最大 sort_order
    const { data: maxOrderData } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM design_public.${tableName}`,
    });
    let currentOrder = (maxOrderData as { max_order: number })?.max_order || 0;

    // 获取表的列类型信息（用于空字符串转 NULL）
    const { data: colTypeInfo } = await client.rpc("query_to_jsonb", {
      p_sql: `SELECT jsonb_object_agg(column_name, data_type) FROM information_schema.columns WHERE table_schema='design_public' AND table_name='${tableName}'`,
    });
    const columnTypes: Record<string, string> = (colTypeInfo as Record<string, string>) || {};

    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];

        // 将显示名映射回列名，并做类型转换
        const record: Record<string, unknown> = {};
        for (const [header, value] of Object.entries(row)) {
          const colName = labelToName[header] || header;
          const col = nameToColumn[colName];

          if (col) {
            // 类型转换
            let convertedValue = value;

            if (value === "" || value === null || value === undefined) {
              // 非字符串类型空值转为 null
              const colType = columnTypes[colName];
              if (colType && !["text", "character varying", "varchar", "jsonb"].includes(colType)) {
                convertedValue = null;
              }
            } else if (col.type === "number" || columnTypes[colName] === "integer" || columnTypes[colName] === "numeric") {
              convertedValue = Number(value);
              if (isNaN(convertedValue as number)) convertedValue = null;
            } else if (col.type === "date" || columnTypes[colName] === "date") {
              // 尝试解析日期
              if (typeof value === "number") {
                // Excel 日期序列号转日期
                const date = XLSX.SSF.parse_date_code(value);
                if (date) {
                  convertedValue = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                }
              } else {
                const d = new Date(String(value));
                if (!isNaN(d.getTime())) {
                  convertedValue = d.toISOString().split("T")[0];
                } else {
                  convertedValue = null;
                }
              }
            } else if (col.type === "boolean" || columnTypes[colName] === "boolean") {
              if (typeof value === "string") {
                convertedValue = value === "true" || value === "是" || value === "1";
              } else {
                convertedValue = Boolean(value);
              }
            } else if (col.type === "multiple_select" && typeof value === "string") {
              // 逗号分隔的多选值转数组
              convertedValue = value.split(",").map((s: string) => s.trim()).filter(Boolean);
            }

            record[colName] = convertedValue;
          }
        }

        // 添加 sort_order 和 data_source
        currentOrder += 1;
        record.sort_order = currentOrder;
        record.data_source = "import";

        const { error } = await client.rpc("dp_insert_generic", {
          p_schema: "design_public",
          p_table: tableName,
          p_data: record,
        });

        if (error) {
          errors.push(`第 ${i + 2} 行导入失败: ${error.message}`);
        } else {
          importedCount++;
        }
      } catch (e) {
        errors.push(`第 ${i + 2} 行导入失败: ${e instanceof Error ? e.message : "未知错误"}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      updated: updatedCount,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
