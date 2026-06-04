"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare, ClipboardList, Clock, Filter, Search, Loader2, Inbox,
  Send, Calendar, User, Briefcase, ListTodo, Plus, BarChart3,
  CheckCircle2, AlertTriangle, Circle, RotateCcw, Users, Building2,
  ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// TaskManagement - unified todo task component
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PublishTaskDialog } from "./publish-task-dialog";

// ============================================
// 类型
// ============================================

interface TaskDef {
  id: string;
  title: string;
  description?: string;
  task_type: "periodic" | "regular";
  task_mode?: "form" | "project" | "approval";
  assignee_ids: string[];
  project_ids: string[];
  form_source: string;
  form_table_code?: string;
  form_table_name?: string;
  periodic_type?: string;
  periodic_config?: Record<string, unknown>;
  deadline_config?: Record<string, unknown>;
  reminder_enabled: boolean;
  reminder_before_days: number;
  allow_late_complete: boolean;
  is_enabled: boolean;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // join fields
  _instance_count?: number;
  _completed_count?: number;
  _pending_count?: number;
  _overdue_count?: number;
  _progress?: number;
}

interface TaskInstance {
  id: string;
  definition_id?: string;
  title: string;
  assignee_id?: string;
  assignee_name?: string;
  project_id?: string;
  project_name?: string;
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  due_date?: string;
  completed_at?: string;
  form_record_id?: string;
  period_label?: string;
  is_late: boolean;
  created_at: string;
  source_type?: string;
  source_id?: string;
  description?: string;
  priority?: string;
  is_read?: boolean;
  // join fields
  _task_type?: string;
  _form_source?: string;
  _form_table_code?: string;
  _form_table_name?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
  by_assignee: Array<{ assignee_id: string; assignee_name: string; total: number; completed: number; rate: number }>;
  by_project: Array<{ project_id: string; project_name: string; total: number; completed: number; rate: number }>;
  by_task: Array<{ definition_id: string; title: string; total: number; completed: number; rate: number }>;
}

interface TaskManagementProps {
  currentUser?: { id: string; name: string; department?: string } | null;
}

type TabKey = "my" | "published" | "all" | "stats";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待完成", color: "text-amber-700", bg: "bg-amber-50" },
  in_progress: { label: "进行中", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "已完成", color: "text-green-700", bg: "bg-green-50" },
  overdue: { label: "已逾期", color: "text-red-700", bg: "bg-red-50" },
};

const TASK_TYPE_CONFIG = {
  periodic: { label: "周期任务", color: "text-purple-600", bg: "bg-purple-50" },
  regular: { label: "普通任务", color: "text-cyan-600", bg: "bg-cyan-50" },
};

