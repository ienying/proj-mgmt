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
import { KpiConfigModal } from "@/components/kpi-config-modal";
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
}: {
  value: number | string;
  label: string;
  variant: 1 | 2 | 3 | 4 | 5 | 6;
  onSettings?: () => void;
  onExport?: () => void;
}) {
  return (
    <div className={`tk tk-k${variant}`} style={{ position: "relative" }}>
      <div className="tk-val">{value}</div>
      <div className="tk-label">{label}</div>
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
   Main Component
   ============================================================ */

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formulaModal, setFormulaModal] = useState<{
    open: boolean;
    title: string;
    formulas: Array<{ metric: string; formula: string; source: string }>;
  }>({ open: false, title: "", formulas: [] });

  /* KPI config */
  const [kpiConfigModal, setKpiConfigModal] = useState(false);
  const [kpiConfig, setKpiConfig] = useState<{
    table_code: string; module_type: string; table_name: string;
  } | null>(null);
  const [kpiConfigDefs, setKpiConfigDefs] = useState<Array<{
    table_code: string; table_name: string; module_type: string[];
  }>>([]);
  const [kpiConfigSelectedModule, setKpiConfigSelectedModule] = useState("");
  const [kpiConfigSelectedTable, setKpiConfigSelectedTable] = useState("");
  const [kpiConfigSaving, setKpiConfigSaving] = useState(false);

  // 高风险残留 KPI 配置
  const [highRiskConfigModal, setHighRiskConfigModal] = useState(false);
  const [highRiskConfig, setHighRiskConfig] = useState<{
    table_code: string; module_type: string; table_name: string;
    include_column: string; include_value: string;
    exclude_column: string; exclude_value: string;
  } | null>(null);
  const [highRiskSelectedModule, setHighRiskSelectedModule] = useState("");
  const [highRiskSelectedTable, setHighRiskSelectedTable] = useState("");
  const [highRiskIncludeColumn, setHighRiskIncludeColumn] = useState("");
  const [highRiskIncludeValue, setHighRiskIncludeValue] = useState("");
  const [highRiskExcludeColumn, setHighRiskExcludeColumn] = useState("");
  const [highRiskExcludeValue, setHighRiskExcludeValue] = useState("");
  const [highRiskSaving, setHighRiskSaving] = useState(false);
  // 选中表后加载的列选项
  const [highRiskTableColumns, setHighRiskTableColumns] = useState<Array<{ name: string; type: string; options?: string[] }>>([]);
  const [highRiskIncludeValues, setHighRiskIncludeValues] = useState<string[]>([]);
  const [highRiskExcludeValues, setHighRiskExcludeValues] = useState<string[]>([]);

  /* unified KPI config modal */
  const [kpiModal, setKpiModal] = useState<{ open: boolean; key: string; label: string }>({ open: false, key: "", label: "" });
  const openKpiModal = (key: string, label: string) => setKpiModal({ open: true, key, label });
  const [domainPopoverOpen, setDomainPopoverOpen] = useState(false);
  const [radarDomainPopoverOpen, setRadarDomainPopoverOpen] = useState(false);

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

  /* task total KPI config (legacy - gradually migrating to unified) */
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskConfig, setTaskConfig] = useState<{
    table_code: string; module_type: string; table_name: string;
    conditions?: { column: string; values: string[] };
  } | null>(null);
  const [taskSelectedModule, setTaskSelectedModule] = useState("");
  const [taskSelectedTable, setTaskSelectedTable] = useState("");
  const [taskSelectedColumn, setTaskSelectedColumn] = useState("");
  const [taskSelectedValues, setTaskSelectedValues] = useState<string[]>([]);
  const [taskTableColumns, setTaskTableColumns] = useState<Array<{ name: string; label: string; type: string; options: string[] }>>([]);
  const [taskSaving, setTaskSaving] = useState(false);

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

  /* ---- load KPI config ---- */
  useEffect(() => {
    if (!isSuperAdmin) return;
    // Load requirement_total config
    fetch("/api/dashboard/kpi-config?kpi_key=requirement_total")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setKpiConfig(json.data);
      })
      .catch(() => {});
    // Load task_total config
    fetch("/api/dashboard/kpi-config?kpi_key=task_total")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setTaskConfig(json.data);
      })
      .catch(() => {});
    // Load table definitions for selector
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

  /* ---- load table columns for task config ---- */
  useEffect(() => {
    if (!taskSelectedTable || !taskModalOpen) return;
    setTaskTableColumns([]);
    setTaskSelectedColumn("");
    setTaskSelectedValues([]);
    fetch(`/api/dashboard/table-columns?table_code=${encodeURIComponent(taskSelectedTable)}`)
      .then((r) => r.json())
      .then((json) => {
        setTaskTableColumns(json.data || []);
      })
      .catch(() => {});
  }, [taskSelectedTable, taskModalOpen]);

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

  /* ---- KPI config helpers ---- */
  const kpiModuleOptions = useMemo(() => {
    const modules = new Set<string>();
    for (const d of kpiConfigDefs) {
      if (d.module_type?.length > 0) modules.add(d.module_type[0]);
    }
    return Array.from(modules)
      .map((code) => ({ code, label: MODULE_LABEL_MAP[code] || code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [kpiConfigDefs]);

  const kpiTableOptions = useMemo(() => {
    if (!kpiConfigSelectedModule) return [];
    return kpiConfigDefs
      .filter((d) => d.module_type?.includes(kpiConfigSelectedModule))
      .map((d) => ({ table_code: d.table_code, table_name: d.table_name }))
      .sort((a, b) => a.table_code.localeCompare(b.table_code));
  }, [kpiConfigDefs, kpiConfigSelectedModule]);

  const highRiskTableOptions = useMemo(() => {
    if (!highRiskSelectedModule) return [];
    return kpiConfigDefs
      .filter((d) => d.module_type?.includes(highRiskSelectedModule))
      .map((d) => ({ table_code: d.table_code, table_name: d.table_name }))
      .sort((a, b) => a.table_code.localeCompare(b.table_code));
  }, [kpiConfigDefs, highRiskSelectedModule]);

  const taskTableOptions = useMemo(() => {
    if (!taskSelectedModule) return [];
    return kpiConfigDefs
      .filter((d) => d.module_type?.includes(taskSelectedModule))
      .map((d) => ({ table_code: d.table_code, table_name: d.table_name }))
      .sort((a, b) => a.table_code.localeCompare(b.table_code));
  }, [kpiConfigDefs, taskSelectedModule]);

  const handleSaveKpiConfig = async () => {
    if (!kpiConfigSelectedTable) return;
    const selectedDef = kpiConfigDefs.find((d) => d.table_code === kpiConfigSelectedTable);
    const configValue = {
      table_code: kpiConfigSelectedTable,
      module_type: kpiConfigSelectedModule,
      table_name: selectedDef?.table_name || kpiConfigSelectedTable,
    };
    setKpiConfigSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ config_value: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setKpiConfig(configValue);
      setKpiConfigModal(false);
      toast.success("需求总数数据源已更新");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setKpiConfigSaving(false);
    }
  };

  const handleResetKpiConfig = async () => {
    setKpiConfigSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ config_value: null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "重置失败");
      setKpiConfig(null);
      setKpiConfigModal(false);
      toast.success("已恢复默认数据源（requirement 模块）");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "重置失败");
    } finally {
      setKpiConfigSaving(false);
    }
  };

  /* ---- task total KPI config handlers ---- */
  const handleSaveTaskConfig = async () => {
    if (!taskSelectedTable || !taskSelectedColumn || taskSelectedValues.length === 0) return;
    const selectedDef = kpiConfigDefs.find((d) => d.table_code === taskSelectedTable);
    const configValue = {
      table_code: taskSelectedTable,
      module_type: taskSelectedModule,
      table_name: selectedDef?.table_name || taskSelectedTable,
      conditions: {
        column: taskSelectedColumn,
        values: taskSelectedValues,
      },
    };
    setTaskSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: "task_total", config_value: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setTaskConfig(configValue);
      setTaskModalOpen(false);
      toast.success("任务总数数据源已更新");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleResetTaskConfig = async () => {
    setTaskSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: "task_total", config_value: null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "重置失败");
      setTaskConfig(null);
      setTaskModalOpen(false);
      toast.success("已恢复默认任务统计逻辑");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "重置失败");
    } finally {
      setTaskSaving(false);
    }
  };

  /* ---- high-risk KPI config ---- */
  // Load table columns when table is selected
  useEffect(() => {
    if (!highRiskSelectedTable) return;
    const def = kpiConfigDefs.find((d) => d.table_code === highRiskSelectedTable);
    if (!def) return;
    // Get the full table definition with columns_config
    fetch(`/api/standards?table_code=${highRiskSelectedTable}`)
      .then((r) => r.json())
      .then((json) => {
        const fullDef = (json.data || []).find((d: any) => d.table_code === highRiskSelectedTable);
        if (fullDef?.columns_config) {
          const cols = (fullDef.columns_config as Array<any>).filter((c: any) => c.name && !["id", "sort_order", "created_at", "updated_at", "created_by", "allow_delete", "_readonly", "data_source"].includes(c.name));
          setHighRiskTableColumns(cols);
        }
      })
      .catch(() => {});
  }, [highRiskSelectedTable, kpiConfigDefs]);

  // Load column values when a column is selected for include/exclude
  useEffect(() => {
    if (!highRiskSelectedTable || !highRiskIncludeColumn) { setHighRiskIncludeValues([]); return; }
    const col = highRiskTableColumns.find((c) => c.name === highRiskIncludeColumn);
    setHighRiskIncludeValues(col?.options || []);
  }, [highRiskIncludeColumn, highRiskSelectedTable, highRiskTableColumns]);

  useEffect(() => {
    if (!highRiskSelectedTable || !highRiskExcludeColumn) { setHighRiskExcludeValues([]); return; }
    const col = highRiskTableColumns.find((c) => c.name === highRiskExcludeColumn);
    setHighRiskExcludeValues(col?.options || []);
  }, [highRiskExcludeColumn, highRiskSelectedTable, highRiskTableColumns]);

  const handleSaveHighRiskConfig = async () => {
    if (!highRiskSelectedTable || !highRiskIncludeColumn || !highRiskIncludeValue) return;
    const selectedDef = kpiConfigDefs.find((d) => d.table_code === highRiskSelectedTable);
    const configValue = {
      table_code: highRiskSelectedTable,
      module_type: highRiskSelectedModule,
      table_name: selectedDef?.table_name || highRiskSelectedTable,
      include_column: highRiskIncludeColumn,
      include_value: highRiskIncludeValue,
      exclude_column: highRiskExcludeColumn || null,
      exclude_value: highRiskExcludeValue || null,
    };
    setHighRiskSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: "high_risk_remaining", config_value: configValue }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      setHighRiskConfig(configValue as any);
      setHighRiskConfigModal(false);
      toast.success("高风险残留数据源已更新");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setHighRiskSaving(false);
    }
  };

  const handleResetHighRiskConfig = async () => {
    setHighRiskSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("/api/dashboard/kpi-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ kpi_key: "high_risk_remaining", config_value: null }),
      });
      setHighRiskConfig(null);
      setHighRiskConfigModal(false);
      toast.success("已恢复默认数据源（risk 模块）");
      fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined);
    } catch (e: any) {
      toast.error(e.message || "重置失败");
    } finally {
      setHighRiskSaving(false);
    }
  };

  // Load high-risk config on mount
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/dashboard/kpi-config?kpi_key=high_risk_remaining")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setHighRiskConfig(json.data);
          setHighRiskSelectedModule(json.data.module_type || "");
          setHighRiskSelectedTable(json.data.table_code || "");
          setHighRiskIncludeColumn(json.data.include_column || "");
          setHighRiskIncludeValue(json.data.include_value || "");
          setHighRiskExcludeColumn(json.data.exclude_column || "");
          setHighRiskExcludeValue(json.data.exclude_value || "");
        }
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  // Set module/table values when config is loaded (for opening modal with pre-filled values)
  useEffect(() => {
    if (highRiskConfigModal && highRiskConfig && !highRiskSelectedModule) {
      setHighRiskSelectedModule(highRiskConfig.module_type || "");
      setHighRiskSelectedTable(highRiskConfig.table_code || "");
      setHighRiskIncludeColumn(highRiskConfig.include_column || "");
      setHighRiskIncludeValue(highRiskConfig.include_value || "");
      setHighRiskExcludeColumn(highRiskConfig.exclude_column || "");
      setHighRiskExcludeValue(highRiskConfig.exclude_value || "");
    }
  }, [highRiskConfigModal]);

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
          onSettings={isSuperAdmin && selectedIds.size !== 1 ? () => openKpiModal("total_projects", "项目总数") : undefined}
          onExport={isSuperAdmin && selectedIds.size !== 1 ? () => handleExportKpi("total_projects", "项目总数") : undefined}
        />
        <KpiCard
          value={kpi?.total_requirements ?? 0}
          label="需求总数"
          variant={2}
          onSettings={isSuperAdmin ? () => openKpiModal("requirement_total", "需求总数") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("requirement_total", "需求总数") : undefined}
        />
        <KpiCard
          value={kpi?.high_risk_remaining ?? 0}
          label="高风险残留"
          variant={3}
          onSettings={isSuperAdmin ? () => openKpiModal("high_risk_remaining", "高风险残留") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("high_risk_remaining", "高风险残留") : undefined}
        />
        <KpiCard
          value={kpi?.total_tasks ?? 0}
          label="任务总数"
          variant={4}
          onSettings={isSuperAdmin ? () => openKpiModal("task_total", "任务总数") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("task_total", "任务总数") : undefined}
        />
        <KpiCard
          value={kpi?.stakeholders ?? 0}
          label="干系人"
          variant={5}
          onSettings={isSuperAdmin ? () => openKpiModal("stakeholders", "干系人") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("stakeholders", "干系人") : undefined}
        />
        <KpiCard
          value={kpi?.procurement_items ?? 0}
          label="采购项"
          variant={6}
          onSettings={isSuperAdmin ? () => openKpiModal("procurement_items", "采购项") : undefined}
          onExport={isSuperAdmin ? () => handleExportKpi("procurement_items", "采购项") : undefined}
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
                          openKpiModal(`domain_score_${d.module}`, `${d.icon} ${d.label}`);
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
                            openKpiModal(`domain_score_${d.module}`, `${d.icon} ${d.label}`);
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
                  setFormulaModal({
                    open: true,
                    title: "9 大领域指标 · 计算公式",
                    formulas: NINE_DOMAINS.map((d) => ({
                      metric: d.label,
                      formula: `${d.label} = 已完成数 / 总数 × 100%`,
                      source: `${d.label}表`,
                    })),
                  })
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

          {/* Warning summary */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {data.warning_summary && data.warning_summary.total > 0 ? (
              <>
                <span className="db-warn-pill error" style={{ cursor: "pointer" }}>
                  ● 严重 {data.warning_summary.errors}
                </span>
                <span className="db-warn-pill warning" style={{ cursor: "pointer" }}>
                  ● 警告 {data.warning_summary.warnings}
                </span>
                <span style={{ fontSize: 10, color: "var(--text3)", padding: "4px 6px" }}>
                  共 {data.warning_summary.total} 条预警 · 阈值{data.warning_summary.threshold} · 趋势{data.warning_summary.trend} · 对比{data.warning_summary.comparison}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 10, color: "var(--text3)", padding: "4px 0" }}>
                暂无预警 · 点击「生成新预警」开始 AI 分析
              </span>
            )}
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
                              openKpiModal(`domain_score_${d.module}`, `${d.icon} ${d.label}`);
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
                                openKpiModal(`domain_score_${d.module}`, `${d.icon} ${d.label}`);
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
                    setFormulaModal({
                      open: true,
                      title: "健康度排行 · 计算公式",
                      formulas: [
                        { metric: "综合得分", formula: "= (范围% + 进度% + 质量% + 成本% + 风险关闭% + 采购% + 资源% + 资料%) / 8", source: "各模块管理表" },
                        { metric: "排序规则", formula: "按综合得分降序排列，取前2名", source: "-" },
                      ],
                    })
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
                  setFormulaModal({
                    open: true,
                    title: "薄弱环节 · 计算公式",
                    formulas: [
                      { metric: "识别规则", formula: "取9领域中双项目均值最低的6项，升序排列", source: "-" },
                      { metric: "差距计算", formula: "标注最低项目数值与均值差距", source: "-" },
                    ],
                  })
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

      {/* ========== Warning Center ========== */}
      <div className="db-panel" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            ⚠️ 预警中心
            <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>
              {data.warning_summary.total > 0
                ? `共 ${data.warning_summary.total} 条（严重 ${data.warning_summary.errors} · 警告 ${data.warning_summary.warnings}）`
                : "暂无预警 · 指标正常"}
            </span>
          </span>
          <button
            className="db-gear"
            onClick={() =>
              setFormulaModal({
                open: true,
                title: "预警中心 · 触发规则",
                formulas: [
                  { metric: "单指标阈值", formula: "基于9大领域完成率、风险数、里程碑、回款率等单一指标的固定阈值判定", source: "各模块管理表" },
                  { metric: "趋势恶化", formula: "基于连续2个月指标变化趋势判定", source: "需求登记表/风险登记表" },
                  { metric: "差值对比", formula: "基于项目间综合得分/领域得分差距判定", source: "综合评分" },
                ],
              })
            }
          >
            ⚙
          </button>
        </div>

        {/* Warning KPI cards row */}
        <div className="r4" style={{ marginBottom: 10 }}>
          <div className="rt rt-k4" style={{ cursor: "pointer" }}>
            <div className="rt-val" style={{ color: data.warning_summary.threshold > 0 ? "#ef4444" : "var(--text)" }}>
              {data.warning_summary.threshold}
            </div>
            <div className="rt-label">📏 单指标阈值预警</div>
          </div>
          <div className="rt rt-k3" style={{ cursor: "pointer" }}>
            <div className="rt-val" style={{ color: data.warning_summary.trend > 0 ? "#f59e0b" : "var(--text)" }}>
              {data.warning_summary.trend}
            </div>
            <div className="rt-label">📈 趋势恶化预警</div>
          </div>
          <div className="rt rt-k1" style={{ cursor: "pointer" }}>
            <div className="rt-val" style={{ color: data.warning_summary.comparison > 0 ? "#3d6cb9" : "var(--text)" }}>
              {data.warning_summary.comparison}
            </div>
            <div className="rt-label">📊 差值对比预警</div>
          </div>
          <div className="rt rt-k2" style={{ cursor: "pointer" }}>
            <div className="rt-val" style={{ color: data.warning_summary.errors > 0 ? "#ef4444" : data.warning_summary.total > 0 ? "#f59e0b" : "#10b981" }}>
              {data.warning_summary.errors}
            </div>
            <div className="rt-label">🔴 严重 / {data.warning_summary.warnings} 警告</div>
          </div>
        </div>

        {/* Warning bar chart + detail list */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          {/* Left: Warning bar chart */}
          <div className="r3-panel" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>预警分布</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { name: "阈值", error: data.warnings.filter((w) => w.category === "threshold" && w.level === "error").length, warning: data.warnings.filter((w) => w.category === "threshold" && w.level === "warning").length },
                  { name: "趋势", error: data.warnings.filter((w) => w.category === "trend" && w.level === "error").length, warning: data.warnings.filter((w) => w.category === "trend" && w.level === "warning").length },
                  { name: "对比", error: data.warnings.filter((w) => w.category === "comparison" && w.level === "error").length, warning: data.warnings.filter((w) => w.category === "comparison" && w.level === "warning").length },
                ]}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="error" name="严重" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} stackId="a" />
                <Bar dataKey="warning" name="警告" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={24} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right: Top warnings list */}
          <div style={{
            background: "var(--card2)",
            borderRadius: 10,
            padding: 12,
            maxHeight: 220,
            overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>最新预警明细</div>
            {(data.warnings || []).length > 0 ? (
              data.warnings.slice(0, 8).map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    marginBottom: 3,
                    borderRadius: 6,
                    background: "#fff",
                    borderLeft: `3px solid ${w.level === "error" ? "#ef4444" : "#f59e0b"}`,
                    fontSize: 11,
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: w.level === "error" ? "#ef4444" : "#f59e0b",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.item}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap" }}>
                    {w.current_value}
                  </span>
                  <span style={{
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 8,
                    background: w.level === "error" ? "#fef2f2" : "#fff7ed",
                    color: w.level === "error" ? "#dc2626" : "#d97706",
                    whiteSpace: "nowrap",
                  }}>
                    {w.level === "error" ? "严重" : "警告"}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--text3)", whiteSpace: "nowrap" }}>
                    {w.project_name}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text3)", fontSize: 11 }}>
                ✅ 当前各项指标正常，无预警触发
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== Divider ========== */}
      <div className="dv">
        <div className="dl" />
        <div className="dt">范围管理 · 需求追踪</div>
        <div className="dl" />
      </div>

      {/* ========== Requirement Stats Row ========== */}
      <div className="r4">
        <div className="rt rt-k1" style={{ position: "relative" }}>
          <div className="rt-val">{data.requirements.stats.total}</div>
          <div className="rt-label">需求总数</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 CSV" onClick={(e) => { e.stopPropagation(); handleExportKpi("requirement_total", "需求总数"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openKpiModal("requirement_total", "需求总数"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k2" style={{ position: "relative" }}>
          <div className="rt-val">{data.requirements.stats.completion_rate}%</div>
          <div className="rt-label">完成率</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("completion_rate", "完成率"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openKpiModal("completion_rate", "完成率"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k3" style={{ position: "relative" }}>
          <div className="rt-val">{data.requirements.stats.in_development}</div>
          <div className="rt-label">开发中</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("in_development", "开发中"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openKpiModal("in_development", "开发中"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="rt rt-k4" style={{ position: "relative" }}>
          <div className="rt-val">{data.requirements.stats.pending_confirmation}</div>
          <div className="rt-label">待确认</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 Excel" onClick={(e) => { e.stopPropagation(); handleExportKpi("pending_confirmation", "待确认"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openKpiModal("pending_confirmation", "待确认"); }}>⚙</button>
            </div>
          )}
        </div>
      </div>

      {/* ========== Backlog Analysis Row ========== */}
      <div className="r4">
        <div className="blc blc-backlog" style={{ position: "relative" }}>
          <div className="blc-val">{data.requirements.backlog.backlog_count}</div>
          <div className="blc-label">积压需求</div>
          {isSuperAdmin && (
            <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
              <button className="tk-gear" title="导出 CSV" onClick={(e) => { e.stopPropagation(); handleExportKpi("backlog", "积压需求"); }}>📥</button>
              <button className="tk-gear" onClick={(e) => { e.stopPropagation(); openKpiModal("backlog", "积压需求"); }}>⚙</button>
            </div>
          )}
        </div>
        <div className="blc blc-pending">
          <div className="blc-val">{data.requirements.backlog.pending_confirmation}</div>
          <div className="blc-label">待确认</div>
        </div>
        <div className="blc blc-cycle">
          <div className="blc-val">{data.requirements.backlog.avg_processing_days}d</div>
          <div className="blc-label">平均处理周期</div>
        </div>
        <div className="blc blc-velocity">
          <div className="blc-val">{data.requirements.backlog.completion_velocity}/月</div>
          <div className="blc-label">完成速率</div>
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
              setFormulaModal({
                open: true,
                title: "需求追踪 · 计算公式",
                formulas: [
                  { metric: "需求总数", formula: "COUNT(需求登记表)", source: "需求登记表" },
                  { metric: "完成率", formula: "状态='已完成' / 总数 × 100%", source: "需求登记表" },
                  { metric: "开发中", formula: "COUNT(状态='开发中')", source: "需求登记表" },
                  { metric: "待确认", formula: "COUNT(状态='待确认')", source: "需求登记表" },
                  { metric: "积压需求", formula: "等同于开发中数量", source: "需求登记表" },
                  { metric: "平均处理周期", formula: "AVG(完成日期 - 提出日期)", source: "需求登记表" },
                  { metric: "完成速率", formula: "已完成数 / 活跃月数", source: "需求登记表" },
                ],
              })
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

      {/* Formula modal */}
      <Dialog open={formulaModal.open} onOpenChange={(v) => setFormulaModal((p) => ({ ...p, open: v }))}>
        <DialogContent className="max-w-lg max-h-[75vh] flex flex-col" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>{formulaModal.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--card2)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>指标</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>公式</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>数据来源</th>
                </tr>
              </thead>
              <tbody>
                {formulaModal.formulas.map((f, i) => (
                  <tr key={i}>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #f0f1f5", fontWeight: 500 }}>{f.metric}</td>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #f0f1f5", fontFamily: "var(--font-mono)", fontSize: 11 }}>{f.formula}</td>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #f0f1f5", color: "var(--text3)", fontSize: 11 }}>{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* KPI config modal */}
      <Dialog open={kpiConfigModal} onOpenChange={setKpiConfigModal}>
        <DialogContent className="max-w-md" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>需求总数 · 数据源配置</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {kpiConfig && (
              <div style={{ fontSize: 12, color: "var(--text2)", background: "var(--card2)", padding: "8px 12px", borderRadius: 8 }}>
                当前: <strong>{kpiConfig.table_name || kpiConfig.table_code}</strong>（{MODULE_LABEL_MAP[kpiConfig.module_type] || kpiConfig.module_type} 模块）
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>选择模块</label>
              <select
                value={kpiConfigSelectedModule}
                onChange={(e) => {
                  setKpiConfigSelectedModule(e.target.value);
                  setKpiConfigSelectedTable("");
                }}
                style={{
                  width: "100%", padding: "8px 12px", fontSize: 13,
                  border: "1px solid var(--border)", borderRadius: 6,
                  background: "var(--card)", color: "var(--text)",
                }}
              >
                <option value="">-- 请选择模块 --</option>
                {kpiModuleOptions.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>

            {kpiConfigSelectedModule && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>选择数据表</label>
                <select
                  value={kpiConfigSelectedTable}
                  onChange={(e) => setKpiConfigSelectedTable(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", fontSize: 13,
                    border: "1px solid var(--border)", borderRadius: 6,
                    background: "var(--card)", color: "var(--text)",
                  }}
                >
                  <option value="">-- 请选择表 --</option>
                  {kpiTableOptions.map((t) => (
                    <option key={t.table_code} value={t.table_code}>
                      {t.table_code} ({t.table_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              {kpiConfig && (
                <Button variant="outline" size="sm" onClick={handleResetKpiConfig} disabled={kpiConfigSaving}>
                  恢复默认
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveKpiConfig}
                disabled={!kpiConfigSelectedTable || kpiConfigSaving}
              >
                {kpiConfigSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 高风险残留 · 数据源配置 */}
      <Dialog open={highRiskConfigModal} onOpenChange={setHighRiskConfigModal}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>高风险残留 · 数据源配置</DialogTitle>
            <DialogDescription>
              设置如何计算"高风险残留"：先筛选出符合条件A的行，减去其中同时符合条件B的行。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3" style={{ marginTop: 8, marginBottom: 8 }}>
            {/* Current config */}
            {highRiskConfig && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                当前: <strong>{highRiskConfig.table_name || highRiskConfig.table_code}</strong>
                （{MODULE_LABEL_MAP[highRiskConfig.module_type] || highRiskConfig.module_type} 模块）
              </div>
            )}

            {/* Module select */}
            <div>
              <Label className="text-xs">选择模块</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={highRiskSelectedModule}
                onChange={(e) => {
                  setHighRiskSelectedModule(e.target.value);
                  setHighRiskSelectedTable("");
                  setHighRiskIncludeColumn("");
                  setHighRiskExcludeColumn("");
                }}
              >
                <option value="">-- 选择模块 --</option>
                {kpiModuleOptions.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Table select */}
            {highRiskSelectedModule && (
              <div>
                <Label className="text-xs">选择数据表</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={highRiskSelectedTable}
                  onChange={(e) => {
                    setHighRiskSelectedTable(e.target.value);
                    setHighRiskIncludeColumn("");
                    setHighRiskExcludeColumn("");
                  }}
                >
                  <option value="">-- 选择数据表 --</option>
                  {highRiskTableOptions.map((t) => (
                    <option key={t.table_code} value={t.table_code}>{t.table_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Column selects */}
            {highRiskSelectedTable && highRiskTableColumns.length > 0 && (
              <>
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold text-orange-600">筛选条件 A（高风险项）</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">选择列 + 值，统计符合条件的行数</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={highRiskIncludeColumn}
                      onChange={(e) => { setHighRiskIncludeColumn(e.target.value); setHighRiskIncludeValue(""); }}
                    >
                      <option value="">-- 选择列 --</option>
                      {highRiskTableColumns.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={highRiskIncludeValue}
                      onChange={(e) => setHighRiskIncludeValue(e.target.value)}
                      disabled={!highRiskIncludeColumn}
                    >
                      <option value="">-- 选择值 --</option>
                      {highRiskIncludeValues.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      {highRiskIncludeValues.length === 0 && highRiskIncludeColumn && (
                        <option value="">(无预设选项，可手动输入)</option>
                      )}
                    </select>
                  </div>
                  {highRiskIncludeColumn && highRiskIncludeValues.length === 0 && (
                    <Input
                      className="h-8 text-sm mt-2"
                      placeholder="手动输入筛选值..."
                      value={highRiskIncludeValue}
                      onChange={(e) => setHighRiskIncludeValue(e.target.value)}
                    />
                  )}
                </div>

                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold text-blue-600">排除条件 B（已完成项，可选）</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">从 A 的结果中减去同时满足 B 的行（可留空）</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={highRiskExcludeColumn}
                      onChange={(e) => { setHighRiskExcludeColumn(e.target.value); setHighRiskExcludeValue(""); }}
                    >
                      <option value="">-- 选择列（可选）--</option>
                      {highRiskTableColumns.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={highRiskExcludeValue}
                      onChange={(e) => setHighRiskExcludeValue(e.target.value)}
                      disabled={!highRiskExcludeColumn}
                    >
                      <option value="">-- 选择值 --</option>
                      {highRiskExcludeValues.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      {highRiskExcludeValues.length === 0 && highRiskExcludeColumn && (
                        <option value="">(无预设选项，可手动输入)</option>
                      )}
                    </select>
                  </div>
                  {highRiskExcludeColumn && highRiskExcludeValues.length === 0 && (
                    <Input
                      className="h-8 text-sm mt-2"
                      placeholder="手动输入排除值..."
                      value={highRiskExcludeValue}
                      onChange={(e) => setHighRiskExcludeValue(e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            {/* Formula preview */}
            {highRiskIncludeColumn && highRiskIncludeValue && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                <div>
                  公式: <strong className="text-orange-600">COUNT({`${highRiskIncludeColumn} = "${highRiskIncludeValue}"`})</strong>
                  {highRiskExcludeColumn && highRiskExcludeValue && (
                    <> - <strong className="text-blue-600">COUNT({`${highRiskIncludeColumn} = "${highRiskIncludeValue}" AND ${highRiskExcludeColumn} = "${highRiskExcludeValue}"`})</strong></>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            <div>
              {highRiskConfig && (
                <Button variant="ghost" size="sm" onClick={handleResetHighRiskConfig} disabled={highRiskSaving} className="text-muted-foreground">
                  恢复默认
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setHighRiskConfigModal(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveHighRiskConfig} disabled={highRiskSaving || !highRiskSelectedTable || !highRiskIncludeColumn || !highRiskIncludeValue}>
                {highRiskSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 任务总数 · 数据源配置 */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="max-w-md" style={{ borderRadius: 14 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15 }}>任务总数 · 数据源配置</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {taskConfig && (
              <div style={{ fontSize: 12, color: "var(--text2)", background: "var(--card2)", padding: "8px 12px", borderRadius: 8 }}>
                当前: <strong>{taskConfig.table_name || taskConfig.table_code}</strong>
                {taskConfig.conditions && <>（{taskConfig.conditions.column} IN ({taskConfig.conditions.values.join(", ")})）</>}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>选择模块</label>
              <select
                value={taskSelectedModule}
                onChange={(e) => {
                  setTaskSelectedModule(e.target.value);
                  setTaskSelectedTable("");
                  setTaskSelectedColumn("");
                  setTaskSelectedValues([]);
                }}
                style={{
                  width: "100%", padding: "8px 12px", fontSize: 13,
                  border: "1px solid var(--border)", borderRadius: 6,
                  background: "var(--card)", color: "var(--text)",
                }}
              >
                <option value="">-- 请选择模块 --</option>
                {kpiModuleOptions.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>

            {taskSelectedModule && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>选择数据表</label>
                <select
                  value={taskSelectedTable}
                  onChange={(e) => {
                    setTaskSelectedTable(e.target.value);
                    setTaskSelectedColumn("");
                    setTaskSelectedValues([]);
                  }}
                  style={{
                    width: "100%", padding: "8px 12px", fontSize: 13,
                    border: "1px solid var(--border)", borderRadius: 6,
                    background: "var(--card)", color: "var(--text)",
                  }}
                >
                  <option value="">-- 请选择表 --</option>
                  {taskTableOptions.map((t) => (
                    <option key={t.table_code} value={t.table_code}>
                      {t.table_code} ({t.table_name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {taskSelectedTable && taskTableColumns.length > 0 && (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>选择筛选列</label>
                  <select
                    value={taskSelectedColumn}
                    onChange={(e) => {
                      setTaskSelectedColumn(e.target.value);
                      setTaskSelectedValues([]);
                    }}
                    style={{
                      width: "100%", padding: "8px 12px", fontSize: 13,
                      border: "1px solid var(--border)", borderRadius: 6,
                      background: "var(--card)", color: "var(--text)",
                    }}
                  >
                    <option value="">-- 请选择列 --</option>
                    {taskTableColumns.map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.label || col.name}
                      </option>
                    ))}
                  </select>
                </div>

                {taskSelectedColumn && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                      选择筛选值（多选）
                    </label>
                    <div style={{
                      maxHeight: 160, overflowY: "auto",
                      border: "1px solid var(--border)", borderRadius: 6,
                      padding: 8, background: "var(--card)",
                    }}>
                      {taskTableColumns
                        .find((c) => c.name === taskSelectedColumn)
                        ?.options.map((opt) => (
                          <label
                            key={opt}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "4px 0", fontSize: 13, cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={taskSelectedValues.includes(opt)}
                              onChange={(e) => {
                                setTaskSelectedValues((prev) =>
                                  e.target.checked
                                    ? [...prev, opt]
                                    : prev.filter((v) => v !== opt)
                                );
                              }}
                            />
                            {opt}
                          </label>
                        ))}
                    </div>
                    {taskSelectedValues.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
                        已选: {taskSelectedValues.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              {taskConfig && (
                <Button variant="outline" size="sm" onClick={handleResetTaskConfig} disabled={taskSaving}>
                  恢复默认
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveTaskConfig}
                disabled={!taskSelectedTable || !taskSelectedColumn || taskSelectedValues.length === 0 || taskSaving}
              >
                {taskSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified KPI config modal */}
      <KpiConfigModal
        open={kpiModal.open}
        onOpenChange={(v) => setKpiModal((p) => ({ ...p, open: v }))}
        kpiKey={kpiModal.key}
        kpiLabel={kpiModal.label}
        onSaved={() => fetchData(selectedIds.size > 0 ? Array.from(selectedIds) : undefined)}
      />
    </div>
  );
}
