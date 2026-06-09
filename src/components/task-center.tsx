"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, ClipboardList, CheckSquare, List, FileText,
  Clock, User, Calendar, Tag, ChevronRight, Trash2,
  MoreHorizontal, RefreshCw, AlertCircle, ArrowRight,
  Send, Undo2, SkipForward, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  returned: { label: "已退回", color: "bg-red-100 text-red-700" },
  cancelled: { label: "已撤回", color: "bg-gray-100 text-gray-700" },
  terminated: { label: "已终止", color: "bg-red-100 text-red-700" },
};

const MODE_LABELS: Record<string, string> = {
  process: "流程型",
  project: "项目型",
};

const TIME_LABELS: Record<string, string> = {
  one_time: "一次性",
  periodic: "周期性",
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
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无发布的任务</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" />创建任务
          </Button>
        </div>
      )}

      {defs.map((def) => (
        <Card key={def.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {def.task_name}
                  <Badge variant="outline" className="text-xs">{MODE_LABELS[def.task_mode]}</Badge>
                  <Badge variant="outline" className="text-xs">{TIME_LABELS[def.time_type]}</Badge>
                </CardTitle>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(def.created_at)}</span>
                  {def.workflow_nodes?.length > 0 && (
                    <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" />{def.workflow_nodes.length} 个节点</span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setDeleteTarget({ type: "def", id: def.id, name: def.task_name });
                  }} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />删除任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  /* ─── 渲染: 我的待办 ─── */
  const renderTodos = () => (
    <div className="space-y-3">
      {instances.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无待办任务</p>
        </div>
      )}

      {instances.map((inst) => (
        <Card
          key={inst.id}
          className="hover:shadow-md transition-shadow cursor-pointer"
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
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {inst.task_name}
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_MAP[inst.status]?.color || ""}`}>
                    {STATUS_MAP[inst.status]?.label || inst.status}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{inst.assignee_name || "-"}</span>
                  {inst.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inst.due_date}</span>}
                  {inst.period_label && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{inst.period_label}</span>}
                </div>
              </div>
              <div className="flex gap-1">
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
                    <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
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
          </CardHeader>
        </Card>
      ))}
    </div>
  );

  /* ─── 渲染: 全部实例 ─── */
  const renderAll = () => (
    <div className="space-y-3">
      {instances.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无任务实例</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">任务名称</th>
              <th className="pb-2 font-medium">模式</th>
              <th className="pb-2 font-medium">处理人</th>
              <th className="pb-2 font-medium">状态</th>
              <th className="pb-2 font-medium">截止</th>
              <th className="pb-2 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr key={inst.id} className="border-b hover:bg-gray-50 cursor-pointer"
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
                <td className="py-2 pr-3 font-medium">{inst.task_name}</td>
                <td className="py-2 pr-3">{MODE_LABELS[inst.task_mode]}</td>
                <td className="py-2 pr-3">{inst.assignee_name || "-"}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_MAP[inst.status]?.color || ""}`}>
                    {STATUS_MAP[inst.status]?.label || inst.status}
                  </span>
                </td>
                <td className="py-2 pr-3">{inst.due_date || "-"}</td>
                <td className="py-2 text-gray-500">{fmtDate(inst.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">任务中心</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" />新建任务
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="published">我发布的</TabsTrigger>
          <TabsTrigger value="todos">我的待办</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
        <TabsContent value="published" className="flex-1 overflow-auto mt-3">{renderPublished()}</TabsContent>
        <TabsContent value="todos" className="flex-1 overflow-auto mt-3">{renderTodos()}</TabsContent>
        <TabsContent value="all" className="flex-1 overflow-auto mt-3">{renderAll()}</TabsContent>
      </Tabs>

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "def"
                ? "此操作将删除该任务定义、所有实例及对应数据，不可恢复。确认删除？"
                : "此操作将删除该实例及对应数据，不可恢复。确认删除？"}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-700 font-medium">{deleteTarget?.name}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Dialog — Submit/Reject/Skip/Withdraw */}
      <Dialog open={!!advanceTarget} onOpenChange={() => setAdvanceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {advanceAction === "submit" && "确认提交"}
              {advanceAction === "reject" && "驳回任务"}
              {advanceAction === "skip" && "跳过节点"}
              {advanceAction === "withdraw" && "撤回任务"}
            </DialogTitle>
            <DialogDescription>
              {advanceAction === "submit" && "提交后将推进到下一节点处理人"}
              {advanceAction === "reject" && "驳回后将退回上一节点处理人，请填写驳回原因"}
              {advanceAction === "skip" && "跳过当前节点，任务直接进入下一节点"}
              {advanceAction === "withdraw" && "撤回后任务将取消，不再继续流转"}
            </DialogDescription>
          </DialogHeader>

          {advanceAction === "reject" && (
            <textarea id="reject-reason" className="w-full border rounded-md p-2 text-sm min-h-[80px]"
              placeholder="请填写驳回原因..." />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceTarget(null)}>取消</Button>
            <Button
              variant={advanceAction === "reject" || advanceAction === "withdraw" ? "destructive" : "default"}
              onClick={() => handleAdvance(advanceAction)}
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
