"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  ChevronDown,
  Sparkles,
  Settings,
  Loader2,
  X,
  Check,
} from "lucide-react";

/* ============================================================
   Types
   ============================================================ */

interface KpiData {
  total_projects: number;
  customer_type: string | null;
  total_requirements: number;
  high_risk_remaining: number;
  total_tasks: number;
  stakeholders: number;
  procurement_items: number;
}

interface DomainScore {
  module: string;
  label: string;
  icon: string;
  avg: number;
}

interface ProjectDomainHealth {
  project_id: string;
  project_name: string;
  scores: Record<string, number>;
  composite: number;
}

interface HealthRankItem {
  rank: number;
  project_id: string;
  project_name: string;
  project_type: string;
  score: number;
}

interface WeakArea {
  module: string;
  label: string;
  icon: string;
  avg_score: number;
  lowest_project: string;
  lowest_score: number;
}

interface ReqStats {
  total: number;
  completion_rate: number;
  in_development: number;
  pending_confirmation: number;
  backlog: number;
  avg_processing_days: number;
  completion_velocity: number;
}

interface ReqDetail {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  source: string;
  date: string;
}

interface DashboardWarning {
  project_id: string;
  project_name: string;
  category: "threshold" | "trend" | "comparison";
  subcategory: string;
  item: string;
  condition: string;
  level: "error" | "warning";
  source: string;
  current_value: string;
  threshold: string;
  comparison_project?: string;
  gap?: string;
}

interface WarningSummary {
  total: number;
  errors: number;
  warnings: number;
  threshold: number;
  trend: number;
  comparison: number;
}

interface DashboardFullData {
  kpi: KpiData;
  domain_averages: DomainScore[];
  project_domain_health: ProjectDomainHealth[];
  health_ranking: HealthRankItem[];
  weak_areas: WeakArea[];
  project_type_distribution: Array<{ type: string; count: number }>;
  requirements: {
    stats: ReqStats;
    backlog: {
      backlog_count: number;
      pending_confirmation: number;
      avg_processing_days: number;
      completion_velocity: number;
    };
    cumulative_trend: Array<{ month: string; completed: number; total: number }>;
    status_distribution: Array<{ status: string; count: number }>;
    category_distribution: Array<{ category: string; count: number }>;
    detail_list: ReqDetail[];
  };
  departments: string[];
  warnings: DashboardWarning[];
  warning_summary: WarningSummary;
  projects: Array<{
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    status: string;
    role_project_manager: string | null;
    customer_info?: { company_name?: string };
  }>;
}

interface AIWarning {
  project_id: string;
  project_name: string;
  level: "error" | "warning" | "info";
  type: string;
  message: string;
}

/* ============================================================
   Constants
   ============================================================ */

const NINE_DOMAINS = [
  { module: "scope", label: "范围管理", icon: "🎯", cls: "k9-scope", color: "#3d6cb9" },
  { module: "schedule", label: "进度管理", icon: "⏱", cls: "k9-schedule", color: "#f59e0b" },
  { module: "quality", label: "质量管理", icon: "✅", cls: "k9-quality", color: "#10b981" },
  { module: "cost", label: "成本管理", icon: "💰", cls: "k9-cost", color: "#ec4899" },
  { module: "communication", label: "沟通管理", icon: "💬", cls: "k9-communication", color: "#3b82f6" },
  { module: "risk", label: "风险管理", icon: "⚠️", cls: "k9-risk", color: "#ef4444" },
  { module: "procurement", label: "采购管理", icon: "📦", cls: "k9-procurement", color: "#0891b2" },
  { module: "resource", label: "资源管理", icon: "👥", cls: "k9-resource", color: "#7c3aed" },
  { module: "document", label: "资料管理", icon: "📁", cls: "k9-document", color: "#6b7280" },
] as const;

const MODULE_LABEL_MAP: Record<string, string> = {
  scope: "范围管理",
  schedule: "进度管理",
  quality: "质量管理",
  cost: "成本管理",
  communication: "沟通管理",
  risk: "风险管理",
  procurement: "采购管理",
  resource: "资源管理",
  document: "资料管理",
  requirement: "需求管理",
  task: "任务管理",
};

const OPERATOR_LABEL: Record<string, string> = {
  eq: "等于", gt: "大于", lt: "小于", gte: "≥", lte: "≤", in: "包含", not_in: "排除",
};

const WA_CLASSES = ["wa-doc", "wa-risk", "wa-cost", "wa-scope", "wa-schedule", "wa-procurement"] as const;

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  suspended: "已暂停",
  planning: "规划中",
};

const CHART_COLORS = ["#22d3a0", "#3b82f6", "#f59e0b", "#ef4444"];

/* ============================================================
   Helpers
   ============================================================ */

function scoreColor(v: number) {
  if (v >= 90) return "#10b981";
  if (v >= 70) return "#f59e0b";
  return "#ef4444";
}

/* ============================================================
   Sub-components
   ============================================================ */

