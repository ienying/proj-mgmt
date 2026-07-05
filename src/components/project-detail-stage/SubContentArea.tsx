"use client";

import type { SubContentEntry } from "./types";

interface SubContentAreaProps {
  data: SubContentEntry | null;
  label: string;
  onBack: () => void;
}

export function SubContentArea({ data, label, onBack }: SubContentAreaProps) {
  if (!data) {
    return (
      <div className="fixed inset-0 z-37 flex items-center justify-center bg-[var(--s-bg)]">
        <div className="text-center">
          <p className="text-sm text-[var(--s-text-secondary)] mb-4">内容建设中: {label}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[1px] border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer transition-all hover:bg-[var(--s-surface)] hover:text-[var(--s-orange)] hover:border-[var(--s-orange)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            ← 返回项目主页
          </button>
        </div>
      </div>
    );
  }

  const total = data.rows.length;
  const confirmed = data.rows.filter((r) => r.status === "已确认").length;
  const highCount = data.rows.filter((r) => r.priority === "高").length;

  return (
    <div className="fixed inset-0 z-37 overflow-y-auto bg-[var(--s-bg)]">
      {/* Hero */}
      <div className="px-16 pt-12 pb-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[1px] border border-[var(--s-border)] text-[var(--s-text-secondary)] cursor-pointer transition-all hover:bg-[var(--s-surface)] hover:text-[var(--s-orange)] hover:border-[var(--s-orange)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            ← 返回项目主页
          </button>
          <span
            className="text-[9px] uppercase tracking-[2px] text-[var(--s-orange)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            {data.section}
          </span>
        </div>
        <h2 className="text-4xl font-bold text-[var(--s-text)] tracking-[-0.5px] mb-2">{label}</h2>
        <p className="text-[13px] text-[var(--s-text-secondary)] mb-6">项目需求登记与跟踪管理</p>

        {/* 统计卡片 */}
        <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span
              className="text-[32px] font-bold text-[var(--s-text)] leading-none"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
              需求总数
            </span>
          </div>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "var(--s-green)", fontFamily: "var(--font-mono, monospace)" }}
            >
              {confirmed}
            </span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
              已确认
            </span>
          </div>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)" }}
            >
              {highCount}
            </span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
              高优先级
            </span>
          </div>
          <div className="flex-1 bg-[var(--s-bg)] p-5 flex flex-col gap-1.5">
            <span
              className="text-[32px] font-bold text-[var(--s-text)] leading-none"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {total - confirmed}
            </span>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
              待处理
            </span>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="px-16 py-6">
        <div
          className="text-[9px] uppercase tracking-[1.5px] mb-3.5 flex items-center gap-2"
          style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
        >
          <span className="w-4 h-px bg-[var(--s-orange)]" />
          需求明细列表
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["编号", "需求名称", "优先级", "状态", "负责人", "日期", "需求描述"].map((h) => (
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
            {data.rows.map((r) => {
              const pc = r.priority === "高" ? "high" : r.priority === "中" ? "medium" : "low";
              const sc = r.status === "已确认" ? "done" : r.status === "评审中" ? "active" : "pending";
              const sl = r.status === "已确认" ? "已完成" : r.status === "评审中" ? "进行中" : "待开始";
              return (
                <tr key={r.id} className="hover:bg-[var(--s-surface)]">
                  <td
                    className="px-4 py-3 text-[11px] border-b border-[var(--s-border)]"
                    style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {r.id}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-[var(--s-text)] border-b border-[var(--s-border)]">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-xs border-b border-[var(--s-border)]">
                    <span
                      className={`text-[10px] px-2 py-0.5 uppercase tracking-[0.5px] ${
                        pc === "high"
                          ? "border border-[var(--s-red)] text-[var(--s-red)]"
                          : pc === "medium"
                          ? "border border-[var(--s-orange)] text-[var(--s-orange)]"
                          : "border border-[var(--s-text-muted)] text-[var(--s-text-muted)]"
                      }`}
                      style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs border-b border-[var(--s-border)]">
                    <span
                      className={`text-[10px] px-2 py-0.5 ${
                        sc === "done"
                          ? "text-[var(--s-green)] border border-[var(--s-green)]"
                          : sc === "active"
                          ? "text-[var(--s-orange)] border border-[var(--s-orange)]"
                          : "text-[var(--s-text-muted)] border border-[var(--s-text-muted)]"
                      }`}
                    >
                      {sl}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--s-text)] border-b border-[var(--s-border)]">{r.owner}</td>
                  <td
                    className="px-4 py-3 text-[11px] text-[var(--s-text)] border-b border-[var(--s-border)]"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {r.date}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--s-text)] leading-relaxed border-b border-[var(--s-border)]">{r.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
