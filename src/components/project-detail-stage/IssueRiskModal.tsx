"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";

interface IssueRiskModalProps {
  open: boolean;
  onClose: () => void;
  projectSchema: string;
  projectName: string;
}

interface TableDefinition {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  columns_config?: Array<{ name: string; type: string; readonly?: boolean }>;
  allow_add?: boolean;
}

interface IssueRow {
  id: string;
  description: string;
  severity: string;
  status: string;
  assignee: string;
  createdAt: string;
  tableCode: string;
}

interface RiskRow {
  id: string;
  description: string;
  impact: string;
  probability: string;
  status: string;
  assignee: string;
  tableCode: string;
  allowAdd: boolean;
}

// ---------- helpers ----------

function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function fmtDate(raw: string): string {
  if (!raw || raw === "—") return "—";
  return raw.split(/[T ]/)[0];
}

interface BadgeStyle {
  bg: string;
  color: string;
}

function severityBadgeStyle(sev: string): BadgeStyle {
  const v = sev.toLowerCase();
  if (v.includes("高") || v.includes("严重") || v.includes("high") || v.includes("critical")) {
    return { bg: "rgba(220,38,38,.12)", color: "var(--s-red, #dc2626)" };
  }
  if (v.includes("中") || v.includes("medium")) {
    return { bg: "rgba(245,158,11,.12)", color: "#d97706" };
  }
  return { bg: "rgba(43,138,62,.12)", color: "var(--s-green, #2b8a3e)" };
}

function statusBadgeStyle(status: string): BadgeStyle {
  const v = status;
  if (
    v === "已解决" || v === "resolved" ||
    v === "已关闭" || v === "closed"
  ) {
    return { bg: "rgba(43,138,62,.12)", color: "var(--s-green, #2b8a3e)" };
  }
  if (v === "处理中" || v === "in_progress") {
    return { bg: "rgba(59,130,246,.12)", color: "var(--s-blue, #3b82f6)" };
  }
  return { bg: "rgba(220,38,38,.12)", color: "var(--s-red, #dc2626)" };
}

// ---------- base styles ----------

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalBoxStyle: React.CSSProperties = {
  background: "var(--s-surface)",
  border: "1px solid var(--s-border)",
  width: "90%",
  maxWidth: "1000px",
  maxHeight: "88vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 24px 48px rgba(0,0,0,.15)",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 24px",
  borderBottom: "1px solid var(--s-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "1px",
  color: "var(--s-text)",
  fontFamily: "var(--s-font-mono, monospace)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const closeBtnStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  border: "1px solid var(--s-border)",
  background: "var(--s-surface)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--s-text-muted)",
  fontSize: "16px",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
};

const tabsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "1px",
  background: "var(--s-border)",
  marginBottom: "20px",
};

const tabBtnBaseStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 500,
  textAlign: "center",
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  transition: "all 0.15s",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  border: "1px solid var(--s-border)",
};

const thStyle: React.CSSProperties = {
  background: "var(--s-surface2)",
  padding: "9px 12px",
  textAlign: "left",
  fontWeight: 600,
  color: "var(--s-text-muted)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontFamily: "var(--s-font-mono, monospace)",
  borderBottom: "2px solid var(--s-border)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderBottom: "1px solid var(--s-border-light, #e9ecef)",
  color: "var(--s-text-secondary)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "10px",
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: "3px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  fontFamily: "var(--s-font-mono, monospace)",
};

const hintStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--s-text-muted)",
  marginTop: "12px",
  padding: "10px 14px",
  background: "var(--s-bg, #f8f9fa)",
  border: "1px solid var(--s-border-light, #e9ecef)",
  lineHeight: "1.6",
};

// ---------- component ----------

