"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { taskData } from "./mock-data";
import type { TaskStep } from "./types";

interface TaskExpandedProps {
  taskKey: string;
  onClose: () => void;
}

interface VisibleFields {
  stepCount: boolean;
  role: boolean;
  desc: boolean;
}

export function TaskExpanded({ taskKey, onClose }: TaskExpandedProps) {
  const data = taskData[taskKey];
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [visibleFields, setVisibleFields] = useState<VisibleFields>({
    stepCount: true,
    role: true,
    desc: true,
  });
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const configRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭设置下拉
  useEffect(() => {
    if (!configOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        configRef.current &&
        !configRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setConfigOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 50);
    return () => document.removeEventListener("click", handler);
  }, [configOpen]);

  const handleExport = useCallback(() => {
    if (!data) return;
    const BOM = "﻿";
    let csv = BOM + "任务名称,步骤说明,步骤输入,步骤输出,执行角色,状态\n";
    data.rows.forEach((r, i) => {
      csv += `"${i === 0 ? data.name : ""}","${r.desc}","${r.input}","${r.output}","${r.role}","${r.label}"\n`;
    });
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name}_任务明细.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  if (!data) return null;

  const totalSteps = data.rows.length;
  const doneSteps = data.rows.filter((r) => r.status === "done").length;
  const activeSteps = data.rows.filter((r) => r.status === "active").length;
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  const statusClass = data.rows.some((r) => r.status === "active")
    ? "active"
    : doneSteps === totalSteps
    ? "done"
    : "pending";
  const statusLabel =
    statusClass === "done" ? "已完成" : statusClass === "active" ? "进行中" : "待开始";

  const toggleField = (field: keyof VisibleFields) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const selectedRow = selectedRowIdx !== null ? data.rows[selectedRowIdx] : null;

  return (
    <div style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="px-16 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <span className="text-[22px] font-bold text-[var(--s-text)] tracking-[-0.3px]">
              {data.name}
            </span>
            <span
              className={`text-[10px] px-3.5 py-1.5 uppercase tracking-[0.5px] font-semibold ${
                statusClass === "done"
                  ? "border border-[var(--s-green)] text-[var(--s-green)]"
                  : statusClass === "active"
                  ? "border border-[var(--s-orange)] text-[var(--s-orange)]"
                  : "border border-[var(--s-border-light)] text-[var(--s-text-muted)]"
              }`}
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {statusLabel}
            </span>
            <span
              className="text-[10px] px-3.5 py-1.5 border border-[var(--s-border-light)] text-[var(--s-text-muted)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {doneSteps}/{totalSteps} 步
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-transparent border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer transition-all hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              {viewMode === "card" ? "切换表格视图" : "切换卡片视图"}
            </button>

            {/* 设置下拉 */}
            <div className="relative">
              <button
                ref={btnRef}
                onClick={() => setConfigOpen(!configOpen)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-transparent border cursor-pointer transition-all ${
                  configOpen
                    ? "bg-[rgba(232,89,12,.06)] border-[var(--s-orange)] text-[var(--s-orange)]"
                    : "border-[var(--s-border)] text-[var(--s-text-secondary)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
                }`}
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                设置
              </button>
              {configOpen && (
                <div
                  ref={configRef}
                  className="absolute top-full right-0 mt-1 bg-[var(--s-surface)] border border-[var(--s-border)] min-w-[180px] z-5 py-1"
                >
                  {[
                    { key: "stepCount" as const, label: "步骤统计" },
                    { key: "role" as const, label: "执行角色" },
                    { key: "desc" as const, label: "任务概述" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => toggleField(item.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 w-full text-left text-[11px] cursor-pointer transition-all hover:bg-[var(--s-surface2)] ${
                        visibleFields[item.key] ? "text-[var(--s-text-secondary)]" : "text-[var(--s-text-muted)]"
                      }`}
                      style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                      <span
                        className={`w-3.5 h-3.5 border border-[var(--s-border)] flex items-center justify-center text-[9px] transition-all ${
                          visibleFields[item.key]
                            ? "bg-[var(--s-orange)] border-[var(--s-orange)] text-white"
                            : "text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.5px] bg-transparent border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer transition-all hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出 Excel
            </button>
          </div>
        </div>

        {/* 卡片视图 */}
        {viewMode === "card" && (
          <>
            {/* 字段卡片 */}
            <div
              className="grid gap-px mb-5"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                backgroundColor: "var(--s-border)",
              }}
            >
              {visibleFields.stepCount && (
                <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    步骤总数
                  </span>
                  <span className="text-2xl font-bold text-[var(--s-text)] tracking-[-0.5px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {totalSteps}
                  </span>
                </div>
              )}
              {visibleFields.stepCount && (
                <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    进度
                  </span>
                  <span className="text-2xl font-bold tracking-[-0.5px] text-[var(--s-orange)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {progress}%
                  </span>
                </div>
              )}
              {visibleFields.role && (
                <div className="bg-[var(--s-bg)] px-5 py-5 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    执行角色
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--s-text-secondary)]">
                    {[...new Set(data.rows.map((r) => r.role))].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>

            {/* 概述 */}
            {visibleFields.desc && (
              <div className="bg-[var(--s-bg)] px-5 py-4 mb-5 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                  任务概述
                </span>
                <span className="text-[13px] text-[var(--s-text-secondary)] leading-relaxed">
                  {data.rows.map((r) => r.desc).filter(Boolean).join("；")}
                </span>
              </div>
            )}

            {/* 步骤明细表 */}
            <div>
              <div
                className="flex items-center justify-between cursor-pointer py-3"
                onClick={() => setStepsExpanded(!stepsExpanded)}
              >
                <span
                  className="text-[11px] font-bold text-[var(--s-text-secondary)] uppercase tracking-[1px]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}
                >
                  步骤明细 · {totalSteps} 步
                </span>
                <span
                  className="text-[11px] text-[var(--s-text-muted)]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}
                >
                  {stepsExpanded ? "▲ 收起" : "▼ 展开"}
                </span>
              </div>
              {stepsExpanded && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["#", "步骤说明", "步骤输入", "步骤输出", "执行角色", "状态"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)]"
                          style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={i} className="hover:bg-[var(--s-surface)]">
                        <td
                          className="px-4 py-3 text-[11px] border-b border-[var(--s-border)]"
                          style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
                        >
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--s-text)] border-b border-[var(--s-border)]">{r.desc || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--s-text)] border-b border-[var(--s-border)]">{r.input || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--s-text)] border-b border-[var(--s-border)]">{r.output || "—"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--s-text)] border-b border-[var(--s-border)]">{r.role || "—"}</td>
                        <td className="px-4 py-3 text-sm border-b border-[var(--s-border)]">
                          <span
                            className={`text-[10px] px-2 py-0.5 ${
                              r.status === "done"
                                ? "text-[var(--s-green)] border border-[var(--s-green)]"
                                : r.status === "active"
                                ? "text-[var(--s-orange)] border border-[var(--s-orange)]"
                                : "text-[var(--s-text-muted)] border border-[var(--s-text-muted)]"
                            }`}
                          >
                            {r.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 表格视图 (V28) */}
        {viewMode === "table" && (
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["任务名称", "步骤说明", "步骤输入", "步骤输出", "执行角色", "状态", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-[11px] text-[10px] uppercase tracking-[1px] font-medium bg-[var(--s-surface)] border-b-2 border-[var(--s-border)]"
                      style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const truncate = (s: string, max = 28) => (s.length > max ? s.slice(0, max) + "…" : s);
                  return (
                    <tr
                      key={i}
                      data-idx={i}
                      onClick={() => setSelectedRowIdx(i)}
                      className={`cursor-pointer transition-all ${
                        selectedRowIdx === i
                          ? "bg-[rgba(28,126,214,.06)] border-l-2 border-l-[var(--s-blue)]"
                          : "hover:bg-[var(--s-surface)]"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text)]">
                        {i === 0 ? <strong>{data.name}</strong> : ""}
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text)]" title={r.desc}>
                        {truncate(r.desc)}
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text)]">{truncate(r.input, 20)}</td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text)]">{truncate(r.output, 20)}</td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text)]">{r.role}</td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)]">
                        <span
                          className={`text-[10px] px-2 py-0.5 ${
                            r.status === "done"
                              ? "text-[var(--s-green)] border border-[var(--s-green)]"
                              : r.status === "active"
                              ? "text-[var(--s-orange)] border border-[var(--s-orange)]"
                              : "text-[var(--s-text-muted)] border border-[var(--s-text-muted)]"
                          }`}
                        >
                          {r.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm border-b border-[var(--s-border)] text-[var(--s-text-muted)]">▶</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 行详情面板 */}
            {selectedRow && (
              <div className="mt-4 bg-[var(--s-surface)] border border-[var(--s-border)] p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      步骤说明
                    </span>
                    <span className="text-sm text-[var(--s-text)]">{selectedRow.desc}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      输入
                    </span>
                    <span className="text-sm text-[var(--s-text)]">{selectedRow.input || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      输出
                    </span>
                    <span className="text-sm text-[var(--s-text)]">{selectedRow.output || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      执行角色
                    </span>
                    <span className="text-sm text-[var(--s-text)]">{selectedRow.role}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[1px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      状态
                    </span>
                    <span
                      className={`text-sm ${
                        selectedRow.status === "done"
                          ? "text-[var(--s-green)]"
                          : selectedRow.status === "active"
                          ? "text-[var(--s-orange)]"
                          : "text-[var(--s-text-muted)]"
                      }`}
                    >
                      {selectedRow.label}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--s-border)" }}>
          <button
            onClick={onClose}
            className="text-[10px] text-[var(--s-text-muted)] hover:text-[var(--s-orange)] cursor-pointer transition-colors uppercase tracking-[1px]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            ▲ 收起详情
          </button>
        </div>
      </div>
    </div>
  );
}
