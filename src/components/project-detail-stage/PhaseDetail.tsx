"use client";

import { useState, useCallback, useRef } from "react";
import { phaseDetails } from "./mock-data";

interface TableDef {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  apply_project_stages: string[];
  stage_desc_column?: string;
  stage_display_mode?: string;
  stage_progress_column?: string;
  stage_progress_target?: string;
  stage_summary_fields?: string;
  allow_add?: boolean;
  allow_delete?: boolean;
  readonly_mode?: string;
  columns_config?: Array<{ name: string; type: string; readonly?: boolean; options?: string[]; display_mode?: string }>;
}

interface PhaseDetailProps {
  phaseKey: string;
  stageCode?: string;
  tableDefs?: TableDef[];
  projectSchema?: string;
}

export function PhaseDetail({ phaseKey, stageCode, tableDefs = [], projectSchema }: PhaseDetailProps) {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableRecords, setTableRecords] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<{ tableCode: string; rowIdx: number } | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<Record<string, "card" | "table">>({});
  const [editingCell, setEditingCell] = useState<{
    tableCode: string; rowIdx: number; colName: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [productModules, setProductModules] = useState<{ code: string; name: string }[]>([]);
  const [userList, setUserList] = useState<{ id: string; name: string }[]>([]);
  const [pmSearch, setPmSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // 开始编辑单元格
  const startEdit = (tableCode: string, rowIdx: number, colName: string, currentValue: string) => {
    setEditingCell({ tableCode, rowIdx, colName });
    setEditValue(currentValue);
  };

  // 保存编辑（支持传入特定值，避免React状态异步问题）
  const saveEdit = useCallback(async (saveValue?: string) => {
    if (!editingCell || !projectSchema) return;
    const { tableCode, rowIdx, colName } = editingCell;
    const row = tableRecords[tableCode]?.[rowIdx];
    if (!row) return;
    const valueToSave = saveValue !== undefined ? saveValue : editValue;
    try {
      const res = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema,
          tableCode,
          rowId: row.id,
          data: { [colName]: valueToSave },
        }),
      });
      if (res.ok) {
        setTableRecords((prev) => {
          const updated = [...(prev[tableCode] || [])];
          updated[rowIdx] = { ...updated[rowIdx], [colName]: valueToSave };
          return { ...prev, [tableCode]: updated };
        });
      }
    } catch {}
    setEditingCell(null);
  }, [editingCell, editValue, projectSchema, tableRecords]);

  // 添加行
  const addRow = async (tableCode: string) => {
    if (!projectSchema) return;
    try {
      const res = await fetch("/api/project-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, tableCode, data: {} }),
      });
      if (res.ok) {
        const data = await res.json();
        setTableRecords((prev) => ({
          ...prev,
          [tableCode]: [...(prev[tableCode] || []), data.data || data],
        }));
      }
    } catch {}
  };

  // 删除行
  const deleteRow = async (tableCode: string, rowIdx: number) => {
    if (!projectSchema) return;
    const row = tableRecords[tableCode]?.[rowIdx];
    if (!row?.id) return;
    try {
      const res = await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}&rowId=${row.id}`, { method: "DELETE" });
      if (res.ok) {
        setTableRecords((prev) => {
          const updated = (prev[tableCode] || []).filter((_, i) => i !== rowIdx);
          return { ...prev, [tableCode]: updated };
        });
      }
    } catch {}
  };

  // 取消编辑
  const cancelEdit = () => setEditingCell(null);

  // 文件上传处理（用 ref 避免 React 状态异步问题）
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ tableCode: string; rowIdx: number; colName: string } | null>(null);
  const [uploadingCell, setUploadingCell] = useState<{ tableCode: string; rowIdx: number; colName: string } | null>(null);

  const handleFileUpload = async (file: File) => {
    const target = uploadTargetRef.current;
    if (!target || !projectSchema) return;
    const { tableCode, rowIdx, colName } = target;
    const row = tableRecords[tableCode]?.[rowIdx];
    if (!row) return;

    setUploadingCell(target);
    uploadTargetRef.current = null;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", "attachment");
      fd.append("projectCode", projectSchema);

      const uploadRes = await fetch("/api/files/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        console.error("上传失败:", uploadData.error);
        setUploadingCell(null);
        return;
      }
      const fileKey = uploadData.key || "";
      if (!fileKey) { setUploadingCell(null); return; }

      // 保存 key 到数据库
      const saveRes = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [colName]: fileKey } }),
      });
      if (!saveRes.ok) {
        console.error("保存文件key失败");
        setUploadingCell(null);
        return;
      }

      setTableRecords((prev) => {
        const updated = [...(prev[tableCode] || [])];
        updated[rowIdx] = { ...updated[rowIdx], [colName]: fileKey };
        return { ...prev, [tableCode]: updated };
      });
    } catch (e) {
      console.error("上传异常:", e);
    }
    setUploadingCell(null);
  };

  // 筛选属于当前阶段 + 显示位置为 phase/both 的表
  const phaseTables = stageCode
    ? tableDefs.filter(
        (def) =>
          def.apply_project_stages?.includes(stageCode) &&
          (!def.stage_display_mode || def.stage_display_mode === "phase" || def.stage_display_mode === "both")
      )
    : [];

  const handleTableClick = useCallback(
    async (tableCode: string) => {
      if (expandedTable === tableCode) {
        setExpandedTable(null);
        setSelectedRecord(null);
        return;
      }
      setExpandedTable(tableCode);
      setSelectedRecord(null);

      if (!tableRecords[tableCode] && projectSchema) {
        setLoadingTable(tableCode);
        try {
          // 预加载产品模块字典（用于 procurement_module 类型）
          if (productModules.length === 0) {
            fetch("/api/dicts?type=product_module_types")
              .then((r) => r.json())
              .then((d) => setProductModules((d.data || []).map((item: any) => ({ code: item.code, name: item.module_name || item.product_name || item.code }))))
              .catch(() => {});
          }
          if (userList.length === 0) {
            fetch("/api/users")
              .then((r) => r.json())
              .then((d) => setUserList((d.data || d.users || []).map((u: any) => ({ id: u.id, name: u.name || u.username }))))
              .catch(() => {});
          }
          // 先同步引用数据
          await fetch(`/api/project-data/sync?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}`).catch(() => {});
          // 加载数据
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}`
          );
          const data = await res.json();
          setTableRecords((prev) => ({ ...prev, [tableCode]: data.data || [] }));
        } catch {
          setTableRecords((prev) => ({ ...prev, [tableCode]: [] }));
        } finally {
          setLoadingTable(null);
        }
      }
    },
    [expandedTable, tableRecords, projectSchema]
  );

  const handleRecordClick = (tableCode: string, rowIdx: number) => {
    setSelectedRecord((prev) =>
      prev?.tableCode === tableCode && prev?.rowIdx === rowIdx ? null : { tableCode, rowIdx }
    );
  };

  const expandedDef = expandedTable ? phaseTables.find((t) => t.table_code === expandedTable) : null;
  // 解析汇总字段：{column, label, hide}
  const summaryFields = (() => {
    const raw = expandedDef?.stage_summary_fields || "";
    return raw.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6).map((line) => {
      const hide = line.startsWith("-");
      const col = hide ? line.slice(1).trim() : line.trim();
      return { column: col, hide };
    });
  })();

  // 隐藏列名集合
  const hiddenCols = new Set([
    expandedDef?.stage_desc_column,
    ...summaryFields.filter((s) => s.hide).map((s) => s.column),
  ].filter(Boolean));

  // 表格显示列：排除隐藏列
  const visibleColumns = (expandedDef?.columns_config || []).filter(
    (col) => !hiddenCols.has(col.name)
  );

  // 进度计算
  const progressPercent = expandedTable && expandedDef?.stage_progress_column && expandedDef?.stage_progress_target
    ? (() => {
        const records = tableRecords[expandedTable] || [];
        if (records.length === 0) return 0;
        const col = expandedDef.stage_progress_column!;
        const target = expandedDef.stage_progress_target!;
        const matchCount = records.filter((r) => String(r[col] || "").trim() === target.trim()).length;
        return Math.round((matchCount / records.length) * 100);
      })()
    : null;

  // 判断列是否可编辑（与 API PUT 只读逻辑完全一致）
  const isColumnEditable = (col: { type: string; readonly?: boolean }, row?: Record<string, unknown>) => {
    if (!["text", "number", "date", "textarea", "select", "multiple_select", "procurement_module", "user"].includes(col.type)) return false;
    const isOrMode = expandedDef?.readonly_mode === "or";
    if (isOrMode) {
      // OR: 行列任一满足即锁定
      if (row?._readonly) return false; // 行只读 → 所有列锁
      if (col.readonly) return false;    // 列只读 → 该列锁
    } else {
      // AND: 行列同时满足才锁定
      if (col.readonly && row?._readonly) return false;
    }
    return true;
  };

  // 渲染可编辑单元格
  const renderCell = (tableCode: string, rowIdx: number, col: { name: string; type: string; readonly?: boolean; options?: string[]; display_mode?: string }, row: Record<string, unknown>) => {
    const value = String(row[col.name] ?? "");
    const isEditing = editingCell?.tableCode === tableCode && editingCell?.rowIdx === rowIdx && editingCell?.colName === col.name;
    const editable = isColumnEditable(col, row);

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {col.type === "select" && (col.options || []).length > 0 ? (
            <select value={editValue} onChange={(e) => { setEditValue(e.target.value); saveEdit(e.target.value); }}
              className="px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              autoFocus>
              <option value="">请选择</option>
              {col.options!.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : col.type === "multiple_select" && (col.options || []).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {col.options!.map((opt) => {
                const selected = (editValue || "").split(",").map((s: string) => s.trim()).includes(opt);
                return (
                  <label key={opt} className="inline-flex items-center gap-1 text-[10px] cursor-pointer">
                    <input type="checkbox" checked={selected} onChange={() => {
                      const current = (editValue || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                      const next = selected ? current.filter((v: string) => v !== opt) : [...current, opt];
                      const newVal = next.join(",");
                      setEditValue(newVal);
                      // auto-save for multi-select
                      if (editingCell) {
                        const { tableCode, rowIdx, colName } = editingCell;
                        fetch("/api/project-data", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [colName]: newVal } }),
                        }).then((r) => {
                          if (r.ok) setTableRecords((prev) => {
                            const updated = [...(prev[tableCode] || [])];
                            updated[rowIdx] = { ...updated[rowIdx], [colName]: newVal };
                            return { ...prev, [tableCode]: updated };
                          });
                        });
                      }
                    }} className="w-3 h-3" />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : col.type === "procurement_module" ? (
            <div className="flex flex-col gap-1 w-full max-w-[200px]">
              <input type="text" value={pmSearch} onChange={(e) => setPmSearch(e.target.value)}
                placeholder="搜索模块..."
                className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
                autoFocus />
              <div className="max-h-[120px] overflow-y-auto border border-[var(--s-border)] bg-[var(--s-surface)]">
                {productModules.filter((m) => !pmSearch || m.name.includes(pmSearch) || m.code.includes(pmSearch)).slice(0, 20).map((m) => (
                  <div key={m.code}
                    onClick={() => { setEditValue(m.name); setPmSearch(""); saveEdit(m.name); }}
                    className={`px-2 py-1 text-xs cursor-pointer hover:bg-[var(--s-surface2)] ${editValue === m.name ? "bg-[rgba(28,126,214,.08)] text-[var(--s-blue)]" : "text-[var(--s-text)]"}`}>
                    {m.name}
                  </div>
                ))}
                {productModules.length === 0 && (
                  <div className="px-2 py-1 text-xs text-[var(--s-text-muted)]">加载中...</div>
                )}
              </div>
            </div>
          ) : col.type === "user" ? (
            <div className="flex flex-col gap-1 w-full max-w-[200px]">
              <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="搜索用户..."
                className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
                autoFocus />
              <div className="max-h-[120px] overflow-y-auto border border-[var(--s-border)] bg-[var(--s-surface)]">
                {userList.filter((u) => !userSearch || u.name.includes(userSearch)).slice(0, 20).map((u) => (
                  <div key={u.id}
                    onClick={() => { setEditValue(u.name); setUserSearch(""); saveEdit(u.name); }}
                    className={`px-2 py-1 text-xs cursor-pointer hover:bg-[var(--s-surface2)] ${editValue === u.name ? "bg-[rgba(28,126,214,.08)] text-[var(--s-blue)]" : "text-[var(--s-text)]"}`}>
                    {u.name}
                  </div>
                ))}
                {userList.length === 0 && (
                  <div className="px-2 py-1 text-xs text-[var(--s-text-muted)]">加载中...</div>
                )}
              </div>
            </div>
          ) : col.type === "textarea" ? (
            <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit((e.target as HTMLTextAreaElement).value); } }}
              onBlur={(e) => saveEdit((e.target as HTMLTextAreaElement).value)}
              className="flex-1 px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none resize-none min-h-[24px]"
              autoFocus />
          ) : col.type === "number" ? (
            <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              autoFocus />
          ) : col.type === "date" ? (
            <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              autoFocus />
          ) : (
            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              autoFocus />
          )}
        </div>
      );
    }

    // 附件/视频类型：上传按钮
    if (col.type === "attachment" || col.type === "video") {
      const value = String(row[col.name] ?? "");
      const hasFile = value && value !== "undefined" && value !== "null";
      return (
        <div className="flex items-center gap-1">
          {hasFile ? (
            <>
              <a href={value.startsWith("http") ? value : `/api/files/download?key=${encodeURIComponent(value)}`}
                target="_blank" className="text-[11px] text-blue-600 hover:underline truncate max-w-[120px]"
                onClick={(e) => e.stopPropagation()}
                title={value}>
                {(value.split("/").pop()?.split("?")[0] || "文件").replace(/^\d+_/, "")}
              </a>
              <button onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
                uploadTargetRef.current = { tableCode, rowIdx, colName: col.name };
                fileInputRef.current?.click();
              }}
                className="text-[10px] text-red-500 hover:text-red-700"
                title="替换文件">
                ↻
              </button>
            </>
          ) : (
            <button onClick={(e) => {
              e.stopPropagation();
              uploadTargetRef.current = { tableCode, rowIdx, colName: col.name };
              fileInputRef.current?.click();
            }}
              className={`text-[10px] cursor-pointer hover:text-primary ${uploadingCell?.tableCode === tableCode && uploadingCell?.rowIdx === rowIdx && uploadingCell?.colName === col.name ? "opacity-50" : ""}`}>
              {uploadingCell?.tableCode === tableCode && uploadingCell?.rowIdx === rowIdx && uploadingCell?.colName === col.name
                ? "上传中..."
                : "📎 上传"}
            </button>
          )}
        </div>
      );
    }

    // 非编辑态的显示
    if (col.type === "select" || col.type === "multiple_select") {
      return (
        <span
          className={editable ? "cursor-pointer hover:bg-[var(--s-surface2)] px-1 -mx-1 rounded" : ""}
          style={{ color: "var(--s-text)" }}
          onClick={() => editable && startEdit(tableCode, rowIdx, col.name, value)}>
          {value || "—"}
        </span>
      );
    }

    return (
      <span
        className={editable ? "cursor-pointer hover:bg-[var(--s-surface2)] px-1 -mx-1 rounded" : ""}
        style={{ color: "var(--s-text)" }}
        onClick={() => editable && startEdit(tableCode, rowIdx, col.name, value)}
        title={editable ? "点击编辑" : "只读-该记录由管理员设置"}>
        {value || "—"}
      </span>
    );
  };

  // 静态阶段详情
  const detail = phaseDetails[phaseKey];
  if (!detail) {
    return (
      <div className="phase-section" style={{ borderBottom: "1px solid var(--s-border)" }}>
        <div className="px-16 py-12 text-center text-[var(--s-text-muted)] text-sm">
          该阶段详情正在建设中...
        </div>
      </div>
    );
  }

  return (
    <div className="phase-section" style={{ borderBottom: "1px solid var(--s-border)" }}>
      {/* 两列布局：阶段信息 + 任务列表 */}
      <div className="grid grid-cols-2 min-h-[320px]">
        {/* 左列：阶段详情 */}
        <div className="px-16 py-12 flex flex-col gap-6" style={{ borderRight: "1px solid var(--s-border)" }}>
          <div
            className={`text-[10px] uppercase tracking-[2px] flex items-center gap-2.5 ${
              detail.statusClass === "done" ? "text-[var(--s-green)]" :
              detail.statusClass === "active" ? "text-[var(--s-text-muted)]" : "text-[var(--s-text-muted)]"
            }`}
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            <span className={`w-2 h-2 ${
              detail.statusClass === "done" ? "bg-[var(--s-green)]" :
              detail.statusClass === "active" ? "bg-[var(--s-orange)]" : "bg-[var(--s-text-muted)]"
            }`} />
            {detail.statusLabel}
          </div>
          <h3 className="text-[32px] font-bold tracking-[-0.5px] leading-[1.2] text-[var(--s-text)]">{detail.name}</h3>
          <p className="text-[15px] text-[var(--s-text-secondary)] leading-[1.75] max-w-[580px]">{detail.description}</p>
          <div className="text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{detail.dateRange}</div>
          <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
            {detail.metaItems.map((item, i) => (
              <div key={i} className="bg-[var(--s-bg)] px-5 py-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.5px]"
                style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                <span className={`text-xl font-bold tracking-[-0.5px] ${item.accent ? "text-[var(--s-orange)]" : "text-[var(--s-text)]"}`}
                  style={{ fontFamily: "sans-serif" }}>{item.value}</span>
                {item.label}
              </div>
            ))}
          </div>

        </div>

        {/* 右列：表任务列表（紧凑模式） */}
        <div className="px-16 py-12 flex flex-col gap-5">
          <div className="mb-1"
            style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
            {phaseTables.length > 0 ? "任务清单 TASKS" : "阶段任务"}
          </div>

          {phaseTables.length > 0 ? (
            <div className="flex flex-col gap-px" style={{ backgroundColor: "var(--s-border)" }}>
              {phaseTables.map((def) => (
                <div key={def.table_code}
                  onClick={() => handleTableClick(def.table_code)}
                  className={`bg-[var(--s-bg)] px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all border-l-[3px] ${
                    expandedTable === def.table_code ? "border-l-[var(--s-blue)] bg-[rgba(28,126,214,.04)] text-[var(--s-blue)]" : "border-l-transparent"
                  } hover:bg-[rgba(28,126,214,.06)] hover:border-l-[var(--s-blue)]`}
                >
                  <div className="flex items-center gap-2.5 text-[13px] text-[var(--s-text-secondary)]">
                    <span className="w-1.5 h-1.5 flex-shrink-0 bg-[var(--s-green)]" />
                    {def.table_name}
                    {def.allow_add === false && (
                      <span className="text-[9px] px-1 border border-[var(--s-red)] text-[var(--s-red)]">不可添加</span>
                    )}
                    {def.allow_delete === false && (
                      <span className="text-[9px] px-1 border border-[var(--s-orange)] text-[var(--s-orange)]">不可删除</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--s-text-muted)] mt-4">
              暂无关联数据表。在「规范管理」中将表的适用范围勾选当前阶段即可显示。
            </div>
          )}
        </div>
      </div>

      {/* 整行展开：表数据详情 — 参考 index-v54.html TaskExpanded 布局 */}
      {expandedTable && expandedDef && (
        <div style={{ borderTop: "1px solid var(--s-border)" }}>
          {loadingTable === expandedTable ? (
            <div className="px-16 py-8 text-xs text-[var(--s-text-muted)]">加载中...</div>
          ) : tableRecords[expandedTable]?.length > 0 ? (
            <div className="px-16 py-8">
              {/* ── 头部：表名 + 状态 + 记录数 ── */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="text-[22px] font-bold tracking-[-0.3px] text-[var(--s-text)]">
                    {expandedDef.table_name}
                  </span>
                  <span className={`text-[10px] px-3.5 py-1.5 uppercase tracking-[0.5px] font-semibold border border-[var(--s-border-light)] text-[var(--s-text-muted)]`}
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {tableRecords[expandedTable].length} 条
                  </span>
                  {expandedDef.allow_add !== false && (
                    <button onClick={() => addRow(expandedTable)}
                      className="text-[10px] px-2.5 py-1.5 border border-[var(--s-green)] text-[var(--s-green)] bg-transparent cursor-pointer hover:bg-[rgba(43,138,62,.06)] uppercase tracking-[0.5px] font-semibold"
                      style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      + 添加
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setTaskViewMode((prev) => ({ ...prev, [expandedTable]: prev[expandedTable] === "table" ? "card" : "table" }))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-transparent border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer hover:bg-[var(--s-surface2)]"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    {taskViewMode[expandedTable] === "table" ? "切换表格视图" : "切换卡片视图"}
                  </button>
                  <button onClick={() => {
                    const cols = visibleColumns.map((c) => c.name);
                    const BOM = "﻿"; let csv = BOM + cols.join(",") + "\n";
                    tableRecords[expandedTable].forEach((row) => { csv += cols.map((c) => `"${String(row[c] ?? "").replace(/"/g,'""')}"`).join(",") + "\n"; });
                    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
                    const url = URL.createObjectURL(blob); const a = document.createElement("a");
                    a.href = url; a.download = `${expandedDef.table_name}.csv`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                  }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-transparent border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer hover:bg-[var(--s-surface2)]"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    导出 Excel
                  </button>
                </div>
              </div>

              {/* ── 摘要卡片 ── */}
              {/* ── 摘要卡片 ── */}
              <div className="grid gap-px mb-5" style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                backgroundColor: "var(--s-border)",
              }}>
                <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>步骤总数</span>
                  <span className="text-2xl font-black tracking-[-1px]" style={{ color: "var(--s-text)", fontFamily: "var(--font-mono, monospace)" }}>{tableRecords[expandedTable].length}</span>
                </div>
                <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>进度</span>
                  <span className="text-2xl font-black tracking-[-1px]" style={{ color: progressPercent === 100 ? "#22c55e" : "#d9480f", fontFamily: "var(--font-mono, monospace)" }}>
                    {progressPercent !== null ? `${progressPercent}%` : "—"}
                  </span>
                </div>
                {/* 动态汇总卡：从 stage_summary_fields 读取 */}
                {summaryFields.filter((s) => !s.hide || true).map((sf) => (
                  <div key={sf.column} className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>{sf.column}</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--s-text)" }}>
                      {[...new Set(tableRecords[expandedTable].map((r) => String(r[sf.column] || "—")))].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── 任务概述（始终显示所有记录该列的拼接） ── */}
              {expandedDef.stage_desc_column && (
                <div className="px-5 py-4 mb-5 flex flex-col gap-1.5" style={{ backgroundColor: "var(--s-bg)", borderLeft: "2px solid var(--s-orange)" }}>
                  <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>任务概述</span>
                  <span className="text-sm leading-relaxed" style={{ color: "#22c55e", fontWeight: 600 }}>
                    {tableRecords[expandedTable].map((r) => String(r[expandedDef.stage_desc_column!] || "")).filter(Boolean).join("；") || "—"}
                  </span>
                </div>
              )}

              {/* ── 卡片视图 (V27) ── */}
              {taskViewMode[expandedTable] !== "table" && (
                <>
                  {/* 步骤明细表 */}
                  <div className="td-steps-section">
                    <div className="flex items-center justify-between cursor-pointer py-3"
                      onClick={() => setTaskViewMode((prev) => ({ ...prev, [expandedTable]: "table" }))}>
                      <span className="text-[11px] font-bold text-[var(--s-text-secondary)] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        步骤明细 · {tableRecords[expandedTable].length} 条
                      </span>
                      <span className="text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>▼ 展开</span>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                            style={{ fontFamily: "var(--font-mono, monospace)" }}>#</th>
                          {visibleColumns.map((col) => (
                            <th key={col.name} className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                              style={{ fontFamily: "var(--font-mono, monospace)" }}>{col.name}</th>
                          ))}
                          {expandedDef.allow_delete !== false && <th className="w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRecords[expandedTable].map((row: Record<string, unknown>, ri: number) => (
                          <tr key={ri} onClick={() => handleRecordClick(expandedTable, ri)}
                            className={`cursor-pointer hover:bg-[var(--s-surface)] border-b border-[var(--s-border)] ${
                              selectedRecord?.tableCode === expandedTable && selectedRecord?.rowIdx === ri ? "bg-[rgba(28,126,214,.04)]" : ""}`}>
                            <td className="px-4 py-3 text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{ri + 1}</td>
                            {visibleColumns.map((col) => (
                              <td key={col.name} className="px-4 py-3 text-xs">{renderCell(expandedTable, ri, col, row)}</td>
                            ))}
                            {expandedDef.allow_delete !== false && (
                              <td className="px-2 py-3">{!row._readonly && (
                                <button onClick={(e) => { e.stopPropagation(); if (confirm("确定删除？")) deleteRow(expandedTable, ri); }}
                                  className="text-[10px] text-[var(--s-red)] hover:underline">删除</button>
                              )}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── 表格视图 (V28) ── */}
              {taskViewMode[expandedTable] === "table" && (
                <div>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                          style={{ fontFamily: "var(--font-mono, monospace)" }}>{expandedDef.table_name}</th>
                        {visibleColumns.map((col) => (
                          <th key={col.name} className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                            style={{ fontFamily: "var(--font-mono, monospace)" }}>{col.name}</th>
                        ))}
                        <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRecords[expandedTable].map((row: Record<string, unknown>, ri: number) => (
                        <tr key={ri} onClick={() => handleRecordClick(expandedTable, ri)}
                          className={`cursor-pointer hover:bg-[var(--s-surface)] border-b border-[var(--s-border)] ${
                            selectedRecord?.tableCode === expandedTable && selectedRecord?.rowIdx === ri ? "bg-[rgba(28,126,214,.04)] border-l-2 border-l-[var(--s-blue)]" : ""}`}>
                          <td className="px-4 py-3 text-xs font-semibold text-[var(--s-text)]">{ri === 0 ? expandedDef.table_name : ""}</td>
                          {visibleColumns.map((col) => (
                            <td key={col.name} className={`px-4 py-3 text-xs truncate max-w-[200px]`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isColumnEditable(col, row)) startEdit(expandedTable, ri, col.name, String(row[col.name] ?? ""));
                              }}>
                              {editingCell?.tableCode === expandedTable && editingCell?.rowIdx === ri && editingCell?.colName === col.name
                                ? <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); }}
                                    onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
                                    className="w-full px-1 py-0.5 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] outline-none"
                                    autoFocus onClick={(e) => e.stopPropagation()} />
                                : <span className={isColumnEditable(col, row) ? "cursor-pointer" : ""}
                                    style={{ color: "var(--s-text)", backgroundColor: isColumnEditable(col, row) ? "transparent" : "#fef9e7" }}>
                                    {String(row[col.name] ?? "—").slice(0, 28)}{String(row[col.name] ?? "").length > 28 ? "…" : ""}
                                  </span>
                              }
                            </td>
                          ))}
                          <td className="px-4 py-3 text-[10px] text-[var(--s-text-muted)]">▶</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* V28 行详情面板 */}
                  {selectedRecord?.tableCode === expandedTable && selectedRecord.rowIdx != null && (
                    <div className="mt-2 bg-[var(--s-surface)] border border-[var(--s-border)] p-6">
                      <div className="grid grid-cols-2 gap-4">
                        {visibleColumns.map((col) => (
                          <div key={col.name} className={`flex flex-col gap-1.5 ${visibleColumns.length === 1 ? "col-span-2" : ""}`}>
                            <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{col.name}</span>
                            <span className="text-sm text-[var(--s-text)]">{String(tableRecords[expandedTable][selectedRecord.rowIdx][col.name] || "—")}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-[var(--s-border-light)] text-[10px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        第 {selectedRecord.rowIdx + 1} 条 · {expandedDef.table_name}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 收起按钮 */}
              <div className="mt-4 pt-4 border-t border-[var(--s-border)]">
                <button onClick={() => { setExpandedTable(null); setSelectedRecord(null); }}
                  className="text-[10px] text-[var(--s-text-muted)] hover:text-[var(--s-orange)] cursor-pointer uppercase tracking-[1px]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}>▲ 收起详情</button>
              </div>
            </div>
          ) : (
            <div className="px-16 py-8 text-xs text-[var(--s-text-muted)] flex items-center justify-between">
              <span>暂无数据</span>
              <button onClick={() => { setExpandedTable(null); setSelectedRecord(null); }}
                className="text-[10px] text-[var(--s-text-muted)] hover:text-[var(--s-orange)] cursor-pointer uppercase tracking-[1px]"
                style={{ fontFamily: "var(--font-mono, monospace)" }}>▲ 收起</button>
            </div>
          )}
        </div>
      )}
      {/* 隐藏文件上传输入框 */}
      <input type="file" ref={fileInputRef} className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
