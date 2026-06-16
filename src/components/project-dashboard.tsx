"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Search,
  ChevronDown,
  FileText,
  Shield,
  Download,
  Loader2,
  ArrowRight,
  Sparkles,
  Settings,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TableStat {
  table_code: string;
  table_name: string;
  module: string;
  record_count: number;
}

interface ProjectStatsItem {
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  status: string;
  role_project_manager: string | null;
  start_date: string | null;
  end_date: string | null;
  member_count: number;
  stats: {
    total_records: number;
    schedule_records: number;
    table_stats: TableStat[];
  };
}

interface Warning {
  project_id: string;
  project_name: string;
  level: "error" | "warning" | "info";
  type: string;
  message: string;
}

interface DashboardData {
  projects: ProjectStatsItem[];
  warnings: Warning[];
  summary: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    total_records_all: number;
    total_schedule_records: number;
    total_warnings: number;
    total_errors: number;
  };
}

const MODULE_NAME_MAP: Record<string, string> = {
  scope: "范围管理",
  schedule: "进度管理",
  quality: "质量管理",
  cost: "成本管理",
  collaboration: "协同管理",
  communication: "沟通管理",
  risk: "风险管理",
  procurement: "采购管理",
  resource: "资源管理",
  document: "资料管理",
};

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  suspended: "已暂停",
  planning: "规划中",
};

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

const WARNING_LEVEL_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  error: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "🔴" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "🟡" },
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "ℹ️" },
};