const TASK_MODE_CONFIG: Record<string, { label: string; icon: string }> = {
  form: { label: "表单", icon: "📝" },
  project: { label: "项目", icon: "📋" },
  approval: { label: "流程", icon: "🔀" },
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getOverdueDays(dueDate?: string): number {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// 主组件
// ============================================

export function TaskManagement({ currentUser }: TaskManagementProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("my");
  const [myInstances, setMyInstances] = useState<TaskInstance[]>([]);
  const [publishedDefs, setPublishedDefs] = useState<TaskDef[]>([]);
  const [allInstances, setAllInstances] = useState<TaskInstance[]>([]);
  const [statsData, setStatsData] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // 加载我的待办
  const loadMyInstances = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ assignee_id: currentUser.id, status: "pending,in_progress,overdue" });
      const res = await fetch(`/api/todo-tasks/instances?${params}`);
      const json = await res.json();
      if (json.data) setMyInstances(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentUser?.id]);

  // 加载我发起的
  const loadPublishedDefs = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/todo-tasks/defs?created_by=${currentUser.id}`);
      const json = await res.json();
      if (json.data) setPublishedDefs(json.data);
    } catch { /* ignore */ }
  }, [currentUser?.id]);

  // 加载全部任务（上帝视角）
  const loadAllInstances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/todo-tasks/instances");
      const json = await res.json();
      if (json.data) setAllInstances(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/todo-tasks/stats");
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        const o = d.overview || {};
        setStatsData({
          total: o.total ?? 0,
          completed: o.completed ?? 0,
          in_progress: o.inProgress ?? 0,
          pending: o.pending ?? 0,
          overdue: o.overdue ?? 0,
          completion_rate: o.completionRate ?? 0,
          by_assignee: (d.byAssignee || []).map((a: Record<string, unknown>) => ({
            assignee_id: String(a.assignee_id || ""),
            assignee_name: String(a.name || "未知"),
            total: Number(a.total ?? 0),
            completed: Number(a.completed ?? 0),
            rate: Number(a.rate ?? 0),
          })),
          by_project: (d.byProject || []).map((p: Record<string, unknown>) => ({
            project_id: String(p.project_id || ""),
            project_name: String(p.name || "个人待办"),
            total: Number(p.total ?? 0),
            completed: Number(p.completed ?? 0),
            rate: Number(p.rate ?? 0),
          })),
          by_task: (d.byTask || []).map((t: Record<string, unknown>) => ({
            definition_id: String(t.definition_id || ""),
            title: String(t.title || "未知任务"),
            total: Number(t.total ?? 0),
            completed: Number(t.completed ?? 0),
            rate: Number(t.rate ?? 0),
          })),
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === "my") loadMyInstances();
    else if (activeTab === "published") loadPublishedDefs();
    else if (activeTab === "all") loadAllInstances();
    else if (activeTab === "stats") loadStats();
  }, [activeTab, loadMyInstances, loadPublishedDefs, loadAllInstances, loadStats]);

  const handleRefresh = () => {
    if (activeTab === "my") loadMyInstances();
    else if (activeTab === "published") loadPublishedDefs();
    else if (activeTab === "all") loadAllInstances();
    else if (activeTab === "stats") loadStats();
  };

  const handleInstanceAction = async (instanceId: string, action: "start" | "complete") => {
    try {
      const newStatus = action === "start" ? "in_progress" : "completed";
      await fetch(`/api/todo-tasks/instances/${instanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      handleRefresh();
    } catch { /* ignore */ }
  };

  const handlePublishSuccess = () => {
    setShowPublishDialog(false);
    handleRefresh();
  };

  // 上报问题：跳转到工单提交页面
  const handleReportIssue = (_instance: TaskInstance) => {
    window.dispatchEvent(new CustomEvent("navigate-to-view", { detail: { view: "issues" } }));
  };

  // 过滤
  const filteredMyInstances = useMemo(() => {
    return myInstances.filter((item) => {
      const q = searchQuery.toLowerCase();
      if (q && !item.title.toLowerCase().includes(q) && !(item.project_name || "").toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterType !== "all" && item._task_type !== filterType) return false;
      return true;
    });
  }, [myInstances, searchQuery, filterStatus, filterType]);

  const filteredAllInstances = useMemo(() => {
    return allInstances.filter((item) => {
      const q = searchQuery.toLowerCase();
      if (q && !item.title.toLowerCase().includes(q) && !(item.assignee_name || "").toLowerCase().includes(q) && !(item.project_name || "").toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterType !== "all" && item._task_type !== filterType) return false;
      return true;
    });
  }, [allInstances, searchQuery, filterStatus, filterType]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 页面标题 */}
      <div className="p-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ListTodo className="w-6 h-6" />
          待办任务
        </h2>
        <p className="text-sm text-muted-foreground mt-1">查看个人待办、任务进度、统计分析</p>
      </div>

      {/* Tab 栏 */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b">
        {([
          { key: "my" as TabKey, label: "我的待办", icon: ClipboardList },
          { key: "published" as TabKey, label: "我发起的", icon: Send },
          { key: "all" as TabKey, label: "全部任务", icon: Users },
          { key: "stats" as TabKey, label: "统计看板", icon: BarChart3 },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200",
              activeTab === tab.key
                ? "bg-indigo-50 text-indigo-600 font-medium shadow-sm ring-1 ring-indigo-200"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
            onClick={() => { setActiveTab(tab.key); setSearchQuery(""); setFilterStatus("all"); setFilterType("all"); }}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.key ? "text-indigo-500" : "text-gray-400")} />
            {tab.label}
          </button>
        ))}

        {/* 发布任务按钮 */}
        <button
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm ml-1"
          onClick={() => setShowPublishDialog(true)}
        >
          <Plus className="w-4 h-4" />
          发布任务
        </button>

        {/* 搜索 */}
        {activeTab !== "stats" && (
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="pl-8 h-8 w-48 text-sm bg-gray-50 border-gray-200"
            />
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      {activeTab !== "stats" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-600"
          >
            <option value="all">全部状态</option>
            <option value="pending">待完成</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="overdue">已逾期</option>
          </select>
          <select
            value={filterType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-600"
          >
            <option value="all">全部类型</option>
            <option value="periodic">周期任务</option>
            <option value="regular">普通任务</option>
          </select>
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "my" && (
          <MyTaskList
            instances={filteredMyInstances}
            loading={loading}
            onAction={handleInstanceAction}
            onReportIssue={handleReportIssue}
          />
        )}
        {activeTab === "published" && (
          <PublishedTaskList
            defs={publishedDefs}
            loading={loading}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === "all" && (
          <AllTaskList
            instances={filteredAllInstances}
            loading={loading}
            onAction={handleInstanceAction}
            onReportIssue={handleReportIssue}
          />
        )}
        {activeTab === "stats" && (
          <StatsPanel stats={statsData} loading={loading} />
        )}
      </div>

      {/* 发布任务弹窗 */}
      <PublishTaskDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        currentUser={currentUser}
        onSuccess={handlePublishSuccess}
      />
    </div>
  );
}

// ============================================
// 我的待办
// ============================================

interface MyTaskListProps {
  instances: TaskInstance[];
  loading: boolean;
  onAction: (id: string, action: "start" | "complete") => void;
  onReportIssue?: (instance: TaskInstance) => void;
}

function MyTaskList({ instances, loading, onAction, onReportIssue }: MyTaskListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载中...</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <Inbox className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">没有待办任务</p>
        <p className="text-xs text-gray-400 mt-1">点击右上角「发布任务」创建新任务</p>
      </div>
    );
  }

  // 分组：逾期 / 即将到期 / 正常
  const overdueItems = instances.filter((i) => i.status === "overdue" || getOverdueDays(i.due_date) > 0);
  const normalItems = instances.filter((i) => i.status !== "overdue" && getOverdueDays(i.due_date) <= 0);

  return (
    <div className="space-y-4">
      {overdueItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">逾期任务</span>
            <Badge variant="destructive" className="text-[10px] h-5">{overdueItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {overdueItems.map((item) => (
              <TaskInstanceCard key={item.id} instance={item} variant="overdue" onAction={onAction} onReportIssue={onReportIssue} />
            ))}
          </div>
        </div>
      )}
      {normalItems.length > 0 && (
        <div>
          {overdueItems.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">待完成</span>
              <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700">{normalItems.length}</Badge>
            </div>
          )}
          <div className="space-y-2">
            {normalItems.map((item) => (
              <TaskInstanceCard key={item.id} instance={item} variant="normal" onAction={onAction} onReportIssue={onReportIssue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 任务实例卡片
// ============================================

interface TaskInstanceCardProps {
  instance: TaskInstance;
  variant: "normal" | "overdue";
  onAction: (id: string, action: "start" | "complete") => void;
  onReportIssue?: (instance: TaskInstance) => void;
}

function TaskInstanceCard({ instance, variant, onAction, onReportIssue }: TaskInstanceCardProps) {
  const statusCfg = STATUS_CONFIG[instance.status] || STATUS_CONFIG.pending;
  const typeCfg = instance._task_type ? TASK_TYPE_CONFIG[instance._task_type as keyof typeof TASK_TYPE_CONFIG] : null;
  const overdueDays = getOverdueDays(instance.due_date);
  const isOverdue = overdueDays > 0 && instance.status !== "completed";

  return (
    <div className={cn(
      "bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
      isOverdue ? "border-red-200/80" : "border-gray-200/80",
      variant === "overdue" && "ring-1 ring-red-100"
    )}>
      <div className={cn("h-1", isOverdue ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-gray-300 to-gray-200")} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">{instance.title}</span>
              {instance.is_late && <Badge className="text-[10px] bg-orange-100 text-orange-700">迟交</Badge>}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
              {instance.source_type && instance.source_type !== "task" && (
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                  instance.source_type === "issue" ? "bg-amber-100 text-amber-700" :
                  instance.source_type === "knowledge" ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {instance.source_type === "issue" ? "工单" :
                   instance.source_type === "knowledge" ? "公告" :
                   instance.source_type === "approval" ? "审批" :
                   instance.source_type}
                </span>
              )}
              {typeCfg && (
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", typeCfg.bg, typeCfg.color)}>
                  {typeCfg.label}
                </span>
              )}
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", statusCfg.bg, statusCfg.color)}>
                {statusCfg.label}
              </span>
              {instance.project_name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {instance.project_name}
                </span>
              )}
              {instance.due_date && (
                <span className={cn("inline-flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                  <Calendar className="w-3 h-3" />
                  {isOverdue ? `逾期${overdueDays}天` : `截止${formatDate(instance.due_date)}`}
                </span>
              )}
              {instance.period_label && (
                <span className="inline-flex items-center gap-1 text-purple-500">
                  <RotateCcw className="w-3 h-3" />
                  {instance.period_label}
                </span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 shrink-0">
            {instance.status === "pending" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(instance.id, "start")}>
                开始
              </Button>
            )}
            {(instance.status === "pending" || instance.status === "in_progress" || instance.status === "overdue") && (
              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => onAction(instance.id, "complete")}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                完成
              </Button>
            )}
            {(instance.status === "pending" || instance.status === "in_progress" || instance.status === "overdue") && onReportIssue && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => onReportIssue(instance)}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                上报问题
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 我发起的
// ============================================

interface PublishedTaskListProps {
  defs: TaskDef[];
  loading: boolean;
  onRefresh: () => void;
}

function PublishedTaskList({ defs, loading }: PublishedTaskListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载中...</p>
      </div>
    );
  }

  if (defs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <Send className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">尚未发布任务</p>
        <p className="text-xs text-gray-400 mt-1">点击「发布任务」创建新任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {defs.map((def) => {
        const typeCfg = TASK_TYPE_CONFIG[def.task_type];
        const progress = def._progress || 0;
        const total = def._instance_count || 0;
        const completed = def._completed_count || 0;
        const overdue = def._overdue_count || 0;
        const pending = def._pending_count || 0;

        return (
          <div key={def.id} className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className={cn("h-1", def.task_type === "periodic" ? "bg-gradient-to-r from-purple-500 to-purple-400" : "bg-gradient-to-r from-cyan-500 to-cyan-400")} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{def.title}</span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", typeCfg.bg, typeCfg.color)}>
                      {typeCfg.label}
                    </span>
                    {def.task_mode && TASK_MODE_CONFIG[def.task_mode] && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                        {TASK_MODE_CONFIG[def.task_mode].icon} {TASK_MODE_CONFIG[def.task_mode].label}
                      </span>
                    )}
                    {!def.is_enabled && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">已停用</span>
                    )}
                  </div>
                  {def.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-1">{def.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>共 {total} 个实例</span>
                    <span className="text-green-600">完成 {completed}</span>
                    <span className="text-amber-600">待完成 {pending}</span>
                    {overdue > 0 && <span className="text-red-600">逾期 {overdue}</span>}
                  </div>
                  {total > 0 && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1.5" />
                      <span className="text-[10px] text-gray-400 mt-0.5 inline-block">{progress.toFixed(0)}% 完成率</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {formatDate(def.created_at)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 全部任务（上帝视角）
// ============================================

interface AllTaskListProps {
  instances: TaskInstance[];
  loading: boolean;
  onAction: (id: string, action: "start" | "complete") => void;
  onReportIssue?: (instance: TaskInstance) => void;
}

function AllTaskList({ instances, loading, onAction, onReportIssue }: AllTaskListProps) {
  const [filterAssignee, setFilterAssignee] = useState("all");

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    instances.forEach((i) => {
      if (i.assignee_id && i.assignee_name) map.set(i.assignee_id, i.assignee_name);
    });
    return Array.from(map.entries());
  }, [instances]);

  const filtered = useMemo(() => {
    if (filterAssignee === "all") return instances;
    return instances.filter((i) => i.assignee_id === filterAssignee);
  }, [instances, filterAssignee]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载中...</p>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <Users className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">暂无任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 人员筛选 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterAssignee("all")}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            filterAssignee === "all" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          全部人员
        </button>
        {assignees.map(([id, name]) => (
          <button
            key={id}
            onClick={() => setFilterAssignee(id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              filterAssignee === id ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <TaskInstanceCard key={item.id} instance={item} variant="normal" onAction={onAction} onReportIssue={onReportIssue} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// 统计看板
// ============================================

interface StatsPanelProps {
  stats: TaskStats | null;
  loading: boolean;
}

function StatsPanel({ stats, loading }: StatsPanelProps) {
  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载统计数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "总任务", value: stats.total, icon: ListTodo, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "已完成", value: stats.completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "进行中", value: stats.in_progress, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "待完成", value: stats.pending, icon: Circle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "逾期", value: stats.overdue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((card) => (
          <div key={card.label} className={cn("p-4 rounded-xl border", card.bg, "border-gray-100")}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={cn("w-4 h-4", card.color)} />
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
            <div className={cn("text-2xl font-bold", card.color)}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 完成率 */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">整体完成率</span>
          <span className="text-lg font-bold text-indigo-600">{(stats.completion_rate ?? 0).toFixed(1)}%</span>
        </div>
        <Progress value={stats.completion_rate} className="h-2" />
      </div>

      {/* 按人员统计 */}
      {stats.by_assignee.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">人员完成率排名</span>
          </div>
          <div className="space-y-3">
            {stats.by_assignee
              .sort((a, b) => b.rate - a.rate)
              .map((item, idx) => (
                <div key={item.assignee_id} className="flex items-center gap-3">
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-gray-200 text-gray-600" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-gray-50 text-gray-400"
                  )}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 w-20 truncate">{item.assignee_name}</span>
                  <div className="flex-1">
                    <Progress value={item.rate} className="h-2" />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {item.completed}/{item.total}
                  </span>
                  <span className={cn(
                    "text-xs font-medium w-14 text-right",
                    item.rate >= 80 ? "text-green-600" : item.rate >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {(item.rate ?? 0).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 按任务统计 */}
      {stats.by_task.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">任务完成率</span>
          </div>
          <div className="space-y-3">
            {stats.by_task
              .sort((a, b) => b.rate - a.rate)
              .map((item) => (
                <div key={item.definition_id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 flex-1 truncate">{item.title}</span>
                  <div className="w-32">
                    <Progress value={item.rate} className="h-2" />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {item.completed}/{item.total}
                  </span>
                  <span className={cn(
                    "text-xs font-medium w-14 text-right",
                    item.rate >= 80 ? "text-green-600" : item.rate >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {(item.rate ?? 0).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 按项目统计 */}
      {stats.by_project.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-gray-700">项目完成率</span>
          </div>
          <div className="space-y-3">
            {stats.by_project
              .sort((a, b) => b.rate - a.rate)
              .map((item) => (
                <div key={item.project_id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 flex-1 truncate">{item.project_name}</span>
                  <div className="w-32">
                    <Progress value={item.rate} className="h-2" />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {item.completed}/{item.total}
                  </span>
                  <span className={cn(
                    "text-xs font-medium w-14 text-right",
                    item.rate >= 80 ? "text-green-600" : item.rate >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {(item.rate ?? 0).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
