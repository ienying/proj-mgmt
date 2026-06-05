"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, List, LayoutGrid, Calendar, Clock, CheckCircle2,
  AlertCircle, Star, Filter, X, ChevronRight, Inbox, GripVertical,
} from "lucide-react";
import { TaskCard, type TaskCardData } from "./task-card";
import { PublishTaskDialog } from "./publish-task-dialog";

interface TaskCenterProps {
  currentUser?: { id: string; name: string; department?: string; phone?: string } | null;
}

type ViewMode = "kanban" | "list" | "calendar";
type NavFilter = "all" | "pending" | "completed" | "today" | "starred";

const STATUS_COLS: Array<{ key: string; label: string; color: string }> = [
  { key: "pending", label: "待处理", color: "border-t-amber-400" },
  { key: "in_progress", label: "进行中", color: "border-t-blue-400" },
  { key: "completed", label: "已完成", color: "border-t-emerald-400" },
  { key: "overdue", label: "已逾期", color: "border-t-red-400" },
];

export function TaskCenter({ currentUser }: TaskCenterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [navFilter, setNavFilter] = useState<NavFilter>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [instances, setInstances] = useState<TaskCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/todo-tasks/instances?assignee_id=${currentUser.id}&status=pending,in_progress,overdue,completed`);
      const d = await r.json();
      const items: TaskCardData[] = (d.data || []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        title: String(item.title || ""),
        status: String(item.status || "pending") as TaskCardData["status"],
        priority: (item.priority as TaskCardData["priority"]) || "normal",
        assignee_name: String(item.assignee_name || ""),
        project_name: String(item.project_name || ""),
        due_date: String(item.due_date || ""),
        task_type: (item._task_type as TaskCardData["task_type"]) || "regular",
        task_mode: (item._task_mode as TaskCardData["task_mode"]),
        is_late: Boolean(item.is_late),
        source_type: String(item.source_type || ""),
        progress: Number(item._progress || 0),
      }));
      setInstances(items);
    } catch { setInstances([]); }
    finally { setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // 筛选逻辑
  const filtered = useMemo(() => {
    let items = instances;
    const today = new Date().toISOString().slice(0, 10);

    if (navFilter === "pending") items = items.filter(i => ["pending", "in_progress", "overdue"].includes(i.status));
    else if (navFilter === "completed") items = items.filter(i => i.status === "completed");
    else if (navFilter === "today") items = items.filter(i => i.due_date?.slice(0, 10) === today);
    else if (navFilter === "starred") items = items.filter(i => i.priority === "high");

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.assignee_name?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") items = items.filter(i => i.status === statusFilter);
    if (priorityFilter !== "all") items = items.filter(i => i.priority === priorityFilter);
    if (projectFilter !== "all") items = items.filter(i => i.project_name === projectFilter);

    return items;
  }, [instances, navFilter, searchQuery, statusFilter, priorityFilter, projectFilter]);

  // 统计数据
  const stats = useMemo(() => ({
    total: instances.length,
    pending: instances.filter(i => i.status === "pending").length,
    inProgress: instances.filter(i => i.status === "in_progress").length,
    completed: instances.filter(i => i.status === "completed").length,
    overdue: instances.filter(i => i.status === "overdue").length,
  }), [instances]);

  // 项目列表
  const projectList = useMemo(() => {
    const set = new Set(instances.map(i => i.project_name).filter(Boolean));
    return [...set];
  }, [instances]);

  const handleTaskAction = async (taskId: string, action: string) => {
    if (action === "start") {
      await fetch(`/api/todo-tasks/instances/${taskId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
    } else if (action === "complete") {
      await fetch(`/api/todo-tasks/instances/${taskId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
    }
    loadData();
    toast.success(action === "complete" ? "已完成" : "已开始");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilter("all"); setPriorityFilter("all"); setProjectFilter("all");
    setSearchQuery(""); setNavFilter("pending");
  };

  // 左侧导航
  const renderNav = () => (
    <div className="w-48 shrink-0 border-r bg-gray-50/50 h-full flex flex-col">
      <div className="p-3 space-y-0.5">
        {([
          { key: "all", label: "全部任务", icon: Inbox, count: stats.total },
          { key: "pending", label: "待处理", icon: AlertCircle, count: stats.pending + stats.inProgress + stats.overdue },
          { key: "completed", label: "已完成", icon: CheckCircle2, count: stats.completed },
          { key: "today", label: "今日到期", icon: Clock, count: null },
          { key: "starred", label: "⭐ 关注", icon: Star, count: null },
        ] as Array<{ key: NavFilter; label: string; icon: React.ComponentType<{ className?: string }>; count: number | null }>).map(item => (
          <button key={item.key} onClick={() => setNavFilter(item.key)}
            className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
              navFilter === item.key ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100")}>
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== null && <span className="text-xs text-gray-400">{item.count}</span>}
          </button>
        ))}
      </div>

      <div className="border-t mx-3 my-2" />

      <div className="px-3 pb-2 space-y-2">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">筛选</p>
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">按项目</p>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1 bg-white">
            <option value="all">全部项目</option>
            {projectList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">按优先级</p>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1 bg-white">
            <option value="all">全部</option>
            <option value="high">🔴 高</option>
            <option value="normal">🟡 中</option>
            <option value="low">🟢 低</option>
          </select>
        </div>
      </div>
    </div>
  );

  // 看板视图
  const renderKanban = () => (
    <div className="flex gap-3 overflow-x-auto h-full p-4">
      {STATUS_COLS.map(col => {
        const items = filtered.filter(i => i.status === col.key);
        return (
          <div key={col.key} className={cn("flex-1 min-w-[220px] max-w-[320px] rounded-xl bg-gray-50/80 border-t-2 flex flex-col", col.color)}>
            <div className="px-3 py-2 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-gray-700">{col.label}</span>
              <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {items.map(task => (
                <TaskCard key={task.id} task={task} compact
                  onClick={() => toggleSelect(task.id)}
                  selected={selectedIds.has(task.id)}
                  onAction={(a) => handleTaskAction(task.id, a)} />
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">暂无任务</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 列表视图
  const renderList = () => (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr className="text-left text-xs text-gray-500">
            <th className="w-8 px-2 py-2"></th>
            <th className="px-2 py-2">状态</th>
            <th className="px-2 py-2">优先级</th>
            <th className="px-2 py-2">标题</th>
            <th className="px-2 py-2">负责人</th>
            <th className="px-2 py-2">截止日期</th>
            <th className="px-2 py-2">项目</th>
            <th className="px-2 py-2 w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filtered.map(task => {
            const isLate = task.is_late || task.status === "overdue";
            return (
              <tr key={task.id} className={cn("hover:bg-gray-50 cursor-pointer", selectedIds.has(task.id) && "bg-indigo-50", isLate && "bg-red-50/30")}
                onClick={() => toggleSelect(task.id)}>
                <td className="px-2 py-2">
                  <Checkbox checked={selectedIds.has(task.id)} />
                </td>
                <td className="px-2 py-2">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                    task.status === "pending" ? "bg-amber-50 text-amber-600" :
                    task.status === "in_progress" ? "bg-blue-50 text-blue-600" :
                    task.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                    {task.status === "pending" ? "待处理" : task.status === "in_progress" ? "进行中" : task.status === "completed" ? "已完成" : "已逾期"}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {task.priority === "high" ? "🔴" : task.priority === "low" ? "🟢" : "🟡"}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 truncate max-w-[200px]">{task.title}</td>
                <td className="px-2 py-2 text-gray-500">{task.assignee_name || "-"}</td>
                <td className={cn("px-2 py-2 text-xs", isLate && "text-red-500 font-medium")}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString("zh-CN") : "-"}
                </td>
                <td className="px-2 py-2 text-gray-500 text-xs">{task.project_name || "-"}</td>
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    {task.status !== "completed" && (
                      <button onClick={(e) => { e.stopPropagation(); handleTaskAction(task.id, task.status === "pending" ? "start" : "complete"); }}
                        className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                        {task.status === "pending" ? "开始" : "完成"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-400">暂无任务</div>}
    </div>
  );

  // 日历视图
  const renderCalendar = () => {
    const today = new Date();
    const days: Date[] = [];
    for (let i = -1; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    return (
      <div className="overflow-auto h-full p-4">
        <div className="grid grid-cols-7 gap-1">
          {["一","二","三","四","五","六","日"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
          {days.map(day => {
            const dateStr = day.toISOString().slice(0, 10);
            const dayItems = filtered.filter(i => i.due_date?.slice(0, 10) === dateStr);
            const isToday = dateStr === today.toISOString().slice(0, 10);
            return (
              <div key={dateStr} className={cn("min-h-[80px] border rounded-lg p-1 text-xs",
                isToday ? "border-indigo-300 bg-indigo-50/50" : "border-gray-100")}>
                <div className={cn("text-center mb-0.5", isToday ? "font-bold text-indigo-600" : "text-gray-500")}>
                  {day.getDate()}
                </div>
                {dayItems.slice(0, 3).map(t => (
                  <div key={t.id} className={cn("px-1 py-0.5 rounded mb-0.5 truncate text-[10px]",
                    t.status === "overdue" ? "bg-red-100 text-red-700" : t.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700")}>
                    {t.title.slice(0, 8)}
                  </div>
                ))}
                {dayItems.length > 3 && <div className="text-[9px] text-gray-400">+{dayItems.length - 3}项</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部栏 */}
      <div className="shrink-0 border-b px-4 py-2 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">待办中心</h2>
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索任务..." className="h-8 text-sm pl-8" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs border rounded px-2 bg-white">
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="overdue">已逾期</option>
        </select>
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: "kanban" as const, icon: LayoutGrid, label: "看板" },
            { key: "list" as const, icon: List, label: "列表" },
            { key: "calendar" as const, icon: Calendar, label: "日历" },
          ]).map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className={cn("flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-colors",
                viewMode === v.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              <v.icon className="w-3.5 h-3.5" /> {v.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-gray-500">已选 {selectedIds.size}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>取消</Button>
          </div>
        )}
        <Button size="sm" onClick={() => setShowPublish(true)} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-3.5 h-3.5 mr-1" /> 发布任务
        </Button>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex min-h-0">
        {renderNav()}
        <div className="flex-1 min-w-0 overflow-hidden">
          {loading
            ? <div className="flex items-center justify-center h-full text-gray-400">加载中...</div>
            : viewMode === "kanban" ? renderKanban()
            : viewMode === "list" ? renderList()
            : renderCalendar()
          }
        </div>
      </div>

      <PublishTaskDialog open={showPublish} onOpenChange={setShowPublish} currentUser={currentUser || { id: "", name: "" }} onSuccess={loadData} />
    </div>
  );
}
