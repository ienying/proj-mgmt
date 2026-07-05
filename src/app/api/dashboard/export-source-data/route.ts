import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import ExcelJS from "exceljs";

function safeSchema(schema: string) {
  return schema.includes("-") ? `"${schema}"` : schema;
}

interface KpiCondition {
  column: string;
  operator: string;
  values: string[];
}

interface KpiSource {
  table_code: string;
  conditions: KpiCondition[];
}

function buildWhereClause(source: KpiSource): string {
  const conditions: string[] = [];
  for (const c of source.conditions || []) {
    if (!c.column || !c.operator) continue;
    const col = `"${c.column.replace(/"/g, '""')}"`;
    const vals = (c.values || []).map((v) => `'${String(v).replace(/'/g, "''")}'`);
    if (vals.length === 0) continue;
    switch (c.operator) {
      case "eq": conditions.push(`${col} = ${vals[0]}`); break;
      case "gt": conditions.push(`${col} > ${vals[0]}`); break;
      case "lt": conditions.push(`${col} < ${vals[0]}`); break;
      case "gte": conditions.push(`${col} >= ${vals[0]}`); break;
      case "lte": conditions.push(`${col} <= ${vals[0]}`); break;
      case "in": conditions.push(`${col} IN (${vals.join(", ")})`); break;
      case "not_in": conditions.push(`${col} NOT IN (${vals.join(", ")})`); break;
    }
  }
  return conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sources: KpiSource[] = body.sources || [];
    const sheetLabel: string = body.label || "export";
    const requestedIds: string[] | null = body.project_ids?.length
      ? body.project_ids.map((s: string) => s.trim()).filter(Boolean)
      : null;

    if (sources.length === 0) {
      return NextResponse.json({ error: "缺少数据源配置" }, { status: 400 });
    }

    const client = await createServerClient();

    // Get all projects
    const { data: projectRows } = await client.rpc("dp_select", { p_table: "projects" });
    let projects = (projectRows as Array<Record<string, unknown>>) || [];
    if (requestedIds && requestedIds.length > 0) {
      projects = projects.filter((p) => requestedIds.includes(String(p.id)));
    }

    // Apply department/status filters from query params
    const { searchParams } = new URL(request.url);
    const deptFilter = searchParams.get("department");
    const statusFilter = searchParams.get("status");
    if (statusFilter && statusFilter !== "all") {
      projects = projects.filter((p) => String(p.status) === statusFilter);
    }
    if (deptFilter && deptFilter !== "all") {
      projects = projects.filter((p) => {
        const ci = p.customer_info as Record<string, unknown> | undefined;
        return String(ci?.company_name || "") === deptFilter;
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "项目管理系统";

    let hasData = false;

    for (let si = 0; si < sources.length; si++) {
      const source = sources[si];
      const whereClause = buildWhereClause(source);
      // Sheet name: label (or label-N for multi-source)
      const sheetName = sources.length > 1
        ? `${sheetLabel}-${si + 1}`.slice(0, 31)
        : sheetLabel.slice(0, 31);
      const sheet = workbook.addWorksheet(sheetName); // Excel sheet name max 31 chars

      // Header row
      const headerRow = sheet.addRow([]);
      let headerWritten = false;

      for (const project of projects) {
        const schema = safeSchema(String(project.project_schema));
        const projectName = String(project.project_name || "");

        try {
          const sql = `SELECT * FROM ${schema}."${source.table_code.replace(/"/g, '""')}"${whereClause}`;
          const { data } = await client.rpc("execute_sql", { p_sql: sql });
          const rows = data as Array<Record<string, unknown>> | null;
          if (!rows || rows.length === 0) continue;

          // Write header once per sheet
          if (!headerWritten) {
            const cols = Object.keys(rows[0]).filter((k) => k !== "id");
            headerRow.values = ["项目名称", ...cols];
            // Style header
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF3B82F6" },
            };
            headerRow.eachCell((cell) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
            });
            headerWritten = true;
            hasData = true;
          }

          for (const row of rows) {
            const cols = Object.keys(row).filter((k) => k !== "id");
            const dataRow = sheet.addRow([projectName, ...cols.map((k) => row[k])]);
            dataRow.eachCell((cell) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
              };
            });
          }
        } catch {
          // table may not exist in this schema
        }
      }

      // Auto-fit column widths
      if (sheet.columns) {
        sheet.columns.forEach((col, i) => {
          if (i === 0) col.width = 20; // project name
          else col.width = 16;
        });
      }
    }

    if (!hasData) {
      return NextResponse.json({ error: "没有匹配的数据" }, { status: 404 });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(sheetLabel)}-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
