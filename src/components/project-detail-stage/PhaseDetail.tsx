"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { toast } from "sonner";

// Docx/PPTX 客户端预览组件（使用 CDN 加载 mammoth.js）
function DocxPreview({ src, fn }: { src: string; fn: string }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ext = fn.split(".").pop()?.toLowerCase();
    if (ext === "pptx") {
      setError("PPTX 预览暂不支持，请下载查看");
      setLoading(false);
      return;
    }
    // 加载 mammoth.js CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js";
    script.onload = async () => {
      try {
        const res = await fetch(src);
        const buffer = await res.arrayBuffer();
        const result = await (window as any).mammoth.convertToHtml({ arrayBuffer: buffer });
        setHtml(result.value);
      } catch {
        setError("加载失败，请下载查看");
      }
      setLoading(false);
    };
    script.onerror = () => { setError("CDN加载失败，请下载查看"); setLoading(false); };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [src, fn]);

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">⏳ 加载中...</div>;
  if (error) return (
    <div className="text-center p-8">
      <p className="text-sm mb-3">{error}</p>
      <a href={src} target="_blank" className="px-4 py-2 text-xs bg-[var(--s-orange)] text-white rounded no-underline">下载查看</a>
    </div>
  );
  return <div className="p-4 h-full overflow-auto bg-white" dangerouslySetInnerHTML={{ __html: html }} />;
}

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
  stage_plan_start_col?: string;
  stage_plan_end_col?: string;
  stage_actual_start_col?: string;
  stage_actual_end_col?: string;
  allow_add?: boolean;
  allow_delete?: boolean;
  readonly_mode?: string;
  enable_drawer_form?: boolean;
  columns_config?: Array<{ name: string; type: string; readonly?: boolean; options?: string[]; display_mode?: string; data_source?: string; allow_custom?: boolean; calc_left_col?: string; calc_operator?: string; calc_right_col?: string; calc_sum?: boolean }>;
}

interface PhaseDetailProps {
  phaseKey: string;
  stageCode?: string;
  tableDefs?: TableDef[];
  projectSchema?: string;
  projectStages?: { code: string; name: string; detail_description?: string; sort_order?: number }[];
  currentStageCode?: string;
  onRecordsUpdate?: (tableCode: string, records: Array<Record<string, unknown>>) => void;
  onDataChange?: () => void;
  userName?: string;
  canEdit?: boolean;
  isDark?: boolean;
}

