"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, ClipboardList, CheckSquare, List, FileText,
  Clock, User, Calendar, Tag, ChevronRight, Trash2,
  MoreHorizontal, RefreshCw, AlertCircle, ArrowRight,
  Send, Undo2, SkipForward, UserPlus, CheckCircle2,
  XCircle, Archive, Layers, BarChart3, Building2, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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
  // Joined fields
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
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode; barColor: string }> = {
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3.5 h-3.5" />, barColor: "bg-yellow-400" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <FileText className="w-3.5 h-3.5" />, barColor: "bg-blue-400" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3.5 h-3.5" />, barColor: "bg-green-400" },
  returned: { label: "已退回", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" />, barColor: "bg-red-400" },
  cancelled: { label: "已撤回", color: "bg-gray-100 text-gray-600 border-gray-200", icon: <Archive className="w-3.5 h-3.5" />, barColor: "bg-gray-300" },
  terminated: { label: "已终止", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" />, barColor: "bg-red-400" },
};

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  process: { label: "流程型", color: "bg-indigo-100 text-indigo-700" },
  project: { label: "项目型", color: "bg-purple-100 text-purple-700" },
};

const TIME_LABELS: Record<string, { label: string; color: string }> = {
  one_time: { label: "一次性", color: "bg-teal-100 text-teal-700" },
  periodic: { label: "周期性", color: "bg-cyan-100 text-cyan-700" },
};

