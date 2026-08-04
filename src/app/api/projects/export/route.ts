import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 项目字段中文标签映射
const FIELD_LABELS: Record<string, string> = {
  project_name: "项目名称", project_code: "项目编号",
  final_customer: "最终客户", company_name: "客户名称",
  project_type: "项目类型", project_stage: "项目阶段", project_status: "项目状态",
  department: "所属部门",
  role_sales: "销售负责人", role_presales: "售前负责人",
  role_market_product: "市场产品负责人", role_project_manager: "项目经理",
  customer_type: "客户类型", deployment_mode: "部署模式",
  entry_date: "进场时间", initial_acceptance_date: "初验时间",
  final_acceptance_date: "终验时间", required_date: "要求时间",
  procurement_modules: "采购模块", procurement_amount: "合同总金额",
  software_amount: "合同软件金额", hardware_amount: "合同硬件金额",
  channel_info: "渠道公司", implementation_unit: "实施单位",
  construction_units_info: "施工单位",
  integration_list: "对接信息", custom_dev_info: "定制化信息",
  description: "项目描述", created_at: "创建时间",
  customer_location: "客户位置",
};

const SYSTEM_TABLES = ["progress_updates", "operation_logs"];

// 字典查找表
type DictMap = Map<string, string>;

function fmtDate(v: unknown): string {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  // 已经是 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // 尝试解析各种格式
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  // 回退：取前10个字符
  return s.slice(0, 10);
}

function resolveName(code: string, dict: DictMap): string {
  return dict.get(code) || code;
}

function resolveCodeList(raw: unknown, dict: DictMap): string {
  if (!raw) return "";
  let codes: string[] = [];
  if (Array.isArray(raw)) {
    codes = raw.map(String);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try { const p = JSON.parse(trimmed); if (Array.isArray(p)) codes = p.map(String); } catch { /* ignore */ }
    }
    if (codes.length === 0) codes = trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  return codes.map(c => resolveName(c, dict)).join("、");
}

function getFieldValue(
  project: Record<string, unknown>,
  field: string,
  dicts: Record<string, DictMap>,
): string {
  switch (field) {
    case "company_name":
      return ((project.customer_info as Record<string, unknown>)?.company_name as string) || "";
    case "customer_location": {
      const cl = project.customer_location as Record<string, string> || {};
      return [cl.province, cl.city, cl.district, cl.town, cl.village].filter(Boolean).join("/") || "";
    }
    case "channel_info": {
      const ci = project.channel_info;
      if (Array.isArray(ci)) return (ci as Array<Record<string, string>>).map(c => c.company_name).filter(Boolean).join("、");
      return "";
    }
    case "procurement_modules": {
      const pm = project.procurement_modules;
      if (Array.isArray(pm)) return (pm as string[]).map(c => resolveName(c, dicts.productModules)).join("、");
      return resolveName(String(pm || ""), dicts.productModules);
    }
    case "integration_list": {
      const il = project.integration_list;
      if (Array.isArray(il)) return (il as Array<Record<string, string>>).map(i => i.product_module || i.vendor_name).filter(Boolean).join("、");
      return "";
    }
    case "custom_dev_info": {
      const cd = project.custom_dev_info;
      if (Array.isArray(cd)) return (cd as Array<Record<string, string>>).map(i => i.product_module).filter(Boolean).join("、");
      return "";
    }
    case "customer_type":
      return resolveCodeList(project.customer_type, dicts.customerTypes);
    case "deployment_mode":
      return resolveName(String(project.deployment_mode || ""), dicts.deploymentModes);
    case "project_type":
      return resolveName(String(project.project_type || ""), dicts.projectTypes);
    case "project_stage":
      return resolveName(String(project.project_stage || ""), dicts.projectStages);
    case "project_status":
      return resolveName(String(project.project_status || project.status || ""), dicts.projectStatuses);
    case "department":
      return resolveName(String(project.department || ""), dicts.departments);
    case "construction_units_info": {
      const cu = project.construction_units_info;
      if (Array.isArray(cu)) return (cu as Array<Record<string, string>>).map(c => c.company_name).filter(Boolean).join("、");
      return "";
    }
    case "entry_date":
    case "initial_acceptance_date":
    case "final_acceptance_date":
    case "required_date":
      return fmtDate(project[field]);
    case "created_at":
      return fmtDate(project[field]);
    default:
      return String(project[field] ?? "");
  }
}

