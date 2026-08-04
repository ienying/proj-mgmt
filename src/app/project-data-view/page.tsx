"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";

// ═══ CSS Variables — 匹配阶段式布局风格 ═══
const cssVars = `
:root {
  --s-bg: #f8f9fa;
  --s-surface: #ffffff;
  --s-surface2: #f1f3f5;
  --s-border: #dee2e6;
  --s-border-light: #e9ecef;
  --s-text: #212529;
  --s-text-secondary: #495057;
  --s-text-muted: #868e96;
  --s-orange: #e8590c;
  --s-green: #2b8a3e;
  --s-blue: #1c7ed6;
  --s-font-mono: "SF Mono","Fira Code","Cascadia Code",monospace;
}
body { background: var(--s-bg); margin: 0; }
`;

function TableViewInner() {
  const searchParams = useSearchParams();
  const schema = searchParams.get("schema") || "";
  const tableCode = searchParams.get("table") || "";
  const tableName = searchParams.get("name") || tableCode;

  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<Array<{ name: string; label: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchData = useCallback(async () => {
    if (!schema || !tableCode) return;
    setLoading(true);
    try {
      // 并行获取数据和表定义
      const [dataRes, defRes] = await Promise.all([
        fetch(`/api/project-data?projectSchema=${encodeURIComponent(schema)}&tableCode=${encodeURIComponent(tableCode)}`),
        fetch("/api/standards"),
      ]);
      const dataJson = await dataRes.json();
      const defJson = await defRes.json();
      const data = (dataJson.data || []) as Array<Record<string, unknown>>;
      setRecords(data);

      const defs = (defJson.data || []) as Array<{ table_code: string; columns_config?: Array<{ name: string; label: string; type: string }> }>;
      const def = defs.find(d => d.table_code === tableCode);
      const cols = def?.columns_config || [];

      // 硬编码：对接信息和定制化信息的列定义
      const HARDCODED_COLS: Record<string, Array<{ name: string; label: string; type: string }>> = {
        integration_info: [
          { name: "vendor_name", label: "对接厂商", type: "text" },
          { name: "product_module", label: "产品目录", type: "text" },
          { name: "integration_type", label: "对接类型", type: "text" },
          { name: "brief_description", label: "简述", type: "text" },
          { name: "in_contract", label: "是否在合同内", type: "text" },
          { name: "contract_note", label: "合同备注", type: "text" },
          { name: "our_req_contact", label: "我方需求对接人", type: "text" },
          { name: "our_req_contact_phone", label: "联系方式", type: "text" },
          { name: "our_product_contact", label: "我方产品负责人", type: "text" },
          { name: "our_product_contact_phone", label: "联系方式", type: "text" },
          { name: "our_dev_contact", label: "我方开发负责人", type: "text" },
          { name: "our_dev_contact_phone", label: "联系方式", type: "text" },
          { name: "our_responsibility", label: "我方负责内容", type: "text" },
          { name: "their_req_contact", label: "对方需求对接人", type: "text" },
          { name: "their_req_contact_phone", label: "联系方式", type: "text" },
          { name: "their_req_contact_position", label: "职位", type: "text" },
          { name: "their_req_contact_note", label: "备注", type: "text" },
          { name: "their_product_contact", label: "对方产品负责人", type: "text" },
          { name: "their_product_contact_phone", label: "联系方式", type: "text" },
          { name: "their_product_contact_position", label: "职位", type: "text" },
          { name: "their_product_contact_note", label: "备注", type: "text" },
          { name: "their_dev_contact", label: "对方开发负责人", type: "text" },
          { name: "their_dev_contact_phone", label: "联系方式", type: "text" },
          { name: "their_dev_contact_position", label: "职位", type: "text" },
          { name: "their_dev_contact_note", label: "备注", type: "text" },
          { name: "their_responsibility", label: "对方负责内容", type: "text" },
          { name: "integration_docs", label: "附件", type: "json" },
          { name: "remark", label: "备注", type: "text" },
        ],
        custom_dev_info: [
          { name: "product_module", label: "产品目录", type: "text" },
          { name: "custom_content", label: "定制内容", type: "text" },
          { name: "in_contract", label: "是否在合同内", type: "text" },
          { name: "contract_note", label: "合同备注", type: "text" },
          { name: "customer_req_contact", label: "客户需求提出人", type: "text" },
          { name: "customer_req_contact_phone", label: "联系方式", type: "text" },
          { name: "customer_req_contact_position", label: "职位", type: "text" },
          { name: "customer_req_contact_note", label: "备注", type: "text" },
          { name: "internal_req_contact", label: "内部需求对接人", type: "text" },
          { name: "internal_req_contact_phone", label: "联系方式", type: "text" },
          { name: "internal_product_contact", label: "内部产品负责人", type: "text" },
          { name: "internal_product_contact_phone", label: "联系方式", type: "text" },
          { name: "req_docs", label: "需求文档", type: "json" },
          { name: "remark", label: "备注", type: "text" },
        ],
      };

      // 优先用表定义的列（有label），其次硬编码定义，否则用数据中的列名
      if (cols.length > 0) {
        setColumns(cols.map(c => ({ name: c.name, label: c.label || c.name, type: c.type || "text" })));
      } else if (HARDCODED_COLS[tableCode]) {
        setColumns(HARDCODED_COLS[tableCode]);
      } else if (data.length > 0) {
        setColumns(Object.keys(data[0]).filter(k => !k.startsWith("_") && k !== "id" && k !== "created_at").map(k => ({ name: k, label: k, type: "text" })));
      }
    } catch { }
    setLoading(false);
  }, [schema, tableCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startEdit = (rowIdx: number, colName: string, value: unknown) => {
    setEditingCell({ rowIdx, colName });
    setEditValue(String(value ?? ""));
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { rowIdx, colName } = editingCell;
    const row = records[rowIdx];
    if (!row?.id) return;
    try {
      const res = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema: schema, tableCode, rowId: row.id, data: { [colName]: editValue } }),
      });
      if (res.ok) {
        setRecords(prev => {
          const updated = [...prev];
          updated[rowIdx] = { ...updated[rowIdx], [colName]: editValue };
          return updated;
        });
      }
    } catch { }
    setEditingCell(null);
  };

  if (!schema || !tableCode) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--s-text-muted)", fontFamily: "\"PingFang SC\",\"Microsoft YaHei\",sans-serif" }}>缺少参数</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <div style={{ minHeight: "100vh", background: "var(--s-bg)", color: "var(--s-text)", fontFamily: "\"PingFang SC\",\"Noto Sans SC\",\"Microsoft YaHei\",sans-serif" }}>
        {/* Header — 匹配阶段式布局风格 */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--s-border)", background: "var(--s-surface)", display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => window.close()} style={{ width: 32, height: 32, border: "1px solid var(--s-border)", background: "var(--s-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--s-text-muted)", fontSize: 14 }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text)", margin: 0, fontFamily: "var(--s-font-mono)" }}>{tableName}</h1>
            <p style={{ fontSize: 10, color: "var(--s-text-muted)", margin: "2px 0 0", fontFamily: "var(--s-font-mono)", letterSpacing: "0.3px" }}>{records.length} 条记录</p>
          </div>
        </div>

        {/* Table — 匹配表格风格 */}
        <div style={{ padding: "20px 24px", maxWidth: "100%", overflowX: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--s-text-muted)", fontSize: 12 }}>加载中...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: "1px solid var(--s-border)" }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.name} style={{ background: "var(--s-surface2)", padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "var(--s-text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", borderBottom: "2px solid var(--s-border)", whiteSpace: "nowrap" }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length || 1} style={{ textAlign: "center", padding: 40, color: "var(--s-text-muted)", fontSize: 12, background: "var(--s-surface)" }}>暂无数据</td>
                  </tr>
                ) : (
                  records.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--s-surface)" : "var(--s-bg)" }}>
                    {columns.map(col => {
                      const isEditing = editingCell?.rowIdx === ri && editingCell?.colName === col.name;
                      const val = row[col.name];
                      // 对于 JSONB 附件列，显示文档数量
                      const jsonCols = ["integration_docs", "req_docs"];
                      let displayVal: string;
                      if (jsonCols.includes(col.name) && Array.isArray(val)) {
                        displayVal = `${val.length} 个文档`;
                      } else {
                        displayVal = typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? "—");
                      }
                      // JSONB 列不可双击编辑
                      const editable = !jsonCols.includes(col.name);
                      return (
                        <td key={col.name} style={{ padding: "8px 12px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)" }}
                          onDoubleClick={() => { if (editable) startEdit(ri, col.name, displayVal === "—" ? "" : displayVal); }}>
                          {isEditing ? (
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCell(null); }}
                                autoFocus style={{ flex: 1, padding: "5px 8px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 12, color: "var(--s-text)", fontFamily: "inherit", outline: "none" }} />
                              <button onClick={saveEdit} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--s-green)", padding: 2 }}><Check size={14} /></button>
                              <button onClick={() => setEditingCell(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#e03131", padding: 2 }}><X size={14} /></button>
                            </div>
                          ) : (
                            <span style={{ cursor: "default", display: "block" }} title={displayVal}>{displayVal}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

export default function TableViewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", fontFamily: "\"PingFang SC\",\"Microsoft YaHei\",sans-serif" }}>加载中...</div>}>
      <TableViewInner />
    </Suspense>
  );
}
