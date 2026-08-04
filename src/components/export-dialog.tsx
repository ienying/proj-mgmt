"use client";

import { useState, useMemo } from "react";
import {
  X, Plus, Download, ChevronDown, Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── 类型 ───
interface Project {
  id: string;
  project_name: string;
  project_code: string;
  project_schema?: string;
}

interface TableDef {
  tableCode: string;
  tableName: string;
  columns: Array<{ name: string; label: string }>;
}

interface SelectedTable {
  tableCode: string;
  tableName: string;
  columns: Array<{ name: string; label: string }>;
  selectedCols: Set<string>;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
}

// ─── 项目字段定义 ───
const PROJECT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "project_name", label: "项目名称" },
  { key: "project_code", label: "项目编号" },
  { key: "final_customer", label: "最终客户" },
  { key: "company_name", label: "客户名称" },
  { key: "project_type", label: "项目类型" },
  { key: "project_stage", label: "项目阶段" },
  { key: "project_status", label: "项目状态" },
  { key: "department", label: "所属部门" },
  { key: "role_sales", label: "销售负责人" },
  { key: "role_presales", label: "售前负责人" },
  { key: "role_market_product", label: "市场产品负责人" },
  { key: "role_project_manager", label: "项目经理" },
  { key: "customer_type", label: "客户类型" },
  { key: "deployment_mode", label: "部署模式" },
  { key: "entry_date", label: "进场时间" },
  { key: "initial_acceptance_date", label: "初验时间" },
  { key: "final_acceptance_date", label: "终验时间" },
  { key: "required_date", label: "要求时间" },
  { key: "procurement_modules", label: "采购模块" },
  { key: "procurement_amount", label: "合同总金额" },
  { key: "software_amount", label: "合同软件金额" },
  { key: "hardware_amount", label: "合同硬件金额" },
  { key: "channel_info", label: "渠道公司" },
  { key: "implementation_unit", label: "实施单位" },
  { key: "construction_units_info", label: "施工单位" },
  { key: "integration_list", label: "对接信息" },
  { key: "custom_dev_info", label: "定制化信息" },
  { key: "description", label: "项目描述" },
  { key: "created_at", label: "创建时间" },
  { key: "customer_location", label: "客户位置" },
];

const DEFAULT_FIELDS = new Set([
  "project_name", "project_code", "final_customer", "company_name",
  "project_type", "project_stage", "project_status", "department",
  "role_sales", "role_presales", "role_project_manager",
  "entry_date", "initial_acceptance_date", "final_acceptance_date",
  "procurement_modules",
]);

