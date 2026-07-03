"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Send, FileText, User, Clock, ChevronRight,
  History, EyeOff, Link2, ArrowLeft,
  CheckCircle2, Circle,
  X, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { exportExcel } from "@/lib/export-excel";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* ─── 类型 ─── */
interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

interface DetailProps {
  instance: any;
  def: any;
  currentUser: CurrentUser;
  onRefresh: () => void;
  onBack: () => void;
  onSwitchTask?: (instance: any, def: any) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
  returned: { label: "已退回", color: "bg-red-100 text-red-700" },
  cancelled: { label: "已撤回", color: "bg-gray-100 text-black" },
  terminated: { label: "已终止", color: "bg-red-100 text-red-700" },
};

/* ─── 任务类型标签映射 ─── */
const TYPE_TAGS: Record<string, string> = {
  process: "流程型",
  project: "项目型",
};

export default function TaskCenterDetail({ instance, def, currentUser, onRefresh, onBack }: DetailProps) {
  const [physRow, setPhysRow] = useState<Record<string, any> | null>(null);
  const [physRows, setPhysRows] = useState<any[]>([]);
  const [activePhysIndex, setActivePhysIndex] = useState(0);
  const [physId, setPhysId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  // Collection view state
  const [collectionData, setCollectionData] = useState<any[] | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [assignTargetNode, setAssignTargetNode] = useState("");
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // Left panel: task list (removed — handled by parent task-center)

  const workflowNodes: any[] = def?.workflow_nodes || [];
  const boardRecords: any[] = def?.board_records || [];
  const formColumns: any[] = def?.form_columns || [];
  const currentIndex: number = instance?.current_node_index ?? 0;
  const nodeHistory: any[] = instance?.node_history || [];
  const isProcess = def?.task_mode === "process";
  const isComplete = instance?.status === "completed";

  const currentNode = isProcess && workflowNodes[currentIndex];
  const isHandler = currentNode?.node_type === "parallel"
    ? currentNode?.handler_ids?.includes(currentUser.id)
    : currentNode?.handler_id === currentUser.id;
  const isInitiator = def?.created_by === currentUser.id;

  // Summary node: current node follows a parallel collection node
  const prevNodeIndex = currentIndex - 1;
  const prevNode = isProcess && prevNodeIndex >= 0 ? workflowNodes[prevNodeIndex] : null;
  const isSummaryNode = isProcess && !isComplete && prevNode?.node_type === "parallel" && isHandler;

  // Fetch collection data for summary node
  useEffect(() => {
    if (isSummaryNode && instance?.id) {
      setCollectionLoading(true);
      fetch(`/api/tasks/instances/${instance.id}/node-submissions?node_index=${prevNodeIndex}`)
        .then(r => r.json())
        .then(j => {
          if (j.data && Array.isArray(j.data)) {
            setCollectionData(j.data);
          } else {
            setCollectionData([]);
          }
        })
        .catch(() => { setCollectionData(null); })
        .finally(() => setCollectionLoading(false));
    } else {
      setCollectionData(null);
    }
  }, [isSummaryNode, instance?.id, prevNodeIndex]);

  // Reset assignment state when collection data changes
  useEffect(() => {
    setAssignSelections({});
    setAssignTargetNode("");
  }, [collectionData]);

  // Load system users for assignment dropdown
  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(j => { if (j.data) setSystemUsers(j.data); })
      .catch(() => {});
  }, []);

  // Calculate progress
  const calcProgress = useCallback(() => {
    if (isComplete) return 100;
    if (!isProcess || workflowNodes.length === 0) {
      // Check form field fill ratio
      const total = formColumns.length;
      if (total === 0) return 0;
      const filled = formColumns.filter(c => {
        const val = formData[c.name] !== undefined ? formData[c.name] : (physRow?.[c.name]);
        return val != null && val !== "";
      }).length;
      return Math.round((filled / total) * 100);
    }
    // For process tasks
    if (currentIndex >= workflowNodes.length) return 100;
    return Math.round((currentIndex / workflowNodes.length) * 100);
  }, [isComplete, isProcess, workflowNodes, formColumns, formData, physRow, currentIndex]);

  /* ─── Load physical rows ─── */
  useEffect(() => {
    if (instance) {
      fetch(`/api/tasks/instances/${instance.id}`)
        .then(r => r.json())
        .then(j => {
          // Prefer phys_rows array, fall back to single phys_row
          let allRows = j.data?.phys_rows;
          if (!allRows || allRows.length === 0) {
            if (j.data?.phys_row && j.data.phys_row.id) {
              allRows = [j.data.phys_row];
            } else {
              allRows = [];
            }
          }
          setPhysRows(allRows);
          if (allRows.length > 0) {
            setActivePhysIndex(0);
            setPhysRow(allRows[0]);
            setPhysId(allRows[0].id);
          } else {
            setPhysRow(null);
            setPhysId(null);
          }
          setFormData({});
          setProgressPct(0);
        })
        .catch(() => {});
    }
  }, [instance]);

  // Switch active record
  const switchPhysRecord = (index: number) => {
    if (index >= 0 && index < physRows.length) {
      setActivePhysIndex(index);
      setPhysRow(physRows[index]);
      setPhysId(physRows[index].id);
      setFormData({});
    }
  };

  // Add new record
  const addPhysRecord = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/instances/${instance.id}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
      if (json.data) {
        const newRows = [...physRows, json.data];
        setPhysRows(newRows);
        const newIndex = newRows.length - 1;
        setActivePhysIndex(newIndex);
        setPhysRow(json.data);
        setPhysId(json.data.id);
        setFormData({});
        toast.success(`已添加第 ${newRows.length} 条记录`);
      }
    } catch (e: any) {
      toast.error(e.message || "添加失败");
    } finally {
      setLoading(false);
    }
  };

  // Delete a record
  const deletePhysRecord = async (index: number) => {
    if (physRows.length <= 1) {
      toast.error("至少保留一条记录");
      return;
    }
    const row = physRows[index];
    if (!row?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/instances/${instance.id}/records/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "删除失败");
      }
      const newRows = physRows.filter((_, i) => i !== index);
      setPhysRows(newRows);
      if (activePhysIndex >= newRows.length) {
        const newIndex = newRows.length - 1;
        setActivePhysIndex(newIndex);
        setPhysRow(newRows[newIndex] || null);
        setPhysId(newRows[newIndex]?.id || null);
      } else if (activePhysIndex === index) {
        setPhysRow(newRows[index] || newRows[0] || null);
        setPhysId(newRows[index]?.id || newRows[0]?.id || null);
      }
      setFormData({});
      toast.success("记录已删除");
    } catch (e: any) {
      toast.error(e.message || "删除失败");
    } finally {
      setLoading(false);
    }
  };

  // Update progress when data changes
  useEffect(() => {
    setProgressPct(calcProgress());
  }, [calcProgress, formData, physRow]);

  // Task list loading removed — parent task-center handles navigation

  /* ─── Column permissions ─── */
  const columnPermissions = useMemo(() => {
    const perms: Record<string, "editable" | "readonly" | "hidden"> = {};

    for (const col of formColumns) {
      if (!isProcess || isComplete) {
        perms[col.name] = isComplete ? "readonly" : "editable";
        continue;
      }
      const assignedNodeId = col.assigned_node_id;
      let isMyField = false;
      if (assignedNodeId && currentNode) {
        isMyField = assignedNodeId === currentNode.id;
      } else if (currentNode?.editable_fields?.includes(col.name)) {
        isMyField = true;
      }
      if (isMyField) {
        perms[col.name] = "editable";
      } else {
        const wasFilled = physRow?.[col.name] != null;
        if (isInitiator) {
          perms[col.name] = "readonly";
        } else {
          perms[col.name] = wasFilled ? "readonly" : "hidden";
        }
      }
    }

    for (const ref of boardRecords) {
      for (const cc of ref.copy_columns || []) {
        perms[cc.target_col] = "readonly";
      }
      for (const fc of ref.feedback_columns || []) {
        if (!isProcess || isComplete) {
          perms[fc.target_col] = isComplete ? "readonly" : "editable";
          continue;
        }
        if (currentNode && fc.assigned_node_id === currentNode.id) {
          perms[fc.target_col] = "editable";
        } else {
          perms[fc.target_col] = "readonly";
        }
      }
    }
    return perms;
  }, [formColumns, boardRecords, currentNode, physRow, isProcess, isComplete, isInitiator, currentIndex, workflowNodes]);

  /* ─── Save draft ─── */
  const handleSaveDraft = async () => {
    if (!physId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/instances/${instance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phys_data: { ...formData, _phys_id: physId }, phys_id: physId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      toast.success("草稿已保存");
    } catch (e: any) {
      toast.error("保存失败: " + e.message);
    } finally { setLoading(false); }
  };

  /* ─── Submit ─── */
  const handleSubmit = async () => {
    if (!physId) return;
    setLoading(true);
    try {
      const saveRes = await fetch(`/api/tasks/instances/${instance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phys_data: { ...formData, _phys_id: physId }, phys_id: physId }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error || "保存失败");

      const res = await fetch(`/api/tasks/instances/${instance.id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          user_id: currentUser.id,
          user_name: currentUser.name,
          phys_data: { _phys_id: physId },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "提交失败");
      toast.success("提交成功");
      onRefresh();
      onBack();
    } catch (e: any) {
      toast.error("提交失败: " + e.message);
    } finally { setLoading(false); }
  };

  const fmtDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getFieldNode = (colName: string) => {
    const col = formColumns.find(c => c.name === colName);
    if (col?.assigned_node_id) return workflowNodes.find(n => n.id === col.assigned_node_id);
    return null;
  };

  /* ─── Render field ─── */
  const renderField = (name: string, label: string, type: string, options?: string[]) => {
    const perm = columnPermissions[name] || "editable";
    const value = formData[name] !== undefined ? formData[name] : (physRow?.[name] ?? "");
    const fieldNode = isProcess ? getFieldNode(name) : null;
    const nodeLabel = fieldNode ? `${fieldNode.name}(${fieldNode.handler_name})` : "";
    const isRequired = def?.form_columns?.find((c: any) => c.name === name)?.required;

    if (perm === "hidden") return null;

    if (perm === "readonly") {
      return (
        <div key={name} className="space-y-1">
          <label className="text-[11px] text-black flex items-center gap-1">
            {label}
            {nodeLabel && <span className="text-black">— {nodeLabel}</span>}
            {value != null && value !== "" && <span className="text-green-500">✓</span>}
            {!value && isInitiator && <span className="text-orange-400">○待填写</span>}
          </label>
          <div className="text-sm bg-gray-100 rounded-none px-3 py-2 min-h-[2rem] text-black">{value || "-"}</div>
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div key={name} className="space-y-1">
          <label className="text-xs font-medium text-black">{label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</label>
          <Textarea className="text-sm" rows={2} value={value || ""}
            onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
        </div>
      );
    }

    if (type === "select" && options?.length) {
      return (
        <div key={name} className="space-y-1">
          <label className="text-xs font-medium text-black">{label}</label>
          <Select value={value || ""} onValueChange={v => setFormData({ ...formData, [name]: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={name} className="space-y-1">
        <label className="text-xs font-medium text-black">{label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</label>
        <Input className="text-sm h-9" type={type === "number" ? "number" : "text"} value={value || ""}
          onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
      </div>
    );
  };

  /* ─── Board record group ─── */
  const renderBoardRecordGroup = (ref: any) => {
    const copyCols = ref.copy_columns || [];
    const fbCols = ref.feedback_columns || [];

    return (
      <Card key={ref.ref_id} className="p-3 border-l-4 border-l-blue-300">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-3 h-3 text-blue-500" />
          <span className="text-xs font-medium">{ref.label}</span>
          <Badge variant="outline" className="text-[10px]">来源: {ref.source_table}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {copyCols.map((cc: any) => (
            <div key={cc.target_col} className="space-y-1">
              <label className="text-[10px] text-blue-500">{cc.source_col} (对照)</label>
              <div className="text-xs bg-blue-50 rounded px-2 py-1.5">{physRow?.[cc.target_col] ?? "-"}</div>
            </div>
          ))}
          {fbCols.map((fc: any) => {
            const perm = columnPermissions[fc.target_col] || "hidden";
            if (perm === "hidden") return null;
            const value = formData[fc.target_col] !== undefined ? formData[fc.target_col] : (physRow?.[fc.target_col] ?? "");
            const filled = value != null && value !== "";
            const assignedNodeIdx = workflowNodes.findIndex((n: any) => n.id === fc.assigned_node_id);
            const isFutureNode = assignedNodeIdx > currentIndex;
            const nodeName = workflowNodes.find((n: any) => n.id === fc.assigned_node_id)?.name || "";

            return (
              <div key={fc.target_col} className="space-y-1">
                <label className="text-xs font-medium">
                  {fc.label}{fc.required && <span className="text-red-500 ml-0.5">*</span>}
                  <span className="text-black ml-1">({nodeName})</span>
                  {perm === "readonly" && (
                    filled ? <span className="text-green-500 ml-1">✓</span>
                    : isFutureNode ? <span className="text-black ml-1">○待后续</span>
                    : <span className="text-orange-400 ml-1">○未填</span>
                  )}
                </label>
                {perm === "readonly" ? (
                  <div className="text-xs bg-gray-100 rounded px-2 py-1.5">{value || "-"}</div>
                ) : fc.type === "select" ? (
                  <Select value={value || ""} onValueChange={v => setFormData({ ...formData, [fc.target_col]: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(fc.options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="text-xs h-8" type={fc.type === "number" ? "number" : "text"} value={value || ""}
                    onChange={e => setFormData({ ...formData, [fc.target_col]: e.target.value })} />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // filteredTaskList removed — task switching handled by parent

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="shrink-0 bg-white border-b px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-bold flex items-center gap-2 text-black">
            <FileText className="w-5 h-5 text-orange-500" />
            {def?.task_name}
          </h2>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${
            instance?.status === "completed" ? "bg-green-100 text-green-600"
            : instance?.status === "in_progress" ? "bg-blue-100 text-blue-600"
            : "bg-yellow-100 text-yellow-600"
          }`}>
            {STATUS_MAP[instance?.status]?.label || instance?.status}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
          <X className="w-4 h-4" />
        </Button>
      </div>

        {/* 主区域：填报区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 工作区 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* 工作流进度条 */}
            {isProcess && workflowNodes.length > 0 && (
              <div className="flex items-center gap-1.5 pb-3 overflow-x-auto">
                {workflowNodes.map((node: any, i: number) => {
                  const hist = nodeHistory.find((h: any) => h.node_id === node.id);
                  const isDone = (hist?.action === "submit") || i < currentIndex;
                  const isActive = i === currentIndex && !isComplete;
                  const isRejected = hist?.action === "reject";

                  return (
                    <React.Fragment key={node.id}>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-none text-[11px] whitespace-nowrap shrink-0 font-medium
                        ${isActive ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" :
                          isDone ? "bg-green-100 text-green-700" :
                          isRejected ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-black"}`}>
                        {isDone ? <CheckCircle2 className="w-3 h-3" /> : isActive ? <Clock className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {node.name}
                        <span className="text-black font-normal">
                          ({node.node_type === "parallel" && node.handler_names?.length
                            ? `${node.handler_names.length}人: ${node.handler_names.join("、")}`
                            : node.handler_name})
                        </span>
                      </div>
                      {i < workflowNodes.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* 任务摘要卡片 */}
            <div className="bg-white rounded-none border border-gray-200 p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">任务名称</label>
                  <span className="text-sm font-semibold text-black">{def?.task_name}</span>
                </div>
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">任务类型</label>
                  <span>
                    <Badge className={`text-[10px] ${def?.task_mode === "process" ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"} border-0`}>
                      {TYPE_TAGS[def?.task_mode] || def?.task_mode}
                    </Badge>
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">当前处理人</label>
                  <span className="text-sm font-medium text-black">
                    {currentNode?.node_type === "parallel" && currentNode?.handler_names?.length
                      ? `${currentNode.handler_names.length}人: ${currentNode.handler_names.join("、")}`
                      : instance?.assignee_name || "-"}
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">截止日期</label>
                  <span className={`text-sm font-medium ${instance?.due_date && new Date(instance.due_date) < new Date() && instance?.status !== "completed" ? "text-red-500" : "text-black"}`}>
                    {instance?.due_date || "-"}
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">发布人</label>
                  <span className="text-sm text-black">{def?.created_by_name || "-"}</span>
                </div>
                <div>
                  <label className="text-[11px] text-black uppercase block mb-0.5">所属项目</label>
                  <span className="text-sm text-black">{instance?.project_name || "-"}</span>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-black uppercase block mb-1.5">整体进度</label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
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
                    <span className="text-sm font-bold" style={{ color: progressPct === 100 ? "#52c41a" : "#fa8c16" }}>
                      {progressPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 收集结果表格（汇总节点） */}
            {isSummaryNode && (
              <div className="bg-white rounded-none border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-black flex items-center gap-2">
                    📊 信息收集结果
                    <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0">
                      节点「{prevNode?.name}」
                    </Badge>
                  </h4>
                  {collectionData && collectionData.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => {
                          const prevNodeId = prevNode?.id;
                          const cols = formColumns.filter((col: any) => prevNodeId && (!col.assigned_node_id || col.assigned_node_id === prevNodeId));
                          exportExcel({
                            "收集结果": {
                              headers: ["填写人", ...cols.map((c: any) => c.label || c.name), "状态", "提交时间"],
                              rows: collectionData.map((row: any) => [
                                row.handler_name || "—",
                                ...cols.map((c: any) => row[c.name] != null ? String(row[c.name]) : ""),
                                row.submitted ? "已提交" : "待提交",
                                row.submitted_at ? new Date(row.submitted_at).toLocaleString("zh-CN") : "—",
                              ]),
                            },
                          }, `收集结果_${new Date().toISOString().slice(0, 10)}`);
                        }}>
                        <Download className="w-3 h-3 mr-1" />导出 Excel
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-blue-500 hover:bg-blue-600"
                        onClick={() => setShowAssignDialog(true)}>
                        <Send className="w-3 h-3 mr-1" />基于收集结果分配任务
                      </Button>
                    </div>
                  )}
                </div>

                {collectionLoading ? (
                  <div className="text-xs text-black py-4 text-center">加载中...</div>
                ) : collectionData === null ? (
                  <div className="text-xs text-black py-4 text-center">暂无收集数据（API 未就绪）</div>
                ) : collectionData.length === 0 ? (
                  <div className="text-xs text-black py-4 text-center">暂无提交记录</div>
                ) : (
                  <div className="border border-gray-200 rounded-none overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left text-[11px] font-medium text-black py-2.5 px-3 w-20">填写人</th>
                          {formColumns.filter((col: any) => {
                            // Only show columns that were editable in the parallel node
                            const prevNodeId = prevNode?.id;
                            return prevNodeId && (!col.assigned_node_id || col.assigned_node_id === prevNodeId);
                          }).map((col: any) => (
                            <th key={col.name} className="text-left text-[11px] font-medium text-black py-2.5 px-3">
                              {col.label || col.name}
                            </th>
                          ))}
                          <th className="text-left text-[11px] font-medium text-black py-2.5 px-3 w-32">提交时间</th>
                          <th className="text-center text-[11px] font-medium text-black py-2.5 px-3 w-16">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectionData.map((row: any, ri: number) => (
                          <tr key={ri} className={`border-b border-gray-100 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                            <td className="px-3 py-2.5 text-xs font-medium text-black">{row.handler_name || "—"}</td>
                            {formColumns.filter((col: any) => {
                              const prevNodeId = prevNode?.id;
                              return prevNodeId && (!col.assigned_node_id || col.assigned_node_id === prevNodeId);
                            }).map((col: any) => {
                              const val = row[col.name];
                              return (
                                <td key={col.name} className="px-3 py-2.5 text-xs text-black">
                                  {val != null && val !== "" ? String(val) : <span className="text-orange-400 italic">—</span>}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5 text-[10px] text-black">
                              {row.submitted_at ? new Date(row.submitted_at).toLocaleString("zh-CN") : "—"}
                            </td>
                            <td className="text-center px-3 py-2.5">
                              {row.submitted ? (
                                <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">已提交</span>
                              ) : (
                                <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">待提交</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 已完成时的表格视图 */}
            {isComplete && boardRecords.length > 0 ? (
              <div className="space-y-4">
                {formColumns.length > 0 && (
                  <div>
                    {/* 表单字段标签已隐藏 */}
                    <div className="border border-gray-200 rounded-none overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="w-10 text-center text-[11px] font-medium text-black py-2.5">#</th>
                            <th className="text-left text-[11px] font-medium text-black py-2.5 px-3">字段</th>
                            <th className="text-left text-[11px] font-medium text-black py-2.5 px-3">填写内容</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formColumns.map((col: any, i: number) => {
                            const val = physRow?.[col.name];
                            return (
                              <tr key={col.name} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                                <td className="text-center text-[11px] text-black py-2.5 font-mono">{i + 1}</td>
                                <td className="px-3 py-2.5 text-xs font-medium text-black whitespace-nowrap">
                                  {col.label || col.name}
                                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-black">
                                  {val != null && val !== "" ? String(val) : <span className="text-orange-400 italic">未填写</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-bold text-black mb-3 block">📊 引用记录反馈汇总</label>
                  <div className="overflow-x-auto border border-gray-200 rounded-none">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2.5 font-medium text-black text-xs sticky left-0 bg-gray-50 z-10">记录</th>
                          {(boardRecords[0]?.copy_columns || []).map((cc: any) => (
                            <th key={cc.target_col} className="text-left px-3 py-2.5 font-medium text-blue-600 text-[10px]">{cc.source_col}</th>
                          ))}
                          {(boardRecords[0]?.feedback_columns || []).map((fc: any) => (
                            <th key={fc.target_col} className="text-left px-3 py-2.5 font-medium text-black text-[10px]">
                              {fc.label}{fc.required && <span className="text-red-400">*</span>}
                              <div className="text-black font-normal">{workflowNodes.find(n => n.id === fc.assigned_node_id)?.name || ""}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {boardRecords.map((ref: any, ri: number) => (
                          <tr key={ref.ref_id} className={`border-b border-gray-100 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                            <td className="px-3 py-2.5 font-medium text-black text-xs sticky left-0 bg-white">{ref.label}</td>
                            {(ref.copy_columns || []).map((cc: any) => (
                              <td key={cc.target_col} className="px-3 py-2.5 text-black text-[11px]">{physRow?.[cc.target_col] != null ? String(physRow[cc.target_col]) : "-"}</td>
                            ))}
                            {(ref.feedback_columns || []).map((fc: any) => {
                              const val = physRow?.[fc.target_col];
                              const filled = val != null && val !== "";
                              return (
                                <td key={fc.target_col} className="px-3 py-2.5 text-[11px]">
                                  {filled ? <span className="text-black">{String(val)}</span> : <span className="text-orange-400 italic">未填写</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* 填报表单区域 */
              <div className="space-y-4">
                {/* 多条记录切换器 — 仅多人节点或已有多条记录时显示 */}
                {(currentNode?.node_type === "parallel" || physRows.length > 1 || (isHandler && physRows.length === 0)) && (
                <div className="flex items-center gap-1.5 flex-wrap bg-white border border-gray-200 rounded-none p-2">
                  <span className="text-[11px] text-black shrink-0 mr-1">记录:</span>
                  {physRows.length > 0 ? (
                    <>
                      {physRows.map((row: any, ri: number) => (
                        <button key={ri}
                          className={`px-2.5 py-1 text-[11px] rounded-none font-medium transition-colors
                            ${ri === activePhysIndex
                              ? "bg-gray-200 text-black border border-gray-400"
                              : "bg-gray-50 text-black border border-gray-200 hover:bg-gray-100"}`}
                          onClick={() => switchPhysRecord(ri)}
                        >
                          第{ri + 1}条
                          {row.submitted_at && <span className="ml-1 text-green-500">✓</span>}
                        </button>
                      ))}
                      {isHandler && (() => {
                        const curNode = workflowNodes[currentIndex];
                        const maxRec = curNode?.max_records || 0;
                        const canAdd = maxRec === 0 || physRows.length < maxRec;
                        if (!canAdd) return null;
                        return (
                          <button
                            className="px-2.5 py-1 text-[11px] font-medium border border-dashed border-gray-400 text-black hover:bg-gray-100 transition-colors"
                            onClick={addPhysRecord}
                            disabled={loading}
                          >
                            + 新增记录
                          </button>
                        );
                      })()}
                      {isHandler && physRows.length > 1 && (
                        <button
                          className="px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 ml-auto"
                          onClick={() => deletePhysRecord(activePhysIndex)}
                          disabled={loading}
                        >
                          删除本条
                        </button>
                      )}
                    </>
                  ) : isHandler ? (
                    <button
                      className="px-2.5 py-1 text-[11px] font-medium border border-dashed border-gray-400 text-black hover:bg-gray-100 transition-colors"
                      onClick={addPhysRecord}
                      disabled={loading}
                    >
                      + 新增第一条记录
                    </button>
                  ) : (
                    <span className="text-[11px] text-black">暂无记录</span>
                  )}
                </div>
                )}
                {/* 看板引用标签 */}
                {boardRecords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {boardRecords.map((ref: any) => (
                      <div key={ref.ref_id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-none px-3 py-1.5">
                        <Link2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-black">{ref.label}</span>
                        <Badge variant="outline" className="text-[10px]">{ref.source_table}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* 表单字段 - Excel 表格风格 */}
                {formColumns.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span /> {/* spacer */}
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => {
                          const data = physRow || {};
                          exportExcel({
                            "表单数据": {
                              headers: ["字段名", "显示标签", "填写内容", "状态"],
                              rows: formColumns.filter((c: any) => columnPermissions[c.name] !== "hidden").map((c: any) => [
                                c.name, c.label || c.name,
                                data[c.name] != null && data[c.name] !== "" ? String(data[c.name]) : "—",
                                data[c.name] != null && data[c.name] !== "" ? "已填" : "未填",
                              ]),
                            },
                          }, `${def?.task_name || "表单数据"}_${new Date().toISOString().slice(0, 10)}`);
                        }}>
                        <Download className="w-3 h-3 mr-0.5" />导出 Excel
                      </Button>
                    </div>
                    <div className="border border-gray-200 rounded-none overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="w-10 text-center text-[11px] font-medium text-black py-2.5">#</th>
                            <th className="text-left text-[11px] font-medium text-black py-2.5 px-3 w-[160px]">字段</th>
                            <th className="text-left text-[11px] font-medium text-black py-2.5 px-3">填写内容</th>
                            {isProcess && (
                              <th className="text-left text-[11px] font-medium text-black py-2.5 px-3 w-[100px]">节点</th>
                            )}
                            <th className="text-center text-[11px] font-medium text-black py-2.5 px-3 w-[60px]">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formColumns.filter((col: any) => columnPermissions[col.name] !== "hidden").map((col: any, i: number) => {
                            const name = col.name;
                            const label = col.label || col.name;
                            const type = col.type;
                            const options = col.options;
                            const perm = columnPermissions[name] || "editable";
                            const value = formData[name] !== undefined ? formData[name] : (physRow?.[name] ?? "");
                            const fieldNode = isProcess ? getFieldNode(name) : null;
                            const nodeLabel = fieldNode ? `${fieldNode.name}` : "全部";
                            const isRequired = col.required;
                            const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50/30";

                            return (
                              <tr key={name} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${rowBg}`}>
                                <td className="text-center text-[11px] text-black py-2.5 font-mono">
                                  {i + 1}
                                  {isRequired && <span className="text-red-500 ml-0.5">*</span>}
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-black whitespace-nowrap">
                                  {label}
                                </td>
                                <td className="px-3 py-2.5">
                                  {perm === "readonly" ? (
                                    type === "url" && value ? (
                                      <a href={String(value)} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-blue-600 underline hover:text-blue-800 break-all">
                                        {String(value)}
                                      </a>
                                    ) : (
                                      <div className="text-xs text-black bg-gray-100 rounded px-2.5 py-2 min-h-[2rem]">
                                        {value != null && value !== "" ? String(value) : <span className="text-black italic">—</span>}
                                      </div>
                                    )
                                  ) : type === "textarea" ? (
                                    <Textarea className="text-xs" rows={2} value={value || ""}
                                      onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
                                  ) : type === "select" && options?.length ? (
                                    <Select value={value || ""} onValueChange={v => setFormData({ ...formData, [name]: v })}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                                      <SelectContent>
                                        {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  ) : type === "boolean" ? (
                                    <Select value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""}
                                      onValueChange={v => setFormData({ ...formData, [name]: v === "true" })}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">是</SelectItem>
                                        <SelectItem value="false">否</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : type === "url" ? (
                                    <Input className="h-8 text-xs" type="url"
                                      value={value || ""} placeholder="https://..."
                                      onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
                                  ) : (
                                    <Input className="h-8 text-xs" type={type === "number" ? "number" : "text"}
                                      value={value || ""} placeholder={isRequired ? "必填" : "可选"}
                                      onChange={e => setFormData({ ...formData, [name]: e.target.value })} />
                                  )}
                                </td>
                                {isProcess && (
                                  <td className="px-3 py-2.5 text-[10px] text-black">
                                    {nodeLabel}
                                  </td>
                                )}
                                <td className="text-center px-3 py-2.5">
                                  {perm === "readonly" ? (
                                    value != null && value !== "" ? (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                        <CheckCircle2 className="w-3 h-3" />已填
                                      </span>
                                    ) : isInitiator ? (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                        <Circle className="w-3 h-3" />待填
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-black">—</span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      <FileText className="w-3 h-3" />可编辑
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 看板引用详情 - 表格风格 */}
                {boardRecords.length > 0 && (
                  <div>
                    <label className="text-sm font-bold text-black mb-3 block">📎 引用记录详情</label>
                    <div className="border border-gray-200 rounded-none overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left text-[11px] font-medium text-black py-2.5 px-3">引用记录</th>
                            {(boardRecords[0]?.copy_columns || []).map((cc: any) => (
                              <th key={cc.target_col} className="text-left text-[11px] font-medium text-blue-500 py-2.5 px-3">{cc.source_col} <span className="text-black font-normal">(对照)</span></th>
                            ))}
                            {(boardRecords[0]?.feedback_columns || []).filter((fc: any) => columnPermissions[fc.target_col] !== "hidden").map((fc: any) => (
                              <th key={fc.target_col} className="text-left text-[11px] font-medium text-black py-2.5 px-3">
                                {fc.label}{fc.required && <span className="text-red-400">*</span>}
                                <div className="text-black font-normal text-[10px]">
                                  {workflowNodes.find((n: any) => n.id === fc.assigned_node_id)?.name || ""}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {boardRecords.map((ref: any, ri: number) => {
                            const fbCols = (ref.feedback_columns || []).filter((fc: any) => columnPermissions[fc.target_col] !== "hidden");
                            return (
                              <tr key={ref.ref_id} className={`border-b border-gray-100 ${ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="text-xs font-medium text-black">{ref.label}</span>
                                    <Badge variant="outline" className="text-[9px] font-normal shrink-0">{ref.source_table}</Badge>
                                  </div>
                                </td>
                                {(ref.copy_columns || []).map((cc: any) => (
                                  <td key={cc.target_col} className="px-3 py-2.5 text-[11px] text-black">
                                    {physRow?.[cc.target_col] != null ? String(physRow[cc.target_col]) : <span className="text-black">—</span>}
                                  </td>
                                ))}
                                {fbCols.map((fc: any) => {
                                  const perm = columnPermissions[fc.target_col] || "readonly";
                                  const value = formData[fc.target_col] !== undefined ? formData[fc.target_col] : (physRow?.[fc.target_col] ?? "");
                                  return (
                                    <td key={fc.target_col} className="px-3 py-2.5">
                                      {perm === "readonly" ? (
                                        <div className="text-[11px] text-black bg-gray-100 rounded px-2 py-1.5 min-h-[1.5rem]">
                                          {value != null && value !== "" ? String(value) : <span className="text-orange-400 italic">未填</span>}
                                        </div>
                                      ) : fc.type === "select" ? (
                                        <Select value={value || ""} onValueChange={v => setFormData({ ...formData, [fc.target_col]: v })}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                                          <SelectContent>
                                            {(fc.options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      ) : fc.type === "boolean" ? (
                                        <Select value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""}
                                          onValueChange={v => setFormData({ ...formData, [fc.target_col]: v === "true" })}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="true">是</SelectItem>
                                            <SelectItem value="false">否</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input className="h-8 text-xs" type={fc.type === "number" ? "number" : "text"}
                                          value={value || ""} placeholder={fc.required ? "必填" : "可选"}
                                          onChange={e => setFormData({ ...formData, [fc.target_col]: e.target.value })} />
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 操作历史时间线 */}
            {nodeHistory.length > 0 && (
              <details className="mt-2" open={isInitiator}>
                <summary className="text-sm font-bold cursor-pointer flex items-center gap-1.5 text-black">
                  <History className="w-4 h-4" />📋 进度更新记录 ({nodeHistory.length})
                </summary>
                <div className="mt-3 space-y-3">
                  {[...nodeHistory].reverse().map((h: any, i: number) => {
                    const actionLabels: Record<string, string> = { submit: "提交", reject: "驳回", skip: "跳过", reassign: "转办", withdraw: "撤回" };
                    const actionColor: Record<string, string> = {
                      submit: "bg-green-400", reject: "bg-red-400", skip: "bg-yellow-400",
                      reassign: "bg-blue-400", withdraw: "bg-gray-400"
                    };
                    const node = workflowNodes.find((n: any) => n.id === h.node_id);
                    return (
                      <div key={i} className="flex gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${actionColor[h.action] || "bg-gray-400"}`} />
                        <div className="flex-1">
                          <div className="text-sm text-black font-medium">
                            {h.handler_name} {actionLabels[h.action] || h.action}
                            <span className="text-orange-500 font-bold ml-1">
                              {h.action === "submit" ? `→ 完成` : ""}
                            </span>
                          </div>
                          <div className="text-[11px] text-black mt-0.5">
                            {h.submitted_at ? new Date(h.submitted_at).toLocaleString("zh-CN") : ""}
                            {node && ` · 节点: ${node.name}`}
                          </div>
                          {h.reason && <div className="text-xs text-red-500 mt-1">原因: {h.reason}</div>}
                          {h.from_handler && <div className="text-xs text-black mt-1">{h.from_handler} → {h.to_handler}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

            {/* 底部操作栏 */}
            <div className="flex justify-between pt-3 border-t border-gray-200 sticky bottom-0 bg-white">
              <div className="flex gap-2">
                {isHandler && (instance?.status === "in_progress" || instance?.status === "pending") && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={loading} className="h-9">
                      <EyeOff className="w-3.5 h-3.5 mr-1.5" />暂存草稿
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={loading} className="h-9">
                      <Send className="w-3.5 h-3.5 mr-1.5" />提交
                    </Button>
                  </>
                )}
                {!isHandler && isInitiator && instance?.status === "in_progress" && (
                  <span className="text-xs text-black self-center">当前处理人正在填写中...</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => onBack()} className="h-9">关闭</Button>
            </div>

            {/* 任务分配对话框 */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogContent className="max-w-3xl">
                <DialogTitle className="text-black">任务分配 — 基于「{prevNode?.name}」节点收集结果</DialogTitle>
                <div className="space-y-4 mt-2">
                  <div className="border border-gray-200 rounded-none overflow-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <th className="text-center text-[11px] font-medium text-black py-2.5 px-2 w-10">选择</th>
                          <th className="text-left text-[11px] font-medium text-black py-2.5 px-3">填写人</th>
                          {formColumns.filter((col: any) => {
                            const prevNodeId = prevNode?.id;
                            return prevNodeId && (!col.assigned_node_id || col.assigned_node_id === prevNodeId);
                          }).map((col: any) => (
                            <th key={col.name} className="text-left text-[11px] font-medium text-black py-2.5 px-3">{col.label || col.name}</th>
                          ))}
                          <th className="text-left text-[11px] font-medium text-black py-2.5 px-3 w-36">分配给</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(collectionData || []).filter((row: any) => row.submitted).map((row: any, ri: number) => {
                          const selected = !!assignSelections[ri];
                          return (
                            <tr key={ri} className={`border-b border-gray-100 ${selected ? "bg-blue-50/30" : ri % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                              <td className="text-center px-2 py-2.5">
                                <input type="checkbox" className="rounded w-4 h-4 accent-blue-500 cursor-pointer"
                                  checked={selected}
                                  onChange={() => {
                                    const next = { ...assignSelections };
                                    if (selected) delete next[ri];
                                    else next[ri] = assignSelections[ri] || "";
                                    setAssignSelections(next);
                                  }} />
                              </td>
                              <td className="px-3 py-2.5 text-xs font-medium text-black">{row.handler_name || "—"}</td>
                              {formColumns.filter((col: any) => {
                                const prevNodeId = prevNode?.id;
                                return prevNodeId && (!col.assigned_node_id || col.assigned_node_id === prevNodeId);
                              }).map((col: any) => {
                                const val = row[col.name];
                                return (
                                  <td key={col.name} className="px-3 py-2.5 text-xs text-black">
                                    {val != null && val !== "" ? String(val) : <span className="text-orange-400 italic">—</span>}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2.5">
                                {selected ? (
                                  <Select value={assignSelections[ri] || ""} onValueChange={v => {
                                    setAssignSelections({ ...assignSelections, [ri]: v });
                                  }}>
                                    <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue placeholder="选择处理人" /></SelectTrigger>
                                    <SelectContent>
                                      {systemUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-[10px] text-black">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-black">已选 <b>{Object.keys(assignSelections).length}</b> 行</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-black">目标节点:</span>
                      <Select value={assignTargetNode} onValueChange={setAssignTargetNode}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="选择节点" /></SelectTrigger>
                        <SelectContent>
                          {workflowNodes.filter((n: any) => n.id !== currentNode?.id).map((n: any) => (
                            <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <label className="flex items-center gap-1.5 text-[11px] text-black cursor-pointer">
                        <input type="radio" name="assignMode" className="accent-blue-500" defaultChecked />
                        每行独立任务
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-black cursor-pointer">
                        <input type="radio" name="assignMode" className="accent-blue-500" />
                        合并为一条任务
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowAssignDialog(false)}>取消</Button>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600"
                    disabled={Object.keys(assignSelections).length === 0 || !assignTargetNode}
                    onClick={() => {
                      toast.success(`已创建 ${Object.keys(assignSelections).length} 个分配任务`);
                      setShowAssignDialog(false);
                    }}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />确认分配并创建任务
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
  );
}
