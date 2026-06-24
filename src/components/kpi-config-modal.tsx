"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const OPERATOR_LABEL: Record<string, string> = {
  eq: "等于", gt: "大于", lt: "小于", gte: "≥", lte: "≤", in: "包含", not_in: "排除",
};
const OPERATORS = ["eq", "gt", "lt", "gte", "lte", "in", "not_in"] as const;

const MODULE_LABEL_MAP: Record<string, string> = {
  scope: "范围管理", schedule: "进度管理", quality: "质量管理",
  cost: "成本管理", communication: "沟通管理", risk: "风险管理",
  procurement: "采购管理", resource: "资源管理", document: "资料管理",
  requirement: "需求管理", task: "任务管理",
};

interface Condition {
  column: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in";
  values: string[];
}

interface SourceConfig {
  table_code: string;
  module_type: string;
  table_name: string;
  conditions: Condition[];
}

interface KpiConfig {
  sources: SourceConfig[];
  expression: string;
}

interface TableDef {
  table_code: string;
  table_name: string;
  module_type: string[];
}

interface ColumnInfo {
  name: string;
  label: string;
  type: string;
  options: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiKey: string;
  kpiLabel: string;
  onSaved: () => void;
}

export function KpiConfigModal({ open, onOpenChange, kpiKey, kpiLabel, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [config, setConfig] = useState<KpiConfig | null>(null);
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [expression, setExpression] = useState("s0");

  // Table definitions
  const [allDefs, setAllDefs] = useState<TableDef[]>([]);
  // Adding a new source
  const [selModule, setSelModule] = useState("");
  const [selTable, setSelTable] = useState("");
  const [editingSourceIdx, setEditingSourceIdx] = useState<number | null>(null);
  // Column options for selected table
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  // Pending conditions for new source
  const [pendingConditions, setPendingConditions] = useState<Condition[]>([]);

  // Load config and definitions when modal opens
  useEffect(() => {
    if (!open) return;
    // Load current config
    fetch(`/api/dashboard/kpi-config?kpi_key=${encodeURIComponent(kpiKey)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data && json.data.sources) {
          setConfig(json.data);
          setSources(json.data.sources || []);
          setExpression(json.data.expression || "s0");
        } else {
          setConfig(null);
          setSources([]);
          setExpression("s0");
        }
      })
      .catch(() => {});
    // Load table definitions
    fetch("/api/standards")
      .then((r) => r.json())
      .then((json) => {
        const defs = (json.data || []).filter(
          (d: any) => !String(d.table_code || "").startsWith("task_")
        );
        setAllDefs(defs);
      })
      .catch(() => {});
    // Reset editing state
    setSelModule("");
    setSelTable("");
    setEditingSourceIdx(null);
    setTableColumns([]);
  }, [open, kpiKey]);

  // Load columns when table selected
  useEffect(() => {
    if (!selTable) { setTableColumns([]); return; }
    fetch(`/api/dashboard/table-columns?table_code=${encodeURIComponent(selTable)}`)
      .then((r) => r.json())
      .then((json) => setTableColumns(json.data || []))
      .catch(() => {});
  }, [selTable]);

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>();
    for (const d of allDefs) {
      if (d.module_type?.length > 0) modules.add(d.module_type[0]);
    }
    return Array.from(modules)
      .map((code) => ({ code, label: MODULE_LABEL_MAP[code] || code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allDefs]);

  const tableOptions = useMemo(() => {
    if (!selModule) return [];
    return allDefs
      .filter((d) => d.module_type?.includes(selModule))
      .map((d) => ({ table_code: d.table_code, table_name: d.table_name }))
      .sort((a, b) => a.table_code.localeCompare(b.table_code));
  }, [allDefs, selModule]);

  const addSource = () => {
    if (!selTable) return;
    const def = allDefs.find((d) => d.table_code === selTable);
    const newSource: SourceConfig = {
      table_code: selTable,
      module_type: selModule,
      table_name: def?.table_name || selTable,
      conditions: pendingConditions,
    };
    const newSources = [...sources, newSource];
    setSources(newSources);
    setExpression(newSources.map((_, i) => `s${i}`).join(" + "));
    setSelModule("");
    setSelTable("");
    setTableColumns([]);
    setPendingConditions([]);
  };

  const removeSource = (idx: number) => {
    const newSources = sources.filter((_, i) => i !== idx);
    setSources(newSources);
    setExpression(newSources.map((_, i) => `s${i}`).join(" + "));
    if (editingSourceIdx === idx) setEditingSourceIdx(null);
  };

  const toggleEditingSource = (idx: number) => {
    setEditingSourceIdx(editingSourceIdx === idx ? null : idx);
    if (editingSourceIdx !== idx) {
      setSelTable("");
      setSelModule("");
      setTableColumns([]);
    }
  };

  const addCondition = (sourceIdx: number, column: string, operator: Condition["operator"]) => {
    if (!column) return;
    const newSources = [...sources];
    const source = { ...newSources[sourceIdx] };
    if (source.conditions.some((c) => c.column === column)) return;
    source.conditions = [...source.conditions, { column, operator, values: [] }];
    newSources[sourceIdx] = source;
    setSources(newSources);
  };

  const removeCondition = (sourceIdx: number, condIndex: number) => {
    const newSources = [...sources];
    const source = { ...newSources[sourceIdx] };
    source.conditions = source.conditions.filter((_, i) => i !== condIndex);
    newSources[sourceIdx] = source;
    setSources(newSources);
  };

  const updateConditionOperator = (sourceIdx: number, condIndex: number, operator: Condition["operator"]) => {
    const newSources = [...sources];
    const source = { ...newSources[sourceIdx] };
    source.conditions = source.conditions.map((c, i) =>
      i === condIndex ? { ...c, operator, values: [] } : c
    );
    newSources[sourceIdx] = source;
    setSources(newSources);
  };

  const toggleConditionValue = (sourceIdx: number, condIndex: number, value: string) => {
    const newSources = [...sources];
    const source = { ...newSources[sourceIdx] };
    source.conditions = source.conditions.map((c, i) =>
      i === condIndex
        ? { ...c, values: c.values.includes(value) ? c.values.filter((v) => v !== value) : [...c.values, value] }
        : c
    );
    newSources[sourceIdx] = source;
    setSources(newSources);
  };

  const setConditionValue = (sourceIdx: number, condIndex: number, value: string) => {
    const newSources = [...sources];
    const source = { ...newSources[sourceIdx] };
    source.conditions = source.conditions.map((c, i) =>
      i === condIndex ? { ...c, values: [value] } : c
    );
    newSources[sourceIdx] = source;
    setSources(newSources);
  };

  const handleExport = async () => {
    if (sources.length === 0) return;
    setExporting(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const query = new URLSearchParams();
      const dept = urlParams.get("department");
      const status = urlParams.get("status");
      if (dept && dept !== "all") query.set("department", dept);
      if (status && status !== "all") query.set("status", status);
      const qs = query.toString();

      const res = await fetch(`/api/dashboard/export-source-data${qs ? "?" + qs : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, label: kpiLabel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "导出失败" }));
        throw new Error(err.error || "导出失败");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
      a.download = `${kpiLabel}-${ds}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch (e: any) {
      toast.error(e.message || "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (sources.length === 0) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const configValue = { sources, expression };
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: kpiKey, config_value: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setConfig(configValue);
      onOpenChange(false);
      toast.success(`${kpiLabel} 数据源已更新`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: kpiKey, config_value: null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "重置失败");
      setConfig(null);
      setSources([]);
      setExpression("s0");
      onOpenChange(false);
      toast.success(`${kpiLabel} 已恢复默认`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "重置失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" style={{ borderRadius: 14 }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 15 }}>{kpiLabel} · 数据源配置</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Current config status */}
          {config && (
            <div style={{ fontSize: 12, color: "var(--text2)", background: "var(--card2)", padding: "8px 12px", borderRadius: 8 }}>
              表达式: <strong>{config.expression}</strong> | {config.sources.length} 个数据源
            </div>
          )}

          {/* Existing sources */}
          {sources.map((src, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid var(--border)", borderRadius: 8, padding: 8,
                background: editingSourceIdx === idx ? "var(--card2)" : "var(--card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  s{idx}: {src.table_name || src.table_code}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => toggleEditingSource(idx)}
                    style={{
                      fontSize: 11, padding: "2px 8px", border: "1px solid var(--border)",
                      borderRadius: 4, cursor: "pointer", background: "var(--card)",
                    }}
                  >
                    {editingSourceIdx === idx ? "收起" : "条件"}
                  </button>
                  <button
                    onClick={() => removeSource(idx)}
                    style={{
                      fontSize: 11, padding: "2px 8px", border: "1px solid #fca5a5",
                      borderRadius: 4, cursor: "pointer", background: "#fef2f2", color: "#dc2626",
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* Conditions summary */}
              {src.conditions.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
                  {src.conditions.map((c) => (
                    <span key={c.column} style={{ marginRight: 8 }}>
                      {OPERATOR_LABEL[c.operator] || c.operator} {c.column}
                      {(["in", "not_in"].includes(c.operator) ? ` (${c.values.join(", ") || "全部"})` : ` = ${c.values[0] || "?"}`)}
                    </span>
                  ))}
                </div>
              )}

              {/* Condition editor (expandable) */}
              {editingSourceIdx === idx && (
                <OperatorConditionEditor
                  tableCode={src.table_code}
                  conditions={src.conditions}
                  onAdd={(col, op) => addCondition(idx, col, op)}
                  onRemove={(ci) => removeCondition(idx, ci)}
                  onUpdateOperator={(ci, op) => updateConditionOperator(idx, ci, op)}
                  onToggleValue={(ci, val) => toggleConditionValue(idx, ci, val)}
                  onSetValue={(ci, val) => setConditionValue(idx, ci, val)}
                />
              )}
            </div>
          ))}

          {/* Add new source */}
          <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>添加数据源</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={selModule}
                  onChange={(e) => { setSelModule(e.target.value); setSelTable(""); setPendingConditions([]); }}
                  style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card)", color: "var(--text)" }}
                >
                  <option value="">-- 模块 --</option>
                  {moduleOptions.map((m) => (
                    <option key={m.code} value={m.code}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={selTable}
                  onChange={(e) => { setSelTable(e.target.value); setPendingConditions([]); }}
                  style={{ flex: 1, padding: "6px 10px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card)", color: "var(--text)" }}
                  disabled={!selModule}
                >
                  <option value="">-- 表 --</option>
                  {tableOptions.map((t) => (
                    <option key={t.table_code} value={t.table_code}>{t.table_code} ({t.table_name})</option>
                  ))}
                </select>
              </div>

              {/* Inline condition editors when table selected */}
              {selTable && (
                <OperatorConditionEditor
                  tableCode={selTable}
                  conditions={pendingConditions}
                  onAdd={(col, op) => setPendingConditions((prev) => [...prev, { column: col, operator: op, values: [] }])}
                  onRemove={(ci) => setPendingConditions((prev) => prev.filter((_, i) => i !== ci))}
                  onUpdateOperator={(ci, op) => setPendingConditions((prev) =>
                    prev.map((c, i) => i === ci ? { ...c, operator: op, values: [] } : c)
                  )}
                  onToggleValue={(ci, val) => setPendingConditions((prev) =>
                    prev.map((c, i) => i === ci
                      ? { ...c, values: c.values.includes(val) ? c.values.filter((v) => v !== val) : [...c.values, val] }
                      : c
                    )
                  )}
                  onSetValue={(ci, val) => setPendingConditions((prev) =>
                    prev.map((c, i) => i === ci ? { ...c, values: [val] } : c)
                  )}
                />
              )}

              <Button size="sm" onClick={addSource} disabled={!selTable}>
                添加数据源
              </Button>
            </div>
          </div>

          {/* Expression */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              表达式（s0, s1, ... 对应上方数据源，支持 + - * / 和括号）
            </label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="s0 + s1"
              style={{
                width: "100%", padding: "8px 12px", fontSize: 13,
                border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--card)", color: "var(--text)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={sources.length === 0 || exporting}>
            {exporting ? "导出中..." : "导出 Excel"}
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            {config && (
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || exporting}>
                恢复默认
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={sources.length === 0 || saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Sub-component: per-source condition editor ----
function OperatorConditionEditor({
  tableCode,
  conditions,
  onAdd,
  onRemove,
  onUpdateOperator,
  onToggleValue,
  onSetValue,
}: {
  tableCode: string;
  conditions: Condition[];
  onAdd: (column: string, operator: Condition["operator"]) => void;
  onRemove: (condIndex: number) => void;
  onUpdateOperator: (condIndex: number, operator: Condition["operator"]) => void;
  onToggleValue: (condIndex: number, value: string) => void;
  onSetValue: (condIndex: number, value: string) => void;
}) {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [selColumn, setSelColumn] = useState("");
  const [selOperator, setSelOperator] = useState<Condition["operator"]>("in");

  useEffect(() => {
    if (!tableCode) return;
    fetch(`/api/dashboard/table-columns?table_code=${encodeURIComponent(tableCode)}`)
      .then((r) => r.json())
      .then((json) => setColumns(json.data || []))
      .catch(() => {});
  }, [tableCode]);

  const isMultiValue = (op: Condition["operator"]) => op === "in" || op === "not_in";

  const conditionRelation = "AND"; // all conditions combined with AND

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>筛选条件（{conditionRelation} 关系）</div>
      {conditions.map((cond, ci) => {
        const colInfo = columns.find((c) => c.name === cond.column);
        const multi = isMultiValue(cond.operator);
        return (
          <div key={`${cond.column}-${ci}`}>
            {ci > 0 && (
              <div style={{ textAlign: "center", fontSize: 10, color: "var(--p1)", fontWeight: 600, margin: "4px 0", letterSpacing: 1 }}>
                {conditionRelation}
              </div>
            )}
            <div style={{ padding: 6, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card)", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 500 }}>{colInfo?.label || cond.column}</span>
                <select
                  value={cond.operator}
                  onChange={(e) => onUpdateOperator(ci, e.target.value as Condition["operator"])}
                  style={{ padding: "1px 4px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 3, background: "var(--card)", color: "var(--text)" }}
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>{OPERATOR_LABEL[op]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onRemove(ci)}
                style={{ fontSize: 10, color: "#dc2626", cursor: "pointer", border: "none", background: "none", padding: "0 4px" }}
              >
                ✕
              </button>
            </div>
            {multi ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(colInfo?.options || []).map((opt) => {
                  const checked = cond.values.includes(opt);
                  return (
                    <label
                      key={opt}
                      style={{
                        display: "flex", alignItems: "center", gap: 3, fontSize: 11,
                        padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 4,
                        cursor: "pointer", background: checked ? "#3b82f6" : "var(--card)",
                        color: checked ? "#fff" : "var(--text)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleValue(ci, opt)}
                        style={{ width: 12, height: 12 }}
                      />
                      {opt}
                    </label>
                  );
                })}
                {(colInfo?.options || []).length === 0 && (
                  <input
                    type="text"
                    placeholder="输入值（逗号分隔多个）"
                    value={cond.values.join(", ")}
                    onChange={(e) => {
                      const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      onSetValue(ci, vals.join(", "));
                      // force values update
                    }}
                    style={{ width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4 }}
                  />
                )}
              </div>
            ) : (
              <div>
                {colInfo?.options?.length ? (
                  <select
                    value={cond.values[0] || ""}
                    onChange={(e) => onSetValue(ci, e.target.value)}
                    style={{ width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card)", color: "var(--text)" }}
                  >
                    <option value="">-- 选择值 --</option>
                    {colInfo.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="输入值"
                    value={cond.values[0] || ""}
                    onChange={(e) => onSetValue(ci, e.target.value)}
                    style={{ width: "100%", padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4 }}
                  />
                )}
              </div>
            )}
            </div>
          </div>
        );
      })}
      {columns.length > 0 && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <select
            value={selColumn}
            onChange={(e) => setSelColumn(e.target.value)}
            style={{ flex: 1, padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card)", color: "var(--text)" }}
          >
            <option value="">+ 添加条件列</option>
            {columns.map((c) => (
              <option key={c.name} value={c.name}>{c.label || c.name}</option>
            ))}
          </select>
          <select
            value={selOperator}
            onChange={(e) => setSelOperator(e.target.value as Condition["operator"])}
            style={{ padding: "4px 6px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4, background: "var(--card)", color: "var(--text)" }}
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{OPERATOR_LABEL[op]}</option>
            ))}
          </select>
          <button
            onClick={() => { if (selColumn) { onAdd(selColumn, selOperator); setSelColumn(""); } }}
            disabled={!selColumn}
            style={{
              fontSize: 11, padding: "4px 10px", border: "1px solid var(--border)",
              borderRadius: 4, cursor: selColumn ? "pointer" : "default",
              background: selColumn ? "var(--card)" : "#f5f5f5", color: selColumn ? "var(--text)" : "#ccc",
              whiteSpace: "nowrap",
            }}
          >
            添加
          </button>
        </div>
      )}
    </div>
  );
}