export function ExportDialog({ open, onClose, projects }: ExportDialogProps) {
  // ─── 导出项目（直接使用页面筛选结果） ───
  const selectedProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  // ─── 步骤② 项目字段 ───
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(DEFAULT_FIELDS));

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAllFields = (checked: boolean) => {
    if (checked) setSelectedFields(new Set(PROJECT_FIELDS.map(f => f.key)));
    else setSelectedFields(new Set());
  };

  const resetFieldsToDefault = () => setSelectedFields(new Set(DEFAULT_FIELDS));

  // ─── 步骤③ 加上项目表 ───
  const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableDef[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const loadAvailableTables = async () => {
    if (projects.length === 0) {
      toast.error("没有可导出的项目");
      return;
    }
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/projects/tables?projectIds=${Array.from(selectedProjectIds).join(",")}`);
      const json = await res.json();
      const alreadyAdded = new Set(selectedTables.map(t => t.tableCode));
      setAvailableTables((json.tables || []).filter((t: TableDef) => !alreadyAdded.has(t.tableCode)));
    } catch {
      toast.error("加载表列表失败");
    }
    setLoadingTables(false);
    setShowTablePicker(true);
  };

  const addTable = (table: TableDef) => {
    setSelectedTables(prev => [...prev, {
      tableCode: table.tableCode,
      tableName: table.tableName,
      columns: table.columns,
      selectedCols: new Set(table.columns.map(c => c.name)),
    }]);
    setAvailableTables(prev => prev.filter(t => t.tableCode !== table.tableCode));
  };

  const removeTable = (tableCode: string) => {
    setSelectedTables(prev => prev.filter(t => t.tableCode !== tableCode));
  };

  const toggleTableCol = (tableCode: string, colName: string) => {
    setSelectedTables(prev => prev.map(t => {
      if (t.tableCode !== tableCode) return t;
      const next = new Set(t.selectedCols);
      if (next.has(colName)) next.delete(colName); else next.add(colName);
      return { ...t, selectedCols: next };
    }));
  };

  const toggleAllTableCols = (tableCode: string, checked: boolean) => {
    setSelectedTables(prev => prev.map(t => {
      if (t.tableCode !== tableCode) return t;
      return { ...t, selectedCols: checked ? new Set(t.columns.map(c => c.name)) : new Set() };
    }));
  };

  // ─── 预览计算 ───
  const totalCols = selectedFields.size + selectedTables.reduce((s, t) => s + t.selectedCols.size, 0);
  const totalProjects = projects.length;

  // ─── 导出 ───
  const [exporting, setExporting] = useState(false);
  const [expandRows, setExpandRows] = useState(true);

  const handleExport = async () => {
    if (projects.length === 0) { toast.error("没有可导出的项目"); return; }
    if (selectedFields.size === 0 && selectedTables.every(t => t.selectedCols.size === 0)) {
      toast.error("请至少选择一列"); return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/projects/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectIds: Array.from(selectedProjectIds),
          projectFields: Array.from(selectedFields),
          tables: selectedTables.map(t => ({
            tableCode: t.tableCode,
            tableName: t.tableName,
            columns: t.columns.filter(c => t.selectedCols.has(c.name)),
          })).filter(t => t.columns.length > 0),
          expandRows,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "导出失败");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `项目导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败");
    }
    setExporting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white max-w-[900px] w-[95vw] max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            导出项目数据
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* 导出项目数提示 */}
          <div className="bg-blue-50 rounded-lg px-4 py-2.5 text-xs text-blue-700">
            将导出当前筛选结果中的 <strong>{projects.length}</strong> 个项目
          </div>

          {/* ─── 步骤① 项目字段 ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">①</span>
                项目信息字段
                <span className="text-xs text-slate-400 font-normal">已选 {selectedFields.size}/{PROJECT_FIELDS.length} 列</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={() => toggleAllFields(true)} className="text-xs text-blue-600 hover:underline">全选</button>
                <button onClick={() => toggleAllFields(false)} className="text-xs text-blue-600 hover:underline">全不选</button>
                <button onClick={resetFieldsToDefault} className="text-xs text-amber-600 hover:underline">恢复默认</button>
              </div>
            </div>
            <div className="border rounded p-2 grid grid-cols-4 gap-x-2 gap-y-0.5">
              {PROJECT_FIELDS.map(f => (
                <label key={f.key} className={`flex items-center gap-1.5 px-1.5 py-1 rounded cursor-pointer text-xs hover:bg-slate-50 ${selectedFields.has(f.key) ? "bg-green-50" : ""}`}>
                  <Checkbox checked={selectedFields.has(f.key)} onCheckedChange={() => toggleField(f.key)} />
                  <span className="truncate">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ─── 步骤② 加上项目数据表 ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">②</span>
                加上项目数据表
                <span className="text-xs text-slate-400 font-normal">可选</span>
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={loadAvailableTables}>
                <Plus className="w-3 h-3" /> 添加项目表
              </Button>
            </div>

            {/* 已添加的表 */}
            {selectedTables.map((t, idx) => (
              <div key={t.tableCode} className="border rounded mb-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border-b">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-800">📊 {t.tableName}</span>
                    <span className="text-[10px] text-purple-500 font-mono">{t.tableCode}</span>
                    <span className="text-[10px] text-slate-400">已选 {t.selectedCols.size}/{t.columns.length} 列</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAllTableCols(t.tableCode, t.selectedCols.size < t.columns.length)} className="text-[10px] text-blue-600 hover:underline">
                      {t.selectedCols.size < t.columns.length ? "全选" : "全不选"}
                    </button>
                    <button onClick={() => removeTable(t.tableCode)} className="text-[10px] text-red-500 hover:underline">移除</button>
                  </div>
                </div>
                <div className="p-2 grid grid-cols-4 gap-x-2 gap-y-0.5">
                  {t.columns.map(c => (
                    <label key={c.name} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer text-[11px] hover:bg-slate-50 ${t.selectedCols.has(c.name) ? "bg-purple-50" : ""}`}>
                      <Checkbox checked={t.selectedCols.has(c.name)} onCheckedChange={() => toggleTableCol(t.tableCode, c.name)} />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* 表选择器弹窗 */}
            {showTablePicker && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowTablePicker(false)}>
                <div className="bg-white w-[500px] max-h-[500px] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="text-sm font-semibold">选择数据表</h4>
                    <button onClick={() => setShowTablePicker(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  <div className="p-2 border-b">
                    <Input placeholder="搜索表名..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {loadingTables ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : availableTables.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-6">暂无可用表</div>
                    ) : (
                      availableTables
                        .filter(t => !tableSearch || t.tableName.toLowerCase().includes(tableSearch.toLowerCase()) || t.tableCode.toLowerCase().includes(tableSearch.toLowerCase()))
                        .map(t => (
                          <div key={t.tableCode} onClick={() => addTable(t)}
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-50 rounded text-xs border border-transparent hover:border-purple-200">
                            <div>
                              <span className="font-medium text-slate-700">{t.tableName}</span>
                              <span className="text-slate-400 ml-2 font-mono text-[11px]">{t.tableCode}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{t.columns.length} 列</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── 预览 ─── */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">导出预览</h3>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>{totalProjects} 个项目</span>
              <span>·</span>
              <span>{totalCols} 列</span>
              <span>·</span>
              <span>1 个 Sheet</span>
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 cursor-pointer">
              <Checkbox checked={expandRows} onCheckedChange={v => setExpandRows(!!v)} />
              有多条记录时展开为多行
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50 shrink-0">
          <span className="text-xs text-slate-400">
            {selectedTables.length > 0
              ? `将导出项目信息 + ${selectedTables.length} 张表的数据`
              : "将仅导出项目信息"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5 bg-green-600 hover:bg-green-700">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "导出中..." : "导出 Excel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
