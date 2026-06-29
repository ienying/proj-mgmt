"use client";

import { useState, useCallback } from "react";
import { phaseDetails } from "./mock-data";

interface TableDef {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  apply_project_stages: string[];
  stage_desc_column?: string;
  stage_display_mode?: string;
  allow_add?: boolean;
  readonly_mode?: string;
  columns_config?: Array<{ name: string; type: string; readonly?: boolean }>;
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
  // 表格显示列：排除 stage_desc_column（它只在详情面板中显示）
  const visibleColumns = (expandedDef?.columns_config || []).filter(
    (col) => col.name !== expandedDef?.stage_desc_column
  );

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
          <div className="text-[10px] uppercase tracking-[2px] mb-1"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            {phaseTables.length > 0 ? "阶段数据表" : "阶段任务"}
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
                    📋 {def.table_name}
                    {def.allow_add === false && (
                      <span className="text-[9px] px-1 border border-[var(--s-red)] text-[var(--s-red)]">只读</span>
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
                  <span className="text-2xl font-black tracking-[-1px]" style={{ color: "#d9480f", fontFamily: "var(--font-mono, monospace)" }}>
                    {expandedDef.stage_desc_column && tableRecords[expandedTable].length > 0
                      ? `${Math.round((tableRecords[expandedTable].filter((r) => {
                          const v = r[expandedDef.stage_desc_column!];
                          return v && String(v).trim();
                        }).length / tableRecords[expandedTable].length) * 100)}%`
                      : "—"}
                  </span>
                </div>
                {visibleColumns.length > 1 && (
                  <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>执行角色</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--s-text)" }}>
                      {[...new Set(tableRecords[expandedTable].map((r) => String(r[visibleColumns[1].name] || "—")))].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
              </div>

              {/* ── 任务概述（始终显示所有记录该列的拼接） ── */}
              {expandedDef.stage_desc_column && (
                <div className="px-5 py-4 mb-5 flex flex-col gap-1.5" style={{ backgroundColor: "var(--s-bg)", borderLeft: "2px solid var(--s-orange)" }}>
                  <span className="text-[10px] uppercase tracking-[1px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>任务概述</span>
                  <span className="text-sm leading-relaxed" style={{ color: "var(--s-text)", fontWeight: 500 }}>
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
                        </tr>
                      </thead>
                      <tbody>
                        {tableRecords[expandedTable].map((row: Record<string, unknown>, ri: number) => (
                          <tr key={ri} onClick={() => handleRecordClick(expandedTable, ri)}
                            className={`cursor-pointer hover:bg-[var(--s-surface)] border-b border-[var(--s-border)] ${
                              selectedRecord?.tableCode === expandedTable && selectedRecord?.rowIdx === ri ? "bg-[rgba(28,126,214,.04)]" : ""}`}>
                            <td className="px-4 py-3 text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{ri + 1}</td>
                            {visibleColumns.map((col) => (
                              <td key={col.name} className="px-4 py-3 text-xs text-[var(--s-text)]">{String(row[col.name] ?? "—")}</td>
                            ))}
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
                            <td key={col.name} className={`px-4 py-3 text-xs truncate max-w-[200px] ${col.readonly || row._readonly ? "text-[var(--s-text-muted)]" : "text-[var(--s-text)]"}`}>
                              {String(row[col.name] ?? "—").slice(0, 28)}{String(row[col.name] ?? "").length > 28 ? "…" : ""}
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
    </div>
  );
}