export function PhaseDetail({ phaseKey, stageCode, tableDefs = [], projectSchema, projectStages = [], currentStageCode, onRecordsUpdate, onDataChange, userName, canEdit = false, isDark = false }: PhaseDetailProps) {
  const { token } = useAuth();
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableRecords, setTableRecords] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<{ tableCode: string; rowIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    tableCode: string; rowIdx: number; colName: string;
  } | null>(null);

  // 抽屉表单模式
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTableCode, setDrawerTableCode] = useState("");
  const [drawerRowIdx, setDrawerRowIdx] = useState(-1);
  const [drawerEditing, setDrawerEditing] = useState(false);
  const [drawerEditData, setDrawerEditData] = useState<Record<string, string>>({});

  const openDrawer = (tableCode: string, rowIdx: number) => {
    setDrawerTableCode(tableCode);
    setDrawerRowIdx(rowIdx);
    setDrawerEditing(false);
    setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setDrawerEditing(false); };
  const [editValue, setEditValue] = useState("");
  const [dictCache, setDictCache] = useState<Record<string, string[]>>({});
  const [productModules, setProductModules] = useState<{ code: string; name: string }[]>([]);
  const [userList, setUserList] = useState<{ id: string; name: string }[]>([]);
  const [pmSearch, setPmSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [previewFile, setPreviewFile] = useState<{ key: string; name: string } | null>(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // 开始编辑单元格
  const PERM_DENIED_MSG = "没有编辑权限，仅超级管理员、项目创建人、项目经理和项目成员可编辑";

  const startEdit = (tableCode: string, rowIdx: number, colName: string, currentValue: string) => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
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
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          projectSchema,
          tableCode,
          rowId: row.id,
          data: { [colName]: valueToSave },
          user_name: userName || "",
        }),
      });
      if (res.ok) {
        const currentRecords = tableRecords[tableCode] || [];
        const updated = [...currentRecords];
        updated[rowIdx] = { ...updated[rowIdx], [colName]: valueToSave };
        setTableRecords((prev) => ({ ...prev, [tableCode]: updated }));
        onRecordsUpdate?.(tableCode, updated);
        onDataChange?.();
      }
    } catch {}
    setEditingCell(null);
  }, [editingCell, editValue, projectSchema, tableRecords, onDataChange, onRecordsUpdate]);

  // 添加行
  const addRow = async (tableCode: string) => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
    if (!projectSchema) return;
    const def = tableDefs.find(d => d.table_code === tableCode);
    if (def?.enable_drawer_form) {
      // 抽屉模式：打开空白表单
      setDrawerTableCode(tableCode);
      setDrawerRowIdx(-1);
      setDrawerEditing(true);
      const init: Record<string,string> = {};
      (def?.columns_config || []).forEach(c => { init[c.name] = ""; });
      setDrawerEditData(init);
      setDrawerOpen(true);
      return;
    }
    try {
      const initData: Record<string, unknown> = {};
      (def?.columns_config || []).forEach(c => {
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
        const data = await res.json();
        const currentRecords = tableRecords[tableCode] || [];
        const updated = [...currentRecords, data.data || data];
        setTableRecords((prev) => ({ ...prev, [tableCode]: updated }));
        onRecordsUpdate?.(tableCode, updated);
        onDataChange?.();
      }
    } catch {}
  };

  // 删除行
  const deleteRow = async (tableCode: string, rowIdx: number) => {
    if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
    if (!projectSchema) return;
    const row = tableRecords[tableCode]?.[rowIdx];
    if (!row?.id) return;
    try {
      const res = await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}&rowId=${row.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (res.ok) {
        const currentRecords = tableRecords[tableCode] || [];
        const updated = currentRecords.filter((_, i) => i !== rowIdx);
        setTableRecords((prev) => ({ ...prev, [tableCode]: updated }));
        onRecordsUpdate?.(tableCode, updated);
      }
    } catch {}
  };

  // 取消编辑
  const cancelEdit = () => setEditingCell(null);

  // 获取列的合并选项
  const getMergedOpts = (col: any) => {
    const src = (col.data_source && col.data_source !== "custom") ? (dictCache[col.data_source] || []) : [];
    const custom = col.options || [];
    if (src.length > 0) return col.allow_custom ? [...new Set([...src, ...custom])] : src;
    return custom;
  };
  // 预加载字典
  const preloadDict = async (col: any) => {
    if (!col.data_source || col.data_source === "custom" || dictCache[col.data_source]) return;
    const m: Record<string, string> = { project_types: "project_types", project_stages: "project_stages", project_statuses: "project_statuses", todo_statuses: "todo_statuses", customer_types: "customer_types", construction_units: "construction_units", member_role_types: "member_role_types", deployment_modes: "deployment_modes", departments: "departments", procurement_system: "product_module_types", procurement_project: "product_module_types" };
    const api = m[col.data_source]; if (!api) return;
    try { const r = await fetch(`/api/dicts?type=${api}`); const d = await r.json(); setDictCache((prev) => ({ ...prev, [col.data_source]: (d.data || []).map((i: any) => i.name || i.module_name || i.product_name || i.code) })); } catch {}
  };

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
      const fileName = uploadData.name || file.name || "file";
      const fileSize = uploadData.size || file.size || 0;
      if (!fileKey) { setUploadingCell(null); return; }

      // 支持多文件：已有值转数组并追加（兼容 JSONB 数组和旧字符串格式）
      const rawExisting = row[colName];
      let filesArray: Array<{ key: string; name: string; size: number }> = [];
      if (Array.isArray(rawExisting)) {
        // JSONB 列直接返回数组
        filesArray = rawExisting as Array<{ key: string; name: string; size: number }>;
      } else {
        const existingVal = String(rawExisting ?? "");
        try {
          const parsed = JSON.parse(existingVal);
          filesArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          // 旧格式：单个字符串 key，转为数组
          if (existingVal && existingVal.length > 5) {
            filesArray = [{ key: existingVal, name: existingVal.split("/").pop()?.replace(/^\d+_/, "") || "file", size: 0 }];
          }
        }
      }
      filesArray.push({ key: fileKey, name: fileName, size: fileSize });

      // 保存数组到数据库
      const saveBody = { projectSchema, tableCode, rowId: row.id, data: { [colName]: filesArray } };
      const saveRes = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(saveBody),
      });
      if (!saveRes.ok) {
        const errText = await saveRes.text();
        console.error("保存文件key失败", saveRes.status, errText);
        setUploadingCell(null);
        return;
      }

      const currentRecords = tableRecords[tableCode] || [];
      const updated = [...currentRecords];
      // 本地状态存储 JSON 字符串以保证兼容性（数据库存储为 JSONB 数组）
      updated[rowIdx] = { ...updated[rowIdx], [colName]: JSON.stringify(filesArray) };
      setTableRecords((prev) => ({ ...prev, [tableCode]: updated }));
      onRecordsUpdate?.(tableCode, updated);
      onDataChange?.();
    } catch (e) {
      console.error("上传异常:", e);
    }
    setUploadingCell(null);
  };

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
          // 预加载产品目录字典（用于 procurement_module 类型）
          if (productModules.length === 0) {
            fetch("/api/dicts?type=product_module_types")
              .then((r) => r.json())
              .then((d) => setProductModules((d.data || []).map((item: any) => ({ code: item.code, name: item.module_name || item.product_name || item.code }))))
              .catch(() => {});
          }
          if (userList.length === 0) {
            fetch("/api/users", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
              .then((r) => r.json())
              .then((d) => setUserList((d.data || d.users || []).map((u: any) => ({ id: u.id, name: u.name || u.username }))))
              .catch(() => {});
          }
          // 先同步引用数据
          await fetch("/api/project-data/sync-references", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ projectSchema }),
          }).catch(() => {});
          // 加载数据
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(tableCode)}`,
            { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
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
    const def = tableDefs.find(d => d.table_code === tableCode) || phaseTables.find(d => d.table_code === tableCode);
    if (def?.enable_drawer_form) {
      openDrawer(tableCode, rowIdx);
      return;
    }
    setSelectedRecord((prev) =>
      prev?.tableCode === tableCode && prev?.rowIdx === rowIdx ? null : { tableCode, rowIdx }
    );
  };

  // 筛选属于当前阶段 + 显示位置为 phase/both 的表
  const phaseTables = stageCode
    ? tableDefs.filter(
        (def) =>
          def.apply_project_stages?.includes(stageCode) &&
          (!def.stage_display_mode || def.stage_display_mode === "phase" || def.stage_display_mode === "both")
      )
    : [];

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

  // 判断列是否可编辑（遵循规范管理的只读配置：AND/OR 模式）
  const isColumnEditable = (col: { type: string; readonly?: boolean }, row?: Record<string, unknown>) => {
    if (!["text", "number", "date", "textarea", "select", "multiple_select", "procurement_module", "user"].includes(col.type)) return false;
    const colReadonly = col.readonly === true;
    const rowReadonly = row?._readonly === true;
    const isOrMode = expandedDef?.readonly_mode === "or";
    if (isOrMode) {
      // OR: 列只读 OR 行只读 → 锁定
      if (colReadonly || rowReadonly) return false;
    } else {
      // AND（默认）: 列只读 AND 行只读 → 锁定
      if (colReadonly && rowReadonly) return false;
    }
    return true;
  };

  // 渲染可编辑单元格
  const computeCalcRow = (col: any, row: Record<string, unknown>) => {
    if (!col.calc_left_col || !col.calc_right_col) return null;
    const l = Number(row[col.calc_left_col] ?? 0); const r = Number(row[col.calc_right_col] ?? 0);
    const op = col.calc_operator || "*"; // 运算符缺失时默认乘法
    return op === "-" ? (l - r) : op === "*" ? (l * r) : op === "/" ? (r ? l / r : 0) : (l + r);
  };

  const renderCell = (tableCode: string, rowIdx: number, col: any, row: Record<string, unknown>) => {
    const fmtDate = (v: string) => { const d = v.split(/[T ]/)[0]; return d || v; };
    if (col.type === "calc") {
      const r = computeCalcRow(col, row);
      return <span className="font-mono text-xs" style={{ color: "var(--s-text)" }}>{r !== null ? String(r) : "—"}</span>;
    }
    const rawValue = String(row[col.name] ?? "");
    const value = col.type === "date" && rawValue !== "—" ? fmtDate(rawValue) : rawValue;
    const isEditing = editingCell?.tableCode === tableCode && editingCell?.rowIdx === rowIdx && editingCell?.colName === col.name;
    const editable = isColumnEditable(col, row);

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {col.type === "select" || col.type === "multiple_select" ? (
            (() => {
              const mOpts = getMergedOpts(col);
              if (col.data_source && col.data_source !== "custom") preloadDict(col);
              if (mOpts.length === 0) return <span className="text-xs text-[var(--s-text-muted)]">无可用选项</span>;
              if (col.type === "select") return (
                <select value={editValue} onChange={(e) => { setEditValue(e.target.value); saveEdit(e.target.value); }}
                  className="px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none" autoFocus>
                  <option value="">请选择</option>
                  {mOpts.map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              );
              return (
                <div className="flex flex-wrap gap-1">
                  {mOpts.map((opt: string) => {
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
                          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [colName]: newVal } }),
                        }).then((r) => {
                          if (r.ok) { onDataChange?.(); setTableRecords((prev) => {
                            const updated = [...(prev[tableCode] || [])];
                            updated[rowIdx] = { ...updated[rowIdx], [colName]: newVal };
                            onRecordsUpdate?.(tableCode, updated);
                            return { ...prev, [tableCode]: updated };
                          }); }
                        });
                      }
                    }} className="w-3 h-3" />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            );
          })()
          ) : col.type === "procurement_module" ? (
            <div className="flex flex-col gap-1 w-full" style={{ minWidth: "150px" }}>
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
            <div className="flex flex-col gap-1 w-full" style={{ minWidth: "150px" }}>
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
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none resize-y min-h-[24px]"
              style={{ minWidth: "120px" }}
              autoFocus />
          ) : col.type === "number" ? (
            <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              style={{ minWidth: "100px" }}
              autoFocus />
          ) : col.type === "date" ? (
            <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              style={{ minWidth: "120px" }}
              autoFocus />
          ) : (
            <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") saveEdit((e.target as HTMLInputElement).value); }}
              onBlur={(e) => saveEdit((e.target as HTMLInputElement).value)}
              className="w-full px-2 py-1 text-xs border border-[var(--s-orange)] bg-[var(--s-surface)] text-[var(--s-text)] outline-none"
              style={{ minWidth: "120px" }}
              autoFocus />
          )}
        </div>
      );
    }

    // 附件/视频类型：支持多文件上传
    if (col.type === "attachment" || col.type === "video") {
      const rawValue = String(row[col.name] ?? "");
      const isUploading = uploadingCell?.tableCode === tableCode && uploadingCell?.rowIdx === rowIdx && uploadingCell?.colName === col.name;

      // 解析多文件数组（兼容旧单文件格式 + JSONB 直接返回的数组）
      let files: Array<{ key: string; name: string; size: number }> = [];
      if (Array.isArray(rawValue)) {
        // JSONB 列 PostgreSQL 驱动直接返回数组
        files = rawValue as unknown as Array<{ key: string; name: string; size: number }>;
      } else if (typeof rawValue === "string") {
        try {
          const parsed = JSON.parse(rawValue);
          files = Array.isArray(parsed) ? parsed : [];
        } catch {
          if (rawValue && rawValue.length > 5 && rawValue !== "undefined" && rawValue !== "null") {
            const fn = rawValue.split("/").pop()?.split("?")[0]?.replace(/^\d+_/, "") || "文件";
            files = [{ key: rawValue, name: fn, size: 0 }];
          }
        }
      }

      const saveFiles = (newFiles: typeof files) => {
        // 直接传数组对象，由后端自动转为 JSONB
        fetch("/api/project-data", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ projectSchema, tableCode, rowId: row.id, data: { [col.name]: newFiles.length > 0 ? newFiles : [] } }),
        }).then((r) => {
          if (r.ok) setTableRecords((prev) => {
            const val = JSON.stringify(newFiles);
            const updated = [...(prev[tableCode] || [])];
            updated[rowIdx] = { ...updated[rowIdx], [col.name]: val };
            return { ...prev, [tableCode]: updated };
          });
        });
      };

      return (
        <div className="flex flex-col gap-1 min-w-[60px]">
          {isUploading && <span className="text-[10px] text-muted-foreground">⏳ 上传中...</span>}
          {files.map((f, fi) => {
            const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(f.name);
            const isVid = /\.(mp4|webm|mov|avi|mkv)$/i.test(f.name) || col.type === "video";
            return (
              <div key={f.key || fi} className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); setPreviewFile({ key: f.key, name: f.name }); }}
                  className="text-[11px] text-blue-600 hover:underline truncate max-w-[120px] cursor-pointer bg-transparent border-none" title={f.name}>
                  {isImg ? "🖼 " : isVid ? "🎬 " : "📄 "}{f.name}
                </button>
                <button onClick={async (e) => { e.stopPropagation();
                  const res = await fetch(`/api/files/download?key=${encodeURIComponent(f.key)}`);
                  const data = await res.json();
                  if (data.url) window.open(data.url, "_blank");
                }} className="text-[10px] text-muted-foreground hover:text-primary" title="下载">⬇</button>
                <button onClick={(e) => { e.stopPropagation();
                  if (!confirm(`确定删除「${f.name}」？`)) return;
                  fetch(`/api/files/download?key=${encodeURIComponent(f.key)}`, { method: "DELETE" }).catch(() => {});
                  saveFiles(files.filter((_, i) => i !== fi));
                }} className="text-[10px] text-red-500 hover:text-red-700" title="删除">✕</button>
              </div>
            );
          })}
          <button onClick={(e) => {
            e.stopPropagation();
            uploadTargetRef.current = { tableCode, rowIdx, colName: col.name };
            fileInputRef.current?.click();
          }} className="text-[10px] cursor-pointer hover:text-primary text-muted-foreground self-start">
            {files.length > 0 ? `+ 添加 (${files.length})` : "📎 上传"}
          </button>
        </div>
      );
    }

    // 非编辑态的显示
    const renderEmpty = () => {
      if (editable) {
        return <span className="text-[var(--s-text-muted)] cursor-pointer" title="点击编辑">点击编辑</span>;
      }
      return <span className="text-[var(--s-text-muted)]">—</span>;
    };

    if (col.type === "select" || col.type === "multiple_select") {
      return (
        <span
          className={editable ? "cursor-pointer hover:bg-[var(--s-surface2)] px-1 -mx-1 rounded" : ""}
          style={{ color: "var(--s-text)" }}
          onClick={() => editable && startEdit(tableCode, rowIdx, col.name, value)}>
          {value || renderEmpty()}
        </span>
      );
    }

    return (
      <span
        className={editable ? "cursor-pointer hover:bg-[var(--s-surface2)] px-1 -mx-1 rounded" : ""}
        style={{ color: "var(--s-text)" }}
        onClick={() => editable && startEdit(tableCode, rowIdx, col.name, value)}
        title={editable ? "点击编辑" : "只读-该记录由管理员设置"}>
        {value || renderEmpty()}
      </span>
    );
  };

  // 根据 stageCode 从 projectStages 查找阶段信息，降级用 phaseKey 兼容
  const stageInfo = stageCode
    ? projectStages.find((s) => s.code === stageCode)
    : null;

  // 如果没有任何阶段数据，显示建设中
  if (!stageInfo && projectStages.length === 0 && phaseKey) {
    return (
      <div className="phase-section" style={{ borderBottom: "1px solid var(--s-border)" }}>
        <div className="px-16 py-12 text-center text-[var(--s-text-muted)] text-sm">
          暂无阶段数据
        </div>
      </div>
    );
  }

  // 阶段名称：优先取真实数据，降级显示
  const phaseName = stageInfo?.name || "";

  // 阶段描述
  const phaseDescription = stageInfo?.detail_description || "";

  // 状态：根据索引推算
  const currentIdx = currentStageCode
    ? projectStages.findIndex((s) => s.code === currentStageCode)
    : -1;
  const thisIdx = stageCode
    ? projectStages.findIndex((s) => s.code === stageCode)
    : -1;
  const statusLabel = thisIdx < currentIdx ? "已完成" : thisIdx === currentIdx ? "进行中" : "待开始";
  const statusClass = thisIdx < currentIdx ? "done" : thisIdx === currentIdx ? "active" : "pending";

  // 人力统计：遍历所有标记了 stage_role_column 的表
  const roleSet = new Set<string>();
  for (const def of phaseTables as TableDef[]) {
    const roleCol = (def as unknown as Record<string, unknown>).stage_role_column as string | undefined;
    if (!roleCol) continue;
    const records = tableRecords[def.table_code] || [];
    for (const row of records) {
      const v = row[roleCol];
      if (v && String(v).trim()) roleSet.add(String(v).trim());
    }
  }
  const manpower = roleSet.size;

  // meta items 数据
  const metaItems = [
    { value: String(phaseTables.length), label: "数据表" },
    { value: manpower > 0 ? `${manpower}人` : "-", label: "人力" },
  ];

  return (
    <div className="phase-section" style={{ borderBottom: "1px solid var(--s-border)" }}>
      {/* 两列布局：阶段信息 + 任务列表 */}
      <div className="grid grid-cols-2 min-h-[320px]">
        {/* 左列：阶段详情 */}
        <div className="px-16 py-12 flex flex-col gap-6" style={{ borderRight: "1px solid var(--s-border)" }}>
          <div
            className={`text-[10px] uppercase tracking-[2px] flex items-center gap-2.5 ${
              statusClass === "done" ? "text-[var(--s-green)]" :
              statusClass === "active" ? "text-[var(--s-text-muted)]" : "text-[var(--s-text-muted)]"
            }`}
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            <span className={`w-2 h-2 ${
              statusClass === "done" ? "bg-[var(--s-green)]" :
              statusClass === "active" ? "bg-[var(--s-orange)]" : "bg-[var(--s-text-muted)]"
            }`} />
            {statusLabel}
          </div>
          <h3 className="text-[32px] font-bold tracking-[-0.5px] leading-[1.2] text-[var(--s-text)]">{phaseName}</h3>
          {phaseDescription && (
            <p className="text-[15px] leading-[1.75] max-w-[580px]" style={{ color: isDark ? "#ffffff" : "#000000" }}>{phaseDescription}</p>
          )}
          {/* 动态日期（从表数据计算） */}
          {(() => {
            if (phaseTables.length === 0) return null;
            const fmt = (d: string) => { if (!d) return ""; const p = d.split(/[-T]/); return p.length >= 3 ? `${p[0]}.${p[1]}.${p[2]}` : d.slice(0, 10); };
            let planStart = "", planEnd = "", actualStart = "", actualEnd = "";
            for (const def of phaseTables) {
              if (!def.stage_plan_start_col && !def.stage_plan_end_col) continue;
              const records = tableRecords[def.table_code] || [];
              if (records.length === 0) continue;
              if (def.stage_plan_start_col) {
                const dates = records.map((r) => String(r[def.stage_plan_start_col!] || "")).filter(Boolean).sort();
                if (dates[0] && (!planStart || dates[0] < planStart)) planStart = dates[0];
              }
              if (def.stage_plan_end_col) {
                const dates = records.map((r) => String(r[def.stage_plan_end_col!] || "")).filter(Boolean).sort();
                if (dates[dates.length - 1] && (!planEnd || dates[dates.length - 1] > planEnd)) planEnd = dates[dates.length - 1];
              }
              if (def.stage_actual_start_col) {
                const dates = records.map((r) => String(r[def.stage_actual_start_col!] || "")).filter(Boolean).sort();
                if (dates[0] && (!actualStart || dates[0] < actualStart)) actualStart = dates[0];
              }
              if (def.stage_actual_end_col) {
                const dates = records.map((r) => String(r[def.stage_actual_end_col!] || "")).filter(Boolean).sort();
                if (dates[dates.length - 1] && (!actualEnd || dates[dates.length - 1] > actualEnd)) actualEnd = dates[dates.length - 1];
              }
            }
            if (!planStart && !planEnd) return null;
            const isDelay = actualEnd && planEnd && actualEnd > planEnd;
            return (
              <div className="flex flex-col gap-1 mt-1" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {(planStart || planEnd) && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--s-text-muted)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      计划
                    </span>
                    <span style={{ color: "var(--s-text)" }}>{fmt(planStart)} — {fmt(planEnd)}</span>
                    {planStart && planEnd && <span className="text-[10px]">({(() => { const d = (new Date(planEnd).getTime() - new Date(planStart).getTime()) / 86400000; return Math.round(d) + 1; })()}天)</span>}
                  </div>
                )}
                {(actualStart || actualEnd) && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: isDelay ? "var(--s-red)" : "var(--s-text-muted)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      实际
                    </span>
                    <span style={{ color: isDelay ? "var(--s-red)" : "var(--s-text)" }}>{fmt(actualStart)} — {fmt(actualEnd)}</span>
                    {actualStart && actualEnd && <span className="text-[10px]">({(() => { const d = (new Date(actualEnd).getTime() - new Date(actualStart).getTime()) / 86400000; return Math.round(d) + 1; })()}天)</span>}
                    {isDelay && planEnd && <span className="text-[10px]">⚠ 延期{(() => { const d = (new Date(actualEnd).getTime() - new Date(planEnd).getTime()) / 86400000; return Math.round(d); })()}天</span>}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
            {metaItems.map((item, i) => (
              <div key={i} className="bg-[var(--s-bg)] px-5 py-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.5px]"
                style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                <span className="text-xl font-bold tracking-[-0.5px] text-[var(--s-text)]"
                  style={{ fontFamily: "sans-serif" }}>{item.value}</span>
                {item.label}
              </div>
            ))}
          </div>

        </div>

        {/* 右列：表任务列表（紧凑模式） */}
        <div className="px-16 py-12 flex flex-col gap-5">
          <div className="mb-1"
            style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)", fontSize: "22px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
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
                  <div className="flex items-center gap-2.5 text-[13px]" style={{ color: isDark ? "#ffffff" : "#000000" }}>
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
                  {canEdit && expandedDef.allow_add !== false && (
                    <button onClick={() => addRow(expandedTable)}
                      className="text-[10px] px-2.5 py-1.5 border border-[var(--s-green)] text-[var(--s-green)] bg-transparent cursor-pointer hover:bg-[rgba(43,138,62,.06)] uppercase tracking-[0.5px] font-semibold"
                      style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      + 添加
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
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
                      {(() => {
                        const fmtDate = (v: string) => { const d = v.split(/[T ]/)[0]; return d || v; };
                        const vals = [...new Set(tableRecords[expandedTable].map((r) => {
                          const raw = r[sf.column];
                          if (!raw) return "—";
                          // 附件类型：提取文件名显示
                          try {
                            const arr = Array.isArray(raw) ? raw : JSON.parse(String(raw));
                            if (Array.isArray(arr) && arr.length > 0 && arr[0].name) {
                              return arr.map((f: any) => f.name || "文件").join("、");
                            }
                          } catch {}
                          const str = String(raw);
                          // 日期类型：只显示日期部分
                          if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return fmtDate(str);
                          return str;
                        }))].filter(Boolean);
                        return vals.join(" · ");
                      })()}
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

              {/* ── 卡片视图 ── */}
                  {/* 步骤明细表 */}
                  <div className="td-steps-section">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-[11px] font-bold text-[var(--s-text-secondary)] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        步骤明细 · {tableRecords[expandedTable].length} 条
                      </span>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)] whitespace-nowrap"
                            style={{ fontFamily: "var(--font-mono, monospace)" }}>#</th>
                          {visibleColumns.map((col) => (
                            <th key={col.name} className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)] text-[var(--s-text-muted)] whitespace-nowrap"
                              style={{ fontFamily: "var(--font-mono, monospace)", minWidth: "100px" }}>{col.name}</th>
                          ))}
                          {canEdit && expandedDef.allow_delete !== false && <th className="w-10 px-2 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)]"></th>}
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
                            {canEdit && expandedDef.allow_delete !== false && (
                              <td className="px-2 py-3">{!row._readonly && row.allow_delete !== false && (
                                <button onClick={(e) => { e.stopPropagation(); if (confirm("确定删除？")) deleteRow(expandedTable, ri); }}
                                  className="text-[10px] text-[var(--s-red)] hover:underline">删除</button>
                              )}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

      {/* 文件预览面板（右侧划出） */}
      {previewFile && (
        <div className={`fixed z-50 bg-[var(--s-surface)] border-l border-[var(--s-border)] flex flex-col transition-all duration-300 ${
          previewFullscreen ? "inset-0" : "top-0 right-0 w-[520px] h-screen"
        }`}>
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--s-border)]">
            <span className="text-sm font-bold text-[var(--s-text)] truncate">{previewFile.name}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => {
                const url = previewFile.key.startsWith("http") ? previewFile.key : `/api/files/download?key=${encodeURIComponent(previewFile.key)}`;
                window.open(url, "_blank");
              }}
                className="px-2.5 py-1 text-[11px] border border-[var(--s-border)] rounded hover:bg-muted"
                title="下载">下载</button>
              <button onClick={() => setPreviewFullscreen(!previewFullscreen)}
                className="px-2.5 py-1 text-[11px] border border-[var(--s-border)] rounded hover:bg-muted">
                {previewFullscreen ? "退出全屏" : "全屏"}
              </button>
              <button onClick={() => { setPreviewFile(null); setPreviewFullscreen(false); }}
                className="px-2 py-1 text-[13px] hover:text-[var(--s-red)]">✕</button>
            </div>
          </div>
          {/* 预览内容 */}
          <div className="flex-1 overflow-auto flex items-center justify-center bg-[var(--s-bg)] p-4">
            {(() => {
              const fn = previewFile.name;
              const src = previewFile.key.includes("://") ? previewFile.key : `/${previewFile.key}`;
              if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(fn)) {
                return <img src={src} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
              }
              if (/\.(mp4|webm|mov|avi|mkv)$/i.test(fn)) {
                return <video src={src} controls className="max-w-full max-h-full" />;
              }
              if (/\.(pdf)$/i.test(fn)) {
                return <iframe src={src} className="w-full h-full border-0" title="PDF" />;
              }
              if (/\.(xls|xlsx|csv|md|markdown|txt)$/i.test(fn)) {
                const previewUrl = previewFile.key.includes("://")
                  ? previewFile.key
                  : `/api/files/preview?key=${encodeURIComponent(previewFile.key)}`;
                return <iframe src={previewUrl} className="w-full h-full border-0 bg-white" title="预览" />;
              }
              if (/\.(docx|pptx)$/i.test(fn)) {
                // 客户端加载 mammoth.js 预览 docx，pptx 类似用 pptx2html
                return <DocxPreview src={src} fn={fn} />;
              }
              if (/\.(doc|ppt)$/i.test(fn)) {
                // 旧版 Office 格式不支持客户端渲染
                const dlUrl = previewFile.key.includes("://") ? previewFile.key : `/${previewFile.key}`;
                return (
                  <div className="text-center text-[var(--s-text-muted)] p-8">
                    <p className="text-4xl mb-3">📝</p>
                    <p className="text-sm text-[var(--s-text)] mb-2">{fn}</p>
                    <p className="text-xs mb-4">旧版格式(.doc/.ppt)不支持预览，请转换为 .docx/.pptx</p>
                    <a href={dlUrl} target="_blank" className="px-4 py-2 text-xs bg-[var(--s-orange)] text-white rounded hover:opacity-90 no-underline">下载</a>
                  </div>
                );
              }
              return (
                <div className="text-center text-[var(--s-text-muted)]">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-sm mb-2">{fn}</p>
                  <p className="text-xs mb-3">不支持在线预览</p>
                  <button onClick={() => { const url = previewFile.key.includes("://") ? previewFile.key : `/${previewFile.key}`; window.open(url, "_blank"); }}
                    className="text-xs text-blue-600 hover:underline">点击下载</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* 预览遮罩 */}
      {previewFile && !previewFullscreen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setPreviewFile(null)} />
      )}

      {/* ═══ 抽屉表单（enable_drawer_form 模式） ═══ */}
      {drawerOpen && (() => {
        const def = tableDefs.find(d => d.table_code === drawerTableCode);
        const records = tableRecords[drawerTableCode] || [];
        const record = records[drawerRowIdx] || {};
        const cols = def?.columns_config || [];
        const isNew = drawerRowIdx < 0;

        // 字段分行逻辑
        const fieldRows: Array<Array<typeof cols[0]>> = [];
        let i = 0;
        while (i < cols.length) {
          const c = cols[i];
          if (c.type === "textarea" || c.type === "attachment" || c.type === "video") {
            fieldRows.push([c]); i++;
          } else if (i + 1 < cols.length && cols[i+1].type !== "textarea" && cols[i+1].type !== "attachment" && cols[i+1].type !== "video") {
            fieldRows.push([c, cols[i+1]]); i += 2;
          } else {
            fieldRows.push([c]); i++;
          }
        }

        const handleDrawerSave = async () => {
          if (!projectSchema) { toast.error("无法保存：项目Schema未加载"); return; }
          if (!canEdit) { toast.error(PERM_DENIED_MSG); return; }
          const rowId = isNew ? null : record.id;
          try {
            const url = "/api/project-data";
            const method = isNew ? "POST" : "PUT";
            const body: Record<string, unknown> = isNew
              ? { projectSchema, tableCode: drawerTableCode, data: drawerEditData }
              : { projectSchema, tableCode: drawerTableCode, rowId, data: drawerEditData };
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
            if (res.ok) {
              const json = await res.json();
              const saved = json.data || drawerEditData;
              if (isNew) {
                const updated = [...records, saved];
                setTableRecords(prev => ({ ...prev, [drawerTableCode]: updated }));
                onRecordsUpdate?.(drawerTableCode, updated);
              } else {
                const updated = [...records];
                updated[drawerRowIdx] = { ...updated[drawerRowIdx], ...drawerEditData };
                setTableRecords(prev => ({ ...prev, [drawerTableCode]: updated }));
                onRecordsUpdate?.(drawerTableCode, updated);
              }
              onDataChange?.();
              toast.success(isNew ? "添加成功" : "保存成功");
              closeDrawer();
            } else {
              const errText = await res.text();
              let errMsg = errText;
              try { const parsed = JSON.parse(errText); errMsg = parsed.error || errText; } catch {}
              console.error("抽屉表单保存失败", res.status, errText);
              toast.error(`保存失败: ${errMsg}`);
            }
          } catch (e: any) {
            console.error("抽屉表单保存异常", e);
            toast.error(`保存异常: ${e?.message || "未知错误"}`);
          }
        };

        const handlePrint = () => {
          const w = window.open("", "_blank", "width=800,height=600");
          if (!w) return;
          let html = '<html><head><title>打印</title><style>table{width:100%;border-collapse:collapse;border:1px solid #555;font-family:sans-serif}td{border:1px solid #aaa;padding:8px;vertical-align:top}td:first-child{background:#f5f5f5;font-weight:600;width:100px;font-size:11px}</style></head><body><table>';
          fieldRows.forEach(row => {
            html += '<tr>';
            row.forEach(f => {
              const val = drawerEditing ? (drawerEditData[f.name] ?? "") : String(record[f.name] ?? "—");
              html += `<td>${f.name}</td><td>${val}</td>`;
            });
            html += '</tr>';
          });
          html += '</table></body></html>';
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 300);
        };

        const handleExportExcel = async () => {
          const rows: string[][] = [];
          fieldRows.forEach(row => {
            const r: string[] = [];
            row.forEach(f => {
              r.push(f.name);
              r.push(drawerEditing ? (drawerEditData[f.name] ?? "") : String(record[f.name] ?? "—"));
            });
            rows.push(r);
          });
          const csv = rows.map(r => r.map(c => `"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
          const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${def?.table_name || drawerTableCode}_记录.csv`;
          a.click();
        };

        // 解析附件/视频字段值：兼容 JSON 数组字符串、JSONB 直接返回的数组、以及旧版纯 key 字符串
        const parseFiles = (raw: unknown): Array<{ key: string; name: string; size: number }> => {
          if (!raw) return [];
          if (Array.isArray(raw)) {
            return (raw as Array<{ key: string; name: string; size: number }>).filter((f) => f && f.key);
          }
          const s = String(raw);
          if (!s || s === "—" || s === "undefined" || s === "null") return [];
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) {
              return (parsed as Array<{ key: string; name: string; size: number }>).filter((f) => f && f.key);
            }
          } catch {}
          const fn = s.split("/").pop()?.split("?")[0]?.replace(/^\d+_/, "") || "文件";
          return [{ key: s, name: fn, size: 0 }];
        };

        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={closeDrawer} style={{ transition: "opacity .25s" }} />
            <div className="fixed top-0 right-0 h-full z-55 flex flex-col" style={{ width: 820, maxWidth: "95vw", background: "var(--s-surface)", boxShadow: "-4px 0 24px rgba(0,0,0,.12)", transform: drawerOpen ? "translateX(0)" : "translateX(100%)", transition: "transform .3s" }}>
              {/* Header */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface2)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--s-text)", fontFamily: "var(--font-mono, monospace)" }}>
                  {isNew ? "新增记录" : "记录详情"}
                </span>
                <span className="text-[10px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                  {def?.table_name || drawerTableCode}{!isNew ? ` · 第 ${drawerRowIdx + 1} 条` : ""}
                </span>
                <div className="flex-1" />
                <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-border)", color: "var(--s-text-muted)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>🖨 打印</button>
                <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-border)", color: "var(--s-text-muted)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>📥 导出</button>
                <button onClick={closeDrawer} className="w-7 h-7 border flex items-center justify-center cursor-pointer flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface)", color: "var(--s-text-muted)" }}>✕</button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #555" }}>
                  <tbody>
                    {fieldRows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((f, fi) => {
                          const val = drawerEditing ? (drawerEditData[f.name] ?? "") : String(record[f.name] ?? "—");
                          const colSpan = row.length === 1 ? 4 : 2;
                          return (
                            <React.Fragment key={f.name}>
                              <td style={{ border: "1px solid #aaa", padding: "8px 10px", verticalAlign: "top", background: "#f5f5f5", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", width: 100, fontWeight: 600 }}>
                                {f.name}
                              </td>
                              <td style={{ border: "1px solid #aaa", padding: "8px 10px", verticalAlign: "top", fontSize: f.type === "textarea" ? 12 : 13, lineHeight: f.type === "textarea" ? 1.7 : 1.5, color: "var(--s-text)" }} colSpan={row.length === 1 ? 3 : 1}>
                                {f.type === "attachment" || f.type === "video" ? (
                                  drawerEditing && !f.readonly ? (
                                    <div>
                                      <input type="file" onChange={async (e) => {
                                        const file = e.target.files?.[0]; if (!file || !projectSchema) return;
                                        const fd = new FormData(); fd.append("file", file); fd.append("fileType", f.type); fd.append("projectCode", projectSchema);
                                        try { const res = await fetch("/api/files/upload", { method: "POST", body: fd }); const d = await res.json(); if (d.key) setDrawerEditData(prev => ({ ...prev, [f.name]: d.key })); } catch {}
                                      }} className="text-[11px]" />
                                      {val && <span className="text-[11px] ml-2" style={{ color: "var(--s-text-muted)" }}>当前: {parseFiles(val).map((fl) => fl.name).join("、") || val}</span>}
                                    </div>
                                  ) : (() => {
                                    const files = parseFiles(record[f.name]);
                                    return files.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {files.map((file, fi) => (
                                          <a key={file.key || fi} href={`/api/files/download?key=${encodeURIComponent(file.key)}`} target="_blank"
                                            className="inline-flex items-center gap-1 text-[11px]" style={{ color: "var(--s-blue)", cursor: "pointer", textDecoration: "none" }}
                                            onClick={(e) => { e.preventDefault(); fetch(`/api/files/download?key=${encodeURIComponent(file.key)}`).then(r=>r.json()).then(json=>{ if(json.url) window.open(json.url,"_blank"); }).catch(()=>{}); }}>
                                            📎 {file.name || (file.key.split("/").pop()?.replace(/^\d+_/, "") || file.key)}
                                          </a>
                                        ))}
                                      </div>
                                    ) : "—";
                                  })()
                                ) : drawerEditing && !f.readonly ? (
                                  f.type === "textarea" ? (
                                    <textarea value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                      className="w-full border-none outline-none resize-y text-[13px] font-sans" style={{ minHeight: 60, color: "var(--s-text)", background: "transparent" }} />
                                  ) : f.type === "select" && f.options?.length ? (
                                    <select value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                      className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }}>
                                      <option value="">—</option>
                                      {f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  ) : f.type === "date" ? (
                                    <input type="date" value={val?.slice(0,10) || ""} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                      className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }} />
                                  ) : (
                                    <input type="text" value={val} onChange={e => setDrawerEditData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                      className="w-full border-none outline-none text-[13px] font-sans" style={{ color: "var(--s-text)", background: "transparent" }} />
                                  )
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

              {/* Footer */}
              <div className="flex items-center gap-2 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: "var(--s-border)", background: "var(--s-surface2)" }}>
                <span className="text-[9px] px-2 py-0.5 font-semibold uppercase font-mono" style={{ border: drawerEditing ? "1px solid var(--s-orange)" : "1px solid var(--s-border)", color: drawerEditing ? "var(--s-orange)" : "var(--s-text-muted)" }}>
                  {drawerEditing ? "编辑" : "查看"}
                </span>
                <div className="flex-1" />
                {!drawerEditing ? (
                  <>
                    {canEdit && (
                      <button onClick={() => { setDrawerEditing(true); const init: Record<string,string> = {}; cols.forEach(c => { init[c.name] = String(record[c.name] ?? ""); }); setDrawerEditData(init); }}
                        className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-orange)", color: "var(--s-orange)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>编辑</button>
                    )}
                    <button onClick={async () => {
                      if (!projectSchema || !record.id) return;
                      await fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(drawerTableCode)}&rowId=${record.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                      const updated = records.filter((_,i) => i !== drawerRowIdx);
                      setTableRecords(prev => ({ ...prev, [drawerTableCode]: updated }));
                      onRecordsUpdate?.(drawerTableCode, updated);
                      onDataChange?.();
                      closeDrawer();
                    }} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] border cursor-pointer" style={{ borderColor: "var(--s-red)", color: "var(--s-red)", background: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}>删除</button>
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