export default function TaskCenter({ currentUser }: TaskCenterProps) {
  const [activeTab, setActiveTab] = useState("published");
  const [showWizard, setShowWizard] = useState(false);
  const [defs, setDefs] = useState<TaskDef[]>([]);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail view
  const [selectedInstance, setSelectedInstance] = useState<TaskInstance | null>(null);
  const [selectedDef, setSelectedDef] = useState<TaskDef | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "def" | "instance"; id: string; name: string; count?: number } | null>(null);

  // Advance dialog
  const [advanceTarget, setAdvanceTarget] = useState<TaskInstance | null>(null);
  const [advanceAction, setAdvanceAction] = useState<"submit" | "reject" | "skip" | "withdraw">("submit");

  /* ─── 加载数据 ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uid = currentUser.id;

      if (activeTab === "published") {
        // Published defs
        const res = await fetch(`/api/tasks/defs?user_id=${uid}&status=active`);
        const json = await res.json();
        if (json.data) setDefs(json.data);
      } else if (activeTab === "todos") {
        // My todos
        const res = await fetch(`/api/tasks/instances?user_id=${uid}&mode=my_todos`);
        const json = await res.json();
        if (json.data) setInstances(json.data);
      } else {
        // All instances
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

  // Initial schema setup
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

      // Create first instance for process tasks
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
      const body: any = {
        action,
        user_id: currentUser.id,
        user_name: currentUser.name,
      };

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

  /* ─── 格式化日期 ─── */
  const fmtDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  /* ─── 渲染: 我发布的任务定义 ─── */
  const renderPublished = () => (
    <div className="space-y-3">
      {defs.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-500">暂无发布的任务</p>
          <p className="text-xs text-gray-400 mt-1">创建一个任务来开始工作流</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" />创建任务
          </Button>
        </div>
      )}

      {defs.map((def) => {
        const modeInfo = MODE_LABELS[def.task_mode] || { label: def.task_mode, color: "bg-gray-100 text-gray-600" };
        const timeInfo = TIME_LABELS[def.time_type] || { label: def.time_type, color: "bg-gray-100 text-gray-600" };
        return (
        <div key={def.id}
          className="bg-white rounded-lg border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-gray-300/80 transition-all duration-200 group cursor-pointer"
          onClick={async () => {
            // Load instances for this def to show in detail view
            try {
              const res = await fetch(`/api/tasks/instances?def_id=${def.id}`);
              const json = await res.json();
              if (json.data?.length > 0) {
                setSelectedDef(def);
                setSelectedInstance(json.data[0]);
              } else {
                toast.info("该任务暂无实例");
              }
            } catch (e) {}
          }}
        >
          <div className="h-1 bg-indigo-400" />
          <div className="p-4 pt-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate group-hover:text-indigo-600 transition-colors">{def.task_name}</h4>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Badge className={`${modeInfo.color} text-xs border-0 font-normal`}>{modeInfo.label}</Badge>
                <Badge className={`${timeInfo.color} text-xs border-0 font-normal`}>{timeInfo.label}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(def.created_at)}</span>
              {def.workflow_nodes?.length > 0 && (
                <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-gray-400" />{def.workflow_nodes.length} 个节点</span>
              )}
              {def.form_columns?.length > 0 && (
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-gray-400" />{def.form_columns.length} 个字段</span>
              )}
              {def.board_records?.length > 0 && (
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{def.board_records.length} 条引用</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />{def.created_by_name || currentUser.name}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: "def", id: def.id, name: def.task_name });
                    }} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />删除任务
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );

  /* ─── 渲染: 我的待办 ─── */
  const renderTodos = () => (
    <div className="space-y-3">
      {instances.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-500">暂无待办任务</p>
          <p className="text-xs text-gray-400 mt-1">所有任务都已处理完毕</p>
        </div>
      )}

      {instances.map((inst) => {
        const statusInfo = STATUS_MAP[inst.status] || STATUS_MAP.pending;
        return (
        <div key={inst.id}
          className="bg-white rounded-lg border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-gray-300/80 transition-all duration-200 group cursor-pointer"
          onClick={async () => {
            try {
              const res = await fetch(`/api/tasks/defs/${inst.def_id}`);
              const json = await res.json();
              if (json.data) {
                setSelectedDef(json.data);
                setSelectedInstance(inst);
              }
            } catch (e) {}
          }}
        >
          <div className={`h-1 ${statusInfo.barColor}`} />
          <div className="p-4 pt-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate group-hover:text-blue-600 transition-colors">{inst.task_name}</h4>
              </div>
              <Badge className={`${statusInfo.color} text-xs shrink-0 ml-2 border`}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{inst.assignee_name || "-"}</span>
              {inst.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{inst.due_date}</span>}
              {inst.period_label && <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-gray-400" />{inst.period_label}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(inst.created_at)}</span>
            </div>
            {inst.status === "in_progress" && inst.current_node_id && (
              <p className="text-xs text-gray-400 mb-2">
                当前节点: {inst.assignee_name || "处理中"}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fmtDate(inst.created_at)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {inst.status === "in_progress" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); setAdvanceTarget(inst); setAdvanceAction("submit"); }}>
                      <Send className="w-3 h-3 mr-1" />提交
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-500"
                      onClick={(e) => { e.stopPropagation(); setAdvanceTarget(inst); setAdvanceAction("reject"); }}>
                      <Undo2 className="w-3 h-3 mr-1" />驳回
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setAdvanceTarget(inst); setAdvanceAction("skip");
                    }}>
                      <SkipForward className="w-4 h-4 mr-2" />跳过节点（发起人）
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setAdvanceTarget(inst); setAdvanceAction("withdraw");
                    }}>
                      <Undo2 className="w-4 h-4 mr-2" />撤回任务
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );

  /* ─── 渲染: 全部实例 ─── */
  const renderAll = () => (
    <div className="space-y-3">
      {instances.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-500">暂无任务实例</p>
          <p className="text-xs text-gray-400 mt-1">创建任务后将在此处查看所有实例</p>
        </div>
      )}

      {instances.map((inst) => {
        const statusInfo = STATUS_MAP[inst.status] || STATUS_MAP.pending;
        const modeInfo = MODE_LABELS[inst.task_mode] || { label: inst.task_mode, color: "bg-gray-100 text-gray-600" };
        return (
        <div key={inst.id}
          className="bg-white rounded-lg border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-gray-300/80 transition-all duration-200 group cursor-pointer"
          onClick={async () => {
            try {
              const res = await fetch(`/api/tasks/defs/${inst.def_id}`);
              const json = await res.json();
              if (json.data) {
                setSelectedDef(json.data);
                setSelectedInstance(inst);
              }
            } catch (e) {}
          }}
        >
          <div className={`h-1 ${statusInfo.barColor}`} />
          <div className="p-4 pt-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate group-hover:text-blue-600 transition-colors">{inst.task_name}</h4>
                <Badge className={`${modeInfo.color} text-xs border-0 font-normal`}>{modeInfo.label}</Badge>
              </div>
              <Badge className={`${statusInfo.color} text-xs shrink-0 ml-2 border`}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
              <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{inst.assignee_name || "-"}</span>
              {inst.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{inst.due_date}</span>}
              {inst.period_label && <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-gray-400" />{inst.period_label}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" />{fmtDate(inst.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fmtDate(inst.created_at)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Load detail
                    fetch(`/api/tasks/defs/${inst.def_id}`).then(r => r.json()).then(j => {
                      if (j.data) { setSelectedDef(j.data); setSelectedInstance(inst); }
                    });
                  }}>
                  详情<ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 页面标题 */}
      <div className="p-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CheckSquare className="w-6 h-6" />
          任务中心
        </h2>
        <p className="text-sm text-muted-foreground mt-1">管理和追踪流程任务与项目任务</p>
      </div>

      {/* Tab 栏 — 胶囊式 */}
      <div className="flex items-center justify-between gap-1.5 px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-1.5">
          {[
            { key: "published", label: "我发布的", icon: <ClipboardList className="w-4 h-4" /> },
            { key: "todos", label: "我的待办", icon: <CheckSquare className="w-4 h-4" /> },
            { key: "all", label: "全部", icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === "todos" ? instances.length : tab.key === "published" ? defs.length : 0;
            return (
              <button key={tab.key}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium shadow-sm ring-1 ring-blue-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab(tab.key)}>
                <span className={isActive ? "text-blue-500" : "text-gray-400"}>{tab.icon}</span>
                {tab.label}
                {count > 0 && (
                  <span className={`ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-medium flex items-center justify-center px-1 ${
                    isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                  }`}>{count > 99 ? '99+' : count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading} className="h-8 w-8 p-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowWizard(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Plus className="w-4 h-4 mr-1" />新建任务
          </Button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === "published" && renderPublished()}
            {activeTab === "todos" && renderTodos()}
            {activeTab === "all" && renderAll()}
          </>
        )}
      </div>

      {/* Create Wizard */}
      <TaskCenterCreateWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        currentUser={currentUser}
        onSave={handleCreate}
      />

      {/* Detail View */}
      {selectedInstance && selectedDef && (
        <TaskCenterDetail
          open={true}
          onOpenChange={(open) => { if (!open) { setSelectedInstance(null); setSelectedDef(null); } }}
          instance={selectedInstance}
          def={selectedDef}
          currentUser={currentUser}
          onRefresh={loadData}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[440px] overflow-hidden p-0 [&>button[data-slot=dialog-close]]:text-white/80 [&>button[data-slot=dialog-close]]:hover:text-white [&>button[data-slot=dialog-close]]:z-10">
          <div className="px-6 pb-4 pt-5 bg-gradient-to-r from-red-600 to-red-400 rounded-t-lg shrink-0">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />确认删除
            </DialogTitle>
            <p className="text-white/80 text-sm mt-1">
              {deleteTarget?.type === "def"
                ? "此操作将删除该任务定义、所有实例及对应数据，不可恢复。"
                : "此操作将删除该实例及对应数据，不可恢复。"}
            </p>
          </div>
          <div className="px-6 py-3 text-sm text-gray-700 font-medium">{deleteTarget?.name}</div>
          <DialogFooter className="px-6 pb-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={!!advanceTarget} onOpenChange={() => setAdvanceTarget(null)}>
        <DialogContent className="sm:max-w-[440px] overflow-hidden p-0 [&>button[data-slot=dialog-close]]:text-white/80 [&>button[data-slot=dialog-close]]:hover:text-white [&>button[data-slot=dialog-close]]:z-10">
          <div className={`px-6 pb-4 pt-5 rounded-t-lg shrink-0 bg-gradient-to-r ${
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
              <textarea id="reject-reason" className="w-full border rounded-md p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
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
