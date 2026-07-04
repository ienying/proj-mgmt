"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, ClipboardList, CheckSquare, FileText,
  User, Calendar, ChevronRight, Trash2,
  MoreHorizontal, RefreshCw, AlertCircle,
  Send, Undo2, SkipForward,
  Archive, Layers, BarChart3, Building2,
  Search, Download, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportExcel } from "@/lib/export-excel";
import TaskCenterCreateWizard from "./task-center-create-wizard";
import TaskCenterDetail from "./task-center-detail";

/* ─── 类型 ─── */
interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

interface TaskDef {
  id: string;
  task_name: string;
  time_type: string;
  task_mode: string;
  periodic_config: any;
  form_columns: any[];
  workflow_nodes: any[];
  assignee_config: any;
  board_records: any[];
  deadline_config: any;
  schema_name: string;
  table_name: string;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

interface TaskInstance {
  id: string;
  def_id: string;
  period_label: string;
  assignee_id: string;
  assignee_name: string;
  current_node_id: string;
  current_node_index: number;
  node_history: any[];
  status: string;
  project_id: string;
  project_name: string;
  due_date: string;
  created_at: string;
  task_name: string;
  time_type: string;
  task_mode: string;
  schema_name: string;
  table_name: string;
  def_created_by: string;
  def_created_by_name: string;
}

interface TaskCenterProps {
  currentUser: CurrentUser;
}

/* ─── 状态标签映射 ─── */
const STATUS_MAP: Record<string, { label: string; color: string; barColor: string; dotColor: string }> = {
  pending: { label: "待处理", color: "bg-yellow-50 text-yellow-700 border-yellow-200", barColor: "bg-yellow-400", dotColor: "#d0d0d0" },
  in_progress: { label: "进行中", color: "bg-blue-50 text-blue-700 border-blue-200", barColor: "bg-blue-400", dotColor: "#fa8c16" },
  completed: { label: "已完成", color: "bg-green-50 text-green-700 border-green-200", barColor: "bg-green-400", dotColor: "#52c41a" },
  returned: { label: "已退回", color: "bg-red-50 text-red-700 border-red-200", barColor: "bg-red-400", dotColor: "#f5222d" },
  cancelled: { label: "已撤回", color: "bg-gray-100 text-black border-gray-200", barColor: "bg-gray-300", dotColor: "#8c8c8c" },
  terminated: { label: "已终止", color: "bg-red-50 text-red-700 border-red-200", barColor: "bg-red-400", dotColor: "#f5222d" },
};

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  process: { label: "流程型", color: "bg-indigo-50 text-indigo-600" },
  project: { label: "项目型", color: "bg-purple-50 text-purple-600" },
};

const TIME_LABELS: Record<string, { label: string; color: string }> = {
  one_time: { label: "一次性", color: "bg-teal-50 text-teal-600" },
  periodic: { label: "周期性", color: "bg-cyan-50 text-cyan-600" },
};

/* ─── 筛选选项类型 ─── */
interface FilterState {
  status: string;       // "all" | "in_progress" | "overdue" | "completed" | "pending"
  priority: string;     // "all" | "urgent" | "high" | "normal" | "low"
  tagType: string;      // "all" | "process" | "project"
  project: string;      // "all" | project_id
  assignee: string;     // "all" | user_id
  search: string;
  sort: string;         // "newest" | "deadline_asc" | "priority_desc"
}

