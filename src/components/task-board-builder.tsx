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
}

const SUPPLEMENT_TYPES = [
  { code: "text", name: "文本", icon: FileText },
  { code: "select", name: "单选", icon: FileText },
  { code: "user", name: "用户", icon: FileText },
  { code: "linked_text", name: "写回文本", icon: Link },
];

export function TaskBoardBuilder({
  selectedProjects, onProjectsChange, records, onRecordsChange,
  extraColumns, onExtraColumnsChange,
}: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string; schema: string }>>([]);
  const [browseProjectId, setBrowseProjectId] = useState("");
  const [browseModule, setBrowseModule] = useState("");
  const [browseTable, setBrowseTable] = useState("");
  const [browseData, setBrowseData] = useState<Array<Record<string, unknown>>>([]);
  const [browseCols, setBrowseCols] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [moduleTables, setModuleTables] = useState<Array<{ code: string; name: string }>>([]);
  const [sourceTableCols, setSourceTableCols] = useState<Record<string, Array<{ name: string; type: string }>>>({});

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
      setBrowseCols((def?.columns_config as Array<{ name: string; type: string }>) || []);
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
      writeback_column: typeCode === "linked_text" ? "" : undefined,
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
              {["scope","schedule","quality","cost","collaboration","communication","risk","procurement","resource","document"].map(m =>
                <SelectItem key={m} value={m}>{m}</SelectItem>
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
        {browseTable && browseData.length > 0 && (
          <div className="max-h-48 overflow-y-auto border rounded bg-white">
            {browseData.map(rec => (
              <label key={String(rec.id)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
                <Checkbox checked={selectedRecordIds.has(String(rec.id))}
                  onCheckedChange={(c) => {
                    const next = new Set(selectedRecordIds);
                    c ? next.add(String(rec.id)) : next.delete(String(rec.id));
                    setSelectedRecordIds(next);
                  }} />
                <span className="truncate">{browseCols.length > 0 ? String(rec[browseCols[0].name] || rec.id) : String(rec.id)}</span>
              </label>
            ))}
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
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 w-8">#</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">记录</th>
                  {extraColumns.map((col, i) => (
                    <th key={i} className="text-left px-2 py-1.5 font-medium text-gray-500">
                      {col.name || `列${i + 1}`}
                      {col.type === "linked_text" && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4">写回</Badge>}
                    </th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-slate-700 truncate max-w-[250px]" title={rec.source_label}>{rec.source_label}</td>
                    {extraColumns.map((_, ci) => <td key={ci} className="px-2 py-1 text-gray-300">-</td>)}
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
              placeholder="列名" className="w-24 px-2 py-1 border rounded text-xs outline-none focus:border-blue-400" />
            <span className="text-gray-400 text-[11px]">{SUPPLEMENT_TYPES.find(t => t.code === col.type)?.name || col.type}</span>
            {col.type === "linked_text" && (
              <>
                <span className="text-gray-300">→</span>
                <Select value={col.writeback_column || ""} onValueChange={(v) => updateExtraColumn(idx, "writeback_column", v)}>
                  <SelectTrigger className="h-7 text-xs w-36">
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
