"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Sparkles, Save, Trash2, ChevronDown, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AIPromptResult {
  systemMessage: string;
  userPrompt: string;
  templateId?: string;
}

interface TemplateItem {
  id: string;
  name: string;
  prompt_type: string;
  is_default: boolean;
  system_message: string;
  user_prompt: string;
  project_schema: string;
}

interface AIPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (result: AIPromptResult) => void;
  projectSchema: string;
  promptType: "global" | "single_table";
  tableName?: string;
}

const VARIABLE_LIST: Record<string, string> = {
  projectName: "项目名称",
  projectSchema: "内部 Schema 标识",
  tableName: "表显示名称",
  tableCode: "表代码",
  moduleName: "当前模块 code",
  moduleHint: "模块分析视角提示",
  moduleHintPrefix: "模块提示前缀",
  baseRules: "名称映射规则",
  tableSummaries: "表结构+样本数据",
  tableCount: "表数量",
  totalRows: "总数据行数",
};

export function AIPromptDialog({
  open,
  onOpenChange,
  onSubmit,
  projectSchema,
  promptType,
  tableName,
}: AIPromptDialogProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [systemMessage, setSystemMessage] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVars, setShowVars] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId),
    [templates, selectedId]
  );
  const isDefaultSelected = selectedTemplate?.is_default === true;

  // 内置默认模板（API 无数据时的 fallback）
  const builtinDefaults = useMemo(() => ({
    global: {
      id: "__builtin_global__",
      name: "默认全局分析",
      prompt_type: "global",
      is_default: true,
      project_schema: "",
      system_message: "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。",
      user_prompt: `你是一个项目管理数据分析专家。请分析项目【\${projectName}】的数据库内容，给出专业的分析报告。

\${baseRules}
\${moduleHint}
数据表数量: \${tableCount} | 总数据行数: \${totalRows}

各表结构与样本数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：整体数据量、表关联关系
   - 用 \`\`\`mermaid 输出一张饼图（pie），展示各表数据量占比
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少5条）
   - 如有数值对比，用 \`\`\`mermaid 输出柱状图（bar 或 xychart-beta）
3. **📈 趋势与建议**：基于数据给出项目管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况

Mermaid 图表示例格式：
\`\`\`mermaid
pie showData
    title 各表数据分布
    "进度表" : 23
    "成本表" : 5
    "风险表" : 8
\`\`\``,
    },
    single_table: {
      id: "__builtin_single__",
      name: "默认单表分析",
      prompt_type: "single_table",
      is_default: true,
      project_schema: "",
      system_message: "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。",
      user_prompt: `你是一个项目管理数据分析专家。请对项目【\${projectName}】中的【\${tableName}】表进行深入分析。

\${baseRules}
\${moduleHint}

数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：该表的数据规模、字段结构概要
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少3条）
   - 如有数值对比，用 \`\`\`mermaid 输出柱状图
3. **📈 \${moduleHintPrefix}**：基于数据分析给出具体管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况`,
    },
  } as Record<string, TemplateItem>), []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ai/prompt-templates?projectSchema=${encodeURIComponent(projectSchema)}&promptType=${promptType}`
      );
      const json = await res.json();
      const list: TemplateItem[] = json.data || [];

      // API 无数据时用内置默认
      if (list.length === 0) {
        const builtin = builtinDefaults[promptType];
        if (builtin) {
          setTemplates([builtin]);
          setSelectedId(builtin.id);
          setSystemMessage(builtin.system_message);
          setUserPrompt(builtin.user_prompt);
          return;
        }
      }

      // 排序：默认模板在前
      list.sort((a, b) => (a.is_default === b.is_default ? 0 : a.is_default ? -1 : 1));
      setTemplates(list);

      // 选中默认模板
      const def = list.find((t) => t.is_default);
      if (def && !selectedId) {
        setSelectedId(def.id);
        setSystemMessage(def.system_message || "");
        setUserPrompt(def.user_prompt || "");
      }
    } catch {
      // 网络错误时也用内置默认
      const builtin = builtinDefaults[promptType];
      if (builtin) {
        setTemplates([builtin]);
        setSelectedId(builtin.id);
        setSystemMessage(builtin.system_message);
        setUserPrompt(builtin.user_prompt);
      }
    }
  }, [projectSchema, promptType, builtinDefaults]);

  useEffect(() => {
    if (open) {
      setSelectedId("");
      setTemplateName("");
      setShowVars(false);
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  // 切换模板
  const handleSelectTemplate = (id: string) => {
    setSelectedId(id);
    const t = templates.find((tpl) => tpl.id === id);
    if (t) {
      setSystemMessage(t.system_message || "");
      setUserPrompt(t.user_prompt || "");
    }
  };

  // 另存为新模板
  const handleSaveAs = async () => {
    const name = templateName.trim();
    if (!name) { toast.error("请输入模板名称"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_schema: projectSchema,
          name,
          prompt_type: promptType,
          system_message: systemMessage,
          user_prompt: userPrompt,
        }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      toast.success("模板已保存");
      setTemplateName("");
      await fetchTemplates();
      if (json.data?.id) {
        setSelectedId(json.data.id);
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  // 保存当前模板（覆盖，仅自定义）
  const handleSave = async () => {
    if (!selectedId || isDefaultSelected) { toast.error("默认模板不可覆盖，请用另存为"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/prompt-templates?id=${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedTemplate?.name || templateName,
          system_message: systemMessage,
          user_prompt: userPrompt,
        }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      toast.success("模板已更新");
      await fetchTemplates();
    } catch {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!selectedId || isDefaultSelected) return;
    if (!confirm(`确定删除模板"${selectedTemplate?.name}"？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/prompt-templates?id=${selectedId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      toast.success("模板已删除");
      setSelectedId("");
      await fetchTemplates();
    } catch {
      toast.error("删除失败");
    } finally {
      setLoading(false);
    }
  };

  // 发送
  const handleSubmit = () => {
    onSubmit({ systemMessage, userPrompt, templateId: selectedId || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            AI 分析 · 提示词配置
          </DialogTitle>
          <DialogDescription>
            {promptType === "single_table"
              ? `单表分析模式${tableName ? ` · ${tableName}` : ""}`
              : "全局分析模式"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* 模板选择 */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium shrink-0">选择模板</Label>
            <Select value={selectedId} onValueChange={handleSelectTemplate}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="选择提示词模板..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.is_default ? " (默认)" : ""}
                    {t.project_schema ? "" : " · 全局"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="新模板名..."
              className="h-8 text-xs w-28"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shrink-0"
              onClick={handleSaveAs}
              disabled={loading || !templateName.trim()}
            >
              <Save className="w-3 h-3 mr-1" />另存为
            </Button>
          </div>

          {/* 模板操作 */}
          {selectedTemplate && !isDefaultSelected && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSave} disabled={loading}>
                <Save className="w-3 h-3 mr-1" />保存修改
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={handleDelete} disabled={loading}>
                <Trash2 className="w-3 h-3 mr-1" />删除模板
              </Button>
            </div>
          )}

          {/* System Message */}
          <div>
            <Label className="text-xs font-medium">System Message</Label>
            <Textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              className="mt-1 text-xs font-mono min-h-[60px]"
              rows={3}
            />
          </div>

          {/* User Prompt */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">User Prompt</Label>
              <button
                type="button"
                onClick={() => setShowVars(!showVars)}
                className="text-[10px] text-teal-600 hover:text-teal-800 flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3" />
                变量说明
                <ChevronDown className={cn("w-3 h-3 transition-transform", showVars && "rotate-180")} />
              </button>
            </div>

            {/* 变量列表 */}
            {showVars && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-[10px] grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(VARIABLE_LIST).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <code className="bg-teal-50 text-teal-700 px-1 rounded font-mono">{'${' + k + '}'}</code>
                    <span className="text-gray-500">{v}</span>
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="mt-1 text-xs font-mono min-h-[200px]"
              rows={12}
              placeholder="输入提示词，支持 ${variable} 变量..."
            />

            {/* 变量高亮预览 */}
            <div className="mt-2 p-2 bg-gray-50 rounded text-[11px] text-gray-600 max-h-[120px] overflow-y-auto leading-relaxed">
              {userPrompt.split(/(\$\{\w+\})/g).map((part, i) =>
                part.startsWith("${") && part.endsWith("}") ? (
                  <code key={i} className="bg-teal-100 text-teal-700 px-0.5 rounded font-mono">{part}</code>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!userPrompt.trim()} className="bg-teal-500 hover:bg-teal-600 text-white gap-1">
            <Play className="w-3.5 h-3.5" />
            发送分析
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