export default function TaskCenter({ currentUser }: TaskCenterProps) {
  const [activeTab, setActiveTab] = useState<"todos" | "published" | "all">("todos");
  const [showWizard, setShowWizard] = useState(false);
  const [defs, setDefs] = useState<TaskDef[]>([]);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail view
  const [selectedInstance, setSelectedInstance] = useState<TaskInstance | null>(null);
  const [selectedDef, setSelectedDef] = useState<TaskDef | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "def" | "instance"; id: string; name: string } | null>(null);

  // Advance dialog
  const [advanceTarget, setAdvanceTarget] = useState<TaskInstance | null>(null);
  const [advanceAction, setAdvanceAction] = useState<"submit" | "reject" | "skip" | "withdraw">("submit");

  // New UI state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [pubInstances, setPubInstances] = useState<Record<string, any[]>>({});
  const [pubPhysData, setPubPhysData] = useState<Record<string, Record<string, any>>>({});
  const [pubLoading, setPubLoading] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    status: "all", priority: "all", tagType: "all",
    project: "all", assignee: "all", search: "", sort: "newest",
  });

  /* ─── 加载数据 ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = currentUser.id;

      if (activeTab === "published") {
        const res = await fetch(`/api/tasks/defs?user_id=${uid}&status=active`);
        const json = await res.json();
        if (json.data) setDefs(json.data);
        // Also load instances to show fill counts for published tasks
        const instRes = await fetch(`/api/tasks/instances`);
        const instJson = await instRes.json();
        if (instJson.data) {
          // Only keep instances for defs created by this user
          const userDefIds = new Set((json.data || []).map((d: any) => d.id));
          setInstances((instJson.data || []).filter((i: any) => userDefIds.has(i.def_id)));
        }
      } else if (activeTab === "todos") {
        const res = await fetch(`/api/tasks/instances?user_id=${uid}&mode=my_todos`);
        const json = await res.json();
        if (json.data) setInstances(json.data);
      } else {
        const res = await fetch(`/api/tasks/instances`);
        const json = await res.json();
        if (json.data) setInstances(json.data);
      }
    } catch (e) {
      console.error("加载任务数据失败:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUser.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch("/api/tasks/ensure-schemas", { method: "POST" }).catch(() => {});
  }, []);

  /* ─── 创建任务 ─── */
  const handleCreate = async (data: any) => {
    try {
      const res = await fetch("/api/tasks/defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");

      const def = json.data;
      if (def.task_mode === "process" && def.workflow_nodes?.length > 0) {
        await fetch("/api/tasks/instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            def_id: def.id,
            period_label: def.time_type === "periodic" ? new Date().toISOString().slice(0, 7) : undefined,
            project_id: def.assignee_config?.project_id,
            project_name: def.assignee_config?.project_name,
            due_date: def.deadline_config?.due_date,
          }),
        });
      }

      toast.success("任务创建成功");
      setShowWizard(false);
      loadData();
    } catch (e: any) {
      toast.error("创建失败: " + e.message);
    }
  };

  /* ─── 删除 ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url = deleteTarget.type === "def"
        ? `/api/tasks/defs/${deleteTarget.id}?user_id=${currentUser.id}`
        : `/api/tasks/instances/${deleteTarget.id}?user_id=${currentUser.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "删除失败");
      toast.success("删除成功");
      setDeleteTarget(null);
      loadData();
    } catch (e: any) {
      toast.error("删除失败: " + e.message);
    }
  };

  /* ─── 工作流推进 ─── */
  const handleAdvance = async (action: string) => {
    if (!advanceTarget) return;
    try {
      const body: any = { action, user_id: currentUser.id, user_name: currentUser.name };
      if (action === "reject") {
        const reason = (document.getElementById("reject-reason") as HTMLTextAreaElement)?.value;
        if (!reason) { toast.error("请填写驳回原因"); return; }
        body.reason = reason;
      }
      const res = await fetch(`/api/tasks/instances/${advanceTarget.id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "操作失败");
      toast.success(action === "submit" ? "提交成功" : action === "reject" ? "已驳回" : action === "skip" ? "已跳过" : "已撤回");
      setAdvanceTarget(null);
      loadData();
    } catch (e: any) {
      toast.error("操作失败: " + e.message);
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const toggleExpand = (id: string, isDef?: boolean, defId?: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // Fetch instances + phys data when expanding a published task
    if (isDef && defId && !expandedCards.has(id)) {
      setPubLoading(prev => ({ ...prev, [id]: true }));
      fetch(`/api/tasks/instances?def_id=${defId}`)
        .then(r => r.json())
        .then(async j => {
          const insts = j.data || [];
          setPubInstances(prev => ({ ...prev, [id]: insts }));
          // Fetch phys data for each instance
          const physMap: Record<string, any> = {};
          await Promise.all(insts.map(async (inst: any) => {
            try {
              const r = await fetch(`/api/tasks/instances/${inst.id}`);
              const d = await r.json();
              physMap[inst.id] = d.data?.phys_row || {};
            } catch (e) { physMap[inst.id] = {}; }
          }));
          setPubPhysData(prev => ({ ...prev, ...physMap }));
        })
        .catch(() => {})
        .finally(() => setPubLoading(prev => ({ ...prev, [id]: false })));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = new Set(filteredItems().map((item: any) => item.id));
    if (selectedIds.size === allIds.size && allIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(allIds);
    }
  };

  /* ─── 多人任务分组 ─── */
  const groupParallelInstances = (rawItems: any[]): any[] => {
    const groups: Record<string, any> = {};
    const result: any[] = [];

    for (const item of rawItems) {
      if (item.parallel_group_id) {
        const gid = item.parallel_group_id;
        if (!groups[gid]) {
          groups[gid] = {
            ...item,
            id: gid,
            _isGroup: true,
            _members: [item],
            _def_id: item.def_id,
            _task_name: item.task_name,
            _task_mode: item.task_mode,
            _schema_name: item.schema_name,
            _table_name: item.table_name,
            _created_at: item.created_at,
            _due_date: item.due_date,
            _project_name: item.project_name,
            _created_by_name: item.def_created_by_name,
          };
        } else {
          groups[gid]._members.push(item);
          // Keep earliest created_at
          if (item.created_at < groups[gid]._created_at) groups[gid]._created_at = item.created_at;
        }
      } else {
        result.push(item);
      }
    }

    for (const g of Object.values(groups)) {
      const members = g._members as any[];
      g._totalCount = members.length;
      g._completedCount = members.filter((m: any) => m.status === "completed").length;
      g._inProgressCount = members.filter((m: any) => m.status === "in_progress" || m.status === "pending").length;
      g.status = g._completedCount === g._totalCount ? "completed"
        : g._completedCount > 0 ? "in_progress" : "pending";
      g.assignee_name = members.map((m: any) => m.assignee_name).filter(Boolean).join("、");
      g.assignee_id = members.map((m: any) => m.assignee_id).filter(Boolean).join(",");
      // Keep the first member's workflow/def info
      const firstMember = members[0];
      g.task_name = firstMember.task_name;
      g.task_mode = firstMember.task_mode;
      g.current_node_index = firstMember.current_node_index;
      g.def_id = firstMember.def_id;
      g._def_id = firstMember.def_id;
      result.push(g);
    }

    return result;
  };

  /* ─── 筛选与排序 ─── */
  const filteredItems = (): any[] => {
    let items: any[] = activeTab === "published" ? defs : instances;

    // Group parallel instances for "all" and "todos" tabs
    if (activeTab !== "published") {
      items = groupParallelInstances(items);
    }

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((item: any) =>
        (item.task_name || "").toLowerCase().includes(q) ||
        (item.project_name || "").toLowerCase().includes(q) ||
        (item.assignee_name || "").toLowerCase().includes(q)
      );
    }

    // Status filter (for instances)
    if (activeTab !== "published" && filters.status !== "all") {
      items = items.filter((item: any) => {
        if (filters.status === "overdue") {
          return item.due_date && new Date(item.due_date) < new Date() && item.status !== "completed";
        }
        return item.status === filters.status;
      });
    }

    // Tag type filter
    if (filters.tagType !== "all") {
      items = items.filter((item: any) => item.task_mode === filters.tagType || item.time_type === filters.tagType);
    }

    // Project filter
    if (filters.project !== "all") {
      items = items.filter((item: any) => item.project_id === filters.project || item.project_name === filters.project);
    }

    // Assignee filter
    if (filters.assignee !== "all") {
      items = items.filter((item: any) => item.assignee_id === filters.assignee || item.assignee_name === filters.assignee);
    }

    // Sort
    if (filters.sort === "deadline_asc") {
      items.sort((a: any, b: any) => (a.due_date || "").localeCompare(b.due_date || ""));
    } else {
      items.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return items;
  };

  /* ─── 统计数据 ─── */
  const stats = useMemo(() => {
    const items = activeTab === "published" ? defs : instances;
    const filtered = filteredItems();
    const overdue = (activeTab !== "published" ? instances : []).filter((i: any) =>
      i.due_date && new Date(i.due_date) < new Date() && i.status !== "completed"
    );
    const weekDue = (activeTab !== "published" ? instances : [])
      .filter((i: any) => i.due_date && new Date(i.due_date) > new Date() && new Date(i.due_date) < new Date(Date.now() + 7 * 86400000));
    return {
      total: items.length,
      filtered: filtered.length,
      overdue: overdue.length,
      weekDue: weekDue.length,
      completed: items.filter((i: any) => i.status === "completed").length,
    };
  }, [activeTab, defs, instances, filters]);

  /* ─── 提取项目列表 ─── */
  const projectList = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const inst of instances) {
      if (inst.project_name && !seen.has(inst.project_name)) {
        seen.add(inst.project_name);
        result.push({ id: inst.project_id || inst.project_name, name: inst.project_name });
      }
    }
    return result;
  }, [instances]);

  /* ─── 提取负责人列表 ─── */
  const assigneeList = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const inst of instances) {
      if (inst.assignee_name && !seen.has(inst.assignee_name)) {
        seen.add(inst.assignee_name);
        result.push({ id: inst.assignee_id || inst.assignee_name, name: inst.assignee_name });
      }
    }
    return result;
  }, [instances]);

  /* ─── 渲染任务卡片 ─── */
  const renderTaskCard = (item: any, isDef: boolean) => {
    const isExpanded = expandedCards.has(item.id);
    const isSelected = selectedIds.has(item.id);
    const statusInfo = isDef
      ? { label: "已发布", color: "bg-blue-50 text-blue-700 border-blue-200", barColor: "bg-blue-400", dotColor: "#1890ff" }
      : (STATUS_MAP[item.status] || STATUS_MAP.pending);
    const modeInfo = MODE_LABELS[item.task_mode] || { label: item.task_mode, color: "bg-gray-50 text-black" };

    // Calculate progress based on workflow nodes
    const workflowNodes = item.workflow_nodes || [];
    const currentNodeIndex = item.current_node_index ?? 0;
    const totalNodes = workflowNodes.length || (item.form_columns?.length || 1);
    const doneNodes = isDef ? 0 : (item.status === "completed" ? totalNodes : Math.max(0, currentNodeIndex));
    const progressPct = totalNodes > 0 ? Math.round((doneNodes / totalNodes) * 100) : (item.status === "completed" ? 100 : 0);

    // Avatar initials from assignee
    const getInitials = (name: string) => name?.slice(0, 1) || "?";

    return (
      <React.Fragment key={item.id}>
        <div
          className={`task-card group bg-white rounded-none border transition-all duration-200 cursor-pointer
            ${isExpanded ? "border-orange-300 bg-orange-50/30 shadow-md" : "border-gray-200/80 hover:border-orange-200 hover:shadow-lg"}`}
        >
          {/* Checkbox */}
          <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
            <div
              className={`w-5 h-5 rounded-none border-2 flex items-center justify-center cursor-pointer transition-all duration-200
                ${isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300 hover:border-orange-400"}`}
              onClick={() => toggleSelect(item.id)}
            >
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
          </div>

          {/* Main body */}
          <div className="flex-1 min-w-0" onClick={() => toggleExpand(item.id)}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-black truncate group-hover:text-orange-600 transition-colors">
                {item.task_name}
              </span>
              {!isDef && modeInfo.label && (
                <Badge className={`${modeInfo.color} text-[11px] border-0 font-normal`}>{modeInfo.label}</Badge>
              )}
              {(item as any)._isGroup && (
                <Badge className="bg-purple-50 text-purple-600 text-[11px] border-0 font-normal">
                  多人 · {(item as any)._totalCount}人
                </Badge>
              )}
              {isDef && (
                <>
                  <Badge className={`${MODE_LABELS[item.task_mode]?.color || "bg-gray-50 text-black"} text-[11px] border-0 font-normal`}>
                    {MODE_LABELS[item.task_mode]?.label || item.task_mode}
                  </Badge>
                  <Badge className={`${TIME_LABELS[item.time_type]?.color || "bg-gray-50 text-black"} text-[11px] border-0 font-normal`}>
                    {TIME_LABELS[item.time_type]?.label || item.time_type}
                  </Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-black">
              {!isDef && item.status && (item as any)._isGroup ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (item as any)._completedCount === (item as any)._totalCount ? "#52c41a" : "#fa8c16" }} />
                  {(item as any)._completedCount}/{(item as any)._totalCount} 已完成
                </span>
              ) : !isDef && item.status && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.dotColor }} />
                  {item.status === "in_progress" && item.due_date && (
                    <span className={new Date(item.due_date) < new Date() ? "text-red-500 font-medium" : ""}>
                      截止 {fmtDate(item.due_date)}
                    </span>
                  )}
                  {item.status !== "in_progress" && statusInfo.label}
                </span>
              )}
              {!isDef && item.assignee_name && (
                <span className="flex items-center gap-1"><User className="w-3 h-3 text-black" />{item.assignee_name}</span>
              )}
              {(item.project_name || item.assignee_config?.project_name) && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-black" />{item.project_name || item.assignee_config?.project_name}</span>
              )}
              {isDef && item.workflow_nodes?.length > 0 && (
                <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-black" />{item.workflow_nodes.length} 节点</span>
              )}
              {isDef && item.form_columns?.length > 0 && (
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-black" />{item.form_columns.length} 字段</span>
              )}
              {isDef && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-black" />{fmtDate(item.created_at)}</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(item as any)._isGroup ? (
            <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={() => toggleExpand(item.id)}>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item as any)._totalCount > 0 ? Math.round(((item as any)._completedCount / (item as any)._totalCount) * 100) : 0}%`,
                    background: (item as any)._completedCount === (item as any)._totalCount
                      ? "linear-gradient(90deg, #52c41a, #73d13d)"
                      : "linear-gradient(90deg, #fa8c16, #ffa940)",
                  }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: (item as any)._completedCount === (item as any)._totalCount ? "#52c41a" : "#fa8c16" }}>
                {(item as any)._completedCount}/{(item as any)._totalCount}
              </span>
            </div>
          ) : !isDef && totalNodes > 0 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0" onClick={() => toggleExpand(item.id)}>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? "linear-gradient(90deg, #52c41a, #73d13d)"
                      : "linear-gradient(90deg, #fa8c16, #ffa940)",
                  }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: progressPct === 100 ? "#52c41a" : "#fa8c16" }}>
                {progressPct}%
              </span>
            </div>
          )}

          {/* Avatars */}
          <div className="hidden md:flex items-center shrink-0" onClick={() => toggleExpand(item.id)}>
            <div className="flex flex-row-reverse">
              {!isDef && item.assignee_name && (
                <span
                  className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white -ml-1 first:ml-0"
                  title={item.assignee_name}
                >{getInitials(item.assignee_name)}</span>
              )}
              {isDef && item.created_by_name && (
                <span
                  className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center border-2 border-white"
                  title={item.created_by_name}
                >{getInitials(item.created_by_name)}</span>
              )}
            </div>
          </div>

          {/* Expand arrow */}
          <div className="shrink-0 text-gray-300 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "" }}
            onClick={() => toggleExpand(item.id)}>
            <ChevronRight className="w-4 h-4" />
          </div>

          {/* Def actions (always visible) */}
          {isDef && (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/tasks/instances?def_id=${item.id}`);
                    const json = await res.json();
                    if (json.data?.length > 0) {
                      setSelectedDef(item);
                      setSelectedInstance(json.data[0]);
                    } else { toast.info("该任务暂无实例"); }
                  } catch (e) { }
                }}>
                查看详情
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => {
                  exportExcel({
                    "表单结构": {
                      headers: ["字段名", "显示标签", "类型", "必填"],
                      rows: (item.form_columns || []).map((c: any) => [
                        c.name, c.label || c.name, c.type, c.required ? "是" : "否",
                      ]),
                    },
                  }, `${item.task_name || "表单结构"}_${new Date().toISOString().slice(0, 10)}`);
                }}>
                <Download className="w-3 h-3 mr-0.5" />导出表单
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() => setDeleteTarget({ type: "def", id: item.id, name: item.task_name })}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {/* Actions — only for current assignee */}
          {!isDef && item.status === "in_progress" && item.assignee_id === currentUser.id && (
            <div className="hidden group-hover:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => { setAdvanceTarget(item); setAdvanceAction("submit"); }}>
                <Send className="w-3 h-3 mr-1" />提交
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-red-500"
                onClick={() => { setAdvanceTarget(item); setAdvanceAction("reject"); }}>
                <Undo2 className="w-3 h-3 mr-1" />驳回
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setAdvanceTarget(item); setAdvanceAction("skip"); }}>
                    <SkipForward className="w-4 h-4 mr-2" />跳过节点
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setAdvanceTarget(item); setAdvanceAction("withdraw"); }}>
                    <Undo2 className="w-4 h-4 mr-2" />撤回任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="expanded-detail bg-gray-50/80 border border-gray-200 rounded-none -mt-1 pt-5 px-5 pb-4 mb-2">
            {/* Group member list */}
            {(item as any)._isGroup && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-black uppercase tracking-wide">
                    填写人员状态 ({(item as any)._completedCount}/{(item as any)._totalCount} 已完成)
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      const members = (item as any)._members || [];
                      exportExcel({
                        "提交状态": {
                          headers: ["填写人", "状态", "提交时间"],
                          rows: members.map((m: any) => [
                            m.assignee_name || "—",
                            m.status === "completed" ? "已完成" : m.status === "in_progress" ? "进行中" : "待处理",
                            m.status === "completed" && m.node_history?.length > 0
                              ? new Date(m.node_history[m.node_history.length - 1].submitted_at).toLocaleString("zh-CN") : "—",
                          ]),
                        },
                      }, `${(item as any).task_name || "提交状态"}_${new Date().toISOString().slice(0, 10)}`);
                    }}>
                    <Download className="w-3 h-3 mr-1" />导出 Excel
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-none overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-medium text-black">填写人</th>
                        <th className="text-left px-3 py-2 font-medium text-black">状态</th>
                        <th className="text-left px-3 py-2 font-medium text-black">提交时间</th>
                        <th className="text-center px-3 py-2 font-medium text-black w-16">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((item as any)._members || []).map((m: any, mi: number) => (
                        <tr key={mi} className={`border-b border-gray-100 ${mi % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                          <td className="px-3 py-2 font-medium text-black">{m.assignee_name || "—"}</td>
                          <td className="px-3 py-2">
                            {m.status === "completed" ? (
                              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px]">已完成</span>
                            ) : m.status === "in_progress" ? (
                              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">进行中</span>
                            ) : (
                              <span className="text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">待处理</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-black">
                            {m.status === "completed" && m.node_history?.length > 0
                              ? new Date(m.node_history[m.node_history.length - 1].submitted_at).toLocaleString("zh-CN")
                              : "—"}
                          </td>
                          <td className="text-center px-1 py-2">
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const defRes = await fetch(`/api/tasks/defs/${m.def_id}`);
                                  const defJson = await defRes.json();
                                  if (defJson.data) { setSelectedDef(defJson.data); setSelectedInstance(m); }
                                } catch (e) { }
                              }}>
                              查看
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Description / Meta */}
              <div className="md:col-span-2">
                <div className="text-[11px] text-black uppercase tracking-wide mb-1.5">任务详情</div>
                <div className="text-sm text-black leading-relaxed">
                  {!isDef && item.status === "in_progress" && item.current_node_id && (
                    <p className="mb-2">当前节点: <strong>{item.assignee_name || "处理中"}</strong></p>
                  )}
                  {isDef && (
                    <div className="space-y-1.5">
                      <p>模式: {MODE_LABELS[item.task_mode]?.label || item.task_mode} · {TIME_LABELS[item.time_type]?.label || item.time_type}</p>
                      {item.periodic_config && <p>周期: {item.periodic_config.type}</p>}
                      {item.deadline_config?.due_date && <p>截止日期: {item.deadline_config.due_date}</p>}
                    </div>
                  )}
                  {!isDef && (
                    <div className="space-y-1.5">
                      {item.period_label && <p>周期: {item.period_label}</p>}
                      {item.due_date && <p>截止日期: {item.due_date}</p>}
                      <p>创建时间: {new Date(item.created_at).toLocaleString("zh-CN")}</p>
                    </div>
                  )}
                </div>
                {/* Workflow nodes display */}
                {!isDef && isDef === false && item.node_history?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-black uppercase tracking-wide mb-1.5">操作记录</div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {(item.node_history || []).slice(-5).reverse().map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-black">
                          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                          <span className="font-medium">{h.handler_name}</span>
                          <span className="text-black">{h.action === "submit" ? "提交" : h.action === "reject" ? "驳回" : h.action}</span>
                          {h.reason && <span className="text-red-500">原因: {h.reason}</span>}
                          <span className="text-black ml-auto">{h.submitted_at ? new Date(h.submitted_at).toLocaleString("zh-CN") : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-start md:items-end justify-center gap-2">
                {!isDef ? (
                  <>
                    <Button size="sm" variant="outline" className="w-full md:w-auto"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/tasks/defs/${item.def_id}`);
                          const json = await res.json();
                          if (json.data) { setSelectedDef(json.data); setSelectedInstance(item); }
                        } catch (e) { }
                      }}>
                      查看详情<ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="outline" className="w-full md:w-auto"
                      onClick={async () => {
                        try {
                          // Fetch the def to get form columns
                          const defRes = await fetch(`/api/tasks/defs/${item.def_id}`);
                          const defJson = await defRes.json();
                          const cols = defJson.data?.form_columns || [];
                          // Fetch phys data
                          const instRes = await fetch(`/api/tasks/instances/${item.id}`);
                          const instJson = await instRes.json();
                          const physRow = instJson.data?.phys_row || {};
                          exportExcel({
                            "填写数据": {
                              headers: ["字段名", "显示标签", "填写内容"],
                              rows: cols.map((c: any) => [
                                c.name, c.label || c.name,
                                physRow[c.name] != null && physRow[c.name] !== "" ? String(physRow[c.name]) : "—",
                              ]),
                            },
                          }, `${item.task_name || "导出"}_${new Date().toISOString().slice(0, 10)}`);
                        } catch (e) { toast.error("导出失败"); }
                      }}>
                      <Download className="w-3 h-3 mr-1" />导出数据
                    </Button>
                    {item.status === "in_progress" && item.assignee_id === currentUser.id && (
                      <Button size="sm" className="w-full md:w-auto"
                        onClick={() => { setAdvanceTarget(item); setAdvanceAction("submit"); }}>
                        <Send className="w-3 h-3 mr-1" />提交
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="w-full md:w-auto"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/tasks/instances?def_id=${item.id}`);
                          const json = await res.json();
                          if (json.data?.length > 0) {
                            setSelectedDef(item);
                            setSelectedInstance(json.data[0]);
                          } else {
                            toast.info("该任务暂无实例");
                          }
                        } catch (e) { }
                      }}>
                      查看实例<ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="ghost" className="w-full md:w-auto text-red-500 hover:text-red-700"
                      onClick={() => setDeleteTarget({ type: "def", id: item.id, name: item.task_name })}>
                      <Trash2 className="w-3 h-3 mr-1" />删除
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  /* ─── 渲染筛选面板 ─── */
  const renderFilterPanel = () => (
    <aside className="filter-panel w-[280px] shrink-0 bg-white rounded-none border border-gray-200 p-5 overflow-y-auto">
      {/* 视图切换 Tab */}
      <div className="flex flex-col gap-0.5 mb-5">
        {[
          { key: "todos" as const, label: "我的待办", icon: <CheckSquare className="w-3.5 h-3.5" />, count: instances.filter(i => i.status === "in_progress" || i.status === "pending").length },
          { key: "published" as const, label: "我的发布", icon: <ClipboardList className="w-3.5 h-3.5" />, count: defs.length },
          { key: "all" as const, label: "全部", icon: <BarChart3 className="w-3.5 h-3.5" />, count: instances.length + defs.length },
        ].map(tab => (
          <div
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); setExpandedCards(new Set()); }}
            className={`filter-option flex items-center gap-2 px-3 py-2 rounded-none cursor-pointer text-sm transition-colors
              ${activeTab === tab.key ? "bg-orange-50 text-orange-600 font-medium" : "text-black hover:bg-gray-50"}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="text-xs text-black ml-auto">{tab.count}</span>
          </div>
        ))}
      </div>

      {/* 状态筛选 */}
      <div className="filter-section mb-6">
        <div className="text-xs text-black uppercase tracking-wide font-semibold mb-3">状态</div>
        {[
          { key: "all", label: "全部", dot: "#8c8c8c", count: stats.total },
          { key: "in_progress", label: "进行中", dot: "#fa8c16", count: instances.filter(i => i.status === "in_progress").length },
          { key: "overdue", label: "逾期", dot: "#f5222d", count: stats.overdue },
          { key: "completed", label: "已完成", dot: "#52c41a", count: instances.filter(i => i.status === "completed").length },
          { key: "pending", label: "未开始", dot: "#d0d0d0", count: instances.filter(i => i.status === "pending").length },
        ].map(opt => (
          <div
            key={opt.key}
            className={`filter-option flex items-center gap-2 px-3 py-2 rounded-none cursor-pointer text-sm transition-colors
              ${filters.status === opt.key ? "bg-orange-50 text-orange-600 font-medium" : "text-black hover:bg-gray-50"}`}
            onClick={() => setFilters(f => ({ ...f, status: opt.key }))}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
            <span>{opt.label}</span>
            <span className="text-xs text-black ml-auto">{opt.count}</span>
          </div>
        ))}
      </div>

      {/* 标签类型 */}
      {activeTab !== "published" && (
        <div className="filter-section mb-6">
          <div className="text-xs text-black uppercase tracking-wide font-semibold mb-3">任务类型</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: "all", label: "全部" },
              { key: "process", label: "流程型" },
              { key: "project", label: "项目型" },
            ].map(opt => (
              <button
                key={opt.key}
                className={`w-full py-2 rounded-none text-xs font-medium cursor-pointer border transition-colors text-center
                  ${filters.tagType === opt.key ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 text-black hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50"}`}
                onClick={() => setFilters(f => ({ ...f, tagType: opt.key }))}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* 所属项目 */}
      {projectList.length > 0 && (
        <div className="filter-section mb-6">
          <div className="text-xs text-black uppercase tracking-wide font-semibold mb-3">所属项目</div>
          {[
            { key: "all", name: "全部项目", count: instances.length },
            ...projectList.map(p => ({ key: p.name, name: p.name, count: instances.filter(i => i.project_name === p.name).length })),
          ].map(opt => (
            <div
              key={opt.key}
              className={`filter-option flex items-center gap-2 px-3 py-2 rounded-none cursor-pointer text-sm transition-colors
                ${filters.project === opt.key ? "bg-orange-50 text-orange-600 font-medium" : "text-black hover:bg-gray-50"}`}
              onClick={() => setFilters(f => ({ ...f, project: opt.key }))}
            >
              <span className="truncate">{opt.name}</span>
              <span className="text-xs text-black ml-auto">{opt.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* 负责人 */}
      {assigneeList.length > 0 && (
        <div className="filter-section mb-6">
          <div className="text-xs text-black uppercase tracking-wide font-semibold mb-3">负责人</div>
          {assigneeList.slice(0, 6).map(a => (
            <div
              key={a.id}
              className={`filter-option flex items-center gap-2 px-3 py-2 rounded-none cursor-pointer text-sm transition-colors
                ${filters.assignee === a.name ? "bg-orange-50 text-orange-600 font-medium" : "text-black hover:bg-gray-50"}`}
              onClick={() => setFilters(f => ({ ...f, assignee: a.name === filters.assignee ? "all" : a.name }))}
            >
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-semibold flex items-center justify-center shrink-0">
                {a.name.slice(0, 1)}
              </span>
              <span className="truncate">{a.name}</span>
              <span className="text-xs text-black ml-auto">{instances.filter(i => i.assignee_name === a.name).length}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="w-full text-center text-xs text-black py-2 border border-gray-200 rounded-none hover:bg-gray-50 transition-colors"
        onClick={() => setFilters({ status: "all", priority: "all", tagType: "all", project: "all", assignee: "all", search: "", sort: "newest" })}
      >
        重置筛选
      </button>
    </aside>
  );

  const filtered = filteredItems();

  if (showWizard) {
    return (
      <TaskCenterCreateWizard
        currentUser={currentUser}
        onSave={handleCreate}
        onBack={() => setShowWizard(false)}
      />
    );
  }

  if (selectedInstance && selectedDef) {
    return (
      <TaskCenterDetail
        instance={selectedInstance}
        def={selectedDef}
        currentUser={currentUser}
        onRefresh={loadData}
        onBack={() => { setSelectedInstance(null); setSelectedDef(null); }}
      />
    );
  }

  return (
    <div className="h-full flex bg-[#f4f7fb] pt-12" style={{fontFamily: "'PingFang SC','Microsoft YaHei',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      {/* ====== 左侧导航 ====== */}
      <nav className="w-[172px] shrink-0 flex flex-col gap-0 bg-transparent py-6 fixed left-[60px] top-1/2 -translate-y-1/2 z-50 border-0">
        <div className="text-[15px] font-extrabold text-black px-4 pb-5 tracking-wider">任务中心</div>
        <div className="h-0.5 bg-[#0f2840] mx-4 my-3.5" />
        {[
          { key: "todos" as const, label: "我的待办", count: instances.filter(i => i.status === "in_progress" || i.status === "pending").length },
          { key: "published" as const, label: "我的发布", count: defs.length },
          { key: "all" as const, label: "全部任务", count: instances.length },
        ].map(tab => (
          <div key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedInstance(null); setSelectedDef(null); }}
            className={`py-[7px] px-4 text-[12.5px] cursor-pointer transition-colors duration-150
              ${activeTab === tab.key ? "text-[#2563eb] font-semibold" : "text-black font-normal hover:text-[#2563eb]"}`}
          >
            {tab.label}<span className="text-[10px] text-[#999] ml-1 font-normal">{tab.count}</span>
          </div>
        ))}
        <div className="text-[11px] text-[#333] px-4 pt-1.5 pb-3 leading-relaxed">任务填报与处理，流程流转全程可视，团队协作高效透明。</div>
        <div className="px-4 mt-1">
          <button onClick={() => setShowWizard(true)}
            className="py-[7px] text-[12.5px] font-semibold text-black cursor-pointer bg-transparent border-0 hover:text-[#2563eb] transition-colors">
            + 新建任务
          </button>
        </div>
      </nav>

      {/* ====== 右侧主内容 ====== */}
      <div className="flex-1 min-w-0 ml-[232px]">
        <div className="bg-white max-w-[960px] mx-auto my-0 px-12 py-11">
          {/* 标题 */}
          <div className="flex items-baseline gap-2.5 mb-5">
            <div>
              <span className="text-xs text-[#7b8fa1] font-medium">
                {activeTab === "todos" ? "MY TASKS" : activeTab === "published" ? "PUBLISHED" : "ALL TASKS"}
              </span>
              <h2 className="text-[22px] font-extrabold -tracking-[0.3px] leading-tight">
                {activeTab === "todos" ? "我的待办" : activeTab === "published" ? "我的发布" : "全部任务"}
              </h2>
            </div>
          </div>

          {/* 统计条 */}
          {(() => {
            const statItems: { v: number; l: string; c: string }[] = activeTab === "todos" ? [
              { v: instances.filter(i => i.status === "pending").length, l: "待处理", c: "text-[#2563eb]" },
              { v: stats.overdue, l: "逾期", c: stats.overdue > 0 ? "text-[#c24141]" : "text-[#7b8fa1] opacity-40" },
              { v: instances.filter(i => i.status === "completed").length, l: "已完成", c: "text-[#0d9488]" },
              { v: instances.filter(i => i.status === "in_progress").length, l: "进行中", c: "text-[#2563eb]" },
            ] : activeTab === "published" ? [
              { v: defs.length, l: "已发布", c: "text-[#2563eb]" },
              { v: stats.overdue, l: "逾期", c: stats.overdue > 0 ? "text-[#c24141]" : "text-[#7b8fa1] opacity-40" },
              { v: defs.filter((d: any) => d.status === "completed").length, l: "已完成", c: "text-[#0d9488]" },
              { v: stats.weekDue, l: "本周截止", c: stats.weekDue > 0 ? "text-[#2563eb]" : "text-[#7b8fa1] opacity-40" },
            ] : [
              { v: instances.length + defs.length, l: "总计", c: "text-[#2563eb]" },
              { v: instances.filter(i => i.status === "in_progress").length, l: "进行中", c: "text-[#2563eb]" },
              { v: instances.filter(i => i.status === "completed").length, l: "已完成", c: "text-[#0d9488]" },
              { v: stats.overdue, l: "逾期", c: stats.overdue > 0 ? "text-[#c24141]" : "text-[#7b8fa1] opacity-40" },
            ];
            return (
              <div className="flex gap-0 border-2 border-[#0f2840] mb-7">
                {statItems.map((s, i) => (
                  <div key={i} className="flex-1 py-[18px] px-4 text-center border-r-2 border-[#0f2840] last:border-r-0">
                    <div className={`text-4xl font-black leading-none -tracking-[1px] ${s.c}`}>{s.v}</div>
                    <div className="text-[11px] font-bold text-[#7b8fa1] mt-1 uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 工具栏 */}
          <div className="flex gap-2 mb-5 items-center">
            <div className="flex-1 relative min-w-[200px]">
              <input type="text" placeholder="搜索任务名称、项目、处理人..."
                className="w-full py-[9px] pl-[34px] pr-3.5 border-2 border-[#0f2840] text-[13px] bg-white text-[#0d2137] outline-none focus:border-[#2563eb]"
                style={{fontFamily:"inherit"}}
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
              <Search className="w-[15px] h-[15px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8fa1]" />
            </div>
            <select className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer"
              style={{fontFamily:"inherit"}}
              value={filters.sort} onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}>
              <option value="newest">最新创建 ▾</option>
              <option value="deadline_asc">截止日期 ▾</option>
            </select>
            <button onClick={loadData} disabled={loading}
              className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
              style={{fontFamily:"inherit"}}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* 表格 */}
          <table className="w-full border-collapse border border-[#c0c4cc]">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-9">#</th>
                <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap">任务名称</th>
                <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[70px]">类型</th>
                {activeTab !== "published" && <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[70px]">模式</th>}
                {activeTab !== "published" && <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[80px]">状态</th>}
                {activeTab === "published" ? (
                  <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[90px]">已填写</th>
                ) : (
                  <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[100px]">{activeTab === "todos" ? "截止日期" : "负责人"}</th>
                )}
                <th className="text-left py-1.5 px-2.5 text-[11px] font-semibold text-[#333] bg-[#f5f6f7] border border-[#d0d4da] whitespace-nowrap w-[80px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-xs text-[#0d2137]">加载中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-xs text-[#0d2137]">暂无任务</td></tr>
              ) : (
                filtered.map((item: any, idx: number) => {
                  const isDef = activeTab === "published";
                  const isGroup = (item as any)._isGroup;
                  const isExpanded = expandedCards.has(item.id);
                  return (
                    <React.Fragment key={item.id || idx}>
                      <tr className="cursor-pointer hover:bg-[#f0f7ff]" onClick={() => toggleExpand(item.id, isDef, isDef ? item.id : item.def_id)}>
                        <td className="py-1.5 px-2.5 text-xs text-[#0d2137] border border-[#e0e3e8]">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 text-xs text-[#0d2137] border border-[#e0e3e8]">
                          <strong>{item.task_name || "—"}</strong>
                        </td>
                        <td className="py-1.5 px-2.5 text-xs border border-[#e0e3e8]">
                          <span className={`inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px]
                            ${isDef ? (item.task_mode === "process" ? "border-[#2563eb] text-[#2563eb]" : "border-[#0d9488] text-[#0d9488]")
                              : (item.task_mode === "process" ? "border-[#2563eb] text-[#2563eb]" : "border-[#2563eb] text-[#2563eb]")}`}>
                            {isDef ? (MODE_LABELS[item.task_mode]?.label || item.task_mode) : (item.task_mode === "process" ? "流程型" : "项目型")}
                          </span>
                        </td>
                        {activeTab !== "published" && (
                          <td className="py-1.5 px-2.5 text-xs border border-[#e0e3e8]">
                            {isGroup ? (
                              <span className="inline-block px-2 py-0.5 border border-[#2563eb] text-[#2563eb] text-[10px] font-semibold">多人</span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 border border-[#0d9488] text-[#0d9488] text-[10px] font-semibold">单人</span>
                            )}
                          </td>
                        )}
                        {activeTab !== "published" && (
                          <td className="py-1.5 px-2.5 text-xs border border-[#e0e3e8]">
                            {isGroup
                              ? <span className="text-[#2563eb]">{(item as any)._completedCount}/{(item as any)._totalCount}</span>
                              : item.status === "completed"
                                ? <span className="text-[#0d9488]">已完成</span>
                                : item.status === "in_progress" ? <span className="text-[#2563eb]">进行中</span>
                                : <span className="text-[#0d2137]">待处理</span>}
                          </td>
                        )}
                        {activeTab === "published" ? (
                          <td className="py-1.5 px-2.5 text-xs text-[#0d2137] border border-[#e0e3e8]">
                            {(() => {
                              const totalMembers = instances.filter((i: any) => i.def_id === item.id).length;
                              const completedMembers = instances.filter((i: any) => i.def_id === item.id && i.status === "completed").length;
                              return `${completedMembers} / ${totalMembers} 人`;
                            })()}
                          </td>
                        ) : (
                          <td className="py-1.5 px-2.5 text-xs text-[#0d2137] border border-[#e0e3e8]">
                            {activeTab === "todos" ? (item.due_date || "—") : (item.assignee_name || "—")}
                          </td>
                        )}
                        <td className="py-1.5 px-2.5 text-xs border border-[#e0e3e8]">
                          <span className="inline-block px-2 py-0.5 border border-[#2563eb] text-[#2563eb] text-[10px] font-semibold cursor-pointer"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isDef) {
                                try {
                                  const res = await fetch(`/api/tasks/instances?def_id=${item.id}`);
                                  const json = await res.json();
                                  if (json.data?.length > 0) { setSelectedDef(item); setSelectedInstance(json.data[0]); }
                                  else { toast.info("暂无实例"); }
                                } catch (e) { }
                              } else if (isGroup) {
                                const m = (item as any)._members?.[0];
                                if (m) {
                                  try {
                                    const defRes = await fetch(`/api/tasks/defs/${m.def_id}`);
                                    const defJson = await defRes.json();
                                    if (defJson.data) { setSelectedDef(defJson.data); setSelectedInstance(m); }
                                  } catch (e) { }
                                }
                              } else {
                                try {
                                  const defRes = await fetch(`/api/tasks/defs/${item.def_id}`);
                                  const defJson = await defRes.json();
                                  if (defJson.data) { setSelectedDef(defJson.data); setSelectedInstance(item); }
                                } catch (e) { }
                              }
                            }}>
                            {isDef ? "查看实例" : isGroup ? "查看" : item.status === "completed" ? "查看" : "填写"}
                          </span>
                        </td>
                      </tr>
                      {/* 展开行 */}
                      {isExpanded && !isDef && (
                        <tr className="bg-[#f4f7fb]">
                          <td colSpan={8} className="!p-0 border-b-2 border-[#0f2840]">
                            <div className="flex flex-col">
                              {!isGroup && (
                                <div className="flex-1 px-5 py-4 border-b border-[#d5dfe8]">
                                  <div className="text-[8px] text-[#7b8fa1] uppercase tracking-[1.5px] font-bold mb-2.5">填写字段</div>
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">#</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">字段</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">填写内容</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(() => {
                                        // Need to fetch def to get form_columns
                                        return <tr><td colSpan={3} className="py-3 px-3 text-[11px] text-[#3d5468]">点击「填写」查看完整表单</td></tr>;
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {isGroup && (
                                <div className="flex-1 px-5 py-4 border-b border-[#d5dfe8]">
                                  <div className="text-[8px] text-[#7b8fa1] uppercase tracking-[1.5px] font-bold mb-2.5">
                                    填写人员 ({(item as any)._completedCount}/{(item as any)._totalCount})
                                  </div>
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">填写人</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">状态</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold">提交时间</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {((item as any)._members || []).map((m: any, mi: number) => (
                                        <tr key={mi}>
                                          <td className="py-2 px-3 text-[11px] text-[#3d5468] border-b border-[#d5dfe8]">{m.assignee_name || "—"}</td>
                                          <td className="py-2 px-3 text-[11px] border-b border-[#d5dfe8]">
                                            {m.status === "completed"
                                              ? <span className="text-[#0d9488]">已完成</span>
                                              : m.status === "in_progress" ? <span className="text-[#2563eb]">进行中</span>
                                              : <span className="text-[#0d2137]">待处理</span>}
                                          </td>
                                          <td className="py-2 px-3 text-[11px] text-[#3d5468] border-b border-[#d5dfe8]">
                                            {m.status === "completed" && m.node_history?.length > 0
                                              ? new Date(m.node_history[m.node_history.length - 1].submitted_at).toLocaleString("zh-CN") : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <div className="py-3.5 px-5 flex justify-between items-center w-full border-t border-[#d5dfe8]">
                                <div className="flex gap-2">
                                  {item.status !== "completed" && (
                                    <>
                                      <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                        style={{fontFamily:"inherit"}} onClick={(e) => e.stopPropagation()}>
                                        暂存草稿
                                      </button>
                                      <button className="py-[9px] px-4 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold cursor-pointer hover:bg-[#2563eb] hover:border-[#2563eb] transition-all"
                                        style={{fontFamily:"inherit"}}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAdvanceTarget(item); setAdvanceAction("submit");
                                        }}>
                                        提交
                                      </button>
                                    </>
                                  )}
                                  {item.status === "completed" && (
                                    <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                      style={{fontFamily:"inherit"}}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const defRes = await fetch(`/api/tasks/defs/${item.def_id}`);
                                          const defJson = await defRes.json();
                                          if (defJson.data) { setSelectedDef(defJson.data); setSelectedInstance(item); }
                                        } catch (e) { }
                                      }}>
                                      查看详情
                                    </button>
                                  )}
                                  <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                    style={{fontFamily:"inherit"}}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const defRes = await fetch(`/api/tasks/defs/${item.def_id}`);
                                        const defJson = await defRes.json();
                                        const cols = defJson.data?.form_columns || [];
                                        const instRes = await fetch(`/api/tasks/instances/${item.id}`);
                                        const instJson = await instRes.json();
                                        const physRow = instJson.data?.phys_row || {};
                                        exportExcel({
                                          "填写数据": {
                                            headers: ["字段名", "显示标签", "填写内容"],
                                            rows: cols.map((c: any) => [c.name, c.label || c.name, physRow[c.name] != null && physRow[c.name] !== "" ? String(physRow[c.name]) : "—"]),
                                          },
                                        }, `${item.task_name || "导出"}`);
                                      } catch (e) { toast.error("导出失败"); }
                                    }}>
                                    <Download className="w-3 h-3 mr-1 inline" />导出
                                  </button>
                                </div>
                                <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                  style={{fontFamily:"inherit"}}
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(item.id, isDef, isDef ? item.id : item.def_id); }}>收起</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* 发布任务展开行 — 直接显示填写字段值 */}
                      {isExpanded && isDef && (
                        <tr className="bg-[#f4f7fb]">
                          <td colSpan={5} className="!p-0 border-b-2 border-[#0f2840]" style={{overflowX:"auto"}}>
                            <div className="flex flex-col">
                              <div className="flex-1 px-5 py-4" style={{minWidth:"max-content"}}>
                                <div className="text-[8px] text-[#7b8fa1] uppercase tracking-[1.5px] font-bold mb-2.5">
                                  填写情况 · {(pubInstances[item.id] || []).length} 人
                                </div>
                                {pubLoading[item.id] ? (
                                  <div className="text-xs text-[#7b8fa1] py-4 text-center">加载中...</div>
                                ) : pubInstances[item.id]?.length > 0 ? (
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold whitespace-nowrap">填写人</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold whitespace-nowrap">状态</th>
                                        {(item.form_columns || []).map((c: any) => (
                                          <th key={c.name} className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold whitespace-nowrap">{c.label || c.name}</th>
                                        ))}
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold whitespace-nowrap">提交时间</th>
                                        <th className="text-left py-2 px-3 text-[9px] text-[#7b8fa1] uppercase tracking-[1px] bg-white border-b border-[#0f2840] font-semibold whitespace-nowrap">操作</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pubInstances[item.id].map((inst: any, ii: number) => {
                                        const phys = pubPhysData[inst.id] || {};
                                        return (
                                        <tr key={inst.id || ii}>
                                          <td className="py-2 px-3 text-[11px] font-medium text-[#0d2137] border-b border-[#d5dfe8] whitespace-nowrap">{inst.assignee_name || "—"}</td>
                                          <td className="py-2 px-3 text-[11px] border-b border-[#d5dfe8] whitespace-nowrap">
                                            {inst.status === "completed"
                                              ? <span className="text-[#0d9488]">已完成</span>
                                              : inst.status === "in_progress" ? <span className="text-[#2563eb]">进行中</span>
                                              : <span className="text-[#0d2137]">待处理</span>}
                                          </td>
                                          {(item.form_columns || []).map((c: any) => (
                                            <td key={c.name} className="py-2 px-3 text-[11px] text-[#3d5468] border-b border-[#d5dfe8] whitespace-nowrap">
                                              {phys[c.name] != null && phys[c.name] !== ""
                                                ? String(phys[c.name])
                                                : <span className="text-[#7b8fa1] italic">—</span>}
                                            </td>
                                          ))}
                                          <td className="py-2 px-3 text-[11px] text-[#3d5468] border-b border-[#d5dfe8] whitespace-nowrap">
                                            {inst.status === "completed" && inst.node_history?.length > 0
                                              ? new Date(inst.node_history[inst.node_history.length - 1].submitted_at).toLocaleString("zh-CN") : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-[11px] border-b border-[#d5dfe8] whitespace-nowrap">
                                            <button className="py-1 px-2 border border-[#2563eb] text-[#2563eb] text-[10px] font-semibold hover:bg-[#eef4ff] transition-colors"
                                              style={{fontFamily:"inherit"}}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  const defRes = await fetch(`/api/tasks/defs/${inst.def_id}`);
                                                  const defJson = await defRes.json();
                                                  if (defJson.data) { setSelectedDef(defJson.data); setSelectedInstance(inst); }
                                                } catch (e) { }
                                              }}>
                                              查看详情
                                            </button>
                                          </td>
                                        </tr>
                                      );})}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-xs text-[#7b8fa1] py-4 text-center">暂无填写数据</div>
                                )}
                              </div>
                              <div className="py-3.5 px-5 flex justify-between items-center w-full border-t border-[#d5dfe8]">
                                <div className="flex gap-2">
                                  <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                    style={{fontFamily:"inherit"}}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const insts = pubInstances[item.id] || [];
                                      const cols = item.form_columns || [];
                                      const headers = cols.map((c: any) => c.label || c.name);
                                      const rows: string[][] = [];
                                      for (const inst of insts) {
                                        try {
                                          const r = await fetch(`/api/tasks/instances/${inst.id}`);
                                          const j = await r.json();
                                          const phys = j.data?.phys_row || {};
                                          rows.push(cols.map((c: any) => phys[c.name] != null ? String(phys[c.name]) : ""));
                                        } catch (e) { rows.push(cols.map(() => "")); }
                                      }
                                      exportExcel({
                                        "填写数据": { headers: ["填写人", "状态", ...headers], rows: insts.map((inst: any, ii: number) => [
                                          inst.assignee_name || "—",
                                          inst.status === "completed" ? "已完成" : inst.status === "in_progress" ? "进行中" : "待处理",
                                          ...(rows[ii] || cols.map(() => "")),
                                        ])},
                                      }, `${item.task_name || "导出"}`);
                                      toast.success("导出成功");
                                    }}>
                                    <Download className="w-3 h-3 mr-1 inline" />导出 Excel
                                  </button>
                                  <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                    style={{fontFamily:"inherit"}}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({ type: "def", id: item.id, name: item.task_name });
                                    }}>删除</button>
                                </div>
                                <button className="py-[9px] px-4 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] cursor-pointer hover:bg-[#0d2137] hover:text-white transition-all"
                                  style={{fontFamily:"inherit"}}
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(item.id, isDef, isDef ? item.id : item.def_id); }}>收起</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[440px] overflow-hidden p-0 [&>button[data-slot=dialog-close]]:text-white/80 [&>button[data-slot=dialog-close]]:hover:text-white [&>button[data-slot=dialog-close]]:z-10">
          <div className="px-6 pb-4 pt-5 bg-gradient-to-r from-red-600 to-red-400 rounded-t-none shrink-0">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />确认删除
            </DialogTitle>
            <p className="text-white/80 text-sm mt-1">
              {deleteTarget?.type === "def"
                ? "此操作将删除该任务定义、所有实例及对应数据，不可恢复。"
                : "此操作将删除该实例及对应数据，不可恢复。"}
            </p>
          </div>
          <div className="px-6 py-3 text-sm text-black font-medium">{deleteTarget?.name}</div>
          <DialogFooter className="px-6 pb-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={!!advanceTarget} onOpenChange={() => setAdvanceTarget(null)}>
        <DialogContent className="sm:max-w-[440px] overflow-hidden p-0 [&>button[data-slot=dialog-close]]:text-white/80 [&>button[data-slot=dialog-close]]:hover:text-white [&>button[data-slot=dialog-close]]:z-10">
          <div className={`px-6 pb-4 pt-5 rounded-t-none shrink-0 bg-gradient-to-r ${
            advanceAction === "submit" ? "from-blue-600 to-blue-400"
            : advanceAction === "reject" ? "from-red-600 to-red-400"
            : advanceAction === "withdraw" ? "from-gray-600 to-gray-400"
            : "from-amber-600 to-amber-400"
          }`}>
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              {advanceAction === "submit" && <><Send className="w-5 h-5" />确认提交</>}
              {advanceAction === "reject" && <><Undo2 className="w-5 h-5" />驳回任务</>}
              {advanceAction === "skip" && <><SkipForward className="w-5 h-5" />跳过节点</>}
              {advanceAction === "withdraw" && <><Archive className="w-5 h-5" />撤回任务</>}
            </DialogTitle>
            <p className="text-white/80 text-sm mt-1">
              {advanceAction === "submit" && "提交后将推进到下一节点处理人"}
              {advanceAction === "reject" && "驳回后将退回上一节点处理人，请填写驳回原因"}
              {advanceAction === "skip" && "跳过当前节点，任务直接进入下一节点"}
              {advanceAction === "withdraw" && "撤回后任务将取消，不再继续流转"}
            </p>
          </div>
          <div className="px-6 pt-4">
            {advanceAction === "reject" && (
              <textarea id="reject-reason" className="w-full border rounded-none p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                placeholder="请填写驳回原因..." />
            )}
          </div>
          <DialogFooter className="px-6 pb-4">
            <Button variant="outline" onClick={() => setAdvanceTarget(null)}>取消</Button>
            <Button
              variant={advanceAction === "reject" || advanceAction === "withdraw" ? "destructive" : "default"}
              onClick={() => handleAdvance(advanceAction)}
              className={advanceAction === "submit" ? "bg-blue-600 hover:bg-blue-700" : advanceAction === "skip" ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {advanceAction === "submit" && "确认提交"}
              {advanceAction === "reject" && "确认驳回"}
              {advanceAction === "skip" && "确认跳过"}
              {advanceAction === "withdraw" && "确认撤回"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
