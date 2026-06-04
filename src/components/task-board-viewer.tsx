"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import type { ExtraColumn } from "./task-board-builder";

interface BoardRecord {
  id: string;
  source_label: string;
  source_project_schema: string;
  source_table_code: string;
  source_record_id: string;
  source_data: Record<string, unknown>;
  extra: Array<{ id: string; column_id: string; value: string }>;
}

interface Props {
  taskInstanceId: string;
  columns: ExtraColumn[];
  readOnly?: boolean;
  fillableFields?: string[];
  userList?: { id: string; name: string }[];
  onSave?: (records: BoardRecord[]) => Promise<void>;
}

export function TaskBoardViewer({
  taskInstanceId, columns, readOnly, fillableFields, userList = [], onSave,
}: Props) {
  const [records, setRecords] = useState<BoardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    loadData();
  }, [taskInstanceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/task-board?task_instance_id=${taskInstanceId}`);
      const d = await r.json();
      const recs = (d.data || []) as BoardRecord[];
      setRecords(recs);
      // 初始化本地值
      const vals: Record<string, Record<string, string>> = {};
      for (const rec of recs) {
        vals[rec.id] = {};
        for (const ext of rec.extra || []) {
          vals[rec.id][ext.column_id] = ext.value || "";
        }
      }
      setLocalValues(vals);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  const updateValue = (recordId: string, columnId: string, value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [recordId]: { ...(prev[recordId] || {}), [columnId]: value },
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(records);
      toast.success("保存成功");
    } catch { toast.error("保存失败"); }
    finally { setSaving(false); }
  };

  const isFieldFillable = (colName: string) => {
    if (!fillableFields || fillableFields.length === 0) return !readOnly;
    return fillableFields.includes(colName);
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{records.length} 条记录 · {columns.length} 列</span>
        {!readOnly && onSave && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
            <Save className="w-3 h-3 mr-1" /> {saving ? "保存中..." : "保存"}
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 py-1.5 w-8 text-gray-500">#</th>
              <th className="text-left px-2 py-1.5 text-gray-500">记录来源</th>
              {columns.map((col, i) => (
                <th key={i} className="text-left px-2 py-1.5 text-gray-500 min-w-[120px]">
                  {col.name || `列${i + 1}`}
                  {col.type === "linked_text" && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4">写回</Badge>}
                  {!isFieldFillable(col.name) && readOnly !== false && (
                    <Eye className="w-3 h-3 inline ml-1 text-gray-300" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((rec, idx) => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="px-2 py-1 text-gray-400">{idx + 1}</td>
                <td className="px-2 py-1 truncate max-w-[180px]" title={rec.source_label}>
                  <Building2 className="w-3 h-3 inline mr-1 text-gray-300" />
                  {rec.source_label}
                </td>
                {columns.map((col, ci) => {
                  const colId = col.sort_order !== undefined ? String(col.sort_order) : String(ci);
                  const val = localValues[rec.id]?.[colId] || "";
                  const canEdit = isFieldFillable(col.name) && !readOnly;

                  return (
                    <td key={ci} className="px-2 py-1">
                      {!canEdit ? (
                        <span className="text-gray-500">{val || "-"}</span>
                      ) : col.type === "select" && col.options?.length ? (
                        <Select value={val} onValueChange={(v) => updateValue(rec.id, colId, v)}>
                          <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="选择" /></SelectTrigger>
                          <SelectContent>{(col.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : col.type === "user" ? (
                        <div className="w-32">
                          {/* Simple user select fallback */}
                          <Select value={val} onValueChange={(v) => updateValue(rec.id, colId, v)}>
                            <SelectTrigger className="h-6 text-xs"><SelectValue placeholder="选用户" /></SelectTrigger>
                            <SelectContent>
                              {userList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Input value={val} onChange={(e) => updateValue(rec.id, colId, e.target.value)}
                          placeholder="填写" className="h-6 text-xs w-full min-w-[80px]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
