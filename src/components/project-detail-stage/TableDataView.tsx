"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";
import { GanttChart } from "./GanttChart";

interface TableDataViewProps {
  tableName: string;
  tableCode: string;
  projectSchema?: string;
  tableDef?: {
    columns_config?: Array<{ name: string; type: string; readonly?: boolean; options?: string[] }>;
    stage_desc_column?: string;
    allow_add?: boolean;
    allow_delete?: boolean;
    readonly_mode?: string;
    enable_drawer_form?: boolean;
    gantt_enabled?: boolean;
    gantt_start_col?: string;
    gantt_end_col?: string;
    gantt_name_col?: string;
    gantt_group_col?: string;
    gantt_milestone_col?: string;
    gantt_milestone_value?: string;
  };
  onBack: () => void;
  userName?: string;
  canEdit?: boolean;
}

// 判断列是否可编辑
function isColEditable(col: { type: string; readonly?: boolean }, row?: Record<string, unknown>, tableDef?: TableDataViewProps["tableDef"]) {
  if (!["text", "number", "date", "textarea", "select", "multiple_select", "procurement_module", "user"].includes(col.type)) return false;
  const colReadonly = col.readonly === true;
  const rowReadonly = row?._readonly === true;
  const isOrMode = tableDef?.readonly_mode === "or";
  if (isOrMode) {
    // OR: 列只读 OR 行只读 → 锁定
    if (colReadonly || rowReadonly) return false;
  } else {
    // AND（默认）: 列只读 AND 行只读 → 锁定
    if (colReadonly && rowReadonly) return false;
  }
  return true;
}

