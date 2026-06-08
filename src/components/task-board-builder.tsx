"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Building2, Layers, Table as TableIcon, Link, FileText, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { FormColumn } from "./task-form-builder";
import { TaskFormBuilder } from "./task-form-builder";

export interface BoardRecord {
  source_project_schema: string;
  source_project_name: string;
  source_table_code: string;
  source_record_id: string;
  source_label: string;
  source_data: Record<string, unknown>;
}

export interface ExtraColumn extends FormColumn {
  writeback_column?: string;
  fillable_by?: string; // "anyone" | "handler" | "creator"
}

interface Props {
  selectedProjects: string[];
  onProjectsChange: (ids: string[]) => void;
  records: BoardRecord[];
  onRecordsChange: (records: BoardRecord[]) => void;
  extraColumns: ExtraColumn[];
  onExtraColumnsChange: (cols: ExtraColumn[]) => void;
  workflowNodes?: Array<{ order: number; name: string; assignee_id: string; assignee_name: string }>;
  userList?: Array<{ id: string; name: string }>;
}

const SUPPLEMENT_TYPES = [
  { code: "text", name: "文本", icon: FileText },
  { code: "select", name: "单选", icon: FileText },
  { code: "user", name: "用户", icon: FileText },
  { code: "linked_text", name: "写回文本", icon: Link },
  { code: "linked_date", name: "写回日期", icon: Link },
];

