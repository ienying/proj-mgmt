"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Type, List, Hash, Calendar, User, CheckSquare, FileText, Upload } from "lucide-react";

export interface FormColumn {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  options?: string[];
  sort_order: number;
}

interface FieldType {
  code: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  color: string;
}

const FIELD_TYPES: FieldType[] = [
  { code: "text", name: "文本", icon: Type, desc: "单行文本", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { code: "textarea", name: "多行文本", icon: FileText, desc: "多行输入", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { code: "number", name: "数字", icon: Hash, desc: "数字输入", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { code: "date", name: "日期", icon: Calendar, desc: "日期选择", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { code: "user", name: "用户", icon: User, desc: "系统用户", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { code: "select", name: "单选", icon: CheckSquare, desc: "下拉单选", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { code: "multiple_select", name: "多选", icon: List, desc: "多选", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { code: "file", name: "文件", icon: Upload, desc: "文件上传", color: "bg-rose-100 text-rose-700 border-rose-200" },
];

interface Props {
  columns: FormColumn[];
  onChange: (cols: FormColumn[]) => void;
  compact?: boolean;
}

export function TaskFormBuilder({ columns, onChange, compact }: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addColumn = (typeCode: string) => {
    const ft = FIELD_TYPES.find((t) => t.code === typeCode);
    onChange([...columns, {
      name: "", type: typeCode, required: false, description: "",
      options: (typeCode === "select" || typeCode === "multiple_select") ? [] : undefined,
      sort_order: columns.length,
    }]);
    setShowAddMenu(false);
  };

  const updateColumn = (idx: number, field: keyof FormColumn, value: unknown) => {
    const newCols = [...columns];
    newCols[idx] = { ...newCols[idx], [field]: value };
    onChange(newCols);
  };

  const removeColumn = (idx: number) => {
    onChange(columns.filter((_, i) => i !== idx));
  };

  const moveColumn = (from: number, dir: number) => {
    const to = from + dir;
    if (to < 0 || to >= columns.length) return;
    const newCols = [...columns];
    [newCols[from], newCols[to]] = [newCols[to], newCols[from]];
    newCols.forEach((c, i) => (c.sort_order = i));
    onChange(newCols);
  };

  if (compact) {
    // Compact mode: colorful chip list
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {columns.map((col, idx) => {
            const ft = FIELD_TYPES.find((t) => t.code === col.type);
            return (
              <div key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${ft?.color || "bg-gray-100 text-gray-700 border-gray-200"} group`}>
                {ft?.icon && <ft.icon className="w-3 h-3" />}
                <span className="font-medium">{col.name || `列${idx + 1}`}</span>
                {col.required && <span className="text-red-400">*</span>}
                <button onClick={() => removeColumn(idx)} className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-600">×</button>
              </div>
            );
          })}
          <div className="relative">
            <button onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-600">
              <Plus className="w-3 h-3" /> 添加列
            </button>
            {showAddMenu && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-lg shadow-lg p-2 w-48">
                {FIELD_TYPES.map((ft) => (
                  <button key={ft.code} onClick={() => addColumn(ft.code)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-50 ${ft.color}`}>
                    <ft.icon className="w-3.5 h-3.5" /> {ft.name}
                    <span className="text-gray-400 ml-auto text-[10px]">{ft.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full mode: table-based editor
  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={() => setShowAddMenu(!showAddMenu)}>
            <Plus className="w-3.5 h-3.5" /> 添加字段
          </Button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border rounded-xl shadow-lg p-3 w-56">
              <p className="text-[11px] font-medium text-gray-400 mb-2">选择字段类型</p>
              <div className="space-y-0.5">
                {FIELD_TYPES.map((ft) => (
                  <button key={ft.code} onClick={() => addColumn(ft.code)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${ft.color} border`}>
                      <ft.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium text-gray-700">{ft.name}</span>
                    <span className="text-[11px] text-gray-400 ml-auto">{ft.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">{columns.length} 个字段</span>
      </div>

      {/* Field table */}
      {columns.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <p className="text-sm">暂无字段</p>
          <p className="text-xs mt-1">点击「添加字段」开始构建表单</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="w-8"></th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">字段名</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 w-[130px]">类型</th>
                <th className="text-center px-2 py-2.5 text-xs font-medium text-gray-500 w-[60px]">必填</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">描述</th>
                <th className="w-[70px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {columns.map((col, idx) => {
                const ft = FIELD_TYPES.find((t) => t.code === col.type);
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 group">
                    <td className="px-1">
                      <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button onClick={() => moveColumn(idx, -1)} disabled={idx === 0}
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▲</button>
                        <button onClick={() => moveColumn(idx, 1)} disabled={idx === columns.length - 1}
                          className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none">▼</button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={col.name} onChange={(e) => updateColumn(idx, "name", e.target.value)}
                        placeholder="字段名" className="h-7 text-xs border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Select value={col.type} onValueChange={(v) => updateColumn(idx, "type", v)}>
                        <SelectTrigger className={`h-7 text-xs border-0 bg-transparent ${ft?.color || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.code} value={t.code}>
                              <span className="flex items-center gap-2">
                                <t.icon className="w-3.5 h-3.5" /> {t.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Checkbox checked={col.required} onCheckedChange={(v) => updateColumn(idx, "required", v === true)} />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input value={col.description || ""} onChange={(e) => updateColumn(idx, "description", e.target.value)}
                        placeholder="描述" className="h-7 text-xs border-transparent hover:border-gray-200 focus:border-blue-400 bg-transparent" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => removeColumn(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Options editor for select/multiple_select */}
      {columns.filter((c) => c.type === "select" || c.type === "multiple_select").map((col, idx) => {
        const realIdx = columns.indexOf(col);
        if (realIdx < 0) return null;
        return (
          <div key={idx} className="border rounded-xl p-3 bg-gray-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${FIELD_TYPES.find((t) => t.code === col.type)?.color || ""}`}>
                {FIELD_TYPES.find((t) => t.code === col.type)?.icon && (() => { const I = FIELD_TYPES.find((t) => t.code === col.type)!.icon; return <I className="w-3 h-3" />; })()}
              </span>
              <span className="text-xs font-medium text-gray-700">{col.name || `列${idx + 1}`} 选项</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(col.options || []).map((opt, oi) => (
                <span key={oi} className="inline-flex items-center gap-1 bg-white border rounded-full px-2.5 py-1 text-xs text-gray-700">
                  {opt}
                  <button onClick={() => {
                    const opts = [...(col.options || [])];
                    opts.splice(oi, 1);
                    updateColumn(realIdx, "options", opts);
                  }} className="text-gray-300 hover:text-red-500">×</button>
                </span>
              ))}
              <input
                type="text" placeholder="输入选项后回车" className="text-xs border-b border-dashed border-gray-300 bg-transparent outline-none focus:border-blue-400 w-28 py-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) { updateColumn(realIdx, "options", [...(col.options || []), val]); (e.target as HTMLInputElement).value = ""; }
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