export function TableDataView({ tableName, tableCode, projectSchema, tableDef, onBack, userName, canEdit = false }: TableDataViewProps) {
  const { token } = useAuth();
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [ganttExpanded, setGanttExpanded] = useState(true);
  const [ganttScale, setGanttScale] = useState<"day" | "month">("month");
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set()); // 多选
  const importFileRef = useRef<HTMLInputElement>(null);
  // 抽屉表单模式
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRowIdx, setDrawerRowIdx] = useState(-1);
  const [drawerEditing, setDrawerEditing] = useState(false);
  const [drawerEditData, setDrawerEditData] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ rowIdx: number; colName: string } | null>(null);

  const columns = tableDef?.columns_config || [];
  const [productModules, setProductModules] = useState<{ code: string; name: string }[]>([]);
  const [pmSearch, setPmSearch] = useState("");
  const [userList, setUserList] = useState<{ id: string; name: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetch("/api/dicts?type=product_module_types")
      .then(r => r.json())
      .then(d => setProductModules((d.data || []).map((item: any) => ({ code: item.code, name: item.module_name || item.product_name || item.code }))))
      .catch(() => {});
    const token = localStorage.getItem("auth_token");
    fetch("/api/users", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => setUserList((d.data || []).map((u: any) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectSchema) return;
    setLoading(true);
    fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema || "")}&tableCode=${encodeURIComponent(tableCode)}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectSchema, tableCode]);

  const PERM_DENIED_MSG = "没有编辑权限，仅超级管理员、项目创建人、项目经理和项目成员可编辑";

  const saveEdit = async (value?: string) => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); setEditingCell(null); return; }
    if (!editingCell || !projectSchema) return;
    const { rowIdx, colName } = editingCell;
    const row = records[rowIdx];
    if (!row) return;
    const val = value !== undefined ? value : editValue;
    try {
      const res = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [colName]: val }, user_name: userName || "" }),
      });
      if (res.ok) {
        setRecords((prev) => { const u = [...prev]; u[rowIdx] = { ...u[rowIdx], [colName]: val }; return u; });
      }
    } catch {}
    setEditingCell(null);
  };

  const addRow = async () => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
    if (!projectSchema) return;
    if (tableDef?.enable_drawer_form) {
      setDrawerRowIdx(-1); setDrawerEditing(true);
      const init: Record<string,string> = {};
      (tableDef.columns_config || []).forEach(c => { init[c.name] = ""; });
      setDrawerEditData(init);
      setDrawerOpen(true);
      return;
    }
    try {
      // 构建初始数据：所有列给空值，避免 NOT NULL 约束报错
      const initData: Record<string, unknown> = {};
      (tableDef?.columns_config || []).forEach(c => {
        if (c.type === "number") initData[c.name] = 0;
        else if (c.type === "select") initData[c.name] = c.options?.[0] || "";
        else initData[c.name] = "";
      });
      const res = await fetch("/api/project-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectSchema, tableCode, data: initData, user_name: userName || "" }),
      });
      if (res.ok) {
        const d = await res.json();
        setRecords((prev) => [...prev, d.data || d]);
      }
    } catch {}
  };

  const deleteRow = async (rowIdx: number) => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
    const row = records[rowIdx];
    if (!row?.id || !projectSchema) return;
    if (row.allow_delete === false) return;
    if (!confirm("确定删除？")) return;
    try {
      const res = await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema || "")}&tableCode=${tableCode}&rowId=${row.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.ok) setRecords((prev) => prev.filter((_, i) => i !== rowIdx));
    } catch {}
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录？`)) return;
    for (const ri of selectedIds) {
      const row = records[ri];
      if (!row?.id || row.allow_delete === false) continue;
      try {
        await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema || "")}&tableCode=${tableCode}&rowId=${row.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      } catch {}
    }
    setRecords(prev => prev.filter((_, i) => !selectedIds.has(i)));
    setSelectedIds(new Set());
  };

  const handleExportExcel = async () => {
    const ExcelJS = await import("exceljs");
    const Excel: any = (ExcelJS as any).default || ExcelJS;
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet(tableName || "Sheet1");
    const cols = columns.filter(c => c.name !== tableDef?.stage_desc_column);
    ws.columns = cols.map(c => ({ header: c.name, key: c.name, width: 20 }));
    records.forEach(r => {
      const row: Record<string, unknown> = {};
      cols.forEach(c => {
        const v = r[c.name] ?? "";
        // 系统模块类型：导出名称而非代码
        if (c.type === "procurement_module" && v) {
          row[c.name] = productModules.find(m => m.code === String(v))?.name || v;
        } else {
          row[c.name] = v;
        }
      });
      ws.addRow(row);
    });
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
    // 为 select/用户/系统模块 列添加下拉数据验证（使用隐藏 sheet 避免字符限制）
    const hiddenSheet = wb.addWorksheet("_options");
    hiddenSheet.state = "hidden";
    let hiddenRow = 1;
    cols.forEach((c, ci) => {
      const colLetter = String.fromCharCode(65 + ci);
      const options: string[] = [];
      if ((c.type === "select" || c.type === "multiple_select") && c.options?.length) options.push(...c.options);
      else if (c.type === "user" && userList.length > 0) options.push(...userList.map(u => u.name));
      else if (c.type === "procurement_module" && productModules.length > 0) options.push(...productModules.map(m => m.name));
      if (options.length > 0) {
        const startRow = hiddenRow;
        options.forEach(o => { hiddenSheet.getCell(`A${hiddenRow}`).value = o; hiddenRow++; });
        const endRow = hiddenRow - 1;
        for (let ri = 2; ri <= records.length + 100; ri++) {
          ws.getCell(`${colLetter}${ri}`).dataValidation = {
            type: "list", allowBlank: true, formulae: [`_options!$A$${startRow}:$A$${endRow}`],
          };
        }
      }
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tableName}_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectSchema) return;
    try {
      const XLSX_dyn = await import("xlsx");
      const xlsxLib: any = (XLSX_dyn as any).default || XLSX_dyn;
      const data = await file.arrayBuffer();
      const wb = xlsxLib.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsxLib.utils.sheet_to_json(sheet, { defval: "", raw: false }) as Record<string, string>[];
      const headers = Object.keys(rows[0] || {});
      if (headers.length === 0) { alert("Excel 文件为空"); return; }
      let imported = 0;
      const failures: Array<{ row: number; data: Record<string, string>; error: string }> = [];
      for (let i = 0; i < rows.length; i++) {
        // 系统模块类型：名称→代码转换
        const row = { ...rows[i] };
        columns.forEach(c => {
          if (c.type === "procurement_module" && row[c.name]) {
            const mod = productModules.find(m => m.name === row[c.name]);
            if (mod) row[c.name] = mod.code; else failures.push({ row: i + 2, data: { ...rows[i] }, error: `模块名称"${row[c.name]}"未找到` });
          }
        });
        try {
          const res = await fetch("/api/project-data", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ projectSchema, tableCode, data: row }),
          });
          if (res.ok) imported++; else {
            const err = await res.json().catch(() => ({}));
            failures.push({ row: i + 2, data: { ...rows[i] }, error: err.error || "新增失败" });
          }
        } catch { failures.push({ row: i + 2, data: { ...rows[i] }, error: "网络错误" }); }
      }
      const reload = await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema || "")}&tableCode=${encodeURIComponent(tableCode)}`);
      const reloadJson = await reload.json();
      setRecords(reloadJson.data || []);
      if (failures.length > 0) {
        // 导出失败记录为 Excel
        const ExcelJS = await import("exceljs");
        const Excel: any = (ExcelJS as any).default || ExcelJS;
        const wb2 = new Excel.Workbook();
        const ws2 = wb2.addWorksheet("导入失败记录");
        ws2.columns = [
          { header: "行号", key: "row", width: 8 },
          { header: "错误原因", key: "error", width: 30 },
          ...headers.map(h => ({ header: h, key: h, width: 20 })),
        ];
        failures.forEach(f => {
          ws2.addRow({ row: f.row, error: f.error, ...f.data });
        });
        const hdr = ws2.getRow(1); hdr.font = { bold: true };
        const buf = await wb2.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${tableName}_导入失败_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        alert(`导入完成：成功 ${imported} 条，失败 ${failures.length} 条（已下载失败记录 Excel）`);
      } else {
        alert(`成功导入 ${imported} 条记录`);
      }
    } catch (e) { alert("导入失败: " + String(e)); }
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const fmt = (v: unknown) => String(v ?? "—");

  const renderValue = (col: any, row: Record<string, unknown>, ri: number) => {
    const fmtDate = (v: string) => { const d = v.split(/[T ]/)[0]; return d || v; };
    if (col.type === "calc" && col.calc_left_col && col.calc_right_col) {
      const l = Number(row[col.calc_left_col] ?? 0); const r = Number(row[col.calc_right_col] ?? 0);
      const op = col.calc_operator || "*"; // 运算符缺失时默认乘法
      const result = op === "-" ? (l - r) : op === "*" ? (l * r) : op === "/" ? (r ? l / r : 0) : (l + r);
      return <span className="font-mono text-xs" style={{ color: "var(--s-text)" }}>{String(result)}</span>;
    }
    const rawVal = (row[col.name] != null && row[col.name] !== "") ? String(row[col.name]) : "—";
    const val = col.type === "date" && rawVal !== "—" ? fmtDate(rawVal) : rawVal;
    const editable = isColEditable(col, row, tableDef);
    const isEditing = editingCell?.rowIdx === ri && editingCell?.colName === col.name;

    // 系统模块类型：显示名称而非代码
    const displayVal = col.type === "procurement_module" ? (productModules.find(m => m.code === rawVal)?.name || rawVal) : val;

    if (isEditing) {
      if (col.type === "procurement_module") {
        return (
          <div className="flex flex-col gap-1" style={{ minWidth: 180 }}>
            <input type="text" value={pmSearch} onChange={(e) => setPmSearch(e.target.value)}
              placeholder="搜索模块..." className="w-full px-2 py-1 text-[11px] border border-[var(--s-orange)] bg-white outline-none" autoFocus />
            <div className="max-h-[120px] overflow-y-auto border border-[var(--s-border)] bg-white">
              {productModules.filter(m => !pmSearch || m.name.includes(pmSearch) || m.code.includes(pmSearch)).slice(0, 20).map(m => (
                <div key={m.code} onClick={() => { setEditValue(m.name); setPmSearch(""); saveEdit(m.name); }}
                  className={`px-2 py-1 text-[11px] cursor-pointer hover:bg-gray-100 ${editValue === m.name ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}>
                  {m.name}
                </div>
              ))}
              {productModules.length === 0 && <div className="px-2 py-1 text-[11px] text-gray-400">加载中...</div>}
            </div>
          </div>
        );
      }
      if (col.type === "user") {
        return (
          <div className="flex flex-col gap-1" style={{ minWidth: 150 }}>
            <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
              placeholder="搜索用户..." className="w-full px-2 py-1 text-[11px] border border-[var(--s-orange)] bg-white outline-none" autoFocus />
            <div className="max-h-[120px] overflow-y-auto border border-[var(--s-border)] bg-white">
              {userList.filter(u => !userSearch || u.name.includes(userSearch)).slice(0, 20).map(u => (
                <div key={u.id} onClick={() => { setEditValue(u.name); setUserSearch(""); saveEdit(u.name); }}
                  className={`px-2 py-1 text-[11px] cursor-pointer hover:bg-gray-100 ${editValue === u.name ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}>{u.name}</div>
              ))}
              {userList.length === 0 && <div className="px-2 py-1 text-[11px] text-gray-400">加载中...</div>}
            </div>
          </div>
        );
      }
      if ((col.type === "select" || col.type === "multiple_select") && col.options?.length) {
        return (
          <select value={editValue} onChange={(e) => { setEditValue(e.target.value); saveEdit(e.target.value); }}
            className="w-full px-1 py-0.5 text-[11px] border border-[var(--s-orange)] outline-none bg-white" autoFocus>
            <option value="">请选择</option>
            {col.options!.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      }
      if (col.type === "date") {
        return <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={(e) => saveEdit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingCell(null); }}
          className="w-full px-1 py-0.5 text-[11px] border border-[var(--s-orange)] outline-none" autoFocus />;
      }
      return <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
        onBlur={(e) => saveEdit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingCell(null); }}
        className="w-full px-1 py-0.5 text-[11px] border border-[var(--s-orange)] outline-none" autoFocus />;
    }
    return (
      <span
        className={editable ? "cursor-pointer hover:bg-gray-100 px-1 -mx-1 rounded" : ""}
        style={{ color: "var(--s-text)" }}
        onClick={(e) => { if (editable) { e.stopPropagation(); setEditingCell({ rowIdx: ri, colName: col.name }); setEditValue(rawVal === "—" ? "" : rawVal); } }}
        title={editable ? "点击编辑" : "只读-该记录由管理员设置"}>
        {rawVal === "—" ? (editable ? <span className="text-gray-400 cursor-pointer">点击编辑</span> : "—") : displayVal}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-37 overflow-y-auto" style={{ backgroundColor: "var(--s-bg)" }}>
      {/* Hero */}
      <div className="px-16 pt-12 pb-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[1px] border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer transition-all hover:bg-[var(--s-surface)] hover:text-[var(--s-orange)] hover:border-[var(--s-orange)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}>
            ← 返回项目主页
          </button>
        </div>
        <h2 className="text-4xl font-bold text-[var(--s-text)] tracking-[-0.5px] mb-2">{tableName}</h2>
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[13px] text-[var(--s-text-secondary)]">项目数据表 · {records.length} 条记录</p>
        </div>

        <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span className="text-[32px] font-bold text-[var(--s-text)] leading-none" style={{ fontFamily: "var(--font-mono, monospace)" }}>{records.length}</span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>记录总数</span>
          </div>
        </div>
      </div>

      {/* 甘特图（可折叠） */}
      {tableDef?.gantt_enabled && tableDef.gantt_start_col && tableDef.gantt_end_col && tableDef.gantt_name_col && (
        <div className="border-b border-[var(--s-border)]">
          <div className="px-16 py-2 flex items-center justify-between bg-[var(--s-surface2)] cursor-pointer hover:bg-[var(--s-surface)]"
            onClick={() => setGanttExpanded(!ganttExpanded)}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>📊 甘特图</span>
              <span className="text-[10px] text-[var(--s-text-muted)]">{ganttExpanded ? "▲ 点击收起" : "▼ 点击展开"}</span>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center border border-[var(--s-border)] rounded p-0.5 mr-1">
                {(["day","month"] as const).map((s) => (
                  <button key={s} onClick={() => setGanttScale(s)}
                    className={`px-2 py-0.5 text-[10px] rounded font-semibold uppercase tracking-[0.5px] ${ganttScale === s ? "bg-[var(--s-orange)] text-white" : "text-[var(--s-text-muted)] hover:bg-[var(--s-surface2)]"}`}
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>{s === "day" ? "日" : "月"}</button>
                ))}
              </div>
            </div>
          </div>
          {ganttExpanded && (
            <div className="overflow-x-auto px-4 py-3">
              <GanttChart records={records}
                startCol={tableDef.gantt_start_col!} endCol={tableDef.gantt_end_col!}
                nameCol={tableDef.gantt_name_col!} groupCol={tableDef.gantt_group_col}
                milestoneCol={tableDef.gantt_milestone_col} milestoneValue={tableDef.gantt_milestone_value}
                timeScale={ganttScale} />
            </div>
          )}
        </div>
      )}

      {/* 表格/操作 */}
      <div className="px-16 py-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {canEdit && tableDef?.allow_add !== false && (
            <button onClick={addRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border border-[var(--s-green)] text-[var(--s-green)] cursor-pointer hover:bg-[rgba(43,138,62,.06)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}>
              + 添加记录
            </button>
          )}
          <label className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border border-[var(--s-border)] text-[var(--s-text-muted)] cursor-pointer hover:bg-[var(--s-surface2)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}>
            📥 导入Excel
            <input ref={importFileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportExcel} />
          </label>
          <button onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border border-[var(--s-border)] text-[var(--s-text-muted)] cursor-pointer hover:bg-[var(--s-surface2)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}>
            📤 导出Excel
          </button>
          {selectedIds.size > 0 && (
            <button onClick={batchDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border border-[var(--s-red)] text-[var(--s-red)] cursor-pointer hover:bg-[rgba(224,49,49,.06)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}>
              🗑 删除选中 ({selectedIds.size})
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-[var(--s-text-muted)] py-8 text-center">加载中...</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8 text-center px-1 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(records.map((_, i) => records[i].allow_delete !== false ? i : -1).filter(i => i >= 0)));
                    else setSelectedIds(new Set());
                  }} checked={selectedIds.size > 0 && selectedIds.size === records.filter(r => r.allow_delete !== false).length} />
                </th>
                <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}>#</th>
                {columns.filter((c) => c.name !== tableDef?.stage_desc_column).map((col) => (
                  <th key={col.name} className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>{col.name}{col.readonly ? " 🔒" : ""}</th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((row, ri) => (
                <tr key={ri} onClick={() => {
                  if (tableDef?.enable_drawer_form) {
                    setDrawerRowIdx(ri); setDrawerEditing(false); setDrawerOpen(true);
                  } else {
                    setSelectedRow(selectedRow === ri ? null : ri);
                  }
                }}
                className={`cursor-pointer hover:bg-[var(--s-surface)] border-b border-[var(--s-border)] ${
                  selectedRow === ri ? "bg-[rgba(28,126,214,.04)] border-l-2 border-l-[var(--s-blue)]" : ""
                }`}>
                  <td className="text-center px-1 py-3" onClick={(e) => e.stopPropagation()}>
                    {records[ri].allow_delete !== false && (
                      <input type="checkbox" checked={selectedIds.has(ri)} onChange={() => {
                        setSelectedIds(prev => { const next = new Set(prev); if (next.has(ri)) next.delete(ri); else next.add(ri); return next; });
                      }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{ri + 1}</td>
                  {columns.filter((c) => c.name !== tableDef?.stage_desc_column).map((col) => (
                    <td key={col.name} className="px-4 py-3 text-xs">{renderValue(col, row, ri)}</td>
                  ))}
                  <td className="px-2 py-3">
                    {canEdit && records[ri].allow_delete !== false && !row._readonly && (
                      <button onClick={(e) => { e.stopPropagation(); deleteRow(ri); }}
                        className="text-[10px] text-[var(--s-red)] hover:underline">删除</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 隐藏文件上传 */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTargetRef.current || !projectSchema) return;
        const { rowIdx, colName } = uploadTargetRef.current;
        const fd = new FormData();
        fd.append("file", file); fd.append("fileType", "attachment"); fd.append("projectCode", projectSchema);
        try {
          const ur = await fetch("/api/files/upload", { method: "POST", body: fd });
          const ud = await ur.json();
          if (ud.key) {
            await fetch("/api/project-data", { method: "PUT",
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ projectSchema, tableCode, rowId: records[rowIdx]?.id, data: { [colName]: ud.key } }),
            });
            setRecords((prev) => { const u = [...prev]; u[rowIdx] = { ...u[rowIdx], [colName]: ud.key }; return u; });
          }
        } catch {}
        e.target.value = "";
      }} />
      {/* ═══ 抽屉表单 ═══ */}
      {drawerOpen && (() => {
        const record = drawerRowIdx >= 0 ? records[drawerRowIdx] : {};
        const cols = tableDef?.columns_config || [];
        const isNew = drawerRowIdx < 0;
        // 字段分行
        const fieldRows: Array<Array<typeof cols[0]>> = [];
        let i = 0;
        while (i < cols.length) {
          const c = cols[i];
          if (c.type === "textarea" || c.type === "attachment" || c.type === "video") { fieldRows.push([c]); i++; }
          else if (i+1 < cols.length && cols[i+1].type !== "textarea" && cols[i+1].type !== "attachment" && cols[i+1].type !== "video") { fieldRows.push([c, cols[i+1]]); i += 2; }
          else { fieldRows.push([c]); i++; }
        }
        const closeDrawer = () => { setDrawerOpen(false); setDrawerEditing(false); };
        const handleDrawerSave = async () => {
          if (!projectSchema) { console.error("TableDataView drawer: projectSchema missing"); return; }
          try {
            const url = "/api/project-data";
            const method = isNew ? "POST" : "PUT";
            const body = isNew ? { projectSchema, tableCode, data: drawerEditData } : { projectSchema, tableCode, rowId: record.id, data: drawerEditData };
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
            if (res.ok) {
              const json = await res.json();
              if (isNew) setRecords(prev => [...prev, json.data || drawerEditData]);
              else setRecords(prev => { const u = [...prev]; u[drawerRowIdx] = { ...u[drawerRowIdx], ...drawerEditData }; return u; });
              closeDrawer();
            } else {
              const errText = await res.text();
              console.error("TableDataView 抽屉保存失败", res.status, errText);
            }
          } catch (e) { console.error("TableDataView 抽屉保存异常", e); }
        };
        const handlePrint = () => {
          const w = window.open("", "_blank", "width=800,height=600");
          if (!w) return;
          let h = '<html><head><title>打印</title><style>table{width:100%;border-collapse:collapse;border:1px solid #555;font-family:sans-serif}td{border:1px solid #aaa;padding:8px;vertical-align:top}td:first-child{background:#f5f5f5;font-weight:600;width:100px;font-size:11px}</style></head><body><table>';
          fieldRows.forEach(row => { h += '<tr>'; row.forEach(f => { const v = drawerEditing ? (drawerEditData[f.name]??"") : String(record[f.name]??"—"); h += `<td>${f.name}</td><td>${v}</td>`; }); h += '</tr>'; });
          h += '</table></body></html>'; w.document.write(h); w.document.close(); setTimeout(() => w.print(), 300);
        };
        const handleExport = () => {
          const rows: string[][] = [];
          fieldRows.forEach(row => { const r: string[] = []; row.forEach(f => { r.push(f.name); r.push(drawerEditing ? (drawerEditData[f.name]??"") : String(record[f.name]??"—")); }); rows.push(r); });
          const csv = rows.map(r => r.map(c => `"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
          const blob = new Blob(["﻿"+csv], { type: "text/csv;charset=utf-8" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${tableName}_记录.xlsx`; a.click();
        };
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={closeDrawer} />
            <div className="fixed top-0 right-0 h-full z-55 flex flex-col" style={{ width: 820, maxWidth: "95vw", background: "var(--s-surface)", boxShadow: "-4px 0 24px rgba(0,0,0,.12)" }}>
              <div className="flex items-center gap-2 px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface2)", paddingTop: 20 }}>
                <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--s-text)", fontFamily: "var(--font-mono, monospace)" }}>{isNew ? "新增记录" : "记录详情"}</span>
                <span className="text-[10px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>{tableName}{!isNew ? ` · 第 ${drawerRowIdx + 1} 条` : ""}</span>
                <div className="flex-1" />
                <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-border)", color: "var(--s-text-muted)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>🖨 打印</button>
                <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-border)", color: "var(--s-text-muted)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>📥 导出</button>
                <button onClick={closeDrawer} className="w-7 h-7 border flex items-center justify-center cursor-pointer flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface)", color: "var(--s-text-muted)" }}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #555" }}>
                  <tbody>
                    {fieldRows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((f) => {
                          const val = drawerEditing ? (drawerEditData[f.name] ?? "") : String(record[f.name] ?? "—");
                          const colSpan = row.length === 1 ? 4 : 2;
                          return (
                            <React.Fragment key={f.name}>
                              <td style={{ border: "1px solid #aaa", padding: "8px 10px", verticalAlign: "top", background: "#f5f5f5", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", width: 100, fontWeight: 600 }}>{f.name}</td>
                              <td style={{ border: "1px solid #aaa", padding: "8px 10px", verticalAlign: "top", fontSize: f.type === "textarea" ? 12 : 13, lineHeight: f.type === "textarea" ? 1.7 : 1.5, color: "var(--s-text)" }} colSpan={row.length === 1 ? 3 : 1}>
                                {f.type === "attachment" || f.type === "video" ? (
                                  /* 附件/视频字段 */
                                  drawerEditing && !f.readonly ? (
                                    <div>
                                      <input type="file" onChange={async (e) => {
                                        const file = e.target.files?.[0]; if (!file || !projectSchema) return;
                                        const fd = new FormData(); fd.append("file", file); fd.append("fileType", f.type); fd.append("projectCode", projectSchema);
                                        try { const res = await fetch("/api/files/upload", { method: "POST", body: fd }); const d = await res.json(); if (d.key) setDrawerEditData(prev => ({ ...prev, [f.name]: d.key })); } catch {}
                                      }} className="text-[11px]" />
                                      {val && <span className="text-[11px] ml-2" style={{ color: "var(--s-text-muted)" }}>当前: {(val as string).split("/").pop()?.replace(/^\d+_/, "") || val}</span>}
                                    </div>
                                  ) : val ? (
                                    <a href={`/api/files/download?key=${encodeURIComponent(val as string)}`} target="_blank" className="text-[11px]" style={{ color: "var(--s-blue)", cursor: "pointer", textDecoration: "none" }}
                                      onClick={(e) => { e.preventDefault(); fetch(`/api/files/download?key=${encodeURIComponent(val as string)}`).then(r=>r.json()).then(json=>{ if(json.url) window.open(json.url,"_blank"); }).catch(()=>{}); }}>
                                      📎 {(val as string).split("/").pop()?.replace(/^\d+_/, "") || val}
                                    </a>
                                  ) : "—"
                                ) : drawerEditing && !f.readonly ? (
                                  f.type === "textarea" ? <textarea value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))} className="w-full border-none outline-none resize-y text-[13px] font-sans" style={{ minHeight: 60, color: "var(--s-text)", background: "transparent" }} />
                                  : f.type === "select" && f.options?.length ? <select value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))} className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }}><option value="">—</option>{f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                                  : f.type === "date" ? <input type="date" value={val?.slice(0,10)||""} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))} className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }} />
                                  : <input type="text" value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))} className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }} />
                                ) : val}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface2)" }}>
                <span className="text-[9px] px-2 py-0.5 font-semibold uppercase font-mono" style={{ border: drawerEditing ? "1px solid var(--s-orange)" : "1px solid var(--s-border)", color: drawerEditing ? "var(--s-orange)" : "var(--s-text-muted)" }}>{drawerEditing ? "编辑" : "查看"}</span>
                <div className="flex-1" />
                {!drawerEditing ? (
                  <>
                    {canEdit && (
                      <button onClick={() => { setDrawerEditing(true); const init: Record<string,string> = {}; cols.forEach(c => { init[c.name] = String(record[c.name]??""); }); setDrawerEditData(init); }} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-orange)", color: "var(--s-orange)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>编辑</button>
                    )}
                    {!isNew && canEdit && record.allow_delete !== false && !record._readonly && <button onClick={() => { deleteRow(drawerRowIdx); closeDrawer(); }} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-red)", color: "var(--s-red)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>删除</button>}
                  </>
                ) : (
                  <>
                    <button onClick={handleDrawerSave} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-orange)", color: "var(--s-orange)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>保存</button>
                    <button onClick={() => setDrawerEditing(false)} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-border)", color: "var(--s-text-muted)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>取消</button>
                  </>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