export function TaskBoardBuilder({
  selectedProjects, onProjectsChange, records, onRecordsChange,
  extraColumns, onExtraColumnsChange, workflowNodes, userList,
}: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string; schema: string }>>([]);
  const [browseProjectId, setBrowseProjectId] = useState("");
  const [browseModule, setBrowseModule] = useState("");
  const [browseTable, setBrowseTable] = useState("");
  const [browseData, setBrowseData] = useState<Array<Record<string, unknown>>>([]);
  const [browseCols, setBrowseCols] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [moduleTables, setModuleTables] = useState<Array<{ code: string; name: string }>>([]);
  const [moduleTypes, setModuleTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [sourceTableCols, setSourceTableCols] = useState<Record<string, Array<{ name: string; type: string }>>>({});
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set());
  const [recordAssignees, setRecordAssignees] = useState<Record<string, Record<number, string>>>({});
  const getRecordAssignee = (recordId: string, nodeOrder: number) => recordAssignees[recordId]?.[nodeOrder] || "";
  const setRecordAssignee = (recordId: string, nodeOrder: number, assigneeId: string) => {
    setRecordAssignees(prev => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), [nodeOrder]: assigneeId } }));
  };

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => {
      setProjects((d.data || []).map((p: Record<string, unknown>) => ({
        id: String(p.id), name: String(p.project_name), schema: String(p.project_schema || ""),
      })));
    }).catch(() => {});
  }, []);

  const loadModuleTables = useCallback(async () => {
    if (!browseProjectId) return;
    const proj = projects.find(p => p.id === browseProjectId);
    if (!proj) return;
    try {
      const r1 = await fetch("/api/module-types");
      const allMods = (await r1.json()).data || [];
      setModuleTypes(allMods);
      const r2 = await fetch("/api/standards");
      const stds = (await r2.json()).data || [];
      const tables: Array<{ code: string; name: string }> = [];
      for (const s of stds) {
        const modCodes = s.module_type || [];
        if (browseModule && browseModule !== "__all__" && !modCodes.includes(browseModule)) continue;
        tables.push({ code: s.table_code, name: s.table_name || s.table_code });
      }
      setModuleTables(tables);
    } catch { /* ignore */ }
  }, [browseProjectId, browseModule, projects]);

  useEffect(() => { loadModuleTables(); }, [loadModuleTables]);

  const loadTableData = useCallback(async () => {
    if (!browseProjectId || !browseTable) return;
    const proj = projects.find(p => p.id === browseProjectId);
    if (!proj || !proj.schema) return;
    try {
      const r = await fetch(`/api/project-data?projectSchema=${proj.schema}&tableCode=${browseTable}`);
      const d = await r.json();
      setBrowseData(d.data || []);
      const r2 = await fetch("/api/standards");
      const stds = (await r2.json()).data || [];
      const def = stds.find((s: Record<string, unknown>) => s.table_code === browseTable);
      const cols = (def?.columns_config as Array<{ name: string; type: string }>) || [];
      setBrowseCols(cols);
      setVisibleCols(new Set(cols.map(c => c.name)));
      // 缓存列信息供回写文本使用
      if (def?.columns_config) {
        setSourceTableCols(prev => { if (prev[browseTable]) return prev; return { ...prev, [browseTable]: def.columns_config as Array<{ name: string; type: string }> }; });
      }
    } catch { setBrowseData([]); }
  }, [browseProjectId, browseTable, projects]);

  useEffect(() => { loadTableData(); }, [loadTableData]);

  const addSelectedRecords = () => {
    const proj = projects.find(p => p.id === browseProjectId);
    const newRecords: BoardRecord[] = [];
    for (const rec of browseData) {
      if (selectedRecordIds.has(String(rec.id))) {
        const label = browseCols.length > 0 ? String(rec[browseCols[0].name] || rec.id) : String(rec.id);
        newRecords.push({
          source_project_schema: proj?.schema || "",
          source_project_name: proj?.name || "",
          source_table_code: browseTable,
          source_record_id: String(rec.id),
          source_label: `[${proj?.name || ""}] ${label}`,
          source_data: rec as Record<string, unknown>,
        });
      }
    }
    if (newRecords.length === 0) { toast.warning("请先勾选记录"); return; }
    onRecordsChange([...records, ...newRecords]);
    setSelectedRecordIds(new Set());
    // 加载该表的列信息，供写回列下拉使用
    if (!sourceTableCols[browseTable]) {
      fetch("/api/standards").then(r => r.json()).then(d => {
        const def = (d.data || []).find((s: Record<string, unknown>) => s.table_code === browseTable);
        if (def?.columns_config) {
          setSourceTableCols(prev => ({ ...prev, [browseTable]: (def.columns_config as Array<{ name: string; type: string }>) }));
        }
      }).catch(() => {});
    }
    toast.success(`已添加 ${newRecords.length} 条记录`);
  };

  const removeRecord = (idx: number) => {
    onRecordsChange(records.filter((_, i) => i !== idx));
  };

  const addExtraColumn = (typeCode: string) => {
    const col: ExtraColumn = {
      name: "", type: typeCode, required: false, sort_order: extraColumns.length,
      options: typeCode === "select" ? [] : undefined,
      writeback_column: (typeCode === "linked_text" || typeCode === "linked_date") ? "" : undefined,
      fillable_by: "anyone",
    };
    onExtraColumnsChange([...extraColumns, col]);
  };

  const updateExtraColumn = (idx: number, field: string, value: unknown) => {
    const newCols = [...extraColumns];
    newCols[idx] = { ...newCols[idx], [field]: value };
    onExtraColumnsChange(newCols);
  };

  const removeExtraColumn = (idx: number) => {
    onExtraColumnsChange(extraColumns.filter((_, i) => i !== idx));
  };

  const formatCellValue = (val: unknown, type: string) => {
    if (val == null || val === "") return "-";
    if (type === "date") {
      try {
        const d = new Date(String(val));
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch { /* fall through */ }
    }
    return String(val);
  };

  return (
    <div className="space-y-4">
      {/* 选择项目 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <Label className="text-xs font-medium">选择项目（可多选）</Label>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-gray-300 cursor-help hover:text-gray-500" /></TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                确定本次任务关联哪些项目，后续浏览拉记录时只在这些项目里选
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => (
            <label key={p.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border hover:border-blue-300">
              <Checkbox checked={selectedProjects.includes(p.id)}
                onCheckedChange={(c) => {
                  if (c) onProjectsChange([...selectedProjects, p.id]);
                  else onProjectsChange(selectedProjects.filter(id => id !== p.id));
                }} />
              <Building2 className="w-3 h-3 text-gray-400" />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      {/* 浏览拉取记录 */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
        <p className="text-xs font-medium text-slate-500">浏览数据</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={browseProjectId} onValueChange={v => { setBrowseProjectId(v); setBrowseModule(""); setBrowseTable(""); }} disabled={selectedProjects.length === 0}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder={selectedProjects.length === 0 ? "请先勾选项目" : "选项目"} /></SelectTrigger>
            <SelectContent>
              {projects.filter(p => selectedProjects.includes(p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={browseModule || "__all__"} onValueChange={v => { setBrowseModule(v === "__all__" ? "" : v); setBrowseTable(""); }}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="选模块" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部模块</SelectItem>
              {moduleTypes.map(m =>
                <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={browseTable} onValueChange={setBrowseTable}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="选表" /></SelectTrigger>
            <SelectContent>
              {moduleTables.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={addSelectedRecords}>
            <Plus className="w-3 h-3 mr-1" /> 加入看板
          </Button>
        </div>
        {browseTable && browseCols.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {browseCols.map(col => (
              <label key={col.name} className="flex items-center gap-1 text-[10px] cursor-pointer px-1.5 py-0.5 rounded hover:bg-gray-100">
                <Checkbox checked={visibleCols.has(col.name)} onCheckedChange={(c) => {
                  const next = new Set(visibleCols);
                  c ? next.add(col.name) : next.delete(col.name);
                  setVisibleCols(next);
                }} />
                {col.name}
              </label>
            ))}
          </div>
        )}
        {browseTable && browseData.length > 0 && (
          <div className="max-h-64 overflow-auto border rounded bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  {browseCols.filter(col => visibleCols.has(col.name)).map(col => (
                    <th key={col.name} className="text-left px-2 py-2 font-medium text-slate-500 whitespace-nowrap">{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {browseData.map(rec => (
                  <tr key={String(rec.id)} className="hover:bg-slate-50">
                    <td className="px-2 py-1.5">
                      <Checkbox checked={selectedRecordIds.has(String(rec.id))}
                        onCheckedChange={(c) => {
                          const next = new Set(selectedRecordIds);
                          c ? next.add(String(rec.id)) : next.delete(String(rec.id));
                          setSelectedRecordIds(next);
                        }} />
                    </td>
                    {browseCols.filter(col => visibleCols.has(col.name)).map(col => (
                      <td key={col.name} className="px-2 py-1.5 text-slate-600 truncate max-w-[200px]" title={formatCellValue(rec[col.name], col.type)}>
                        {formatCellValue(rec[col.name], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 看板 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">看板（{records.length} 条记录）</Label>
          {records.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-red-400" onClick={() => onRecordsChange([])}>清空</Button>
          )}
        </div>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-slate-300 rounded-xl">
            还没有记录，请从上方项目中选择记录加入看板
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-w-full">
            <table className="text-xs w-max border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 text-left px-2 py-1.5 text-xs font-medium text-slate-500 w-6">#</th>
                  <th className="sticky left-6 z-10 bg-slate-50 text-left px-2 py-1.5 text-xs font-medium text-slate-500 w-[140px]">记录</th>
                  {extraColumns.map((col, i) => (
                    <th key={i} className="text-left px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap w-[100px]">
                      {col.name || `列${i + 1}`}
                      {(col.type === "linked_text" || col.type === "linked_date") && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4">写回</Badge>}
                    </th>
                  ))}
                  {workflowNodes && workflowNodes.filter(n => n.name.trim()).map(node => (
                    <th key={`wf-h-${node.order}`} className="text-left px-2 py-1.5 font-medium text-amber-700 bg-amber-50/50 whitespace-nowrap w-[130px]">
                      {node.name}
                    </th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="sticky left-6 z-10 bg-white px-2 py-1.5 text-slate-700 truncate" title={rec.source_label}>{rec.source_label}</td>
                    {extraColumns.map((_, ci) => <td key={ci} className="px-2 py-1 text-gray-300 text-center">-</td>)}
                    {workflowNodes && workflowNodes.filter(n => n.name.trim()).map(node => {
                      const defaultName = node.assignee_name || (userList?.find(u => u.id === node.assignee_id)?.name) || "未指定";
                      const overrideId = getRecordAssignee(rec.source_record_id, node.order);
                      const displayName = overrideId ? (userList?.find(u => u.id === overrideId)?.name || defaultName) : defaultName;
                      return (
                        <td key={`wf-${node.order}`} className="px-1 py-1" onClick={e => e.stopPropagation()}>
                          <select value={overrideId || node.assignee_id} onChange={e => setRecordAssignee(rec.source_record_id, node.order, e.target.value)}
                            className="text-[11px] border border-gray-200 rounded px-1 py-0.5 w-[120px] bg-white hover:border-amber-300 focus:border-amber-400 outline-none truncate">
                            <option value={node.assignee_id}>{defaultName}</option>
                            {userList?.filter(u => u.id !== node.assignee_id).map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}

                    <td className="px-1">
                      <button onClick={() => removeRecord(idx)} className="text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 补充列 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">补充列</Label>
        {extraColumns.map((col, idx) => (
          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-white text-xs">
            <input value={col.name} onChange={(e) => updateExtraColumn(idx, "name", e.target.value)}
              placeholder="列名" className="w-48 px-2 py-1 border rounded text-xs outline-none focus:border-blue-400" />
            <span className="text-gray-400 text-[11px]">{SUPPLEMENT_TYPES.find(t => t.code === col.type)?.name || col.type}</span>
            {(col.type === "linked_text" || col.type === "linked_date") && (
              <>
                <div className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1 -mt-1 mb-1">
                  <TooltipProvider><Tooltip delayDuration={300}><TooltipTrigger asChild><span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 cursor-help">回写文本 <HelpCircle className="w-3 h-3" /></span></TooltipTrigger><TooltipContent side="top" className="max-w-[300px] text-xs leading-relaxed"><p>回写文本允许审批人在表单中填写内容，提交后自动写入到关联项目表的对应记录字段。</p><p className="text-gray-400 mt-1">例如：审批人填写"审批意见"，提交后自动更新到需求表中对应记录的"审批意见"列。</p></TooltipContent></Tooltip></TooltipProvider>
                </div>
                <span className="text-gray-300">→</span>
                <Select value={col.writeback_column || ""} onValueChange={(v) => updateExtraColumn(idx, "writeback_column", v)}>
                  <SelectTrigger className="h-7 text-xs w-56">
                    <SelectValue placeholder="选择写回目标列" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const allCols: Array<{ name: string; table: string }> = [];
                      const seenTables = new Set(records.map(r => r.source_table_code));
                      for (const tc of seenTables) {
                        for (const c of (sourceTableCols[tc] || [])) {
                          if (!["id","created_at","updated_at","sort_order","data_source","allow_delete","_readonly"].includes(c.name)) {
                            allCols.push({ name: c.name, table: tc });
                          }
                        }
                      }
                      const uniqueCols = [...new Map(allCols.map(c => [c.name, c])).values()];
                      return uniqueCols.map(c => (
                        <SelectItem key={`${c.table}.${c.name}`} value={c.name}>{c.name}<span className="text-[10px] text-gray-400 ml-1">({c.table})</span></SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </>
            )}
            <button onClick={() => removeExtraColumn(idx)} className="ml-auto text-red-400 hover:text-red-600 p-1">×</button>
          </div>
        ))}
        <div className="flex gap-1.5">
          {SUPPLEMENT_TYPES.map(ft => (
            <button key={ft.code} onClick={() => addExtraColumn(ft.code)}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors">
              <Plus className="w-3 h-3" /> {ft.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
