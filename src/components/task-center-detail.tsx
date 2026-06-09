"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Send, FileText, User, Clock, Calendar, Tag, ChevronRight,
  ArrowLeft, History, Eye, EyeOff, Link2, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/* ─── 类型 ─── */
interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

interface DetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: any;
  def: any;
  currentUser: CurrentUser;
  onRefresh: () => void;
}

const STATUS_MAP: Record<string, string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  returned: "已退回",
  cancelled: "已撤回",
  terminated: "已终止",
};

export default function TaskCenterDetail({ open, onOpenChange, instance, def, currentUser, onRefresh }: DetailProps) {
  const [physRow, setPhysRow] = useState<Record<string, any> | null>(null);
  const [physId, setPhysId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const workflowNodes: any[] = def?.workflow_nodes || [];
  const boardRecords: any[] = def?.board_records || [];
  const formColumns: any[] = def?.form_columns || [];
  const currentIndex: number = instance?.current_node_index ?? 0;
  const nodeHistory: any[] = instance?.node_history || [];
  const isProcess = def?.task_mode === "process";
  const isComplete = instance?.status === "completed";
  const isReturned = instance?.status === "returned";

  // Determine if current user is the current node handler
  const currentNode = isProcess && workflowNodes[currentIndex];
  const isHandler = currentNode?.handler_id === currentUser.id;
  const isInitiator = def?.created_by === currentUser.id;

  /* ─── Load physical row ─── */
  useEffect(() => {
    if (open && instance) {
      fetch(`/api/tasks/instances/${instance.id}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.data?.phys_row) {
            setPhysRow(j.data.phys_row);
            setPhysId(j.data.phys_row.id);
            setFormData({});
          }
        })
        .catch(() => {});
    }
  }, [open, instance]);

  /* ─── Build column permissions ─── */
  const columnPermissions = useMemo(() => {
    const perms: Record<string, "editable" | "readonly" | "hidden"> = {};

    // Form columns: based on workflow_nodes.editable_fields
    for (const col of formColumns) {
      if (isProcess && currentNode) {
        if (currentNode.editable_fields?.includes(col.name)) {
          perms[col.name] = "editable";
        } else {
          // Check if any previous node filled this
          const wasFilled = physRow?.[col.name] != null;
          perms[col.name] = wasFilled ? "readonly" : "hidden";
        }
      } else {
        perms[col.name] = isComplete ? "readonly" : "editable";
      }
    }

    // Board record columns
    for (const ref of boardRecords) {
      // Copy columns: always readonly
      for (const cc of ref.copy_columns || []) {
        perms[cc.target_col] = "readonly";
      }
      // Feedback columns: check assigned_node_id
      for (const fc of ref.feedback_columns || []) {
        if (isProcess && currentNode) {
          if (fc.assigned_node_id === currentNode.id) {
            perms[fc.target_col] = "editable";
          } else {
            const wasFilled = physRow?.[fc.target_col] != null;
            // Check if this column was filled by a previous node
            const assignedNodeIndex = workflowNodes.findIndex((n: any) => n.id === fc.assigned_node_id);
            perms[fc.target_col] = (assignedNodeIndex < currentIndex || wasFilled) ? "readonly" : "hidden";
          }
        } else {
          perms[fc.target_col] = isComplete ? "readonly" : "editable";
        }
      }
    }

    return perms;
  }, [formColumns, boardRecords, currentNode, physRow, isProcess, isComplete, currentIndex, workflowNodes]);

  /* ─── Save draft ─── */
  const handleSaveDraft = async () => {
    if (!physId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/instances/${instance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phys_data: { ...formData, _phys_id: physId },
          phys_id: physId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      toast.success("草稿已保存");
    } catch (e: any) {
      toast.error("保存失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Submit node ─── */
  const handleSubmit = async () => {
    if (!physId) return;
    setLoading(true);
    try {
      // First save draft
      await fetch(`/api/tasks/instances/${instance.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phys_data: { ...formData, _phys_id: physId },
          phys_id: physId,
        }),
      });

      // Then advance
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
      onOpenChange(false);
    } catch (e: any) {
      toast.error("提交失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Render form row ─── */
  const renderField = (name: string, label: string, type: string, options?: string[]) => {
    const perm = columnPermissions[name] || "editable";
    const value = formData[name] !== undefined ? formData[name] : (physRow?.[name] ?? "");

    if (perm === "hidden") return null;

    if (perm === "readonly") {
      return (
        <div key={name} className="space-y-1">
          <label className="text-xs text-gray-500">{label}</label>
          <div className="text-sm bg-gray-100 rounded px-2 py-1.5 min-h-[2rem]">{value || "-"}</div>
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div key={name} className="space-y-1">
          <label className="text-xs font-medium">{label}{def?.form_columns?.find((c: any) => c.name === name)?.required && <span className="text-red-500 ml-0.5">*</span>}</label>
          <Textarea className="text-sm" rows={2} value={value || ""}
            onChange={(e) => setFormData({ ...formData, [name]: e.target.value })} />
        </div>
      );
    }

    if (type === "select" && options?.length) {
      return (
        <div key={name} className="space-y-1">
          <label className="text-xs font-medium">{label}</label>
          <Select value={value || ""} onValueChange={(v) => setFormData({ ...formData, [name]: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={name} className="space-y-1">
        <label className="text-xs font-medium">{label}{def?.form_columns?.find((c: any) => c.name === name)?.required && <span className="text-red-500 ml-0.5">*</span>}</label>
        <Input className="text-sm h-8" type={type === "number" ? "number" : "text"} value={value || ""}
          onChange={(e) => setFormData({ ...formData, [name]: e.target.value })} />
      </div>
    );
  };

  /* ─── Group board record columns for display ─── */
  const renderBoardRecordGroup = (ref: any) => {
    const copyCols = ref.copy_columns || [];
    const fbCols = ref.feedback_columns || [];

    return (
      <Card key={ref.ref_id} className="p-3 border-l-4 border-l-blue-300">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-3 h-3 text-blue-500" />
          <span className="text-sm font-medium">{ref.label}</span>
          <Badge variant="outline" className="text-xs">来源: {ref.source_table}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {copyCols.map((cc: any) => (
            <div key={cc.target_col} className="space-y-1">
              <label className="text-xs text-blue-500">{cc.source_col} (对照)</label>
              <div className="text-sm bg-blue-50 rounded px-2 py-1.5">{physRow?.[cc.target_col] ?? "-"}</div>
            </div>
          ))}
          {fbCols.map((fc: any) => {
            const nodeName = workflowNodes.find((n: any) => n.id === fc.assigned_node_id)?.name || "";
            const perm = columnPermissions[fc.target_col] || "hidden";
            if (perm === "hidden") return null;
            const value = formData[fc.target_col] !== undefined ? formData[fc.target_col] : (physRow?.[fc.target_col] ?? "");

            return (
              <div key={fc.target_col} className="space-y-1">
                <label className="text-xs font-medium">
                  {fc.label}{fc.required && <span className="text-red-500 ml-0.5">*</span>}
                  <span className="text-gray-400 ml-1">({nodeName})</span>
                </label>
                {perm === "readonly" ? (
                  <div className="text-sm bg-gray-100 rounded px-2 py-1.5">{value || "-"}</div>
                ) : fc.type === "select" ? (
                  <Select value={value || ""} onValueChange={(v) => setFormData({ ...formData, [fc.target_col]: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(fc.options || []).map((opt: string) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="text-sm h-8" type={fc.type === "number" ? "number" : "text"} value={value || ""}
                    onChange={(e) => setFormData({ ...formData, [fc.target_col]: e.target.value })} />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {def?.task_name}
            <span className={`text-xs px-2 py-0.5 rounded ${instance?.status === "completed" ? "bg-green-100 text-green-600" : instance?.status === "in_progress" ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-yellow-600"}`}>
              {STATUS_MAP[instance?.status] || instance?.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
          {instance?.period_label && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{instance.period_label}</span>}
          {currentNode && <span className="flex items-center gap-1"><User className="w-3 h-3" />当前节点: {currentNode.name} ({currentNode.handler_name})</span>}
          {instance?.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />截止: {instance.due_date}</span>}
        </div>

        {/* Workflow progress bar */}
        {isProcess && workflowNodes.length > 0 && (
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
            {workflowNodes.map((node: any, i: number) => {
              const hist = nodeHistory.find((h: any) => h.node_id === node.id);
              const isActive = i === currentIndex;
              const isDone = hist?.action === "submit" || i < currentIndex;
              const isRejected = hist?.action === "reject";

              return (
                <React.Fragment key={node.id}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap
                    ${isActive ? "bg-blue-100 text-blue-700 font-medium" : isDone ? "bg-green-100 text-green-700" : isRejected ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                    <span>{node.name}</span>
                    <span className="text-gray-400">({node.handler_name})</span>
                  </div>
                  {i < workflowNodes.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Form columns */}
          {formColumns.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">表单字段</label>
              <div className="grid grid-cols-2 gap-3">
                {formColumns.map((col: any) => (
                  renderField(col.name, col.label || col.name, col.type, col.options)
                ))}
              </div>
            </div>
          )}

          {/* Board record groups */}
          {boardRecords.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">引用记录</label>
              <div className="space-y-2">
                {boardRecords.map((ref: any) => renderBoardRecordGroup(ref))}
              </div>
            </div>
          )}
        </div>

        {/* Node history */}
        {nodeHistory.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm font-medium cursor-pointer flex items-center gap-1">
              <History className="w-4 h-4" />操作记录 ({nodeHistory.length})
            </summary>
            <div className="mt-2 space-y-1 max-h-40 overflow-auto">
              {nodeHistory.map((h: any, i: number) => (
                <div key={i} className="text-xs flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
                  <span className="font-medium">{h.action}</span>
                  <span>{h.handler_name}</span>
                  {h.reason && <span className="text-red-500">原因: {h.reason}</span>}
                  <span className="text-gray-400 ml-auto">{new Date(h.submitted_at || h.reassigned_at).toLocaleString("zh-CN")}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-4 pt-3 border-t">
          <div className="flex gap-2">
            {isHandler && (instance?.status === "in_progress" || instance?.status === "pending") && (
              <>
                <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={loading}>
                  暂存草稿
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={loading}>
                  <Send className="w-4 h-4 mr-1" />提交
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