async function loadDicts(client: Awaited<ReturnType<typeof createServerClient>>): Promise<Record<string, DictMap>> {
  const buildMap = (rows: Array<Record<string, unknown>> | null, codeKey = "code", nameKey = "name"): DictMap => {
    const map = new Map<string, string>();
    (rows || []).forEach(r => { map.set(String(r[codeKey] || ""), String(r[nameKey] || r[codeKey] || "")); });
    return map;
  };

  try {
    const [ptRes, psRes, pstRes, pmRes, ctRes, dmRes, deptRes] = await Promise.all([
      client.rpc("dp_select", { p_table: "project_types" }),
      client.rpc("dp_select", { p_table: "project_stages" }),
      client.rpc("dp_select", { p_table: "project_statuses" }),
      client.rpc("dp_select", { p_table: "product_module_types" }),
      client.rpc("dp_select", { p_table: "customer_types" }),
      client.rpc("dp_select", { p_table: "deployment_modes" }),
      client.rpc("dp_select", { p_table: "departments" }),
    ]);

    return {
      projectTypes: buildMap(ptRes.data as Array<Record<string, unknown>>, "code", "name"),
      projectStages: buildMap(psRes.data as Array<Record<string, unknown>>, "code", "name"),
      projectStatuses: buildMap(pstRes.data as Array<Record<string, unknown>>),
      productModules: buildMap(pmRes.data as Array<Record<string, unknown>>, "code", "module_name"),
      customerTypes: buildMap(ctRes.data as Array<Record<string, unknown>>, "code", "name"),
      deploymentModes: buildMap(dmRes.data as Array<Record<string, unknown>>, "code", "name"),
      departments: buildMap(deptRes.data as Array<Record<string, unknown>>, "code", "name"),
    };
  } catch {
    return {
      projectTypes: new Map(), projectStages: new Map(), projectStatuses: new Map(),
      productModules: new Map(), customerTypes: new Map(), deploymentModes: new Map(),
      departments: new Map(),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds, projectFields, tables } = body as {
      projectIds: string[];
      projectFields: string[];
      tables: Array<{ tableCode: string; tableName: string; columns: Array<{ name: string; label: string }> }>;
    };

    if (!projectIds || projectIds.length === 0) {
      return NextResponse.json({ error: "请选择至少一个项目" }, { status: 400 });
    }

    const client = await createServerClient();

    // 0. 加载字典表
    const dicts = await loadDicts(client);

    // 1. 获取项目数据
    const safeIds = projectIds.map(id => `'${id.replace(/'/g, "''")}'`).join(",");
    const { data: projects } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM public.projects WHERE id IN (${safeIds}) ORDER BY entry_date DESC NULLS LAST`,
    });
    const projectList = (projects as Array<Record<string, unknown>>) || [];

    // 2. 获取每个项目每张表的数据
    const tableDataMap = new Map<string, Map<string, Array<Record<string, unknown>>>>();
    for (const p of projectList) {
      const schema = String(p.project_schema || "");
      if (!schema) continue;
      const pid = String(p.id);
      const safeSchema = schema.includes('-') ? `"${schema}"` : schema.toLowerCase();

      for (const t of tables || []) {
        if (!tableDataMap.has(t.tableCode)) tableDataMap.set(t.tableCode, new Map());
        const projMap = tableDataMap.get(t.tableCode)!;

        try {
          const { data: rows } = await client.rpc("execute_sql", {
            p_sql: `SELECT * FROM ${safeSchema}."${t.tableCode}" ORDER BY sort_order, created_at`,
          });
          projMap.set(pid, (rows as Array<Record<string, unknown>>) || []);
        } catch {
          projMap.set(pid, []);
        }
      }
    }

    // 3. 构建表头和列信息
    // 第一部分：项目字段列
    const projectCols = projectFields.map(f => ({ group: "项目信息", label: FIELD_LABELS[f] || f, key: f }));
    // 第二部分：每张表的列
    const tableCols: Array<{ group: string; label: string; key: string; tableCode: string; colName: string }> = [];
    for (const t of tables || []) {
      for (const c of t.columns) {
        tableCols.push({ group: t.tableName, label: c.label, key: `${t.tableCode}__${c.name}`, tableCode: t.tableCode, colName: c.name });
      }
    }
    const allCols = [...projectCols, ...tableCols];

    // 4. 构建行数据：一个项目可能对应多行（当有表数据时展开）
    const rows: Array<Array<string>> = [];
    for (const p of projectList) {
      const pid = String(p.id);

      // 项目信息字段值
      const projValues = projectFields.map(f => getFieldValue(p, f, dicts));

      // 收集各表的数据行
      const tableRowSets: Array<Array<Array<string>>> = [];
      let maxRows = 1;
      for (const t of tables || []) {
        const projMap = tableDataMap.get(t.tableCode);
        const tblRows = (projMap?.get(pid) || []) as Array<Record<string, unknown>>;
        if (tblRows.length === 0) {
          // 没有数据 → 一行全是 "—"
          tableRowSets.push([t.columns.map(() => "—")]);
        } else {
          const rowsForTable = tblRows.map(row =>
            t.columns.map(c => {
              const val = row[c.name];
              if (val === null || val === undefined) return "—";
              if (typeof val === "object") return JSON.stringify(val);
              return String(val);
            })
          );
          tableRowSets.push(rowsForTable);
          if (tblRows.length > maxRows) maxRows = tblRows.length;
        }
      }

      // 展开为多行
      for (let ri = 0; ri < maxRows; ri++) {
        const rowValues = [...projValues];
        for (const rowSet of tableRowSets) {
          // 取第 ri 行，如果超出则填空
          const vals = ri < rowSet.length ? rowSet[ri] : rowSet[0].map(() => "—");
          rowValues.push(...vals);
        }
        rows.push(rowValues);
      }
    }

    // 5. 用 ExcelJS 生成文件
    const ExcelJS = await import("exceljs");
    const Excel = (ExcelJS as { default?: unknown }).default || ExcelJS;
    const wb = new (Excel as any).Workbook();
    const ws = wb.addWorksheet("项目导出");

    // 第一行：分组表头（合并单元格）
    const headerRow1 = ws.addRow([]);
    const headerRow2 = ws.addRow([]);
    let colIdx = 1;

    // 项目信息分组
    if (projectCols.length > 0) {
      const startCol = colIdx;
      for (const pc of projectCols) {
        headerRow2.getCell(colIdx).value = pc.label;
        colIdx++;
      }
      const endCol = colIdx - 1;
      if (startCol <= endCol) {
        ws.mergeCells(1, startCol, 1, endCol);
      }
      headerRow1.getCell(startCol).value = "项目信息";
    }

    // 表分组
    if (tables && tables.length > 0) {
      for (const t of tables) {
        const startCol = colIdx;
        for (const c of t.columns) {
          headerRow2.getCell(colIdx).value = c.label;
          colIdx++;
        }
        const endCol = colIdx - 1;
        if (startCol <= endCol) {
          ws.mergeCells(1, startCol, 1, endCol);
        }
        headerRow1.getCell(startCol).value = t.tableName;
      }
    }

    // 样式表头
    [headerRow1, headerRow2].forEach(row => {
      row.font = { bold: true, size: 11 };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
      row.alignment = { horizontal: "center", vertical: "middle" };
    });
    headerRow1.height = 24;
    headerRow2.height = 20;

    // 数据行
    for (const row of rows) {
      const dataRow = ws.addRow(row);
      dataRow.font = { size: 11 };
    }

    // 列宽自适应
    ws.columns = Array.from({ length: colIdx - 1 }, (_, i) => ({
      width: Math.min(30, Math.max(12, ...rows.map(r => (r[i] || "").length).concat(8))),
    }));

    // 冻结表头
    ws.views = [{ state: "frozen", ySplit: 2 }];

    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `%E9%A1%B9%E7%9B%AE%E5%AF%BC%E5%87%BA_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
