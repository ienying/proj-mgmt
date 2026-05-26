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

// 导入 Excel 数据到项目 Schema 表
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema");
    const tableCode = searchParams.get("tableCode");

    if (!projectSchema || !tableCode) {
      return NextResponse.json({ error: "projectSchema and tableCode required" }, { status: 400 });
    }

    const client = await createServerClient();
    const tableName = tableCode;
    const schemaName = projectSchema;

    // 获取列定义
    const { data: tableDefs } = await client.rpc("dp_select", { p_table: "data_table_definitions" });
    const def = (tableDefs as Array<{ table_code: string; columns_config: ColumnConfig[] }>)?.find(
      (d) => d.table_code === tableCode
    );
    const columns = def?.columns_config || [];

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

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel 文件中没有数据" }, { status: 400 });
    }

    // 获取当前最大 sort_order
    const { data: maxOrderData } = await client.rpc("execute_sql", {
      p_sql: `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM ${schemaName}."${tableName}"`,
    });
    const maxOrderResult = maxOrderData as Array<{ max_order: number }>;
    let currentOrder = maxOrderResult?.[0]?.max_order || 0;

    // 获取表的列类型信息
    const { data: colTypeInfo } = await client.rpc("execute_sql", {
      p_sql: `SELECT jsonb_object_agg(column_name, data_type) FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='${tableName}'`,
    });
    const columnTypesRaw = (colTypeInfo as Array<Record<string, unknown>>)?.[0];
    const columnTypes: Record<string, string> = (columnTypesRaw?.jsonb_object_agg as Record<string, string>) || {};

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const record: Record<string, unknown> = {};

        for (const [header, value] of Object.entries(row)) {
          const colName = labelToName[header] || header;
          const col = nameToColumn[colName];

          if (col) {
            let convertedValue = value;

            if (value === "" || value === null || value === undefined) {
              const colType = columnTypes[colName];
              if (colType && !["text", "character varying", "varchar", "jsonb"].includes(colType)) {
                convertedValue = null;
              }
            } else if (col.type === "number" || columnTypes[colName] === "integer" || columnTypes[colName] === "numeric") {
              convertedValue = Number(value);
              if (isNaN(convertedValue as number)) convertedValue = null;
            } else if (col.type === "date" || columnTypes[colName] === "date") {
              if (typeof value === "number") {
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
            } else if (col.type === "multiselect" && typeof value === "string") {
              convertedValue = value.split(",").map((s: string) => s.trim()).filter(Boolean);
            }

            record[colName] = convertedValue;
          }
        }

        currentOrder += 1;
        record.sort_order = currentOrder;
        record.data_source = "import";

        const colNames = Object.keys(record).map(k => `"${k}"`);
        const colValues = Object.values(record).map((v) => {
          if (v === null || v === undefined) return "NULL";
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          if (typeof v === "number") return v;
          if (Array.isArray(v)) return `'${JSON.stringify(v)}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        });

        const { error } = await client.rpc("execute_sql", {
          p_sql: `INSERT INTO ${schemaName}."${tableName}" (${colNames.join(", ")}) VALUES (${colValues.join(", ")})`,
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
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
