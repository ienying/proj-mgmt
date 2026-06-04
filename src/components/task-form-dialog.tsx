"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Calendar, User, FileText, Send } from "lucide-react";

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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待完成", color: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700 border-green-200" },
  overdue: { label: "已逾期", color: "bg-red-100 text-red-700 border-red-200" },
};

export function TaskFormDialog({ open, onOpenChange, formTableCode, formTableName, instanceTitle, instanceDesc, instanceDueDate, instanceStatus, instanceAssignee, instanceId }: TaskFormDialogProps) {
  const statusCfg = instanceStatus ? STATUS_MAP[instanceStatus] || STATUS_MAP.pending : null;
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [linkedOptions, setLinkedOptions] = useState<Record<string, string[]>>({});
  const [linkedRecords, setLinkedRecords] = useState<Record<string, Array<{ id: string; label: string; pid?: string }>>>({});
  const [linkedTextTargets, setLinkedTextTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !formTableCode) return;
    setLoading(true);
    setSaved(false);
    setFormData({});
    fetch("/api/standards")
      .then((r) => r.json())
      .then(async (d) => {
        if (d.data) {
          const def = (d.data as Array<Record<string, unknown>>).find(
            (t) => t.table_code === formTableCode
          );
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

            // 加载关联字段的运行时数据（支持多项目）
            const linkedCols = rawCols.filter((c) => c.type === "linked_select" || c.type === "linked_text");
            if (linkedCols.length > 0) {
              const newLinkedOpts: Record<string, string[]> = {};
              const newLinkedRecs: Record<string, Array<{ id: string; label: string; pid: string }>> = {};
              for (const lc of linkedCols) {
                const targets: Array<{ pid: string; tcode: string; cname: string; rids: string[] }> = [];
                if (lc.linked_project_id && lc.linked_table_code && lc.linked_column_name) {
                  targets.push({ pid: String(lc.linked_project_id), tcode: String(lc.linked_table_code), cname: String(lc.linked_column_name), rids: (lc.linked_record_ids as string[]) || [] });
                }
                if (Array.isArray(lc.linked_configs)) {
                  for (const cfg of lc.linked_configs) {
                    if (cfg.project_id && cfg.table_code && cfg.column_name) {
                      targets.push({ pid: cfg.project_id, tcode: cfg.table_code, cname: cfg.column_name, rids: cfg.record_ids || [] });
                    }
                  }
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
                      })).filter((r) => r.id);
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

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/form-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_code: formTableCode, record: formData }),
      });
      const json = await res.json();
      if (json.error) {
        alert("提交失败：" + json.error);
        setSaving(false);
        return;
      }

      // 关联文本回写（支持多目标多项目）
      const linkedTextCols = columns.filter((c) => c.type === "linked_text");
      for (const col of linkedTextCols) {
        const key = col.name.toLowerCase().replace(/\s+/g, "_");
        const val = formData[key];
        if (!val) continue;
        // 获取所有回写目标
        const sourceRidsKey = col.linked_source_field ? col.linked_source_field.toLowerCase().replace(/\s+/g, "_") + "_rids" : "";
        const sourceRids = sourceRidsKey ? (formData[sourceRidsKey] || "").split(",").filter(Boolean) : [];
        const manualTargetId = linkedTextTargets[col.name] || "";
        const targetIds = manualTargetId ? [manualTargetId] : sourceRids;
        if (targetIds.length === 0) continue;
        // 从所有关联目标中查找每条记录对应的项目和表
        const recs = linkedRecords[col.name] || [];
        const allTargets: Array<{ pid: string; tcode: string; cname: string }> = [];
        if (col.linked_project_id && col.linked_table_code && col.linked_column_name) {
          allTargets.push({ pid: String(col.linked_project_id), tcode: String(col.linked_table_code), cname: String(col.linked_column_name) });
        }
        if (Array.isArray(col.linked_configs)) {
          for (const cfg of col.linked_configs) {
            if (cfg.project_id && cfg.table_code && cfg.column_name) {
              allTargets.push({ pid: cfg.project_id, tcode: cfg.table_code, cname: cfg.column_name });
            }
          }
        }
        for (const rid of targetIds) {
          const rec = recs.find((r) => r.id === rid);
          const tgt = rec?.pid ? allTargets.find((t) => t.pid === rec.pid) : allTargets[0];
          if (!tgt) continue;
          try {
            const projRes = await fetch("/api/projects");
            const projJson = await projRes.json();
            const proj = (projJson.data || []).find((p: Record<string, unknown>) => p.id === tgt.pid);
            if (proj) {
              await fetch("/api/project-data/write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectCode: proj.project_code,
                  tableCode: tgt.tcode,
                  recordId: rid,
                  columnName: tgt.cname,
                  value: val,
                }),
              });
            }
          } catch { /* skip */ }
        }
      }

      // 自动完成关联的任务实例
      if (instanceId) {
        try {
          await fetch(`/api/todo-tasks/instances/${instanceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "completed" }),
          });
          window.dispatchEvent(new CustomEvent("refresh-badges"));
          window.dispatchEvent(new CustomEvent("refresh-tasks"));
        } catch { /* skip */ }
      }

      setSaved(true);
      setTimeout(() => onOpenChange(false), 1200);
    } catch {
      alert("提交失败");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const renderField = (col: ColumnDef) => {
    const key = col.name.toLowerCase().replace(/\s+/g, "_");
    const baseClass = "text-sm border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200";

    // 关联文本：支持多目标回写（从关联来源字段的多选记录）
    if (col.type === "linked_text") {
      const recs = linkedRecords[col.name] || [];
      const sourceFieldName = col.linked_source_field;
      const sourceFieldKey = sourceFieldName ? sourceFieldName.toLowerCase().replace(/\s+/g, "_") + "_rids" : "";
      const sourceRids = sourceFieldKey ? (formData[sourceFieldKey] || "").split(",").filter(Boolean) : [];
      const sourceValues = sourceFieldName ? (formData[sourceFieldName.toLowerCase().replace(/\s+/g, "_")] || "").split(",").filter(Boolean) : [];
      const currentTarget = linkedTextTargets[col.name] || sourceRids.join(",") || "";
      return (
        <div className="space-y-2">
          {sourceFieldName && sourceRids.length > 0 && (
            <p className="text-[10px] text-indigo-500 bg-indigo-50 rounded px-2 py-1">
              已关联「{sourceFieldName}」的 {sourceRids.length} 条选中记录
              {sourceValues.length > 0 && <span className="ml-1">（{sourceValues.join("、")}）</span>}
              ，将回写到对应行
            </p>
          )}
          <Select value={currentTarget} onValueChange={(v: string) => setLinkedTextTargets((prev) => ({ ...prev, [col.name]: v }))}>
            <SelectTrigger className={baseClass}><SelectValue placeholder="选择目标记录" /></SelectTrigger>
            <SelectContent>
              {recs.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)}
            placeholder={`输入回写内容${col.required ? " *" : ""}`} className={baseClass} />
        </div>
      );
    }

    // 关联选择：多选模式，同时记录所选记录ID（供关联文本回写使用）
    if (col.type === "linked_select") {
      const recs = linkedRecords[col.name] || [];
      const selectedValues = (formData[key] || "").split(",").filter(Boolean);
      const selectedRids = (formData[key + "_rids"] || "").split(",").filter(Boolean);
      if (recs.length > 0) {
        return (
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1 bg-white">
            {recs.map((rec) => {
              const isChecked = selectedValues.includes(rec.label);
              return (
                <label key={rec.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(v: boolean | "indeterminate") => {
                      let newVals: string[], newRids: string[];
                      if (v) {
                        newVals = [...selectedValues, rec.label];
                        newRids = [...selectedRids, rec.id];
                      } else {
                        newVals = selectedValues.filter((x) => x !== rec.label);
                        newRids = selectedRids.filter((x) => x !== rec.id);
                      }
                      updateField(key, newVals.join(","));
                      updateField(key + "_rids", newRids.join(","));
                    }}
                  />
                  <span className="truncate">{rec.label}</span>
                </label>
              );
            })}
            {selectedValues.length > 0 && (
              <p className="text-[10px] text-gray-400 pt-1">已选 {selectedValues.length} 条</p>
            )}
          </div>
        );
      }
      return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`${col.name}（加载中...）`} className={baseClass} disabled />;
    }

    switch (col.type) {
      case "textarea":
        return (
          <Textarea value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(key, e.target.value)}
            placeholder={`请输入${col.name}`} className={baseClass} rows={3} />
        );
      case "select":
        if (col.options?.length) {
          return (
            <Select value={formData[key] || ""} onValueChange={(v: string) => updateField(key, v)}>
              <SelectTrigger className={baseClass}><SelectValue placeholder={`选择${col.name}`} /></SelectTrigger>
              <SelectContent>{col.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
            </Select>
          );
        }
        return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      case "date":
        return <Input type="date" value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} className={baseClass} />;
      case "number":
        return <Input type="number" value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
      default:
        return <Input value={formData[key] || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(key, e.target.value)} placeholder={`请输入${col.name}`} className={baseClass} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80%] max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* 浅色渐变顶栏 */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-8 py-6 text-white">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight text-white">
              {instanceTitle || formTableName || "任务详情"}
            </DialogTitle>
            {formTableName && instanceTitle && (
              <DialogDescription className="text-white/70">表单：{formTableName}</DialogDescription>
            )}
          </DialogHeader>

          {/* 任务信息行 */}
          {(instanceAssignee || instanceDueDate || instanceStatus || instanceDesc) && (
            <div className="flex items-center gap-4 mt-4 flex-wrap text-sm text-white/80">
              {instanceAssignee && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                  <User className="w-3.5 h-3.5" />
                  {instanceAssignee}
                </span>
              )}
              {instanceDueDate && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                  <Calendar className="w-3.5 h-3.5" />
                  截止 {instanceDueDate}
                </span>
              )}
              {instanceStatus && statusCfg && (
                <Badge className="bg-white/20 text-white border-white/20 text-xs" variant="outline">
                  {statusCfg.label}
                </Badge>
              )}
              {instanceDesc && (
                <span className="inline-flex items-center gap-1.5 opacity-80 text-xs max-w-md truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {instanceDesc}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-gray-400 py-24 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              加载表单...
            </div>
          ) : columns.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">暂无表单字段</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">表单填写</span>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {columns.map((col) => {
                  const isWide = col.type === "textarea";
                  return (
                    <div key={col.name} className={isWide ? "col-span-2" : ""}>
                      <Card className="shadow-none border-gray-200/80 hover:border-gray-300/80 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            {col.name}
                            {col.required && <span className="text-red-400 ml-1">*</span>}
                          </Label>
                          {renderField(col)}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {columns.length > 0 && (
          <div className="shrink-0 border-t bg-gray-50/80 px-8 py-4 flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={saving} size="default"
              className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              提交
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 提交成功
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