function KpiCard({
  value,
  label,
  variant,
  onSettings,
  onExport,
  warn,
  warnMsg,
}: {
  value: number | string;
  label: string;
  variant: 1 | 2 | 3 | 4 | 5 | 6;
  onSettings?: () => void;
  onExport?: () => void;
  warn?: boolean;
  warnMsg?: string;
}) {
  return (
    <div className={`tk tk-k${variant}`} style={{ position: "relative", ...(warn ? { boxShadow: "0 0 0 2px #ef4444", borderRadius: 10 } : {}) }}>
      <div className="tk-val" style={warn ? { color: "#ef4444" } : {}}>{value}</div>
      <div className="tk-label">{label}</div>
      {warn && warnMsg && (
        <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={warnMsg}>
          ⚠ {warnMsg}
        </div>
      )}
      {(onSettings || onExport) && (
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
          {onExport && (
            <button
              className="tk-gear"
              title="导出 CSV"
              onClick={(e) => {
                e.stopPropagation();
                onExport();
              }}
            >
              📥
            </button>
          )}
          {onSettings && (
            <button
              className="tk-gear"
              onClick={(e) => {
                e.stopPropagation();
                onSettings();
              }}
            >
              ⚙
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DomainCell({
  icon,
  label,
  score,
  cls,
  projectScores,
}: {
  icon: string;
  label: string;
  score: number;
  cls: string;
  projectScores: Array<{ name: string; pct: number }>;
}) {
  return (
    <div className={`k9 ${cls}`} style={{ position: "relative" }}>
      {score > 0 && score < 60 && (
        <span style={{
          position: "absolute", top: 6, right: 6, width: 8, height: 8,
          borderRadius: "50%", background: "#ef4444", border: "1px solid #fff",
        }} title={`${label}严重偏低 ${score}%`} />
      )}
      {score >= 60 && score < 75 && (
        <span style={{
          position: "absolute", top: 6, right: 6, width: 8, height: 8,
          borderRadius: "50%", background: "#f59e0b", border: "1px solid #fff",
        }} title={`${label}偏低 ${score}%`} />
      )}
      <div className="k9-icon">{icon}</div>
      <div className="k9-val" style={{ color: scoreColor(score) }}>
        {score}%
      </div>
      <div className="k9-label">{label}</div>
      <div className="k9-bars">
        {projectScores.slice(0, 2).map((ps, i) => (
          <div key={i} className="k9-bar">
            <div
              className="k9-bar-fill"
              style={{ width: `${ps.pct}%`, background: scoreColor(ps.pct) }}
            />
          </div>
        ))}
        {projectScores.length > 0 && (
          <div style={{ fontSize: 8, color: "var(--text3)", marginTop: 1 }}>
            {projectScores.slice(0, 2).map((ps) => ps.name).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function WarningPill({ level, text }: { level: "error" | "warning"; text: string }) {
  return <span className={`db-warn-pill ${level}`}>{level === "error" ? "●" : "●"} {text}</span>;
}

function HealthRankCard({
  item,
  isGold,
}: {
  item: HealthRankItem;
  isGold: boolean;
}) {
  return (
    <div className={`rank-card ${isGold ? "gold" : "silver"}`}>
      <div className={`rank-badge ${isGold ? "gold" : "silver"}`}>
        {isGold ? "🥇" : "🥈"}
      </div>
      <div>
        <div className="rank-name">{item.project_name}</div>
        <div className="rank-type">{item.project_type}</div>
      </div>
      <div className="rank-score" style={{ color: isGold ? "#d97706" : "#6b7280" }}>
        {item.score}%
      </div>
    </div>
  );
}

/* ============================================================
   DedicatedState type for inline KPI config dialogs
   ============================================================ */

interface Condition {
  column: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in";
  values: string[];
}
interface ConditionGroup {
  id: number;
  conditions: Condition[];
  relation: "AND" | "OR";
}

type DedicatedState = {
  open: boolean; kpiKey: string; label: string;
  currentConfig: any; module: string; table: string;
  columns: Array<{ name: string; type: string; options?: string[] }>;
  colA: string; valA: string; colB: string; valB: string;
  valAOptions: string[]; valBOptions: string[]; saving: boolean;
  groups: ConditionGroup[];
  expression: string;
  nextGroupId: number;
  // 预警阀值
  thresholdEnabled: boolean;
  thresholdOperator: "gt" | "lt" | "gte" | "lte" | "eq";
  thresholdValue: string;
};

const EMPTY_DEDICATED: DedicatedState = {
  open: false, kpiKey: "", label: "",
  currentConfig: null, module: "", table: "",
  columns: [], colA: "", valA: "", colB: "", valB: "",
  valAOptions: [], valBOptions: [], saving: false,
  groups: [], expression: "s0", nextGroupId: 0,
  thresholdEnabled: false, thresholdOperator: "gt", thresholdValue: "",
};

/* ============================================================
   Main Component
   ============================================================ */

/* ConditionAdder — module-level component so React doesn't remount it on parent re-renders */
function ConditionAdder({ columns, onAdd }: { columns: Array<{ name: string; type: string; options?: string[] }>; onAdd: (column: string, operator: Condition["operator"]) => void }) {
  const [col, setCol] = useState("");
  const [op, setOp] = useState<Condition["operator"]>("eq");
  return (
    <div className="flex items-center gap-1 mt-1">
      <select className="h-7 rounded border border-input bg-transparent px-1 text-xs" style={{ minWidth: 80 }} value={col}
        onChange={(e) => setCol(e.target.value)}>
        <option value="">-- 列 --</option>
        {columns.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
      </select>
      <select className="h-7 rounded border border-input bg-transparent px-1 text-xs" style={{ minWidth: 56 }} value={op}
        onChange={(e) => setOp(e.target.value as Condition["operator"])}>
        {Object.entries(OPERATOR_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
      </select>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { onAdd(col, op); setCol(""); setOp("eq"); }} disabled={!col}>
        + 添加
      </Button>
    </div>
  );
}

export function ProjectDashboard({
  onViewProject,
  isSuperAdmin,
}: {
  onViewProject?: (projectId: string) => void;
  isSuperAdmin?: boolean;
}) {
  /* ---- state ---- */
  const [data, setData] = useState<DashboardFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPI threshold alerts: kpi_key → { triggered, operator, threshold, currentValue }
  const [kpiAlerts, setKpiAlerts] = useState<Record<string, { triggered: boolean; level: "error" | "warning"; operator: string; threshold: number; currentValue: number }>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [domainPopoverOpen, setDomainPopoverOpen] = useState(false);
  const [radarDomainPopoverOpen, setRadarDomainPopoverOpen] = useState(false);

  /* KPI config defs (shared across all dialogs) */
  const [kpiConfigDefs, setKpiConfigDefs] = useState<Array<{
    table_code: string; table_name: string; module_type: string[];
  }>>([]);

  /* ---- Dedicated KPI config state hooks ---- */
  const [highRisk, setHighRisk] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [taskTotal, setTaskTotal] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [kpiCard, setKpiCard] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [domainCfg, setDomainCfg] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [reqStats, setReqStats] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [warningCfg, setWarningCfg] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [healthRank, setHealthRank] = useState<DedicatedState>(EMPTY_DEDICATED);
  const [weakArea, setWeakArea] = useState<DedicatedState>(EMPTY_DEDICATED);

  /* ---- Shared KPI config helpers ---- */

  const openDedicated = (setter: any, kpiKey: string, label: string) => {
    setter((p: any) => ({ ...EMPTY_DEDICATED, open: true, kpiKey, label }));
    fetch(`/api/dashboard/kpi-config?kpi_key=${encodeURIComponent(kpiKey)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const cfg = json.data;
          let mod = "", table = "", expression = "s0", nextId = 0;
          let groups: ConditionGroup[] = [];

          if (cfg.sources && Array.isArray(cfg.sources) && cfg.sources.length > 0) {
            // New format: {sources: [...], expression: "..."}
            groups = cfg.sources.map((s: any) => ({
              id: nextId++,
              conditions: (s.conditions || []).map((c: any) => ({
                column: String(c.column || ""),
                operator: (c.operator || "eq") as Condition["operator"],
                values: Array.isArray(c.values) ? c.values.map(String) : [],
              })),
              relation: (s.relation === "OR" ? "OR" : "AND") as "AND" | "OR",
            }));
            expression = cfg.expression || groups.map((_, i) => `s${i}`).join(" + ");
            mod = cfg.sources[0]?.module_type || "";
            table = cfg.sources[0]?.table_code || "";
          } else if (cfg.include_column || cfg.exclude_column) {
            // Legacy format: {include_column, include_value, exclude_column, exclude_value}
            mod = cfg.module_type || "";
            table = cfg.table_code || "";
            const hasA = cfg.include_column && cfg.include_value;
            const hasB = cfg.exclude_column && cfg.exclude_value;
            if (hasA) {
              groups.push({
                id: nextId++,
                conditions: [{ column: cfg.include_column, operator: "eq" as const, values: [cfg.include_value] }],
                relation: "AND" as const,
              });
            }
            if (hasB) {
              groups.push({
                id: nextId++,
                conditions: [
                  ...(hasA ? [{ column: cfg.include_column, operator: "eq" as const, values: [cfg.include_value] }] : []),
                  { column: cfg.exclude_column, operator: "eq" as const, values: [cfg.exclude_value] },
                ],
                relation: "AND" as const,
              });
            }
            expression = groups.length === 2 ? "s0 - s1" : groups.length === 1 ? "s0" : "";
          } else if (cfg.table_code) {
            // Very old format: just {table_code, module_type, table_name}
            mod = cfg.module_type || "";
            table = cfg.table_code || "";
          }
          // Parse threshold
        const threshold = cfg.threshold as { enabled?: boolean; operator?: string; value?: number } | undefined;
        setter((p: any) => ({
          ...p, currentConfig: cfg, module: mod, table, groups, expression, nextGroupId: nextId,
          thresholdEnabled: threshold?.enabled || false,
          thresholdOperator: (threshold?.operator as DedicatedState["thresholdOperator"]) || "gt",
          thresholdValue: threshold?.value != null ? String(threshold.value) : "",
        }));
        }
      })
      .catch(() => {});
  };

  const tableOptionsFor = (state: DedicatedState) => {
    if (!state.module) return [];
    return kpiConfigDefs.filter(d => d.module_type?.includes(state.module))
      .map(d => ({ table_code: d.table_code, table_name: d.table_name }))
      .sort((a, b) => a.table_code.localeCompare(b.table_code));
  };

  const addGroup = (setter: any) => setter((p: any) => {
    const newGroups = [...p.groups, { id: p.nextGroupId, conditions: [], relation: "AND" as const }];
    return { ...p, groups: newGroups, nextGroupId: p.nextGroupId + 1, expression: newGroups.map((_: any, i: number) => `s${i}`).join(" + ") };
  });
  const removeGroup = (setter: any, groupId: number) => setter((p: any) => {
    const newGroups = p.groups.filter((g: ConditionGroup) => g.id !== groupId);
    return { ...p, groups: newGroups, expression: newGroups.map((_: any, i: number) => `s${i}`).join(" + ") };
  });
  const toggleGroupRelation = (setter: any, groupId: number) => setter((p: any) => ({
    ...p, groups: p.groups.map((g: ConditionGroup) => g.id === groupId ? { ...g, relation: g.relation === "AND" ? "OR" as const : "AND" as const } : g)
  }));

  const addConditionToGroup = (setter: any, groupId: number, column: string, operator: Condition["operator"]) => {
    if (!column) return;
    setter((p: any) => ({
      ...p, groups: p.groups.map((g: ConditionGroup) => {
        if (g.id !== groupId) return g;
        return { ...g, conditions: [...g.conditions, { column, operator, values: [] }] };
      })
    }));
  };
  const removeConditionFromGroup = (setter: any, groupId: number, condIndex: number) => setter((p: any) => ({
    ...p, groups: p.groups.map((g: ConditionGroup) => g.id === groupId ? { ...g, conditions: g.conditions.filter((_: any, i: number) => i !== condIndex) } : g)
  }));
  const updateConditionOperator = (setter: any, groupId: number, condIndex: number, operator: Condition["operator"]) => setter((p: any) => ({
    ...p, groups: p.groups.map((g: ConditionGroup) => g.id === groupId ? { ...g, conditions: g.conditions.map((c: Condition, i: number) => i === condIndex ? { ...c, operator, values: [] } : c) } : g)
  }));
  const setConditionValue = (setter: any, groupId: number, condIndex: number, value: string) => setter((p: any) => ({
    ...p, groups: p.groups.map((g: ConditionGroup) => g.id === groupId ? { ...g, conditions: g.conditions.map((c: Condition, i: number) => i === condIndex ? { ...c, values: [value] } : c) } : g)
  }));
  const toggleConditionValue = (setter: any, groupId: number, condIndex: number, value: string) => setter((p: any) => ({
    ...p, groups: p.groups.map((g: ConditionGroup) => g.id === groupId ? { ...g, conditions: g.conditions.map((c: Condition, i: number) => i === condIndex ? { ...c, values: c.values.includes(value) ? c.values.filter((v: string) => v !== value) : [...c.values, value] } : c) } : g)
  }));

  const getColumnInfo = (state: DedicatedState, columnName: string) =>
    state.columns.find((c: any) => c.name === columnName);

  const saveDedicated = async (state: DedicatedState, setter: any, refresh: () => void) => {
    if (!state.table) return;
    const def = kpiConfigDefs.find((d: any) => d.table_code === state.table);

    // If groups is empty but legacy colA exists, auto-create a group
    let groups = state.groups;
    if (groups.length === 0 && state.colA && state.valA) {
      groups = [{ id: 0, conditions: [{ column: state.colA, operator: "eq" as const, values: [state.valA] }], relation: "AND" as const }];
    }

    const sources = groups
      .filter((g: ConditionGroup) => g.conditions.length > 0 && g.conditions.some((c: Condition) => c.column && (c.values.length > 0 || c.operator === "in" || c.operator === "not_in")))
      .map((g: ConditionGroup) => ({
        table_code: state.table,
        module_type: state.module,
        table_name: def?.table_name || state.table,
        conditions: g.conditions
          .filter((c: Condition) => c.column)
          .map((c: Condition) => ({ column: c.column, operator: c.operator, values: c.values })),
        relation: g.relation,
      }));

    if (sources.length === 0) return;

    const configValue: any = { sources, expression: state.expression || sources.map((_: any, i: number) => `s${i}`).join(" + ") };
    if (state.thresholdEnabled && state.thresholdValue) {
      configValue.threshold = { enabled: true, operator: state.thresholdOperator, value: Number(state.thresholdValue) || 0 };
    }

    setter((p: any) => ({ ...p, saving: true }));
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ kpi_key: state.kpiKey, config_value: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setter((p: any) => ({ ...p, open: false, saving: false }));
      toast.success(`${state.label} 数据源已更新`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "保存失败");
      setter((p: any) => ({ ...p, saving: false }));
    }
  };

  const resetDedicated = async (state: DedicatedState, setter: any, refresh: () => void) => {
    setter((p: any) => ({ ...p, saving: true }));
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ kpi_key: state.kpiKey, config_value: null }),
      });
      setter((p: any) => ({ ...p, open: false, saving: false }));
      toast.success(`${state.label} 已恢复默认`);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "重置失败");
      setter((p: any) => ({ ...p, saving: false }));
    }
  };

  /* ---- Export helper ---- */
  const handleExportKpi = async (kpiKey: string, label?: string) => {
    try {
      const res = await fetch(`/api/dashboard/kpi-config?kpi_key=${encodeURIComponent(kpiKey)}`);
      const json = await res.json();
      const cfg = json.data;
      if (!cfg?.sources?.length) {
        toast.error("该 KPI 未配置数据源，请先设置");
        return;
      }
      const exportLabel = label || kpiKey;
      const urlParams = new URLSearchParams(window.location.search);
      const query = new URLSearchParams();
      const dept = urlParams.get("department");
      const status = urlParams.get("status");
      if (dept && dept !== "all") query.set("department", dept);
      if (status && status !== "all") query.set("status", status);
      const qs = query.toString();
      const exportRes = await fetch(`/api/dashboard/export-source-data${qs ? "?" + qs : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: cfg.sources, label: exportLabel }),
      });
      if (!exportRes.ok) {
        const err = await exportRes.json().catch(() => ({ error: "导出失败" }));
        throw new Error(err.error || "导出失败");
      }
      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
      a.download = `${exportLabel}-${ds}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch (e: any) {
      toast.error(e.message || "导出失败");
    }
  };

  /* AI */
  const [aiWarnings, setAiWarnings] = useState<AIWarning[] | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConversationHistory, setAiConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [aiFollowUpQuestion, setAiFollowUpQuestion] = useState("");
  const [aiFollowUpLoading, setAiFollowUpLoading] = useState(false);

  /* real-time clock */
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- load KPI table definitions (shared) ---- */
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/standards")
      .then((r) => r.json())
      .then((json) => {
        const defs = (json.data || []).filter(
          (d: any) => !String(d.table_code || "").startsWith("task_")
        );
        setKpiConfigDefs(defs);
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  /* ---- fetch ---- */
  const fetchData = useCallback(async (ids?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ids && ids.length > 0) params.set("project_ids", ids.join(","));
      if (deptFilter !== "all") params.set("department", deptFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/projects/dashboard-full?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || "加载失败");
      const json = await res.json();
      setData(json.data);
      if (!ids) {
        setSelectedIds(new Set(json.data.projects.map((p: { id: string }) => p.id)));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [deptFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Load cached AI warnings */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects/dashboard-warnings");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setAiWarnings(json.data.warnings || []);
            if (json.data.raw_response) setAiResult(json.data.raw_response);
          }
        }
      } catch {}
    })();
  }, []);

  /* Check KPI thresholds against current values */
  useEffect(() => {
    if (!data) return;
    const kpiKeys = ["total_projects", "requirement_total", "high_risk_remaining", "task_total", "stakeholders", "procurement_items", "completion_rate", "in_development", "pending_confirmation", "backlog"];
    const kpiValues: Record<string, number> = {
      total_projects: data.kpi.total_projects,
      requirement_total: data.kpi.total_requirements,
      high_risk_remaining: data.kpi.high_risk_remaining,
      task_total: data.kpi.total_tasks,
      stakeholders: data.kpi.stakeholders,
      procurement_items: data.kpi.procurement_items,
      completion_rate: data.requirements.stats.completion_rate,
      in_development: data.requirements.stats.in_development,
      pending_confirmation: data.requirements.stats.pending_confirmation,
      backlog: data.requirements.backlog.backlog_count,
    };
    const alerts: Record<string, any> = {};
    let pending = kpiKeys.length;
    kpiKeys.forEach((key) => {
      fetch(`/api/dashboard/kpi-config?kpi_key=${encodeURIComponent(key)}`)
        .then((r) => r.json())
        .then((json) => {
          const cfg = json.data;
          if (cfg?.threshold?.enabled && cfg.threshold.value != null) {
            const currentVal = kpiValues[key] ?? 0;
            const threshold = Number(cfg.threshold.value);
            const op = cfg.threshold.operator || "gt";
            let triggered = false;
            switch (op) {
              case "gt": triggered = currentVal > threshold; break;
              case "gte": triggered = currentVal >= threshold; break;
              case "lt": triggered = currentVal < threshold; break;
              case "lte": triggered = currentVal <= threshold; break;
              case "eq": triggered = currentVal === threshold; break;
            }
            if (triggered) {
              alerts[key] = { triggered: true, level: "warning" as const, operator: op, threshold, currentValue: currentVal };
            }
          }
        })
        .catch(() => {})
        .finally(() => { pending--; if (pending === 0) setKpiAlerts({ ...alerts }); });
    });
  }, [data]);

  /* ---- handlers ---- */
  const handleProjectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!data) return;
    setSelectedIds(new Set(data.projects.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const applyProjectSelection = () => {
    if (selectedIds.size === 0) {
      fetchData();
    } else {
      fetchData(Array.from(selectedIds));
    }
    setProjectModalOpen(false);
  };

  const generateAiWarnings = async () => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiResult(null);
    setAiGenerating(true);
    try {
      const projectIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await fetch("/api/projects/dashboard-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_ids: projectIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "生成失败");
      const json = await res.json();
      if (json.data) {
        setAiWarnings(json.data.warnings || []);
        setAiResult(json.data.raw_response || "");
        if (json.data.conversationHistory) {
          setAiConversationHistory(json.data.conversationHistory);
        }
        const stats = json.data.stats;
        if (stats) {
          toast.success(
            `AI 扫描：${stats.projectCount} 个项目、${stats.tableCount} 张表 → ${stats.warningCount} 条预警`
          );
        } else {
          toast.success(`AI 预警生成完成，共 ${json.data.warnings?.length || 0} 条`);
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setAiLoading(false);
      setAiGenerating(false);
    }
  };

  const handleAIFollowUp = useCallback(async () => {
    const q = aiFollowUpQuestion.trim();
    if (!q || aiConversationHistory.length === 0) return;
    setAiFollowUpLoading(true);
    setAiFollowUpQuestion("");
    try {
      const res = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema: "dashboard",
          question: q,
          conversationHistory: aiConversationHistory,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error || "追问失败");
        return;
      }
      if (json.data?.analysis) {
        setAiConversationHistory((prev) => [
          ...prev,
          { role: "user", content: q },
          { role: "assistant", content: json.data.analysis },
        ]);
        setAiResult(json.data.analysis);
      }
    } catch (e) {
      toast.error("追问失败: " + String(e));
    } finally {
      setAiFollowUpLoading(false);
    }
  }, [aiFollowUpQuestion, aiConversationHistory]);

  /* ---- computed ---- */
  const allProjects = data?.projects || [];

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allProjects;
    const q = searchQuery.toLowerCase();
    return allProjects.filter(
      (p) =>
        p.project_name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        (p.role_project_manager || "").toLowerCase().includes(q)
    );
  }, [allProjects, searchQuery]);

  const kpi = data?.kpi;

  /* Project domain health for radar */
  const radarData = useMemo(() => {
    if (!data?.domain_averages) return [];
    return data.domain_averages.map((d) => ({
      domain: d.label,
      ...Object.fromEntries(
        (data.project_domain_health || []).slice(0, 2).map((p, i) => [
          p.project_name.slice(0, 6),
          p.scores[d.module] || 0,
        ])
      ),
      [d.label]: d.avg,
    }));
  }, [data]);

  const radarProjects = (data?.project_domain_health || []).slice(0, 2);

  /* Weak areas with chart data */
  const weakAreas = data?.weak_areas || [];

  /* Req detail search */
  const [reqSearch, setReqSearch] = useState("");
  const reqDetails = data?.requirements.detail_list || [];
  const filteredReqs = useMemo(() => {
    if (!reqSearch.trim()) return reqDetails;
    const q = reqSearch.toLowerCase();
    return reqDetails.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [reqDetails, reqSearch]);

  /* ---- KPI config helpers (shared) ---- */
  const kpiModuleOptions = useMemo(() => {
    const modules = new Set<string>();
    for (const d of kpiConfigDefs) {
      if (d.module_type?.length > 0) modules.add(d.module_type[0]);
    }
    return Array.from(modules)
      .map((code) => ({ code, label: MODULE_LABEL_MAP[code] || code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [kpiConfigDefs]);

  // ---- dedicated config column loaders (must be before any conditional return) ----
  useEffect(() => { if (kpiCard.open) loadColumnsForDedicated(kpiCard, setKpiCard); }, [kpiCard.open, kpiCard.table]);
  useEffect(() => { if (domainCfg.open) loadColumnsForDedicated(domainCfg, setDomainCfg); }, [domainCfg.open, domainCfg.table]);
  useEffect(() => { if (reqStats.open) loadColumnsForDedicated(reqStats, setReqStats); }, [reqStats.open, reqStats.table]);
  useEffect(() => { if (warningCfg.open) loadColumnsForDedicated(warningCfg, setWarningCfg); }, [warningCfg.open, warningCfg.table]);
  useEffect(() => { if (healthRank.open) loadColumnsForDedicated(healthRank, setHealthRank); }, [healthRank.open, healthRank.table]);
  useEffect(() => { if (weakArea.open) loadColumnsForDedicated(weakArea, setWeakArea); }, [weakArea.open, weakArea.table]);
  useEffect(() => { if (highRisk.open) loadColumnsForDedicated(highRisk, setHighRisk); }, [highRisk.open, highRisk.table]);
  useEffect(() => { if (taskTotal.open) loadColumnsForDedicated(taskTotal, setTaskTotal); }, [taskTotal.open, taskTotal.table]);

  /* ---- loading / error states ---- */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">加载看板数据...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData()}>
          重试
        </Button>
      </div>
    );
  }

  if (!data) return null;

  /* ---- Dedicated KPI dialog handlers ---- */

  const refreshData = () => fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);

  const renderDedicatedDialog = (state: DedicatedState, setter: any) => {
    const isMultiValue = (op: Condition["operator"]) => op === "in" || op === "not_in";
    return (
      <Dialog open={state.open} onOpenChange={(v) => setter((p: any) => ({ ...p, open: v }))}>
        <DialogContent style={{ maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>{state.label} · 数据源配置</DialogTitle>
            <DialogDescription>
              设置"{state.label}"指标的数据来源表和筛选条件组。条件组之间通过表达式进行运算。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3" style={{ marginTop: 8, marginBottom: 8, flex: 1, overflowY: "auto", minHeight: 0 }}>
            {/* Current config */}
            {state.currentConfig && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                当前: <strong>{state.currentConfig.table_name || state.currentConfig.table_code}</strong>
                {state.currentConfig.module_type && (
                  <>（{MODULE_LABEL_MAP[state.currentConfig.module_type] || state.currentConfig.module_type} 模块）</>
                )}
              </div>
            )}

            {/* Module select */}
            <div>
              <Label className="text-xs">选择模块</Label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={state.module}
                onChange={(e) => setter((p: any) => ({ ...p, module: e.target.value, table: "", columns: [], groups: [], expression: "s0", nextGroupId: 0 }))}>
                <option value="">-- 选择模块 --</option>
                {kpiModuleOptions.map((m: any) => (<option key={m.code} value={m.code}>{m.label}</option>))}
              </select>
            </div>

            {/* Table select */}
            {state.module && (
              <div>
                <Label className="text-xs">选择数据表</Label>
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={state.table}
                  onChange={(e) => setter((p: any) => ({ ...p, table: e.target.value, columns: [], groups: [], expression: "s0", nextGroupId: 0 }))}>
                  <option value="">-- 选择数据表 --</option>
                  {tableOptionsFor(state).map((t: any) => (<option key={t.table_code} value={t.table_code}>{t.table_name}</option>))}
                </select>
              </div>
            )}

            {/* Condition Groups (scrollable) */}
            {state.table && (
              <div className="space-y-3" style={{ paddingRight: 4 }}>
                {state.groups.map((g: ConditionGroup, gi: number) => (
                  <div key={g.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
                    {/* Group header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                        条件组 s{gi}
                      </span>
                      <div className="flex items-center gap-2">
                        <select className="h-7 rounded border border-input bg-transparent px-2 text-xs"
                          value={g.relation}
                          onChange={() => toggleGroupRelation(setter, g.id)}>
                          <option value="AND">且 (AND)</option>
                          <option value="OR">或 (OR)</option>
                        </select>
                        <button className="text-xs text-red-500 hover:text-red-700" onClick={() => removeGroup(setter, g.id)} title="删除此组">✕</button>
                      </div>
                    </div>

                    {/* Conditions */}
                    {g.conditions.map((c: Condition, ci: number) => {
                      const colInfo = getColumnInfo(state, c.column);
                      const hasOptions = colInfo?.options && colInfo.options.length > 0;
                      return (
                        <div key={ci} className="mb-2">
                          {ci > 0 && (
                            <div className="text-center text-[10px] text-muted-foreground my-1">
                              —— {g.relation} ——
                            </div>
                          )}
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Column select */}
                            <select className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ minWidth: 100 }}
                              value={c.column}
                              onChange={(e) => {
                                const newOp = e.target.value ? (c.operator || "eq") : "eq";
                                setter((p: any) => ({ ...p, groups: p.groups.map((gg: ConditionGroup) => gg.id === g.id ? { ...gg, conditions: gg.conditions.map((cc: Condition, ii: number) => ii === ci ? { ...cc, column: e.target.value, operator: newOp as Condition["operator"], values: [] } : cc) } : gg) }));
                              }}>
                              <option value="">-- 列 --</option>
                              {state.columns.map((col: any) => (<option key={col.name} value={col.name}>{col.name}</option>))}
                            </select>
                            {/* Operator select */}
                            <select className="h-8 rounded border border-input bg-transparent px-1 text-xs" style={{ minWidth: 64 }}
                              value={c.operator}
                              onChange={(e) => updateConditionOperator(setter, g.id, ci, e.target.value as Condition["operator"])}>
                              {Object.entries(OPERATOR_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                            </select>
                            {/* Value input */}
                            {c.column && (
                              isMultiValue(c.operator) ? (
                                hasOptions ? (
                                  <div className="flex flex-wrap gap-1" style={{ maxWidth: 200, maxHeight: 80, overflowY: "auto" }}>
                                    {colInfo!.options!.map((opt: string) => (
                                      <label key={opt} className="flex items-center gap-1 text-xs" style={{ cursor: "pointer" }}>
                                        <input type="checkbox" checked={c.values.includes(opt)}
                                          onChange={(e) => toggleConditionValue(setter, g.id, ci, opt)} />
                                        {opt}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <input className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ width: 120 }}
                                    placeholder="逗号分隔多个值"
                                    value={c.values.join(", ")}
                                    onChange={(e) => setter((p: any) => ({ ...p, groups: p.groups.map((gg: ConditionGroup) => gg.id === g.id ? { ...gg, conditions: gg.conditions.map((cc: Condition, ii: number) => ii === ci ? { ...cc, values: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) } : cc) } : gg) }))} />
                                )
                              ) : (
                                hasOptions ? (
                                  <select className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ minWidth: 80 }}
                                    value={c.values[0] || ""}
                                    onChange={(e) => setConditionValue(setter, g.id, ci, e.target.value)}>
                                    <option value="">-- 值 --</option>
                                    {colInfo!.options!.map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
                                  </select>
                                ) : (
                                  <input className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ width: 120 }}
                                    placeholder="输入值..."
                                    value={c.values[0] || ""}
                                    onChange={(e) => setConditionValue(setter, g.id, ci, e.target.value)} />
                                )
                              )
                            )}
                            <button className="text-xs text-red-400 hover:text-red-600 ml-1" onClick={() => removeConditionFromGroup(setter, g.id, ci)}>✕</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add condition row */}
                    <ConditionAdder columns={state.columns} onAdd={(col: string, op: Condition["operator"]) => addConditionToGroup(setter, g.id, col, op)} />
                  </div>
                ))}
              </div>
            )}

            {/* Add group button */}
            {state.table && (
              <Button variant="outline" size="sm" onClick={() => addGroup(setter)} className="w-full text-xs">
                + 添加条件组
              </Button>
            )}

            {/* Expression editor */}
            {state.table && state.groups.length > 0 && (
              <div>
                <Label className="text-xs">表达式（s0, s1, ... 对应上方条件组，支持 + - * / 和括号）</Label>
                <input type="text" className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" style={{ fontFamily: "var(--font-mono)" }}
                  value={state.expression}
                  onChange={(e) => setter((p: any) => ({ ...p, expression: e.target.value }))}
                  placeholder="s0" />
              </div>
            )}

            {/* Formula preview */}
            {state.table && state.groups.length > 0 && state.groups.some((g: ConditionGroup) => g.conditions.length > 0 && g.conditions.some((c: Condition) => c.column && (c.values.length > 0 || c.operator === "in" || c.operator === "not_in"))) && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2" style={{ maxHeight: 120, overflowY: "auto" }}>
                <div className="font-semibold mb-1">公式预览:</div>
                {state.groups.map((g: ConditionGroup, gi: number) => {
                  const parts = g.conditions.filter((c: Condition) => c.column && (c.values.length > 0 || c.operator === "in" || c.operator === "not_in"))
                    .map((c: Condition) => {
                      const opSymbol = c.operator === "eq" ? "=" : c.operator === "gt" ? ">" : c.operator === "lt" ? "<" : c.operator === "gte" ? ">=" : c.operator === "lte" ? "<=" : c.operator === "in" ? "IN" : "NOT IN";
                      const valStr = c.values.join(", ");
                      return `${c.column} ${opSymbol} ${isMultiValue(c.operator) ? `(${valStr})` : `"${valStr}"`}`;
                    });
                  if (parts.length === 0) return null;
                  return <div key={g.id} className="mb-1">s{gi} = COUNT({parts.join(` ${g.relation} `)})</div>;
                })}
                <div className="font-semibold">= {state.expression || "s0"}</div>
              </div>
            )}
          </div>

          {/* Threshold config */}
          {state.table && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id={`threshold-${state.kpiKey}`} checked={state.thresholdEnabled}
                  onChange={(e) => setter((p: any) => ({ ...p, thresholdEnabled: e.target.checked, thresholdValue: e.target.checked ? p.thresholdValue : "" }))} />
                <Label className="text-xs font-semibold cursor-pointer" htmlFor={`threshold-${state.kpiKey}`}>⚠️ 预警阀值（可选）</Label>
              </div>
              {state.thresholdEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">当指标值</span>
                  <select className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ minWidth: 70 }}
                    value={state.thresholdOperator}
                    onChange={(e) => setter((p: any) => ({ ...p, thresholdOperator: e.target.value }))}>
                    <option value="gt">大于</option>
                    <option value="gte">大于等于</option>
                    <option value="lt">小于</option>
                    <option value="lte">小于等于</option>
                    <option value="eq">等于</option>
                  </select>
                  <input className="h-8 rounded border border-input bg-transparent px-2 text-xs" style={{ width: 80 }}
                    type="number" placeholder="阀值"
                    value={state.thresholdValue}
                    onChange={(e) => setter((p: any) => ({ ...p, thresholdValue: e.target.value }))} />
                  <span className="text-xs text-muted-foreground">时预警</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            <div>
              {state.currentConfig && (
                <Button variant="ghost" size="sm" onClick={() => resetDedicated(state, setter, refreshData)} disabled={state.saving} className="text-muted-foreground">
                  恢复默认
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setter((p: any) => ({ ...p, open: false }))}>取消</Button>
              <Button size="sm" onClick={() => saveDedicated(state, setter, refreshData)} disabled={state.saving || !state.table}>
                {state.saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Load column options when a table is selected in the generic dialog
  const loadColumnsForDedicated = (state: DedicatedState, setter: any) => {
    if (!state.table || state.columns.length > 0) return;
    fetch(`/api/dashboard/table-columns?table_code=${encodeURIComponent(state.table)}`)
      .then((r) => r.json())
      .then((json) => setter((p: any) => ({ ...p, columns: json.data || [] })))
      .catch(() => {});
  };

  // Trigger column loading for generic dialogs
  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="db" style={{ padding: "0 14px 24px", background: "var(--bg)", minHeight: "100%" }}>
      {/* ========== Header ========== */}
      <div className="db-header">
        <div className="flex items-center gap-4">
          <div className="db-pulse" />
          <button className="btn-sm" onClick={() => setProjectModalOpen(true)}>
            🔍 切换项目
          </button>
          <button className="btn-sm" onClick={() => setDeptModalOpen(true)}>
            🏢 {deptFilter === "all" ? "部门筛选" : deptFilter}
          </button>
          <button className="btn-sm" onClick={() => setStatusModalOpen(true)}>
            📊 {statusFilter === "all" ? "项目状态" : STATUS_LABELS[statusFilter] || statusFilter}
          </button>
          <span className="btn-sm" style={{ cursor: "default" }}>
            📅 时间筛选
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={generateAiWarnings}
            disabled={aiGenerating}
          >
            {aiGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> AI 分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> 生成新预警
              </>
            )}
          </Button>
          <span className="db-clock">{clock}</span>
        </div>
      </div>

      {/* ========== KPI Row ========== */}
      <div className="kpi6" style={{ marginTop: 10 }}>
        <KpiCard
          value={selectedIds.size === 1 ? (allProjects.find((p) => selectedIds.has(p.id))?.customer_info?.company_name || "未分类") : kpi?.total_projects ?? 0}
          label={selectedIds.size === 1 ? "客户类型" : "项目总数"}
          variant={1}
          onSettings={isSuperAdmin && selectedIds.size !== 1 ? () => openDedicated(setKpiCard, "total_projects", "项目总数") : undefined}
          onExport={isSuperAdmin && selectedIds.size !== 1 ? () => handleExportKpi("total_projects", "项目总数") : undefined}
          warn={!!kpiAlerts["total_projects"]?.triggered}
          warnMsg={kpiAlerts["total_projects"]?.triggered ? `当前值 ${kpiAlerts["total_projects"].currentValue} 触发阀值预警` : undefined}
        />
        <KpiCard
          value={kpi?.total_requirements ?? 0}
          label="需求总数"
          variant={2}
          onSettings={isSuperAdmin ? () => openDedicated(setKpiCard, "requirement_total", "需求总数") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("requirement_total", "需求总数") : undefined}
          warn={!!kpiAlerts["requirement_total"]?.triggered}
          warnMsg={kpiAlerts["requirement_total"]?.triggered ? `当前值 ${kpiAlerts["requirement_total"].currentValue} 触发阀值预警` : undefined}
        />
        <KpiCard
          value={kpi?.high_risk_remaining ?? 0}
          label="高风险残留"
          variant={3}
          onSettings={isSuperAdmin ? () => openDedicated(setHighRisk, "high_risk_remaining", "高风险残留") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("high_risk_remaining", "高风险残留") : undefined}
          warn={!!kpiAlerts["high_risk_remaining"]?.triggered}
          warnMsg={kpiAlerts["high_risk_remaining"]?.triggered ? `当前值 ${kpiAlerts["high_risk_remaining"].currentValue} 触发阀值预警` : undefined}
        />
        <KpiCard
          value={kpi?.total_tasks ?? 0}
          label="任务总数"
          variant={4}
          onSettings={isSuperAdmin ? () => openDedicated(setTaskTotal, "task_total", "任务总数") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("task_total", "任务总数") : undefined}
          warn={!!kpiAlerts["task_total"]?.triggered}
          warnMsg={kpiAlerts["task_total"]?.triggered ? `当前值 ${kpiAlerts["task_total"].currentValue} 触发阀值预警` : undefined}
        />
        <KpiCard
          value={kpi?.stakeholders ?? 0}
          label="干系人"
          variant={5}
          onSettings={isSuperAdmin ? () => openDedicated(setKpiCard, "stakeholders", "干系人") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("stakeholders", "干系人") : undefined}
          warn={!!kpiAlerts["stakeholders"]?.triggered}
          warnMsg={kpiAlerts["stakeholders"]?.triggered ? `当前值 ${kpiAlerts["stakeholders"].currentValue} 触发阀值预警` : undefined}
        />
        <KpiCard
          value={kpi?.procurement_items ?? 0}
          label="采购项"
          variant={6}
          onSettings={isSuperAdmin ? () => openDedicated(setKpiCard, "procurement_items", "采购项") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("procurement_items", "采购项") : undefined}
          warn={!!kpiAlerts["procurement_items"]?.triggered}
          warnMsg={kpiAlerts["procurement_items"]?.triggered ? `当前值 ${kpiAlerts["procurement_items"].currentValue} 触发阀值预警` : undefined}
        />
      </div>

      {/* ========== Main 2-column layout ========== */}
      <div className="main2" style={{ marginBottom: 10 }}>
        {/* ---- LEFT PANEL ---- */}
        <div className="db-panel">
          {/* 9-domain grid */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>9 大领域指标</span>
            {isSuperAdmin ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Popover open={domainPopoverOpen} onOpenChange={setDomainPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="db-gear">⚙</button>
                  </PopoverTrigger>
                <PopoverContent className="w-52 p-2" align="end" style={{ borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>选择要配置的领域</div>
                  {NINE_DOMAINS.map((d) => (
                    <div
                      key={d.module}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "4px 4px", borderRadius: 6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <button
                        onClick={() => {
                          setDomainPopoverOpen(false);
                          openDedicated(setDomainCfg, `domain_score_${d.module}`, `${d.icon} ${d.label}`);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, flex: 1,
                          fontSize: 12, border: "none", cursor: "pointer",
                          background: "transparent", color: "var(--text)", textAlign: "left",
                          padding: "2px 4px",
                        }}
                      >
                        <span>{d.icon}</span>
                        <span>{d.label}</span>
                      </button>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          title="设置"
                          onClick={() => {
                            setDomainPopoverOpen(false);
                            openDedicated(setDomainCfg, `domain_score_${d.module}`, `${d.icon} ${d.label}`);
                          }}
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            border: "1px solid var(--border)", background: "var(--card2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: 11,
                          }}
                        >
                          ⚙
                        </button>
                        <button
                          title="导出 Excel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDomainPopoverOpen(false);
                            handleExportKpi(`domain_score_${d.module}`, `9大领域-${d.label}`);
                          }}
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            border: "1px solid var(--border)", background: "var(--card2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: 11,
                          }}
                        >
                          📥
                        </button>
                      </div>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
              </div>
            ) : (
              <button
                className="db-gear"
                onClick={() =>
                  openDedicated(setDomainCfg, "domain_score_non_admin", "9大领域指标")
                }
              >
                ⚙
              </button>
            )}
          </div>
          <div className="k93">
            {NINE_DOMAINS.map((d) => {
              const avg = data.domain_averages.find((a) => a.module === d.module)?.avg || 0;
              const projectScores = (data.project_domain_health || [])
                .slice(0, 2)
                .map((p) => ({ name: p.project_name.slice(0, 6), pct: p.scores[d.module] || 0 }));
              return (
                <DomainCell
                  key={d.module}
                  icon={d.icon}
                  label={d.label}
                  score={avg}
                  cls={d.cls}
                  projectScores={projectScores}
                />
              );
            })}
          </div>


          {/* Project type distribution */}
          {data.project_type_distribution.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {data.project_type_distribution.map((t, i) => (
                <div key={t.type} className={`db-type-card ${i === 0 ? "blue" : "green"}`}>
                  <div>
                    <div className="db-type-val">{t.count}</div>
                    <div className="db-type-label">{t.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- RIGHT PANEL ---- */}
        <div className="side">
          <div className="side-inner">
            {/* Radar chart */}
            <div className="db-panel" style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>9 维能力雷达</span>
                {isSuperAdmin && (
                  <Popover open={radarDomainPopoverOpen} onOpenChange={setRadarDomainPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className="db-gear">⚙</button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end" style={{ borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>选择要配置的领域</div>
                      {NINE_DOMAINS.map((d) => (
                        <div
                          key={d.module}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px", borderRadius: 6 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <button
                            onClick={() => {
                              setRadarDomainPopoverOpen(false);
                              openDedicated(setDomainCfg, `domain_score_${d.module}`, `${d.icon} ${d.label}`);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, fontSize: 12, border: "none", cursor: "pointer", background: "transparent", color: "var(--text)", textAlign: "left", padding: "2px 4px" }}
                          >
                            <span>{d.icon}</span>
                            <span>{d.label}</span>
                          </button>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button
                              title="设置"
                              onClick={() => {
                                setRadarDomainPopoverOpen(false);
                                openDedicated(setDomainCfg, `domain_score_${d.module}`, `${d.icon} ${d.label}`);
                              }}
                              style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11 }}
                            >
                              ⚙
                            </button>
                            <button
                              title="导出 Excel"
                              onClick={(e) => { e.stopPropagation(); setRadarDomainPopoverOpen(false); handleExportKpi(`domain_score_${d.module}`, `9大领域-${d.label}`); }}
                              style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11 }}
                            >
                              📥
                            </button>
                          </div>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {radarData.length === 0 ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>
                  暂无数据，请先配置领域指标数据源
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "#5f6570" }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 8, fill: "#949aa8" }}
                    tickCount={5}
                    stroke="#e5e7eb"
                  />
                  {radarProjects.length > 0 ? (
                    radarProjects.map((p, i) => (
                      <Radar
                        key={p.project_id}
                        name={p.project_name.slice(0, 6)}
                        dataKey={p.project_name.slice(0, 6)}
                        stroke={i === 0 ? "#4da3ff" : "#22d3a0"}
                        fill={i === 0 ? "#4da3ff" : "#22d3a0"}
                        fillOpacity={0.08}
                        strokeWidth={2}
                      />
                    ))
                  ) : (
                    <>
                      <Radar name="项目A" dataKey="项目A" stroke="#4da3ff" fill="#4da3ff" fillOpacity={0.08} strokeWidth={2} />
                      <Radar name="项目B" dataKey="项目B" stroke="#22d3a0" fill="#22d3a0" fillOpacity={0.08} strokeWidth={2} />
                    </>
                  )}
                </RadarChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Health ranking */}
            <div className="db-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>健康度排行</span>
                <button
                  className="db-gear"
                  onClick={() =>
                    openDedicated(setHealthRank, "health_ranking", "健康度排行")
                  }
                >
                  ⚙
                </button>
              </div>
              {(data.health_ranking.length > 0
                ? data.health_ranking.slice(0, 2)
                : [
                    { rank: 1, project_id: "1", project_name: "叙永智慧教育", project_type: "SaaS/托管", score: 76 },
                    { rank: 2, project_id: "2", project_name: "金沙一中", project_type: "私有化部署", score: 71 },
                  ]
              ).map((item, i) => (
                <HealthRankCard key={item.project_id} item={item} isGold={i === 0} />
              ))}
            </div>
          </div>

          {/* Weak areas */}
          <div className="db-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>薄弱环节 · 差距分析</span>
              <button
                className="db-gear"
                onClick={() =>
                  openDedicated(setWeakArea, "weak_areas", "薄弱环节")
                }
              >
                ⚙
              </button>
            </div>
            <div className="wa6">
              {(weakAreas.length > 0
                ? weakAreas
                : [
                    { module: "document", label: "资料管理", icon: "📁", avg_score: 68, lowest_project: "叙永教育", lowest_score: 65 },
                    { module: "risk", label: "风险控制", icon: "⚠️", avg_score: 67, lowest_project: "金沙一中", lowest_score: 64 },
                    { module: "cost", label: "成本回款", icon: "💰", avg_score: 70, lowest_project: "叙永教育", lowest_score: 66 },
                    { module: "scope", label: "范围确认", icon: "🎯", avg_score: 80, lowest_project: "叙永教育", lowest_score: 78 },
                    { module: "schedule", label: "任务执行", icon: "⏱", avg_score: 80, lowest_project: "金沙一中", lowest_score: 78 },
                    { module: "procurement", label: "采购到货", icon: "📦", avg_score: 79, lowest_project: "叙永教育", lowest_score: 76 },
                  ]
              ).map((wa, i) => (
                <div key={wa.module} className={`wa-card ${WA_CLASSES[i % WA_CLASSES.length]}`}>
                  <div className="wa-label">{wa.label}</div>
                  <div className="wa-score">{wa.avg_score}%</div>
                  <div className="wa-gap">
                    最低 {wa.lowest_project} {wa.lowest_score}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ========== Divider ========== */}
      <div className="dv">
        <div className="dl" />
        <div className="dt">范围管理 · 需求追踪</div>
        <div className="dl" />
      </div>

      {/* ========== Requirement Stats Row (7 items) ========== */}
      <div className="r4" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        <div className="rt rt-k1" style={{ position: "relative", borderTop: "3px solid #3b82f6" }}>
          <div className="rt-val">{data.requirements.stats.total}</div>
          <div className="rt-label">需求总数</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 CSV" onClick={(e) => { e.stopPropagation(); handleExportKpi("requirement_total", "需求总数"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openDedicated(setReqStats, "requirement_total", "需求总数"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k2" style={{ position: "relative", borderTop: "3px solid #10b981" }}>
          <div className="rt-val">{data.requirements.stats.completion_rate}%</div>
          <div className="rt-label">完成率</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("completion_rate", "完成率"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openDedicated(setReqStats, "completion_rate", "完成率"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k3" style={{ position: "relative", borderTop: "3px solid #f59e0b" }}>
          <div className="rt-val">{data.requirements.stats.in_development}</div>
          <div className="rt-label">开发中</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("in_development", "开发中"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openDedicated(setReqStats, "in_development", "开发中"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k4" style={{ position: "relative", borderTop: "3px solid #ef4444" }}>
          <div className="rt-val">{data.requirements.stats.pending_confirmation}</div>
          <div className="rt-label">待确认</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("pending_confirmation", "待确认"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openDedicated(setReqStats, "pending_confirmation", "待确认"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k1" style={{ position: "relative", borderTop: "3px solid #8b5cf6" }}>
          <div className="rt-val">{data.requirements.backlog.backlog_count}</div>
          <div className="rt-label">积压需求</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 CSV" onClick={(e) => { e.stopPropagation(); handleExportKpi("backlog", "积压需求"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openDedicated(setReqStats, "backlog", "积压需求"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k2" style={{ position: "relative", borderTop: "3px solid #ec4899" }}>
          <div className="rt-val">{data.requirements.detail_list.filter((r) => r.priority === "中").length}</div>
          <div className="rt-label">中优先级</div>
        </div>
        <div className="rt rt-k3" style={{ position: "relative", borderTop: "3px solid #06b6d4" }}>
          <div className="rt-val">{data.requirements.status_distribution.find((s) => s.status === "已完成")?.count || 0}</div>
          <div className="rt-label">已完成</div>
        </div>
      </div>

      {/* ========== Charts Row ========== */}
      <div className="r3">
        {/* Line chart */}
        <div className="r3-panel">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📈 需求累计完成趋势</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.requirements.cumulative_trend.length > 0
                  ? data.requirements.cumulative_trend
                  : [
                      { month: "2025-01", completed: 3, total: 8 },
                      { month: "2025-02", completed: 6, total: 14 },
                      { month: "2025-03", completed: 10, total: 19 },
                      { month: "2025-04", completed: 14, total: 22 },
                      { month: "2025-05", completed: 17, total: 25 },
                      { month: "2025-06", completed: 20, total: 28 },
                    ]
                }
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="已完成"
                  stroke="#4da3ff"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#4da3ff" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="总需求"
                  stroke="#22d3a0"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#22d3a0" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doughnut chart */}
        <div className="r3-panel">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📊 需求状态分布</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.requirements.status_distribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={0}
                  dataKey="count"
                  nameKey="status"
                  stroke="none"
                >
                  {data.requirements.status_distribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Horizontal bar chart */}
        <div className="r3-panel">
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>📋 需求分类分布</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.requirements.category_distribution}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="count"
                  fill="rgba(77,163,255,0.7)"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== Requirement Detail Table ========== */}
      <div className="db-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>需求明细列表</span>
          <button
            className="db-gear"
            onClick={() =>
              openDedicated(setReqStats, "requirement_detail", "需求明细")
            }
          >
            ⚙
          </button>
        </div>

        <div className="db-search-wrap">
          <span className="db-search-icon">🔍</span>
          <input
            className="db-search"
            placeholder="搜索需求 ID / 标题 / 类型..."
            value={reqSearch}
            onChange={(e) => setReqSearch(e.target.value)}
          />
        </div>

        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>类型</th>
                <th>优先级</th>
                <th>状态</th>
                <th>来源</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {filteredReqs.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.type}</td>
                  <td>
                    <span
                      className={cn(
                        "db-tag",
                        r.priority === "高" ? "high" : r.priority === "中" ? "medium" : "low"
                      )}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "db-status",
                        r.status === "已完成"
                          ? "done"
                          : r.status === "开发中"
                            ? "dev"
                            : r.status === "待确认"
                              ? "pending"
                              : "rejected"
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.source}</td>
                  <td>{r.date}</td>
                </tr>
              ))}
              {filteredReqs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                    无匹配需求记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
         MODALS
         ============================================================ */}

      {/* Project switch modal */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>切换项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="搜索项目名称/编号/经理..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleSelectAll}>
                ☑ 全选
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={handleDeselectAll}>
                ☐ 取消
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">已选 {selectedIds.size} 项</span>
            </div>
            <div className="max-h-[380px] overflow-y-auto space-y-1">
              {filteredProjects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <div
                    className={cn("db-check", selectedIds.has(p.id) && "checked")}
                    onClick={() => handleProjectToggle(p.id)}
                  >
                    {selectedIds.has(p.id) && <Check className="w-3 h-3" />}
                  </div>
                  <span className="flex-1 truncate">{p.project_name}</span>
                  <span className="text-xs text-muted-foreground">{p.project_code}</span>
                </label>
              ))}
              {filteredProjects.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">无匹配项目</div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-3 border-t mt-2">
            <Button variant="outline" size="sm" onClick={() => setProjectModalOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={applyProjectSelection}>
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department filter modal */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="max-w-sm" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>部门筛选</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[340px] overflow-y-auto">
            <label
              className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 text-sm"
              onClick={() => {
                setDeptFilter("all");
                setDeptModalOpen(false);
              }}
            >
              <div className={cn("db-check", deptFilter === "all" && "checked")}>
                {deptFilter === "all" && <Check className="w-3 h-3" />}
              </div>
              全部部门
            </label>
            {data.departments.map((dept) => (
              <label
                key={dept}
                className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 text-sm"
                onClick={() => {
                  setDeptFilter(dept);
                  setDeptModalOpen(false);
                }}
              >
                <div className={cn("db-check", deptFilter === dept && "checked")}>
                  {deptFilter === dept && <Check className="w-3 h-3" />}
                </div>
                {dept}
              </label>
            ))}
            {data.departments.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">暂无部门数据</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Status filter modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-sm" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>项目状态筛选</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-[340px] overflow-y-auto">
            {[
              { value: "all", label: "全部状态" },
              { value: "active", label: "进行中" },
              { value: "planning", label: "规划中" },
              { value: "completed", label: "已完成" },
              { value: "suspended", label: "已暂停" },
            ].map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 text-sm"
                onClick={() => {
                  setStatusFilter(s.value);
                  setStatusModalOpen(false);
                }}
              >
                <div className={cn("db-check", statusFilter === s.value && "checked")}>
                  {statusFilter === s.value && <Check className="w-3 h-3" />}
                </div>
                {s.label}
              </label>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI analysis dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles className="w-5 h-5 text-teal-500" />
              AI 预警分析报告
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            {aiLoading && (
              <div className="flex flex-col items-center py-12">
                <Sparkles className="w-12 h-12 text-teal-400 animate-pulse mb-4" />
                <p className="text-sm text-muted-foreground">AI 正在分析项目数据...</p>
              </div>
            )}
            {aiResult && !aiLoading && (
              <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                {aiResult.slice(0, 8000)}
              </div>
            )}
          </div>
          {aiResult && !aiLoading && aiConversationHistory.length >= 3 && (
            <div className="border-t pt-3 mt-2 flex gap-2">
              <Input
                value={aiFollowUpQuestion}
                onChange={(e) => setAiFollowUpQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAIFollowUp();
                  }
                }}
                placeholder="对分析结果追问..."
                className="flex-1 h-9 text-sm"
                disabled={aiFollowUpLoading}
              />
              <Button
                size="sm"
                onClick={handleAIFollowUp}
                disabled={aiFollowUpLoading || !aiFollowUpQuestion.trim()}
              >
                {aiFollowUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "发送"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {renderDedicatedDialog(highRisk, setHighRisk)}
      {renderDedicatedDialog(taskTotal, setTaskTotal)}

      {/* Generic dedicated KPI config dialogs */}
      {renderDedicatedDialog(kpiCard, setKpiCard)}
      {renderDedicatedDialog(domainCfg, setDomainCfg)}
      {renderDedicatedDialog(reqStats, setReqStats)}
      {renderDedicatedDialog(warningCfg, setWarningCfg)}
      {renderDedicatedDialog(healthRank, setHealthRank)}
      {renderDedicatedDialog(weakArea, setWeakArea)}
    </div>
  );
}