export function IssueRiskModal({ open, onClose, projectSchema, projectName }: IssueRiskModalProps) {
  const [tableDefs, setTableDefs] = useState<TableDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);
  const [activeTab, setActiveTab] = useState<"issues" | "risks">("issues");

  // tab 1 — 问题
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // tab 2 — 风险
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loadingRisks, setLoadingRisks] = useState(false);

  // ---------- load table definitions ----------
  useEffect(() => {
    if (!open) return;
    setLoadingDefs(true);
    setActiveTab("issues");
    fetch("/api/standards")
      .then((r) => r.json())
      .then((data) => {
        setTableDefs((data.data || []) as TableDefinition[]);
      })
      .catch(() => {})
      .finally(() => setLoadingDefs(false));
  }, [open]);

  // ---------- detect matching tables (memoized) ----------
  const issueTables = useMemo(
    () => tableDefs.filter((def) => (def as any).show_in_issues === true),
    [tableDefs],
  );

  const riskTables = useMemo(
    () => tableDefs.filter((def) => (def as any).show_in_risks === true),
    [tableDefs],
  );

  // ---------- tab 1: fetch issues ----------
  useEffect(() => {
    if (!open || issueTables.length === 0 || !projectSchema) {
      setIssues([]);
      return;
    }
    setLoadingIssues(true);
    setIssues([]);

    (async () => {
      const rows: IssueRow[] = [];
      for (const def of issueTables) {
        let found = false;
        try {
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(def.table_code)}`,
          );
          const json = await res.json();
          const recs: Array<Record<string, unknown>> = json.data || [];
          for (const rec of recs) {
            found = true;
            const cols = def.columns_config || [];
            const descCol =
              cols.find((c) => c.name === "描述" || c.name === "description") || cols[0];
            const sevCol = cols.find((c) => c.name === "严重程度" || c.name === "severity");
            const statusCol = cols.find((c) => c.name === "状态" || c.name === "status");
            const assigneeCol = cols.find((c) => c.name === "责任人" || c.name === "assignee");
            const timeCol = cols.find((c) => c.name === "创建时间" || c.name === "created_at");

            rows.push({
              id: s(rec.id || rec._id || ""),
              description: s(descCol ? rec[descCol.name] : ""),
              severity: s(sevCol ? rec[sevCol.name] : ""),
              status: s(statusCol ? rec[statusCol.name] : ""),
              assignee: s(assigneeCol ? rec[assigneeCol.name] : ""),
              createdAt: s(timeCol ? rec[timeCol.name] : ""),
              tableCode: def.table_code,
            });
          }
        } catch { /* skip */ }
        if (!found) {
          rows.push({ id: `empty-${def.table_code}`, description: "", severity: "", status: "empty", assignee: "", createdAt: "", tableCode: def.table_code });
        }
      }
      setIssues(rows);
      setLoadingIssues(false);
    })();
  }, [open, issueTables, projectSchema]);

  // ---------- tab 2: fetch risks ----------
  useEffect(() => {
    if (!open || riskTables.length === 0 || !projectSchema) {
      setRisks([]);
      return;
    }
    setLoadingRisks(true);
    setRisks([]);

    (async () => {
      const rows: RiskRow[] = [];
      for (const def of riskTables) {
        let found = false;
        try {
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(def.table_code)}`,
          );
          const json = await res.json();
          const recs: Array<Record<string, unknown>> = json.data || [];
          for (const rec of recs) {
            const cols = def.columns_config || [];
            const descCol =
              cols.find(
                (c) =>
                  c.name === "描述" ||
                  c.name === "description" ||
                  c.name === "风险描述",
              ) || cols[0];
            const impactCol = cols.find(
              (c) =>
                c.name === "影响程度" ||
                c.name === "impact" ||
                c.name === "严重程度" ||
                c.name === "severity",
            );
            const probCol = cols.find(
              (c) =>
                c.name === "发生概率" ||
                c.name === "probability" ||
                c.name === "概率",
            );
            const statusCol = cols.find((c) => c.name === "状态" || c.name === "status");
            const assigneeCol = cols.find(
              (c) => c.name === "责任人" || c.name === "assignee" || c.name === "负责人",
            );

            rows.push({
              id: s(rec.id || rec._id || ""),
              description: s(descCol ? rec[descCol.name] : ""),
              impact: s(impactCol ? rec[impactCol.name] : ""),
              probability: s(probCol ? rec[probCol.name] : ""),
              status: s(statusCol ? rec[statusCol.name] : ""),
              assignee: s(assigneeCol ? rec[assigneeCol.name] : ""),
              tableCode: def.table_code,
              allowAdd: def.allow_add !== false,
            });
            found = true;
          }
        } catch { /* skip */ }
        if (!found) {
          rows.push({ id: `empty-${def.table_code}`, description: "", impact: "", probability: "", status: "empty", assignee: "", tableCode: def.table_code, allowAdd: false });
        }
      }
      setRisks(rows);
      setLoadingRisks(false);
    })();
  }, [open, riskTables, projectSchema]);

  // ---------- render ----------

  if (!open) return null;

  const loading = loadingDefs || (activeTab === "issues" ? loadingIssues : loadingRisks);
  const realIssueCount = issues.filter(i => i.status !== "empty").length;
  const realRiskCount = risks.filter(r => r.status !== "empty").length;
  const showIssueEmpty = activeTab === "issues" && !loadingIssues && issues.length === 0;
  const showRiskEmpty = activeTab === "risks" && !loadingRisks && risks.length === 0;

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalBoxStyle}>
        {/* ---------- header ---------- */}
        <div style={headerStyle}>
          <h2 style={headerTitleStyle}>
            ⚠ 问题/风险{projectName ? ` — ${projectName}` : ""}
          </h2>
          <button
            style={closeBtnStyle}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* ---------- body ---------- */}
        <div style={bodyStyle}>
          {/* ---- tabs ---- */}
          <div style={tabsRowStyle}>
            <button
              onClick={() => setActiveTab("issues")}
              style={{
                ...tabBtnBaseStyle,
                background: activeTab === "issues" ? "var(--s-surface)" : "var(--s-surface2)",
                color: activeTab === "issues" ? "var(--s-text)" : "var(--s-text-muted)",
                fontWeight: activeTab === "issues" ? 600 : 500,
              }}
            >
              ❗ 问题{!loadingIssues ? ` (${realIssueCount})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("risks")}
              style={{
                ...tabBtnBaseStyle,
                background: activeTab === "risks" ? "var(--s-surface)" : "var(--s-surface2)",
                color: activeTab === "risks" ? "var(--s-text)" : "var(--s-text-muted)",
                fontWeight: activeTab === "risks" ? 600 : 500,
              }}
            >
              ⚠ 风险{!loadingRisks ? ` (${realRiskCount})` : ""}
            </button>
          </div>

          {/* ---- loading ---- */}
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 0",
                fontSize: "13px",
                color: "var(--s-text-muted)",
              }}
            >
              加载中...
            </div>
          ) : (
            <>
              {/* ======== Tab: 问题 ======== */}
              {activeTab === "issues" &&
                (showIssueEmpty ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "48px 0",
                      gap: "12px",
                      fontSize: "13px",
                      color: "var(--s-text-muted)",
                    }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.4 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>暂无问题数据</span>
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {["序号", "问题描述", "严重程度", "状态", "责任人", "发现时间", "操作"].map((h) => (
                          <th key={h} style={thStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, i) => {
                        const def = issueTables.find((t) => t.table_code === issue.tableCode);
                        if (issue.status === "empty") {
                          return (
                            <tr key={issue.id} style={{ background: "var(--s-surface)", borderBottom: "1px solid var(--s-border-light)" }}>
                              <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--s-text-muted)", fontStyle: "italic" }}>
                                {def?.table_name || issue.tableCode} — 暂无数据（表不存在或无记录）
                              </td>
                            </tr>
                          );
                        }
                        const sevStyle = severityBadgeStyle(issue.severity);
                        const stStyle = statusBadgeStyle(issue.status);
                        const canEdit = def?.allow_add !== false;

                        return (
                          <tr
                            key={issue.id || i}
                            style={{
                              background: "var(--s-surface)",
                              borderBottom: "1px solid var(--s-border-light, #e9ecef)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-bg, #f8f9fa)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-surface)";
                            }}
                          >
                            <td style={{ ...tdStyle, fontFamily: "var(--s-font-mono, monospace)", color: "var(--s-text-muted)" }}>
                              {i + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, color: "var(--s-text)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {issue.description || "—"}
                            </td>
                            <td style={tdStyle}>
                              {issue.severity ? (
                                <span
                                  style={{
                                    ...badgeStyle,
                                    backgroundColor: sevStyle.bg,
                                    color: sevStyle.color,
                                  }}
                                >
                                  {issue.severity}
                                </span>
                              ) : (
                                <span style={{ color: "var(--s-text-muted)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {issue.status ? (
                                <span
                                  style={{
                                    ...badgeStyle,
                                    backgroundColor: stStyle.bg,
                                    color: stStyle.color,
                                  }}
                                >
                                  {issue.status}
                                </span>
                              ) : (
                                <span style={{ color: "var(--s-text-muted)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>{issue.assignee || "—"}</td>
                            <td style={{ ...tdStyle, fontFamily: "var(--s-font-mono, monospace)", fontSize: "10px", color: "var(--s-text-muted)" }}>
                              {fmtDate(issue.createdAt)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              {canEdit ? (
                                <button
                                  style={{
                                    padding: "4px 14px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    border: "1px solid var(--s-orange)",
                                    background: "var(--s-surface)",
                                    color: "var(--s-orange)",
                                    cursor: "pointer",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.3px",
                                    fontFamily: "var(--s-font-mono, monospace)",
                                  }}
                                  onClick={() => {
                                    // TODO: navigate to form editor for this record
                                  }}
                                >
                                  处理
                                </button>
                              ) : (
                                <button
                                  style={{
                                    padding: "4px 14px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    border: "1px solid var(--s-border)",
                                    background: "var(--s-surface)",
                                    color: "var(--s-text-muted)",
                                    cursor: "pointer",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.3px",
                                    fontFamily: "var(--s-font-mono, monospace)",
                                  }}
                                  onClick={() => {
                                    // TODO: navigate to form viewer for this record
                                  }}
                                >
                                  查看
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ))}

              {/* ======== Tab: 风险 ======== */}
              {activeTab === "risks" &&
                (showRiskEmpty ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "48px 0",
                      gap: "12px",
                      fontSize: "13px",
                      color: "var(--s-text-muted)",
                    }}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0.4 }}
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>暂无风险数据</span>
                  </div>
                ) : (
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {["序号", "风险描述", "影响程度", "发生概率", "状态", "责任人", "操作"].map((h) => (
                          <th key={h} style={thStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {risks.map((risk, i) => {
                        if (risk.status === "empty") {
                          const rdef = riskTables.find((t) => t.table_code === risk.tableCode);
                          return (
                            <tr key={risk.id} style={{ background: "var(--s-surface)", borderBottom: "1px solid var(--s-border-light)" }}>
                              <td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--s-text-muted)", fontStyle: "italic" }}>
                                {rdef?.table_name || risk.tableCode} — 暂无数据（表不存在或无记录）
                              </td>
                            </tr>
                          );
                        }
                        const impactStyle = severityBadgeStyle(risk.impact);
                        const probLo = risk.probability.toLowerCase();
                        const probBg =
                          probLo.includes("高") || probLo.includes("high")
                            ? "rgba(220,38,38,.12)"
                            : probLo.includes("中") || probLo.includes("medium")
                              ? "rgba(245,158,11,.12)"
                              : "rgba(43,138,62,.12)";
                        const probColor =
                          probLo.includes("高") || probLo.includes("high")
                            ? "var(--s-red, #dc2626)"
                            : probLo.includes("中") || probLo.includes("medium")
                              ? "#d97706"
                              : "var(--s-green, #2b8a3e)";
                        const stStyle = statusBadgeStyle(risk.status);

                        return (
                          <tr
                            key={risk.id || i}
                            style={{
                              background: "var(--s-surface)",
                              borderBottom: "1px solid var(--s-border-light, #e9ecef)",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-bg, #f8f9fa)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-surface)";
                            }}
                          >
                            <td style={{ ...tdStyle, fontFamily: "var(--s-font-mono, monospace)", color: "var(--s-text-muted)" }}>
                              {i + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 500, color: "var(--s-text)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {risk.description || "—"}
                            </td>
                            <td style={tdStyle}>
                              {risk.impact ? (
                                <span
                                  style={{
                                    ...badgeStyle,
                                    backgroundColor: impactStyle.bg,
                                    color: impactStyle.color,
                                  }}
                                >
                                  {risk.impact}
                                </span>
                              ) : (
                                <span style={{ color: "var(--s-text-muted)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {risk.probability ? (
                                <span
                                  style={{
                                    ...badgeStyle,
                                    backgroundColor: probBg,
                                    color: probColor,
                                  }}
                                >
                                  {risk.probability}
                                </span>
                              ) : (
                                <span style={{ color: "var(--s-text-muted)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {risk.status ? (
                                <span
                                  style={{
                                    ...badgeStyle,
                                    backgroundColor: stStyle.bg,
                                    color: stStyle.color,
                                  }}
                                >
                                  {risk.status}
                                </span>
                              ) : (
                                <span style={{ color: "var(--s-text-muted)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>{risk.assignee || "—"}</td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>
                              {risk.allowAdd ? (
                                <button
                                  style={{
                                    padding: "4px 14px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    border: "1px solid var(--s-orange)",
                                    background: "var(--s-surface)",
                                    color: "var(--s-orange)",
                                    cursor: "pointer",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.3px",
                                    fontFamily: "var(--s-font-mono, monospace)",
                                  }}
                                  onClick={() => {
                                    // TODO: navigate to form editor for this record
                                  }}
                                >
                                  处理
                                </button>
                              ) : (
                                <button
                                  style={{
                                    padding: "4px 14px",
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    border: "1px solid var(--s-border)",
                                    background: "var(--s-surface)",
                                    color: "var(--s-text-muted)",
                                    cursor: "pointer",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.3px",
                                    fontFamily: "var(--s-font-mono, monospace)",
                                  }}
                                  onClick={() => {
                                    // TODO: navigate to form viewer for this record
                                  }}
                                >
                                  查看
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ))}

              {/* ---- footer hint ---- */}
              <div style={hintStyle}>
                💡 <strong>数据来源：</strong>问题和风险数据来自规范管理中<strong>风险管理模块</strong>的对应表格。如需修改表格结构或权限，请前往 <strong>系统设置 → 规范管理</strong>。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
