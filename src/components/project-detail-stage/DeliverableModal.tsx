"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Download, FileText, Video } from "lucide-react";

interface DeliverableModalProps {
  open: boolean;
  onClose: () => void;
  projectSchema: string;
  projectName: string;
  onNavigateTable?: (tableCode: string) => void;
}

interface TableDefinition {
  table_code: string;
  table_name: string;
  module_type: string[];
  columns_config?: Array<{ name: string; type: string }>;
  allow_add?: boolean;
}

interface DocRow {
  id: string;
  fileName: string;
  fileType: "attachment" | "video";
  sourceModule: string;
  sourceTable: string;
  uploadTime: string;
  fileKey: string;
}

interface ImplRow {
  tableCode: string;
  tableName: string;
  moduleName: string;
  recordCount: number;
  allowAdd: boolean;
}

function basename(key: string): string {
  const name = key.split("/").pop() || key;
  // 去掉时间戳前缀 "1783847357950_" 等
  return name.replace(/^\d+_/, "");
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "—";
  return filename.slice(dot + 1).toUpperCase();
}

export function DeliverableModal({ open, onClose, projectSchema, projectName, onNavigateTable }: DeliverableModalProps) {
  const [activeTab, setActiveTab] = useState<"docs" | "impl">("docs");

  // Shared data
  const [tableDefs, setTableDefs] = useState<TableDefinition[]>([]);
  const [moduleTypeMap, setModuleTypeMap] = useState<Record<string, string>>({});
  const [loadingDefs, setLoadingDefs] = useState(false);

  // Tab 1: 项目相关文档
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Tab 2: 实施资料
  const [implRows, setImplRows] = useState<ImplRow[]>([]);
  const [loadingImpl, setLoadingImpl] = useState(false);

  // 对接信息和定制化信息表的记录数
  const [integrationCount, setIntegrationCount] = useState(0);
  const [customDevCount, setCustomDevCount] = useState(0);

  // Load table definitions and module types on open
  useEffect(() => {
    if (!open) return;
    setLoadingDefs(true);
    setDocs([]);
    setImplRows([]);

    Promise.all([
      fetch("/api/standards").then((r) => r.json()),
      fetch("/api/module-types").then((r) => r.json()),
    ])
      .then(([stdData, mtData]) => {
        const defs: TableDefinition[] = (stdData.data || []).filter(
          (d: Record<string, unknown>) => !String(d.table_code || "").startsWith("task_")
        );
        setTableDefs(defs);

        const map: Record<string, string> = {};
        (mtData.data || []).forEach((m: { code: string; name: string }) => {
          map[m.code] = m.name;
        });
        setModuleTypeMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingDefs(false));
  }, [open]);

  // Resolve module codes to names (memoized)
  const resolveModule = useCallback(
    (codes: string[]): string => {
      if (!codes || codes.length === 0) return "—";
      return codes.map((c) => moduleTypeMap[c] || c).join(", ");
    },
    [moduleTypeMap]
  );

  // Memoized: attachment tables (those with attachment or video columns)
  const attachmentTables = useMemo(
    () =>
      tableDefs.filter((def) =>
        (def.columns_config || []).some(
          (col) => col.type === "attachment" || col.type === "video"
        )
      ),
    [tableDefs]
  );

  // Memoized: tables for 实施资料 tab — 只显示勾选了"在交付物中展示"的表
  const implTables = useMemo(
    () => tableDefs.filter((def) =>
      !def.table_code.startsWith("task_") && (def as any).show_in_deliverables === true
    ),
    [tableDefs]
  );

  // Tab 1: fetch documents
  useEffect(() => {
    if (!open || attachmentTables.length === 0 || !projectSchema) {
      if (attachmentTables.length === 0 && open && !loadingDefs) {
        setLoadingDocs(false);
      }
      return;
    }

    setLoadingDocs(true);

    (async () => {
      const rows: DocRow[] = [];

      for (const def of attachmentTables) {
        const attCols = (def.columns_config || []).filter(
          (col) => col.type === "attachment" || col.type === "video"
        );

        try {
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(def.table_code)}`
          );
          const json = await res.json();
          const records: Array<Record<string, unknown>> = json.data || [];

          for (const record of records) {
            for (const col of attCols) {
              const rawVal = record[col.name];
              if (!rawVal || (typeof rawVal === "string" && !rawVal.trim())) continue;

              // Extract file keys — handle string, JSON array, and comma-separated values
              const keys: string[] = [];
              const val = typeof rawVal === "string" ? rawVal : String(rawVal);

              if ((val.startsWith("[") || val.startsWith("{")) && val.includes('"')) {
                try {
                  const parsed = JSON.parse(val);
                  if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                      if (typeof item === "string") {
                        keys.push(item);
                      } else if (item?.key && typeof item.key === "string") {
                        keys.push(item.key);
                      }
                    }
                  } else if (parsed?.key && typeof parsed.key === "string") {
                    keys.push(parsed.key);
                  }
                } catch {
                  // JSON解析失败，可能是纯文本，跳过
                }
              } else if (val.includes("/") || val.startsWith("uploads")) {
                // 纯字符串 key（PhaseDetail 上传后直接存 key）
                keys.push(val);
              }

              for (const key of keys) {
                if (!key.trim()) continue;
                // 过滤掉明显不是文件key的值（如中文名称、短文本等）
                const trimmed = key.trim();
                if (!trimmed.includes("/") && !trimmed.includes(".") && !trimmed.startsWith("uploads")) continue;
                rows.push({
                  id: `${def.table_code}-${record.id}-${col.name}-${trimmed}`,
                  fileName: basename(trimmed),
                  fileType: col.type as "attachment" | "video",
                  sourceModule: resolveModule(def.module_type),
                  sourceTable: def.table_name || def.table_code,
                  uploadTime: String(record.created_at || "—"),
                  fileKey: trimmed,
                });
              }
            }
          }
        } catch {
          // Table may not exist in this project — skip
        }
      }

      setDocs(rows);
      setLoadingDocs(false);
    })();
  }, [open, attachmentTables, projectSchema, resolveModule, loadingDefs]);

  // Tab 2: fetch implementation materials
  useEffect(() => {
    if (!open || implTables.length === 0 || !projectSchema) {
      if (implTables.length === 0 && open && !loadingDefs) {
        setLoadingImpl(false);
      }
      return;
    }

    setLoadingImpl(true);

    (async () => {
      const rows: ImplRow[] = [];

      for (const def of implTables) {
        try {
          const res = await fetch(
            `/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=${encodeURIComponent(def.table_code)}`
          );
          const json = await res.json();
          const records = json.data || [];

          rows.push({
            tableCode: def.table_code,
            tableName: def.table_name || def.table_code,
            moduleName: resolveModule(def.module_type),
            recordCount: records.length,
            allowAdd: def.allow_add !== false,
          });
        } catch {
          rows.push({
            tableCode: def.table_code,
            tableName: def.table_name || def.table_code,
            moduleName: resolveModule(def.module_type),
            recordCount: 0,
            allowAdd: def.allow_add !== false,
          });
        }
      }

      setImplRows(rows);
      setLoadingImpl(false);
    })();
  }, [open, implTables, projectSchema, resolveModule, loadingDefs]);

  // Fetch integration_info and custom_dev_info record counts
  useEffect(() => {
    if (!open || !projectSchema) return;
    (async () => {
      try {
        const [intRes, cdRes] = await Promise.all([
          fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=integration_info`),
          fetch(`/api/project-data?projectSchema=${encodeURIComponent(projectSchema)}&tableCode=custom_dev_info`),
        ]);
        const intJson = await intRes.json();
        const cdJson = await cdRes.json();
        setIntegrationCount(Array.isArray(intJson.data) ? intJson.data.length : 0);
        setCustomDevCount(Array.isArray(cdJson.data) ? cdJson.data.length : 0);
      } catch {
        setIntegrationCount(0);
        setCustomDevCount(0);
      }
    })();
  }, [open, projectSchema]);

  // Download handler
  const handleDownload = (fileKey: string) => {
    const apiUrl = `/api/files/download?key=${encodeURIComponent(fileKey)}`;
    fetch(apiUrl).then(r => r.json()).then(json => {
      if (json.url) {
        const a = document.createElement("a");
        a.href = json.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      } else {
        // 兜底：直接用 key 尝试
        const a = document.createElement("a");
        a.href = fileKey.startsWith("/") ? fileKey : `/${fileKey}`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      }
    }).catch(() => {});
  };

  // Format date string
  const fmtDate = (v: string): string => {
    if (!v || v === "—") return "—";
    try {
      const d = new Date(v);
      return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch {
      return v.split("T")[0] || v;
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--s-surface)",
          border: "1px solid var(--s-border)",
          width: "90%",
          maxWidth: 1000,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 48px rgba(0,0,0,.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--s-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1px",
              color: "var(--s-text)",
              fontFamily: "var(--s-font-mono)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: 0,
            }}
          >
            <span style={{ fontSize: 14 }}>&#x1F4C4;</span> 交付物 / 文档 — {projectName}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--s-border)",
              background: "var(--s-surface)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--s-text-muted)",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--s-surface2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--s-surface)";
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            minHeight: 420,
          }}
        >
          {loadingDefs ? (
            <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: "var(--s-text-muted)" }}>
              加载中...
            </div>
          ) : (
            <>
              {/* ═══ Tab 切换 ═══ */}
              <div
                style={{
                  display: "flex",
                  gap: 1,
                  background: "var(--s-border)",
                  marginBottom: 20,
                }}
              >
                {([
                  ["docs", `\u{1F4CE} 项目相关文档 (${docs.length})`],
                  ["impl", `\u{1F4CA} 实施资料 (${implRows.length}张表)`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      fontSize: 11,
                      fontWeight: activeTab === key ? 600 : 500,
                      textAlign: "center",
                      cursor: "pointer",
                      border: "none",
                      background: activeTab === key ? "var(--s-surface)" : "var(--s-surface2)",
                      color: activeTab === key ? "var(--s-text)" : "var(--s-text-muted)",
                      fontFamily: "inherit",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ======== Tab 1: 项目相关文档 ======== */}
              {activeTab === "docs" && (
                <>
                  <p style={{ fontSize: 11, color: "var(--s-text-muted)", marginBottom: 16, marginTop: 0 }}>
                    自动汇集自本项目各模块表格中 <strong>附件(attachment)</strong> 和 <strong>视频(video)</strong> 类型列的所有文件。点击下载按钮即可下载。
                  </p>

                  {loadingDocs ? (
                    <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: "var(--s-text-muted)" }}>
                      加载中...
                    </div>
                  ) : docs.length === 0 ? (
                    <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: "var(--s-text-muted)" }}>
                      暂无数据
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                        border: "1px solid var(--s-border)",
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            { label: "文件名称", width: undefined },
                            { label: "类型", width: 80 },
                            { label: "来源模块", width: undefined },
                            { label: "来源表格", width: undefined },
                            { label: "上传时间", width: 100 },
                            { label: "下载", width: 80, align: "center" as const },
                          ].map((h) => (
                            <th
                              key={h.label}
                              style={{
                                background: "var(--s-surface2)",
                                padding: "9px 14px",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "var(--s-text-muted)",
                                fontSize: 10,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                fontFamily: "var(--s-font-mono)",
                                borderBottom: "2px solid var(--s-border)",
                                whiteSpace: "nowrap",
                                width: h.width,
                                ...(h.align ? { textAlign: h.align } : {}),
                              }}
                            >
                              {h.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc) => (
                          <tr
                            key={doc.id}
                            style={{ background: "var(--s-surface)" }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-bg)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--s-surface)";
                            }}
                          >
                            {/* 文件名称 */}
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)" }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: "var(--s-text)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  overflow: "hidden",
                                }}
                                title={doc.fileName}
                              >
                                {doc.fileType === "video" ? (
                                  <Video size={14} style={{ flexShrink: 0, color: "var(--s-blue)" }} />
                                ) : (
                                  <FileText size={14} style={{ flexShrink: 0, color: "var(--s-text-muted)" }} />
                                )}
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {doc.fileName}
                                </span>
                              </div>
                            </td>
                            {/* 类型 — extension badge */}
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)" }}>
                              <span style={{ fontSize: 10, color: "var(--s-text-muted)" }}>
                                {getExtension(doc.fileName)}
                              </span>
                            </td>
                            {/* 来源模块 */}
                            <td
                              style={{
                                padding: "9px 14px",
                                borderBottom: "1px solid var(--s-border-light)",
                                color: "var(--s-blue)",
                                fontSize: 11,
                              }}
                            >
                              {doc.sourceModule}
                            </td>
                            {/* 来源表格 */}
                            <td
                              style={{
                                padding: "9px 14px",
                                borderBottom: "1px solid var(--s-border-light)",
                                fontSize: 11,
                                color: "var(--s-text-muted)",
                              }}
                            >
                              {doc.sourceTable}
                            </td>
                            {/* 上传时间 */}
                            <td
                              style={{
                                padding: "9px 14px",
                                borderBottom: "1px solid var(--s-border-light)",
                                fontFamily: "var(--s-font-mono)",
                                fontSize: 11,
                                color: "var(--s-text-muted)",
                              }}
                            >
                              {fmtDate(doc.uploadTime)}
                            </td>
                            {/* 下载 */}
                            <td
                              style={{
                                padding: "9px 14px",
                                borderBottom: "1px solid var(--s-border-light)",
                                textAlign: "center",
                              }}
                            >
                              <button
                                onClick={() => handleDownload(doc.fileKey)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "3px 6px",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  border: "none",
                                  background: "transparent",
                                  color: "var(--s-text-muted)",
                                  transition: "all 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = "var(--s-orange)";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = "var(--s-text-muted)";
                                }}
                              >
                                <Download size={12} />
                                下载
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* ======== Tab 2: 实施资料 ======== */}
              {activeTab === "impl" && (
                <>
                  <p style={{ fontSize: 11, color: "var(--s-text-muted)", marginBottom: 16, marginTop: 0 }}>
                    以下表格来自<strong>规范管理</strong>中为本项目定义的表格。编辑权限<strong>自动继承规范管理中的配置</strong>（allow_add / allow_delete / readonly_mode），无需在此手动设置。
                  </p>

                  {loadingImpl ? (
                    <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: "var(--s-text-muted)" }}>
                      加载中...
                    </div>
                  ) : implRows.length === 0 ? (
                    <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: "var(--s-text-muted)" }}>
                      暂无数据
                    </div>
                  ) : (
                    <>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 12,
                          border: "1px solid var(--s-border)",
                        }}
                      >
                        <thead>
                          <tr>
                            {[
                              { label: "表格名称", width: undefined, align: "left" as const },
                              { label: "所属模块", width: undefined, align: "left" as const },
                              { label: "记录数", width: 90, align: "center" as const },
                              { label: "编辑权限", width: 110, align: "center" as const },
                              { label: "操作", width: 100, align: "center" as const },
                            ].map((h) => (
                              <th
                                key={h.label}
                                style={{
                                  background: "var(--s-surface2)",
                                  padding: "9px 12px",
                                  textAlign: h.align,
                                  fontWeight: 600,
                                  color: "var(--s-text-muted)",
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  fontFamily: "var(--s-font-mono)",
                                  borderBottom: "1px solid var(--s-border)",
                                  width: h.width,
                                }}
                              >
                                {h.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {implRows.map((row) => (
                            <React.Fragment key={row.tableCode}>
                            <tr
                              key={row.tableCode}
                              onMouseEnter={(e) => {
                                const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                                td.forEach((t) => {
                                  (t as HTMLElement).style.background = "var(--s-bg)";
                                });
                              }}
                              onMouseLeave={(e) => {
                                const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                                td.forEach((t) => {
                                  (t as HTMLElement).style.background = "";
                                });
                              }}
                            >
                              {/* 表格名称 — 新标签页打开 */}
                              <td
                                onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=${encodeURIComponent(row.tableCode)}&name=${encodeURIComponent(row.tableName)}`, "_blank")}
                                style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", fontWeight: 600, color: "var(--s-blue)", cursor: "pointer" }}
                              >
                                {row.tableName}
                              </td>
                              {/* 所属模块 */}
                              <td
                                style={{
                                  padding: "9px 12px",
                                  borderBottom: "1px solid var(--s-border-light)",
                                  color: "var(--s-text-secondary)",
                                }}
                              >
                                {row.moduleName}
                              </td>
                              {/* 记录数 */}
                              <td
                                style={{
                                  padding: "9px 12px",
                                  borderBottom: "1px solid var(--s-border-light)",
                                  textAlign: "center",
                                  fontFamily: "var(--s-font-mono)",
                                }}
                              >
                                {row.recordCount} 条
                              </td>
                              {/* 编辑权限 */}
                              <td
                                style={{
                                  padding: "9px 12px",
                                  borderBottom: "1px solid var(--s-border-light)",
                                  textAlign: "center",
                                }}
                              >
                                {row.allowAdd ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontSize: 9,
                                      fontWeight: 600,
                                      padding: "2px 10px",
                                      borderRadius: 3,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      fontFamily: "var(--s-font-mono)",
                                      background: "#dcfce7",
                                      color: "var(--s-green)",
                                      border: "1px solid rgba(43,138,62,.2)",
                                    }}
                                  >
                                    可编辑
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontSize: 9,
                                      fontWeight: 600,
                                      padding: "2px 10px",
                                      borderRadius: 3,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      fontFamily: "var(--s-font-mono)",
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      border: "1px solid rgba(146,64,14,.15)",
                                    }}
                                  >
                                    仅查看
                                  </span>
                                )}
                              </td>
                              {/* 操作 — 无框文字 */}
                              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center" }}>
                                {row.allowAdd ? (
                                  <span onClick={() => { onNavigateTable?.(row.tableCode); onClose(); }}
                                    style={{ fontSize: 11, color: "var(--s-orange)", cursor: "pointer" }}
                                  >编辑</span>
                                ) : null}
                                <span onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=${encodeURIComponent(row.tableCode)}&name=${encodeURIComponent(row.tableName)}`, "_blank")}
                                  style={{ fontSize: 11, color: "var(--s-blue)", cursor: "pointer", marginLeft: 8 }}
                                >查看</span>
                              </td>
                            </tr>
                            </React.Fragment>
                          ))}
                          {/* ═══ 对接信息 — 项目 Schema 表 ═══ */}
                          <tr
                            onMouseEnter={(e) => {
                              const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                              td.forEach((t) => { (t as HTMLElement).style.background = "var(--s-bg)"; });
                            }}
                            onMouseLeave={(e) => {
                              const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                              td.forEach((t) => { (t as HTMLElement).style.background = ""; });
                            }}
                          >
                            <td onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=integration_info&name=${encodeURIComponent("对接信息")}`, "_blank")}
                              style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", fontWeight: 600, color: "var(--s-blue)", cursor: "pointer" }}>
                              对接信息
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)" }}>
                              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: "#ede9fe", color: "#7c3aed" }}>对接管理</span>
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center", fontFamily: "var(--s-font-mono)" }}>
                              {integrationCount} 条
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center" }}>
                              <span style={{ display: "inline-block", fontSize: 9, fontWeight: 600, padding: "2px 10px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", background: "#dcfce7", color: "var(--s-green)", border: "1px solid rgba(43,138,62,.2)" }}>可编辑</span>
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center" }}>
                              <span onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=integration_info&name=${encodeURIComponent("对接信息")}`,"_blank")}
                                style={{ fontSize: 11, color: "var(--s-orange)", cursor: "pointer" }}>编辑</span>
                              <span onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=integration_info&name=${encodeURIComponent("对接信息")}`,"_blank")}
                                style={{ fontSize: 11, color: "var(--s-blue)", cursor: "pointer", marginLeft: 8 }}>查看</span>
                            </td>
                          </tr>
                          {/* ═══ 定制化信息 — 项目 Schema 表 ═══ */}
                          <tr
                            onMouseEnter={(e) => {
                              const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                              td.forEach((t) => { (t as HTMLElement).style.background = "var(--s-bg)"; });
                            }}
                            onMouseLeave={(e) => {
                              const td = (e.currentTarget as HTMLElement).querySelectorAll("td");
                              td.forEach((t) => { (t as HTMLElement).style.background = ""; });
                            }}
                          >
                            <td onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=custom_dev_info&name=${encodeURIComponent("定制化信息")}`, "_blank")}
                              style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", fontWeight: 600, color: "var(--s-blue)", cursor: "pointer" }}>
                              定制化信息
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)" }}>
                              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 3, background: "#fef3c7", color: "#92400e" }}>定制开发</span>
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center", fontFamily: "var(--s-font-mono)" }}>
                              {customDevCount} 条
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center" }}>
                              <span style={{ display: "inline-block", fontSize: 9, fontWeight: 600, padding: "2px 10px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", background: "#dcfce7", color: "var(--s-green)", border: "1px solid rgba(43,138,62,.2)" }}>可编辑</span>
                            </td>
                            <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--s-border-light)", textAlign: "center" }}>
                              <span onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=custom_dev_info&name=${encodeURIComponent("定制化信息")}`,"_blank")}
                                style={{ fontSize: 11, color: "var(--s-orange)", cursor: "pointer" }}>编辑</span>
                              <span onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(projectSchema)}&table=custom_dev_info&name=${encodeURIComponent("定制化信息")}`,"_blank")}
                                style={{ fontSize: 11, color: "var(--s-blue)", cursor: "pointer", marginLeft: 8 }}>查看</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Bottom hint */}
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--s-text-muted)",
                          marginTop: 12,
                          padding: "10px 14px",
                          background: "var(--s-bg)",
                          border: "1px solid var(--s-border-light)",
                          lineHeight: 1.6,
                        }}
                      >
                        &#x1F4A1; <strong>权限说明：</strong>编辑权限<strong>完全继承规范管理中的配置</strong>，不在弹窗中手动设置。<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;· 规范管理中该表的 <code style={{ fontFamily: "var(--s-font-mono)", fontSize: 10 }}>allow_add</code> = true &#x2192; 「可编辑」（可新增/修改/删除）<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;· 规范管理中该表的 <code style={{ fontFamily: "var(--s-font-mono)", fontSize: 10 }}>allow_add</code> = false 且 <code style={{ fontFamily: "var(--s-font-mono)", fontSize: 10 }}>readonly_mode</code> = "and" &#x2192; 「仅查看」<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;· 如需修改权限，请前往 <strong>系统设置 &#x2192; 规范管理</strong> 调整对应表的定义。
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
