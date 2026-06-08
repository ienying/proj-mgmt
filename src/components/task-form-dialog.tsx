"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, Calendar, User, FileText, Send, Clock, ChevronDown } from "lucide-react";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formTableCode: string;
  formTableName?: string;
  instanceTitle?: string;
  instanceDesc?: string;
  instanceDueDate?: string;
  instanceStatus?: string;
  instanceAssignee?: string;
  instanceId?: string;
  definitionId?: string;
  projectName?: string;
  projectId?: string;
  recordSource?: string;
  nodeName?: string;
  nodeOrder?: number;
  totalNodes?: number;
  fillableFields?: string[];
  isApproval?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

interface BoardRecord {
  id: string;
  source_label: string;
  source_project_schema: string;
  source_table_code: string;
  source_record_id: string;
  source_data: Record<string, unknown>;
  extra?: Array<{ id: string; board_record_id: string; column_id: string; value: string }>;
}

interface ExtraColumnDef {
  id: string;
  name: string;
  type: string;
  options?: string[];
  writeback_column?: string;
  fillable_by?: string;
}

interface ColumnDef {
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  linked_project_id?: string;
  linked_table_code?: string;
  linked_column_name?: string;
  linked_record_ids?: string[];
  linked_source_field?: string;
  linked_configs?: Array<{
    project_id: string;
    module_code: string;
    table_code: string;
    column_name: string;
    record_ids: string[];
  }>;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "待完成", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  waiting: { label: "等待中", color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
  returned: { label: "已退回", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
};

export function TaskFormDialog({
  open, onOpenChange, formTableCode, formTableName,
  instanceTitle, instanceDesc, instanceDueDate, instanceStatus, instanceAssignee,
  instanceId, definitionId, projectName, projectId, recordSource, nodeName, nodeOrder, totalNodes,
  fillableFields, isApproval, currentUserId, currentUserName,
}: TaskFormDialogProps) {
  const statusCfg = instanceStatus ? STATUS_MAP[instanceStatus] || STATUS_MAP.pending : null;
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [linkedOptions, setLinkedOptions] = useState<Record<string, string[]>>({});
  const [linkedRecords, setLinkedRecords] = useState<Record<string, Array<{ id: string; label: string; pid?: string }>>>({});
  const [linkedTextTargets, setLinkedTextTargets] = useState<Record<string, string>>({});
  // 看板记录 + 补充列
  const [boardRecords, setBoardRecords] = useState<BoardRecord[]>([]);
  const [extraCols, setExtraCols] = useState<ExtraColumnDef[]>([]);
  const [extraData, setExtraData] = useState<Record<string, string>>({}); // key: "brId_colId"
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !formTableCode) return;
    setLoading(true);
    setSaved(false);
    setFormData({});
    fetch("/api/standards")
      .then((r) => r.json())
      .then(async (d) => {
        if (d.data) {
          const def = (d.data as Array<Record<string, unknown>>).find((t) => t.table_code === formTableCode);
          if (def && Array.isArray(def.columns_config)) {
            const rawCols = def.columns_config as Array<Record<string, unknown>>;
            const cols: ColumnDef[] = rawCols.map((c) => ({
              name: String(c.name || ""),
              type: String(c.type || "text"),
              required: Boolean(c.required),
              options: Array.isArray(c.options) ? c.options as string[] : [],
              linked_project_id: c.linked_project_id ? String(c.linked_project_id) : undefined,
              linked_table_code: c.linked_table_code ? String(c.linked_table_code) : undefined,
              linked_column_name: c.linked_column_name ? String(c.linked_column_name) : undefined,
              linked_record_ids: Array.isArray(c.linked_record_ids) ? c.linked_record_ids as string[] : undefined,
              linked_source_field: c.linked_source_field ? String(c.linked_source_field) : undefined,
              linked_configs: Array.isArray(c.linked_configs) ? c.linked_configs as ColumnDef["linked_configs"] : undefined,
            }));
            setColumns(cols);

            // 加载关联字段运行时数据
            const linkedCols = rawCols.filter((c) => c.type === "linked_select" || c.type === "linked_text" || c.type === "linked_date");
            if (linkedCols.length > 0) {
              const newLinkedOpts: Record<string, string[]> = {};
              const newLinkedRecs: Record<string, Array<{ id: string; label: string; pid: string }>> = {};
              for (const lc of linkedCols) {
                const targets: Array<{ pid: string; tcode: string; cname: string; rids: string[] }> = [];
                if (lc.linked_project_id && lc.linked_table_code && lc.linked_column_name)
                  targets.push({ pid: String(lc.linked_project_id), tcode: String(lc.linked_table_code), cname: String(lc.linked_column_name), rids: (lc.linked_record_ids as string[]) || [] });
                if (Array.isArray(lc.linked_configs))
                  for (const cfg of lc.linked_configs)
                    if (cfg.project_id && cfg.table_code && cfg.column_name)
                      targets.push({ pid: cfg.project_id, tcode: cfg.table_code, cname: cfg.column_name, rids: cfg.record_ids || [] });
                // 无显式目标时，从实例所属项目自动加载记录
                if (targets.length === 0 && projectId) {
                  try {
                    const recsRes = await fetch(`/api/project-data/records?projectId=${projectId}`);
                    const recsJson = await recsRes.json();
                    const projectRecords = (recsJson.data || []) as Array<{ id: string; label: string; table_code: string; project_id: string; project_name: string }>;
                    if (projectRecords.length > 0) {
                      newLinkedOpts[String(lc.name)] = projectRecords.map((r) => r.label);
                      newLinkedRecs[String(lc.name)] = projectRecords.map((r) => ({
                        id: r.id,
                        label: r.label,
                        pid: r.project_id,
                      }));
                      setLinkedOptions((prev) => ({ ...prev, [String(lc.name)]: projectRecords.map((r) => r.label) }));
                      setLinkedRecords((prev) => ({ ...prev, [String(lc.name)]: projectRecords.map((r) => ({
                        id: r.id,
                        label: r.label,
                        pid: r.project_id,
                      })) }));
                      continue; // 跳过主循环，因为已经直接设置好了
                    }
                  } catch { /* skip */ }
                }
                if (targets.length === 0) continue;
                const allValues: string[] = [];
                const allRecs: Array<{ id: string; label: string; pid: string }> = [];
                for (const tgt of targets) {
                  try {
                    const projRes = await fetch("/api/projects");
                    const projJson = await projRes.json();
                    const proj = (projJson.data || []).find((p: Record<string, unknown>) => p.id === tgt.pid);
                    if (proj) {
                      const schema = `yuansu_${proj.project_code}`;
                      const dataRes = await fetch(`/api/project-data?projectSchema=${schema}&tableCode=${tgt.tcode}`);
                      const dataJson = await dataRes.json();
                      const rows = (dataJson.data || []) as Array<Record<string, unknown>>;
                      const colKey = tgt.cname.toLowerCase().replace(/\s+/g, "_");
                      let filteredRows = rows;
                      if (tgt.rids.length > 0) {
                        const selectedIds = new Set(tgt.rids);
                        filteredRows = rows.filter((r) => selectedIds.has(String(r.id)));
                      }
                      const labelPrefix = targets.length > 1 ? `[${proj.project_name}] ` : "";
                      const values = filteredRows.map((r) => labelPrefix + String(r[colKey] || r[tgt.cname] || "")).filter(Boolean);
                      allValues.push(...values);
                      const records = filteredRows.map((r) => ({
                        id: String(r.id || ""),
                        label: labelPrefix + String(r[colKey] || r[tgt.cname] || r.id || ""),
                        pid: tgt.pid,
                      })).filter((r: { id: string }) => r.id);
                      allRecs.push(...records);
                    }
                  } catch { /* skip */ }
                }
                newLinkedOpts[String(lc.name)] = [...new Set(allValues)];
                newLinkedRecs[String(lc.name)] = allRecs;
              }
              setLinkedOptions(newLinkedOpts);
              setLinkedRecords(newLinkedRecs);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, formTableCode]);

  // 加载看板记录和补充列
  useEffect(() => {
    if (!open || !instanceId) return;
    (async () => {
      try {
        // 加载看板记录
        const brRes = await fetch(`/api/task-board?task_instance_id=${instanceId}`);
        const brJson = await brRes.json();
        if (brJson.data) {
          setBoardRecords(brJson.data);
          // 从已保存的补充数据初始化 extraData
          const savedExtra: Record<string, string> = {};
          for (const br of brJson.data) {
            const extras = br.extra || [];
            for (const ex of extras) {
              if (ex.column_id && ex.value != null) {
                savedExtra[`${br.id}_${ex.column_id}`] = String(ex.value);
              }
            }
          }
          setExtraData(savedExtra);
        }
      } catch { /* skip */ }
      try {
        // 加载补充列定义
        if (definitionId) {
          const ecRes = await fetch(`/api/task-board?task_def_id=${definitionId}`);
          const ecJson = await ecRes.json();
          if (ecJson.data?.columns) setExtraCols(ecJson.data.columns);
        }
      } catch { /* skip */ }
    })();
  }, [open, instanceId, definitionId]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let formRecordId = "";

      // 如果有表单字段，先提交表单数据
      const visibleColumns = fillableFields
        ? columns.filter((c) => fillableFields.includes(c.name) || fillableFields.includes(c.name.toLowerCase().replace(/\s+/g, "_")))
        : columns;

      if (visibleColumns.length > 0) {
        const res = await fetch("/api/form-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_code: formTableCode, record: formData }),
        });
        const json = await res.json();
        if (json.error) { alert("提交失败：" + json.error); setSaving(false); return; }
        if (json.data?.id) formRecordId = json.data.id;
      }

      // 关联文本/日期回写
      const linkedWritebackCols = columns.filter((c) => c.type === "linked_text" || c.type === "linked_date");
      for (const col of linkedWritebackCols) {
        const key = col.name.toLowerCase().replace(/\s+/g, "_");
        const val = formData[key];
        if (!val) continue;
        const sourceRidsKey = col.linked_source_field ? col.linked_source_field.toLowerCase().replace(/\s+/g, "_") + "_rids" : "";
        const sourceRids = sourceRidsKey ? (formData[sourceRidsKey] || "").split(",").filter(Boolean) : [];
        const manualTargetId = linkedTextTargets[col.name] || "";
        const targetIds = manualTargetId ? [manualTargetId] : sourceRids;
        if (targetIds.length === 0) continue;
        const recs = linkedRecords[col.name] || [];
        const allTargets: Array<{ pid: string; tcode: string; cname: string }> = [];
        if (col.linked_project_id && col.linked_table_code && col.linked_column_name)
          allTargets.push({ pid: String(col.linked_project_id), tcode: String(col.linked_table_code), cname: String(col.linked_column_name) });
        if (Array.isArray(col.linked_configs))
          for (const cfg of col.linked_configs)
            if (cfg.project_id && cfg.table_code && cfg.column_name)
              allTargets.push({ pid: cfg.project_id, tcode: cfg.table_code, cname: cfg.column_name });
        for (const rid of targetIds) {
          const rec = recs.find((r) => r.id === rid);
          const tgt = rec?.pid ? allTargets.find((t) => t.pid === rec.pid) : allTargets[0];
          if (!tgt) continue;
          try {
            const projRes = await fetch("/api/projects");
            const projJson = await projRes.json();
            const proj = (projJson.data || []).find((p: Record<string, unknown>) => p.id === tgt.pid);
            if (proj) {
              await fetch("/api/project-data/write", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectCode: proj.project_code, tableCode: tgt.tcode, recordId: rid, columnName: tgt.cname, value: val }),
              });
            }
          } catch { /* skip */ }
        }
      }

      // 保存看板记录的补充列数据
      if (instanceId && Object.keys(extraData).length > 0) {
        try {
          const allExtraData: Array<{ board_record_id: string; column_id: string; value: string }> = [];
          for (const br of boardRecords) {
            for (const ec of extraCols) {
              const val = extraData[`${br.id}_${ec.id}`] || "";
              allExtraData.push({ board_record_id: br.id, column_id: ec.id, value: val });
            }
          }
          if (allExtraData.length > 0) {
            await fetch("/api/task-board", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ extra_data: allExtraData }),
            });
          }
        } catch { /* skip */ }

        // 补充列写回：linked_text/linked_date 类型回写到源项目记录
        for (const ec of extraCols) {
          if (ec.type !== "linked_text" && ec.type !== "linked_date") continue;
          if (!ec.writeback_column) continue;
          for (const br of boardRecords) {
            const val = extraData[`${br.id}_${ec.id}`] || "";
            if (!val) continue;
            try {
              const projRes = await fetch("/api/projects");
              const projJson = await projRes.json();
              const proj = (projJson.data || []).find((p: Record<string, unknown>) =>
                `yuansu_${String(p.project_code || "").toLowerCase()}` === String(br.source_project_schema || "").toLowerCase()
              );
              if (proj) {
                await fetch("/api/project-data/write", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectCode: proj.project_code,
                    tableCode: br.source_table_code,
                    recordId: br.source_record_id,
                    columnName: ec.writeback_column,
                    value: val,
                  }),
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      // 处理任务实例
      if (instanceId) {
        try {
          if (isApproval) {
            // 流程型任务：推进工作流
            await fetch(`/api/todo-tasks/instances/${instanceId}/advance`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "advance",
                handler_id: currentUserId,
                handler_name: currentUserName,
                form_record_id: formRecordId || undefined,
              }),
            });
          } else {
            // 非流程型任务：直接完成
            await fetch(`/api/todo-tasks/instances/${instanceId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "completed", form_record_id: formRecordId || undefined }),
            });
          }
          window.dispatchEvent(new CustomEvent("refresh-badges"));
          window.dispatchEvent(new CustomEvent("refresh-tasks"));
        } catch { /* skip */ }
      }

      setSaved(true);
      setTimeout(() => onOpenChange(false), 1200);
    } catch { alert("提交失败"); }
    finally { setSaving(false); }
  };

  const updateField = (name: string, value: string) => { setFormData((prev) => ({ ...prev, [name]: value })); setSaved(false); };

  const renderField = (col: ColumnDef) => {
    const key = col.name.toLowerCase().replace(/\s+/g, "_");
    const baseClass = "w-full rounded-lg border-slate-200 bg-white text-sm px-3 py-2.5 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors placeholder:text-slate-300";

    // 项目记录（关联选择）— 多选复选框
    if (col.type === "linked_select") {
      const recs = linkedRecords[col.name] || [];
      const selectedValues = (formData[key] || "").split(",").filter(Boolean);
      const selectedRids = (formData[key + "_rids"] || "").split(",").filter(Boolean);
      if (recs.length > 0) {
        return (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white">
            {recs.map((rec) => {
              const isChecked = selectedValues.includes(rec.label);
              return (
                <label key={rec.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isChecked ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                  <Checkbox checked={isChecked} onCheckedChange={(v: boolean | "indeterminate") => {
                    let newVals: string[], newRids: string[];
                    if (v) { newVals = [...selectedValues, rec.label]; newRids = [...selectedRids, rec.id]; }
                    else { newVals = selectedValues.filter((x) => x !== rec.label); newRids = selectedRids.filter((x) => x !== rec.id); }
                    updateField(key, newVals.join(","));
                    updateField(key + "_rids", newRids.join(","));
                  }} />
                  <span className="text-sm text-slate-700 truncate">{rec.label}</span>
                </label>
              );
            })}
            {selectedValues.length > 0 && (
              <div className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50/50">已选 {selectedValues.length} 条</div>
            )}
          </div>
        );
      }
      return <Input value={formData[key] || ""} disabled placeholder="加载中..." className={baseClass} />;
    }

    // 关联文本
    if (col.type === "linked_text") {
      const recs = linkedRecords[col.name] || [];
      const sourceFieldName = col.linked_source_field;
      const sourceFieldKey = sourceFieldName ? sourceFieldName.toLowerCase().replace(/\s+/g, "_") + "_rids" : "";
      const sourceRids = sourceFieldKey ? (formData[sourceFieldKey] || "").split(",").filter(Boolean) : [];
      const sourceValues = sourceFieldName ? (formData[sourceFieldName.toLowerCase().replace(/\s+/g, "_")] || "").split(",").filter(Boolean) : [];
      const currentTarget = linkedTextTargets[col.name] || sourceRids.join(",") || "";
      return (
        <div className="space-y-3">
          {sourceFieldName && sourceRids.length > 0 && (
            <div className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              已关联「{sourceFieldName}」的 {sourceRids.length} 条记录
              {sourceValues.length > 0 && <span className="ml-1 text-slate-500">（{sourceValues.join("、")}）</span>}
            </div>
          )}
          <Select value={currentTarget} onValueChange={(v: string) => setLinkedTextTargets((prev) => ({ ...prev, [col.name]: v }))}>
            <SelectTrigger className={baseClass}><SelectValue placeholder="选择目标记录" /></SelectTrigger>
            <SelectContent>{recs.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}</SelectContent>
          </Select>
          <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)}
            placeholder={`输入回写内容${col.required ? " *" : ""}`} className={baseClass} />
        </div>
      );
    }

    // 关联日期
    if (col.type === "linked_date") {
      const recs = linkedRecords[col.name] || [];
      const sourceFieldName = col.linked_source_field;
      const sourceFieldKey = sourceFieldName ? sourceFieldName.toLowerCase().replace(/\s+/g, "_") + "_rids" : "";
      const sourceRids = sourceFieldKey ? (formData[sourceFieldKey] || "").split(",").filter(Boolean) : [];
      const sourceValues = sourceFieldName ? (formData[sourceFieldName.toLowerCase().replace(/\s+/g, "_")] || "").split(",").filter(Boolean) : [];
      const currentTarget = linkedTextTargets[col.name] || sourceRids.join(",") || "";
      return (
        <div className="space-y-3">
          {sourceFieldName && sourceRids.length > 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              已关联「{sourceFieldName}」的 {sourceRids.length} 条记录
              {sourceValues.length > 0 && <span className="ml-1 text-slate-500">（{sourceValues.join("、")}）</span>}
            </div>
          )}
          <Select value={currentTarget} onValueChange={(v: string) => setLinkedTextTargets((prev) => ({ ...prev, [col.name]: v }))}>
            <SelectTrigger className={baseClass}><SelectValue placeholder="选择目标记录" /></SelectTrigger>
            <SelectContent>{recs.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}</SelectContent>
          </Select>
          <Input type="date" value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)}
            className={baseClass} />
        </div>
      );
    }

    // 其他类型
    switch (col.type) {
      case "textarea":
        return <Textarea value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(key, e.target.value)}
          placeholder={`请输入${col.name}`} className={baseClass + " min-h-[100px]"} rows={4} />;
      case "select":
        if (col.options?.length)
          return <Select value={formData[key] || ""} onValueChange={(v: string) => updateField(key, v)}>
            <SelectTrigger className={baseClass}><SelectValue placeholder={`选择${col.name}`} /></SelectTrigger>
            <SelectContent>{col.options.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
          </Select>;
        return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      case "date": return <Input type="date" value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} className={baseClass} />;
      case "number": return <Input type="number" value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      case "checkbox": return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      case "user": return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      default: return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
    }
  };

  const formatDisplayValue = (value: unknown): string => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    if (typeof value === "object" && value !== null) return JSON.stringify(value);
    return String(value ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[85%] sm:max-h-[90vh] sm:h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-white shadow-2xl border-0">
        <DialogTitle className="sr-only">{instanceTitle || formTableName || "任务详情"}</DialogTitle>
        {/* 深色顶栏 */}
        <div className="shrink-0 bg-slate-800 text-white">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{instanceTitle || formTableName || "任务详情"}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-300">
                  {instanceAssignee && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{instanceAssignee}</span>}
                  {instanceDueDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{instanceDueDate}</span>}
                  {statusCfg && (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                  )}
                  {nodeName && (
                    <Badge className="bg-white/15 text-white border-white/20 text-xs">
                      {nodeOrder && totalNodes ? `${nodeOrder}/${totalNodes} ` : ""}{nodeName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* 内容区：侧边栏 + 表单 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧信息面板 */}
          <div className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* 任务信息 */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">任务信息</p>
                  <div className="space-y-3">
                    {instanceTitle && (
                      <div>
                        <p className="text-xs text-slate-400">标题</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{instanceTitle}</p>
                      </div>
                    )}
                    {instanceAssignee && (
                      <div>
                        <p className="text-xs text-slate-400">指派人</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{instanceAssignee}</p>
                      </div>
                    )}
                    {instanceDueDate && (
                      <div>
                        <p className="text-xs text-slate-400">截止日期</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{instanceDueDate}</p>
                      </div>
                    )}
                    {instanceStatus && statusCfg && (
                      <div>
                        <p className="text-xs text-slate-400">状态</p>
                        <Badge className={`text-xs mt-0.5 border ${statusCfg.color}`} variant="outline">{statusCfg.label}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* 描述 */}
                {instanceDesc && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">描述</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{instanceDesc}</p>
                  </div>
                )}

                {/* 流程节点 */}
                {nodeName && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">审批节点</p>
                      <p className="text-sm text-slate-800 font-medium">{nodeName}</p>
                      {nodeOrder && totalNodes && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {Array.from({ length: totalNodes }, (_, i) => (
                              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < nodeOrder ? "bg-indigo-500" : i === nodeOrder - 1 ? "bg-indigo-500 animate-pulse" : "bg-slate-200"}`} />
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">节点 {nodeOrder} / {totalNodes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧表单区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-8">
                {loading ? (
                  <div className="flex items-center gap-3 text-sm text-slate-400 py-24 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> 加载表单...
                  </div>
                ) : columns.length === 0 ? (
                  <div className="text-center py-24 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">暂无表单字段</p>
                  </div>
                ) : (
                  <div className="max-w-2xl space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">表单填写</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    {columns.map((col) => {
                      const isFillable = !fillableFields || fillableFields.length === 0 ||
                        fillableFields.includes(col.name) ||
                        fillableFields.includes(col.name.toLowerCase().replace(/\s+/g, "_"));
                      return (
                        <div key={col.name} className={`space-y-2 ${!isFillable ? "opacity-60" : ""}`}>
                          <Label className={`text-sm font-semibold ${isFillable ? "text-slate-700" : "text-slate-400"}`}>
                            {col.name}
                            {col.required && <span className="text-red-400 ml-1">*</span>}
                            {!isFillable && <span className="text-xs text-slate-400 ml-2 font-normal">(只读)</span>}
                          </Label>
                          {isFillable ? renderField(col) : (
                            <div className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm px-3 py-2.5 text-slate-400">
                              {formData[col.name.toLowerCase().replace(/\s+/g, "_")] || "—"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* 看板记录 — 纵向堆叠列表 + 可折叠展开 */}
              {boardRecords.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3 mb-4 px-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">项目看板记录</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{boardRecords.length} 条</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="space-y-2">
                    {boardRecords.map((br, idx) => {
                      const isExpanded = expandedRecords.has(br.id);
                      const SYSTEM_FIELDS = new Set([
                        "id", "created_at", "updated_at", "sort_order", "data_source",
                        "allow_delete", "_readonly", "_label", "project_id", "project_name",
                        "table_code", "table_name", "module_type", "module_code",
                        "schema_name", "record_id", "created_by", "updated_by",
                      ]);
                      const sourceFields = br.source_data && typeof br.source_data === "object"
                        ? Object.entries(br.source_data as Record<string, unknown>)
                            .filter(([k, v]) => !SYSTEM_FIELDS.has(k) && v != null && v !== "")
                        : [];

                      const toggleExpand = () => {
                        setExpandedRecords((prev) => {
                          const next = new Set(prev);
                          if (next.has(br.id)) next.delete(br.id);
                          else next.add(br.id);
                          return next;
                        });
                      };

                      return (
                        <div key={br.id} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                          {/* 折叠头部 */}
                          <button
                            type="button"
                            onClick={toggleExpand}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition-colors text-left"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-slate-800 truncate flex-1" title={br.source_label}>
                              {br.source_label}
                            </span>
                            {br.source_table_code && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400 border-slate-200 shrink-0">
                                {br.source_table_code}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-400 shrink-0">
                              {sourceFields.length} 字段
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>

                          {/* 展开内容 */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/30">
                              <div className="px-4 py-3">
                                {sourceFields.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {sourceFields.map(([key, value]) => {
                                      const displayValue = formatDisplayValue(value);
                                      return (
                                        <div key={key} className="flex items-start gap-2 text-xs min-w-0">
                                          <span className="text-[11px] text-slate-400 shrink-0 max-w-[40%] truncate" title={key}>{key}</span>
                                          <span className="text-slate-700 break-all min-w-0 flex-1" title={displayValue}>
                                            {displayValue.length > 100 ? displayValue.slice(0, 100) + "…" : displayValue}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-300 text-center py-2">无数据字段</p>
                                )}

                                {/* 补充列字段 */}
                                {extraCols.length > 0 && (
                                  <div className="border-t border-slate-200 pt-3 mt-3">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">补充字段</span>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                      {extraCols.map((ec) => {
                                        const dataKey = `${br.id}_${ec.id}`;
                                        const val = extraData[dataKey] || "";
                                        const inputBaseClass = "w-full text-[11px] border rounded px-2 py-1 outline-none transition-colors";
                                        const isWriteback = ec.type === "linked_text" || ec.type === "linked_date";
                                        return (
                                          <div key={ec.id}>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                                              {ec.name}
                                              {isWriteback && (
                                                <span className={`text-[9px] px-1 rounded ${ec.type === "linked_text" ? "bg-sky-50 text-sky-500" : "bg-orange-50 text-orange-500"}`}>
                                                  →{ec.writeback_column || "?"}
                                                </span>
                                              )}
                                            </span>
                                            {ec.type === "select" && ec.options?.length ? (
                                              <select value={val}
                                                onChange={(e) => setExtraData((prev) => ({ ...prev, [dataKey]: e.target.value }))}
                                                className={`${inputBaseClass} bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-200`}>
                                                <option value="">—</option>
                                                {ec.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                              </select>
                                            ) : ec.type === "date" || ec.type === "linked_date" ? (
                                              <input type="date" value={val}
                                                onChange={(e) => setExtraData((prev) => ({ ...prev, [dataKey]: e.target.value }))}
                                                className={`${inputBaseClass} bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-200`} />
                                            ) : (
                                              <input type="text" value={val}
                                                onChange={(e) => setExtraData((prev) => ({ ...prev, [dataKey]: e.target.value }))}
                                                placeholder={ec.name}
                                                className={`${inputBaseClass} bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-200`} />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* 底部操作栏 */}
            {columns.length > 0 && !loading && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-8 py-4 flex items-center gap-3">
                <Button onClick={handleSubmit} disabled={saving} size="default"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  提交
                </Button>
                {saved && (
                  <span className="text-sm text-green-600 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> 提交成功
                  </span>
                )}
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-700">
                  取消
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