export function ProjectDashboard({
  onViewProject,
}: {
  onViewProject?: (projectId: string) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 多选项目
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // AI 预警
  const [aiWarnings, setAiWarnings] = useState<Warning[] | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [aiGeneratedBy, setAiGeneratedBy] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // 提示词编辑
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const DEFAULT_SYSTEM_PROMPT = `你是一个项目管理预警分析专家。你需要基于项目数据识别风险并生成预警。

分析维度：
1. 进度风险：截止日期临近/已逾期、进度管理数据为空或极少
2. 数据异常：长期未更新（>60天）、总记录数异常少
3. 管理风险：缺少项目经理、无任何数据记录

输出要求：
- 仅返回 JSON 数组，不要输出任何其他文字
- 每个预警项包含：project_id（项目id）、project_name（项目名称）、level（error/warning/info）、type（短代码英文）、message（中文描述，简洁明了，每条不超过30字）
- 每个项目最多3条预警，优先输出最严重的
- 如果项目状态良好，不要强行生成预警

JSON 格式示例：
[{"project_id":"xxx","project_name":"项目A","level":"error","type":"overdue","message":"已超过截止日期15天"}]`;

  const DEFAULT_USER_PROMPT = `请分析以下 \${projectCount} 个项目的数据，生成预警：

\${projectData}`;

  const [customSystemPrompt, setCustomSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [customUserPrompt, setCustomUserPrompt] = useState(DEFAULT_USER_PROMPT);

  // 预警筛选
  const [warningLevelFilter, setWarningLevelFilter] = useState<Set<string>>(
    new Set(["error", "warning"])
  );

  // 表格排序
  const [sortField, setSortField] = useState<string>("schedule_records");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async (ids?: string[]) => {
    if (!data) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      if (ids && ids.length > 0) {
        params.set("project_ids", ids.join(","));
      }
      const res = await fetch(`/api/projects/dashboard-stats?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "加载失败");
      }
      const json = await res.json();
      setData(json.data);
      // 初次加载时选中所有项目
      if (!ids) {
        setSelectedIds(new Set(json.data.projects.map((p: ProjectStatsItem) => p.id)));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 加载缓存的 AI 预警
  useEffect(() => {
    const loadCachedWarnings = async () => {
      try {
        const res = await fetch("/api/projects/dashboard-warnings");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setAiWarnings(json.data.warnings || []);
            setAiGeneratedAt(json.data.generated_at || null);
            setAiGeneratedBy(json.data.generated_by || null);
          }
        }
      } catch { /* ignore */ }
    };
    loadCachedWarnings();
  }, []);

  // 生成新 AI 预警（可选传入自定义提示词）
  const generateAiWarnings = async (opts?: { systemPrompt?: string; userPrompt?: string }) => {
    setAiGenerating(true);
    const systemMsg = opts?.systemPrompt ?? (customSystemPrompt !== DEFAULT_SYSTEM_PROMPT ? customSystemPrompt : undefined);
    const userMsg = opts?.userPrompt ?? (customUserPrompt !== DEFAULT_USER_PROMPT ? customUserPrompt : undefined);
    try {
      const projectIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await fetch("/api/projects/dashboard-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_ids: projectIds,
          system_message: systemMsg,
          user_message: userMsg,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "生成失败");
      }
      const json = await res.json();
      if (json.data) {
        const newWarnings = json.data.warnings || [];
        setAiWarnings(newWarnings);
        setAiGeneratedAt(json.data.generated_at || null);
        setAiGeneratedBy(json.data.generated_by || null);
        // 展开全部级别筛选，确保 AI 生成的所有预警可见
        setWarningLevelFilter(new Set(["error", "warning", "info"]));
        toast.success(`AI 预警生成完成，共 ${newWarnings.length} 条`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "AI 预警生成失败");
    } finally {
      setAiGenerating(false);
    }
  };

  // 选中项目变化时重新请求
  const handleSelectionChange = (newIds: Set<string>) => {
    setSelectedIds(newIds);
    if (newIds.size === 0) {
      // 全不选视为查全部
      fetchData();
    } else {
      fetchData(Array.from(newIds));
    }
  };

  // 过滤项目列表（用于搜索）
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

  // 选中的项目数据
  const selectedProjects = useMemo(() => {
    if (selectedIds.size === 0) return allProjects;
    return allProjects.filter((p) => selectedIds.has(p.id));
  }, [allProjects, selectedIds]);

  // 计算选中项目的汇总
  const selectedSummary = useMemo(() => {
    const projects = selectedProjects;
    return {
      total_projects: projects.length,
      active_projects: projects.filter((p) => p.status === "active").length,
      total_records: projects.reduce((s, p) => s + p.stats.total_records, 0),
      total_schedule_records: projects.reduce((s, p) => s + p.stats.schedule_records, 0),
      total_members: projects.reduce((s, p) => s + p.member_count, 0),
    };
  }, [selectedProjects]);

  // 过滤预警：优先使用 AI 预警，兜底用规则预警
  const displayWarnings = useMemo(() => {
    const source = aiWarnings ?? data?.warnings ?? [];
    let warnings = source;
    if (selectedIds.size > 0) {
      // 构建 name→id 回退映射（AI 可能返回名称而非精确 ID）
      const nameToId = new Map<string, string>();
      if (data?.projects) {
        for (const p of data.projects) {
          nameToId.set(p.project_name, p.id);
        }
      }
      warnings = warnings.filter((w) => {
        if (selectedIds.has(w.project_id)) return true;
        // fallback: 用项目名称匹配
        const idByName = nameToId.get(w.project_name);
        if (idByName && selectedIds.has(idByName)) return true;
        return false;
      });
    }
    if (warningLevelFilter.size === 0) return warnings;
    return warnings.filter((w) => warningLevelFilter.has(w.level));
  }, [data, aiWarnings, selectedIds, warningLevelFilter]);

  const isAiGenerated = aiWarnings !== null;

  // 排序后的选中项目
  const sortedProjects = useMemo(() => {
    const projects = [...selectedProjects];
    projects.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortField) {
        case "schedule_records":
          valA = a.stats.schedule_records;
          valB = b.stats.schedule_records;
          break;
        case "total_records":
          valA = a.stats.total_records;
          valB = b.stats.total_records;
          break;
        case "member_count":
          valA = a.member_count;
          valB = b.member_count;
          break;
        default:
          return 0;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });
    return projects;
  }, [selectedProjects, sortField, sortDir]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // 图表数据
  const barChartData = useMemo(() => {
    const top10 = sortedProjects.slice(0, 10);
    return top10.map((p) => ({
      name: p.project_name.length > 8 ? p.project_name.slice(0, 8) + "..." : p.project_name,
      fullName: p.project_name,
      进度管理记录: p.stats.schedule_records,
      总记录数: p.stats.total_records,
    }));
  }, [sortedProjects]);

  const typePieData = useMemo(() => {
    const map = new Map<string, number>();
    selectedProjects.forEach((p) => {
      const t = p.project_type || "未知";
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [selectedProjects]);

  const stagePieData = useMemo(() => {
    const map = new Map<string, number>();
    selectedProjects.forEach((p) => {
      const s = p.project_stage || "未知";
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [selectedProjects]);

  const handleExport = () => {
    if (sortedProjects.length === 0) {
      toast.info("没有可导出的数据");
      return;
    }
    const headers = ["项目名称", "项目编号", "项目经理", "项目类型", "项目阶段", "状态", "进度管理记录数", "总记录数", "成员数"];
    const rows = sortedProjects.map((p) => [
      p.project_name,
      p.project_code,
      p.role_project_manager || "-",
      p.project_type,
      p.project_stage,
      STATUS_LABELS[p.status] || p.status,
      p.stats.schedule_records,
      p.stats.total_records,
      p.member_count,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `项目看板统计_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

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
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData()}>
          重试
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-5 overflow-auto">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-teal-500" />
            项目看板
            {refreshing && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-1" />
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            全局项目概览与数据统计
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 项目搜索多选 */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 min-w-[200px] justify-between">
                <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">
                  {selectedIds.size === 0 || selectedIds.size === allProjects.length
                    ? `全部项目 (${allProjects.length})`
                    : `已选 ${selectedIds.size} 个项目`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0" align="end">
              <div className="p-2 border-b">
                <Input
                  placeholder="搜索项目名称/编号/项目经理..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-sm border-0 focus-visible:ring-0"
                />
              </div>
              <div className="max-h-[280px] overflow-auto p-1">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                  onClick={() => handleSelectionChange(new Set())}
                >
                  <Checkbox checked={selectedIds.size === 0 || selectedIds.size === allProjects.length} />
                  <span className="font-medium">全部项目</span>
                </div>
                <div className="border-t my-1" />
                {filteredProjects.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                        if (checked) {
                          next.add(p.id);
                        } else {
                          next.delete(p.id);
                        }
                        handleSelectionChange(next);
                      }}
                    />
                    <span className="truncate flex-1">{p.project_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{p.project_code}</span>
                  </label>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    无匹配项目
                  </div>
                )}
              </div>
              {selectedIds.size > 0 && selectedIds.size < allProjects.length && (
                <div className="border-t p-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => handleSelectionChange(new Set())}
                  >
                    查看全部
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => handleSelectionChange(new Set())}
                  >
                    清除选择
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            导出
          </Button>
        </div>
      </div>

      {/* ===== 板块 1：统计卡片 ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{selectedSummary.total_projects}</div>
              <div className="text-xs text-muted-foreground">项目总数</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{selectedSummary.active_projects}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{selectedSummary.total_records}</div>
              <div className="text-xs text-muted-foreground">总记录数</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{selectedSummary.total_schedule_records}</div>
              <div className="text-xs text-muted-foreground">进度管理记录</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{selectedSummary.total_members}</div>
              <div className="text-xs text-muted-foreground">成员总数</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 板块 2：AI 预警信息 ===== */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" />
              AI 预警分析
              {isAiGenerated && aiGeneratedAt && (
                <span className="text-xs text-muted-foreground font-normal">
                  上次生成：{new Date(aiGeneratedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {aiGeneratedBy ? `（${aiGeneratedBy}）` : ""}
                </span>
              )}
              <Badge variant="secondary" className="text-xs">
                {displayWarnings.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {["error", "warning", "info"].map((level) => (
                <label
                  key={level}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer border",
                    warningLevelFilter.has(level)
                      ? WARNING_LEVEL_CONFIG[level].bg + " " + WARNING_LEVEL_CONFIG[level].text + " border-transparent"
                      : "bg-gray-50 text-gray-400 border-gray-200"
                  )}
                >
                  <Checkbox
                    checked={warningLevelFilter.has(level)}
                    onCheckedChange={(checked) => {
                      const next = new Set(warningLevelFilter);
                      if (checked) next.add(level);
                      else next.delete(level);
                      setWarningLevelFilter(next);
                    }}
                    className="w-3 h-3"
                  />
                  {level === "error" ? "严重" : level === "warning" ? "警告" : "信息"}
                </label>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => generateAiWarnings()}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    生成新预警
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPromptDialogOpen(true)}
                title="编辑 AI 提示词"
              >
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayWarnings.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              暂无预警信息{!isAiGenerated ? "，点击「生成新预警」使用 AI 分析" : "，所有项目状态良好"}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-auto">
              {displayWarnings.map((w, i) => (
                <div
                  key={`${w.project_id}-${w.type}-${i}`}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2 rounded-lg border text-sm",
                    WARNING_LEVEL_CONFIG[w.level].bg,
                    WARNING_LEVEL_CONFIG[w.level].border,
                    WARNING_LEVEL_CONFIG[w.level].text
                  )}
                >
                  <span className="shrink-0 mt-0.5">{WARNING_LEVEL_CONFIG[w.level].icon}</span>
                  <span className="font-medium shrink-0">{w.project_name}</span>
                  <span className="opacity-75">{w.message}</span>
                  {onViewProject && (
                    <Button
                      variant="link"
                      size="sm"
                      className="ml-auto text-xs h-auto p-0 underline shrink-0"
                      onClick={() => onViewProject(w.project_id)}
                    >
                      查看
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ===== 板块 3：项目统计对比表 ===== */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Table className="w-4 h-4" />
              项目统计对比
              <span className="text-xs text-muted-foreground font-normal">
                （共 {sortedProjects.length} 个项目）
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="min-w-[140px]">项目名称</TableHead>
                    <TableHead className="min-w-[80px]">项目经理</TableHead>
                    <TableHead className="min-w-[60px]">类型</TableHead>
                    <TableHead className="min-w-[60px]">阶段</TableHead>
                    <TableHead className="min-w-[60px]">状态</TableHead>
                    <TableHead
                      className="min-w-[110px] cursor-pointer select-none"
                      onClick={() => handleSort("schedule_records")}
                    >
                      <span className="inline-flex items-center gap-1">
                        进度记录
                        {sortField === "schedule_records" && (
                          <span className="text-blue-500">{sortDir === "desc" ? "↓" : "↑"}</span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead
                      className="min-w-[80px] cursor-pointer select-none"
                      onClick={() => handleSort("total_records")}
                    >
                      <span className="inline-flex items-center gap-1">
                        总记录
                        {sortField === "total_records" && (
                          <span className="text-blue-500">{sortDir === "desc" ? "↓" : "↑"}</span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead
                      className="min-w-[60px] cursor-pointer select-none"
                      onClick={() => handleSort("member_count")}
                    >
                      <span className="inline-flex items-center gap-1">
                        成员
                        {sortField === "member_count" && (
                          <span className="text-blue-500">{sortDir === "desc" ? "↓" : "↑"}</span>
                        )}
                      </span>
                    </TableHead>
                    <TableHead className="min-w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProjects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-sm">
                        <div className="truncate max-w-[150px]" title={p.project_name}>
                          {p.project_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.project_code}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.role_project_manager || <span className="text-red-400">未指定</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.project_type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.project_stage}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            p.status === "active" && "bg-emerald-100 text-emerald-700",
                            p.status === "completed" && "bg-blue-100 text-blue-700",
                            p.status === "suspended" && "bg-amber-100 text-amber-700"
                          )}
                        >
                          {STATUS_LABELS[p.status] || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{p.stats.schedule_records}</TableCell>
                      <TableCell className="text-sm">{p.stats.total_records}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.member_count}</TableCell>
                      <TableCell>
                        {onViewProject && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => onViewProject(p.id)}
                          >
                            详情
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        暂无项目数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ===== 板块 4a：进度管理记录柱状图 ===== */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">各项目进度管理记录数（Top 10）</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label: string, payload: unknown[]) => {
                      const item = (payload as Array<{ payload: { fullName: string } }>)?.[0];
                      return item?.payload?.fullName || label;
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="进度管理记录" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ===== 板块 4b：项目类型/阶段分布 ===== */}
        <Card className="shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">项目类型与阶段分布</CardTitle>
          </CardHeader>
          <CardContent>
            {typePieData.length === 0 && stagePieData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <div className="flex gap-2 h-[260px]">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground text-center mb-1">按类型</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={typePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {typePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} 个`, "项目数"]} contentStyle={{ fontSize: 12 }} />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground text-center mb-1">按阶段</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stagePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {stagePieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} 个`, "项目数"]} contentStyle={{ fontSize: 12 }} />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== AI 提示词编辑对话框 ===== */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />
              AI 预警提示词编辑
            </DialogTitle>
            <DialogDescription className="text-xs">
              修改后将替换默认提示词，用于下次生成预警。关闭对话框保留修改（不持久化）。
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-auto py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                System Prompt（系统指令）
              </Label>
              <Textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                className="min-h-[180px] text-xs font-mono"
                placeholder="输入系统提示词..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                User Prompt（用户消息模板）
              </Label>
              <div className="text-[11px] text-muted-foreground mb-1">
                可用变量：<code className="bg-gray-100 px-1 rounded">{'${projectCount}'}</code> 项目数量、<code className="bg-gray-100 px-1 rounded">{'${projectData}'}</code> 项目数据摘要
              </div>
              <Textarea
                value={customUserPrompt}
                onChange={(e) => setCustomUserPrompt(e.target.value)}
                className="min-h-[140px] text-xs font-mono"
                placeholder="输入用户消息模板..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                setCustomUserPrompt(DEFAULT_USER_PROMPT);
              }}
            >
              恢复默认
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const sys = customSystemPrompt;
                const usr = customUserPrompt;
                setPromptDialogOpen(false);
                setTimeout(() => {
                  generateAiWarnings({ systemPrompt: sys, userPrompt: usr });
                }, 100);
              }}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              保存并用此提示词生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
