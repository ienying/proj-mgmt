"use client";

import { useState, useEffect, useRef } from "react";

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
  };
  onBack: () => void;
}

// 判断列是否可编辑
function isColEditable(col: { type: string; readonly?: boolean }, row?: Record<string, unknown>, tableDef?: TableDataViewProps["tableDef"]) {
  if (!["text", "number", "date", "textarea", "select", "multiple_select", "procurement_module", "user"].includes(col.type)) return false;
  const isOrMode = tableDef?.readonly_mode === "or";
  if (isOrMode) {
    if (row?._readonly) return false;
    if (col.readonly) return false;
  } else {
    if (col.readonly && row?._readonly) return false;
  }
  return true;
}

export function TableDataView({ tableName, tableCode, projectSchema, tableDef, onBack }: TableDataViewProps) {
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ rowIdx: number; colName: string } | null>(null);

  const columns = tableDef?.columns_config || [];

  useEffect(() => {
    if (!projectSchema) return;
    setLoading(true);
    fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectSchema, tableCode]);

  const saveEdit = async (value?: string) => {
    if (!editingCell || !projectSchema) return;
    const { rowIdx, colName } = editingCell;
    const row = records[rowIdx];
    if (!row) return;
    const val = value !== undefined ? value : editValue;
    try {
      const res = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [colName]: val } }),
      });
      if (res.ok) {
        setRecords((prev) => { const u = [...prev]; u[rowIdx] = { ...u[rowIdx], [colName]: val }; return u; });
      }
    } catch {}
    setEditingCell(null);
  };

  const addRow = async () => {
    if (!projectSchema) return;
    try {
      const res = await fetch("/api/project-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, tableCode, data: {} }),
      });
      if (res.ok) {
        const d = await res.json();
        setRecords((prev) => [...prev, d.data || d]);
      }
    } catch {}
  };

  const deleteRow = async (rowIdx: number) => {
    const row = records[rowIdx];
    if (!row?.id || !projectSchema) return;
    if (!confirm("确定删除？")) return;
    try {
      const res = await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${tableCode}&rowId=${row.id}`, { method: "DELETE" });
      if (res.ok) setRecords((prev) => prev.filter((_, i) => i !== rowIdx));
    } catch {}
  };

  const fmt = (v: unknown) => String(v ?? "—");

  const renderValue = (col: { name: string; type: string; readonly?: boolean; options?: string[] }, row: Record<string, unknown>, ri: number) => {
    const val = String(row[col.name] ?? "—");
    const editable = isColEditable(col, row, tableDef);
    const isEditing = editingCell?.rowIdx === ri && editingCell?.colName === col.name;

    if (isEditing) {
      if (col.type === "select" && col.options?.length) {
        return (
          <select value={editValue} onChange={(e) => { setEditValue(e.target.value); saveEdit(e.target.value); }}
            className="w-full px-1 py-0.5 text-[11px] border border-[var(--s-orange)] outline-none bg-white" autoFocus>
            <option value="">请选择</option>
            {col.options!.map((o) => <option key={o} value={o}>{o}</option>)}
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
        onClick={() => { if (editable) { setEditingCell({ rowIdx: ri, colName: col.name }); setEditValue(val === "—" ? "" : val); } }}
        title={editable ? "点击编辑" : "只读-该记录由管理员设置"}>
        {val}
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
        <p className="text-[13px] text-[var(--s-text-secondary)] mb-6">项目数据表 · {records.length} 条记录</p>

        <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span className="text-[32px] font-bold text-[var(--s-text)] leading-none" style={{ fontFamily: "var(--font-mono, monospace)" }}>{records.length}</span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>记录总数</span>
          </div>
        </div>
      </div>

      {/* 表格/操作 */}
      <div className="px-16 py-6">
        {(tableDef?.allow_add !== false) && (
          <button onClick={addRow}
            className="mb-3 inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border border-[var(--s-green)] text-[var(--s-green)] cursor-pointer hover:bg-[rgba(43,138,62,.06)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}>
            + 添加记录
          </button>
        )}

        {loading ? (
          <div className="text-xs text-[var(--s-text-muted)] py-8 text-center">加载中...</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}>#</th>
                {columns.filter((c) => c.name !== tableDef?.stage_desc_column).map((col) => (
                  <th key={col.name} className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>{col.name}{col.readonly ? " 🔒" : ""}</th>
                ))}
                {(tableDef?.allow_delete !== false) && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {records.map((row, ri) => (
                <tr key={ri} onClick={() => setSelectedRow(selectedRow === ri ? null : ri)}
                  className={`cursor-pointer hover:bg-[var(--s-surface)] border-b border-[var(--s-border)] ${
                    selectedRow === ri ? "bg-[rgba(28,126,214,.04)] border-l-2 border-l-[var(--s-blue)]" : ""
                  }`}>
                  <td className="px-4 py-3 text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{ri + 1}</td>
                  {columns.filter((c) => c.name !== tableDef?.stage_desc_column).map((col) => (
                    <td key={col.name} className="px-4 py-3 text-xs">{renderValue(col, row, ri)}</td>
                  ))}
                  {(tableDef?.allow_delete !== false) && (
                    <td className="px-2 py-3">{!row._readonly && (
                      <button onClick={(e) => { e.stopPropagation(); deleteRow(ri); }}
                        className="text-[10px] text-[var(--s-red)] hover:underline">删除</button>
                    )}</td>
                  )}
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
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectSchema, tableCode, rowId: records[rowIdx]?.id, data: { [colName]: ud.key } }),
            });
            setRecords((prev) => { const u = [...prev]; u[rowIdx] = { ...u[rowIdx], [colName]: ud.key }; return u; });
          }
        } catch {}
        e.target.value = "";
      }} />
    </div>
  );
}
