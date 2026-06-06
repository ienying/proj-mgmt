"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Building2 } from "lucide-react";
import type { FormColumn } from "./task-form-builder";

export interface BoardRecord {
  source_project_schema: string; source_project_name: string;
  source_table_code: string; source_record_id: string;
  source_label: string; source_data: Record<string, unknown>;
}
export interface ExtraColumn extends FormColumn { fillable_by?: string; }

interface Props {
  selectedProjects: string[]; onProjectsChange: (ids: string[]) => void;
  records: BoardRecord[]; onRecordsChange: (r: BoardRecord[]) => void;
  extraColumns: ExtraColumn[]; onExtraColumnsChange: (c: ExtraColumn[]) => void;
}
const MODULES = ["scope","schedule","quality","cost","collaboration","communication","risk","procurement","resource","document"];

export function TaskBoardBuilder({ selectedProjects, onProjectsChange, records, onRecordsChange, extraColumns, onExtraColumnsChange }: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string; schema: string }>>([]);
  const [bp, setBp] = useState("");
  const [bm, setBm] = useState("");
  const [bt, setBt] = useState("");
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [cols, setCols] = useState<Array<{ name: string; type: string }>>([]);
  const [tables, setTables] = useState<Array<{ code: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(d => { setProjects((d.data || []).map((p: any) => ({ id: String(p.id), name: String(p.project_name), schema: String(p.project_schema || "") }))); }).catch(() => {}); }, []);

  useEffect(() => {
    if (!bp) { setTables([]); return; }
    fetch("/api/standards").then(r => r.json()).then(d => {
      const t: Array<{ code: string; name: string }> = [];
      for (const s of (d.data || [])) { const mcs = s.module_type || []; if (bm && bm !== "__all__" && !mcs.includes(bm)) continue; t.push({ code: s.table_code, name: s.table_name || s.table_code }); }
      setTables(t);
    }).catch(() => {});
  }, [bp, bm]);

  useEffect(() => {
    if (!bp || !bt) return;
    const proj = projects.find(p => p.id === bp); if (!proj?.schema) return;
    setLoading(true);
    fetch("/api/project-data?projectSchema=" + proj.schema + "&tableCode=" + bt).then(r => r.json()).then(d => { setData(d.data || []); }).catch(() => setData([])).finally(() => setLoading(false));
    fetch("/api/standards").then(r => r.json()).then(d2 => { const def = (d2.data || []).find((s: any) => s.table_code === bt); setCols((def?.columns_config as any[]) || []); }).catch(() => {});
  }, [bp, bt, projects]);

  const sel = (rid: string) => records.some(r => r.source_record_id === rid && r.source_table_code === bt);
  const toggle = (rid: string) => {
    if (sel(rid)) { onRecordsChange(records.filter(r => !(r.source_record_id === rid && r.source_table_code === bt))); return; }
    const proj = projects.find(p => p.id === bp); const rec = data.find(r => String(r.id) === rid); if (!rec) return;
    const c0 = cols[0]; const label = c0 ? String(rec[c0.name] || rec.id) : String(rec.id);
    onRecordsChange([...records, { source_project_schema: proj?.schema || "", source_project_name: proj?.name || "", source_table_code: bt, source_record_id: rid, source_label: "[" + (proj?.name || "") + "] " + label, source_data: rec as Record<string, unknown> }]);
  };
  const toggleAll = () => { if (data.every(r => sel(String(r.id)))) { onRecordsChange(records.filter(r => r.source_table_code !== bt)); } else { const proj = projects.find(p => p.id === bp); const nr: BoardRecord[] = [...records.filter(r => r.source_table_code !== bt)]; for (const rec of data) { if (!sel(String(rec.id))) { const c0 = cols[0]; nr.push({ source_project_schema: proj?.schema || "", source_project_name: proj?.name || "", source_table_code: bt, source_record_id: String(rec.id), source_label: "[" + (proj?.name || "") + "] " + (c0 ? String(rec[c0.name] || rec.id) : String(rec.id)), source_data: rec as any }); } } onRecordsChange(nr); } };
  const addCol = () => { if (!newName.trim()) return; onExtraColumnsChange([...extraColumns, { name: newName.trim(), type: "text", required: false, sort_order: extraColumns.length, fillable_by: "anyone" }]); setNewName(""); setAdding(false); };
  const rmCol = (i: number) => onExtraColumnsChange(extraColumns.filter((_, j) => j !== i));
  const sc = data.filter(r => sel(String(r.id))).length;

  return (
    <div className="space-y-3">
      {/* 数据源栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-400 font-medium shrink-0">数据源</span>
        {projects.map(p => { const a = selectedProjects.includes(p.id); return (
          <button key={p.id} onClick={() => { onProjectsChange(a ? selectedProjects.filter(id => id !== p.id) : [...selectedProjects, p.id]); }}
            className={"flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all " + (a ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-white text-slate-500 border hover:border-slate-300")}>
            <Building2 className="w-3 h-3" />{p.name}{a && <X className="w-3 h-3 ml-0.5" />}
          </button>);
        })}
        <Select value={bm || "__all__"} onValueChange={v => { setBm(v === "__all__" ? "" : v); setBt(""); }} disabled={selectedProjects.length === 0}>
          <SelectTrigger className="h-7 text-xs w-28 bg-white"><SelectValue placeholder="模块" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">全部模块</SelectItem>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={bt} onValueChange={setBt}>
          <SelectTrigger className="h-7 text-xs w-44 bg-white"><SelectValue placeholder="选择数据表" /></SelectTrigger>
          <SelectContent>{tables.map(t => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        {bt && <span className="text-xs text-slate-400">共 {data.length} 条</span>}
      </div>

      {/* 飞书多维表格 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        {loading ? <div className="text-center py-20 text-slate-400 text-sm">加载中...</div>
        : bt && data.length > 0 ? (<>
          {/* 表头 */}
          <div className="flex items-center bg-slate-50 border-b border-slate-200 px-3 py-2 gap-3 text-xs font-medium text-slate-500">
            <div className="w-8 shrink-0"><Checkbox checked={sc === data.length && data.length > 0} onCheckedChange={toggleAll} /></div>
            {cols.slice(0, 4).map(c => <div key={c.name} className="flex-1 min-w-[100px] truncate">{c.name}</div>)}
            {extraColumns.map((c, i) => (
              <div key={"h"+i} className="flex-1 min-w-[100px] flex items-center gap-1 group">
                <span>{c.name || "未命名"}</span>
                <button onClick={() => rmCol(i)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><X className="w-3 h-3" /></button>
              </div>
            ))}
            <div className="w-24 shrink-0 text-right">来源</div>
          </div>
          {/* 数据行 */}
          <div className="divide-y divide-slate-100">
            {data.map((rec, idx) => { const rid = String(rec.id); const s = sel(rid); return (
              <div key={rid} onClick={() => toggle(rid)} className={"flex items-center px-3 py-2 gap-3 text-sm cursor-pointer transition-colors group " + (s ? "bg-blue-50/50" : "hover:bg-slate-50")}>
                <div className="w-8 shrink-0 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-300 w-4 text-right">{idx + 1}</span>
                  <Checkbox checked={s} onCheckedChange={() => {}} />
                </div>
                {cols.slice(0, 4).map(c => <div key={c.name} className="flex-1 min-w-[100px] truncate text-slate-700">{String(rec[c.name] || "-")}</div>)}
                {extraColumns.map((_, ci) => (
                  <div key={"v"+ci} className="flex-1 min-w-[100px]" onClick={e => e.stopPropagation()}>
                    <Input placeholder="-" className="h-7 text-xs border-slate-200 focus:border-blue-400 w-full rounded" />
                  </div>
                ))}
                <div className="w-24 shrink-0 text-right text-xs text-slate-400">{projects.find(p => p.id === bp)?.name || ""}</div>
              </div>
            );})}
          </div>
          {/* 底部栏 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-400">已选 <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{sc}</Badge> 条</span>
            <span className="text-slate-300">|</span>
            {extraColumns.map((c, i) => (
              <span key={"b"+i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px]">
                {c.name || "列"+(i+1)}<button onClick={() => rmCol(i)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            {adding ? (
              <span className="inline-flex items-center gap-1">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="列名" className="h-5 text-[10px] w-20 border-slate-200 rounded" autoFocus onKeyDown={e => { if (e.key === "Enter") addCol(); if (e.key === "Escape") setAdding(false); }} />
                <button onClick={addCol} className="text-blue-500 font-medium text-[10px]">确定</button>
                <button onClick={() => setAdding(false)} className="text-slate-400 text-[10px]">取消</button>
              </span>
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-0.5 text-slate-400 hover:text-blue-500 transition-colors"><Plus className="w-3 h-3" />添加列</button>
            )}
            {records.length > 0 && <button onClick={() => onRecordsChange([])} className="ml-auto text-red-400 hover:text-red-600">清空全部</button>}
          </div>
        </>) : bt ? <div className="text-center py-20 text-slate-400 text-sm">该表暂无数据</div>
        : <div className="text-center py-20 text-slate-400 text-sm">{selectedProjects.length === 0 ? "请在上方选择项目" : "选择模块和数据表开始浏览"}</div>}
      </div>
    </div>
  );
}
