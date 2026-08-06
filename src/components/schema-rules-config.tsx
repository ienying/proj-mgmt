"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { X, HelpCircle, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  Database,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface SchemaRule {
  id: string;
  rule_name: string;
  rule_type: 'type_stage' | 'module';
  project_type: string | null;
  project_stage: string | null;
  project_status: string | null;
  project_type_list?: string[] | null;
  project_status_list?: string[] | null;
  deployment_mode_list?: string[] | null;
  module_codes: string[];
  table_definitions: string[];
  is_enabled: boolean;
  sort_order: number;
  description?: string;
  created_at: string;
}

interface TableDefinition {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
}

interface ProjectType {
  code: string;
  name: string;
}

interface ProjectStage {
  code: string;
  name: string;
}

interface ProjectStatus {
  code: string;
  name: string;
  color: string;
}

interface ProductModule {
  code: string;
  module_name: string;
  product_name: string;
}

interface SchemaRulesConfigProps {
  projectTypes: ProjectType[];
  projectStages: ProjectStage[];
}

export function SchemaRulesConfig({ projectTypes, projectStages }: SchemaRulesConfigProps) {
  const [rules, setRules] = useState<SchemaRule[]>([]);
  const [tableDefinitions, setTableDefinitions] = useState<TableDefinition[]>([]);
  const [productModules, setProductModules] = useState<ProductModule[]>([]);
  const [projectStatuses, setLocalProjectStatuses] = useState<ProjectStatus[]>([]);
  const [deploymentModes, setDeploymentModes] = useState<{code:string;name:string}[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<SchemaRule>>({
    rule_name: "",
    rule_type: "type_stage",
    project_type: null,
    project_stage: null,
    project_status: null,
    project_type_list: null,
    project_status_list: null,
    deployment_mode_list: [] as string[],
    module_codes: [],
    table_definitions: [],
    is_enabled: true,
    sort_order: 0,
    description: "",
  });

  // 加载规则列表
  const loadRules = async () => {
    try {
      const response = await fetch("/api/schema-rules");
      if (response.ok) {
        const data = await response.json();
        setRules(data.data || []);
      }
    } catch (error) {
      console.error("加载规则失败:", error);
    }
  };

  // 加载规范表定义
  const loadTableDefinitions = async () => {
    try {
      const response = await fetch("/api/standards");
      if (response.ok) {
        const data = await response.json();
        setTableDefinitions(data.data || []);
      }
    } catch (error) {
      console.error("加载规范表失败:", error);
    }
  };

  // 加载产品目录
  const loadProductModules = async () => {
    try {
      const response = await fetch("/api/dicts?type=product_module_types");
      if (response.ok) {
        const data = await response.json();
        setProductModules(data.data || []);
      }
    } catch (error) {
      console.error("加载产品目录失败:", error);
    }
  };

  // 加载项目状态
  const loadProjectStatuses = async () => {
    try {
      const response = await fetch("/api/dicts?type=project_statuses");
      if (response.ok) {
        const data = await response.json();
        setLocalProjectStatuses(data.data || []);
      }
    } catch (error) {
      console.error("加载项目状态失败:", error);
    }
  };

  useEffect(() => {
    loadRules();
    loadTableDefinitions();
    loadProductModules();
    loadProjectStatuses();
    fetch("/api/dicts?type=deployment_modes").then(r=>r.json()).then(d=>{ if(d.data) setDeploymentModes(d.data); }).catch(()=>{});
  }, []);

  const openCreateDrawer = () => {
    setEditingId(null);
    setFormData({
      rule_name: "",
      rule_type: "type_stage",
      project_type: null,
      project_stage: null,
      project_status: null,
      project_type_list: null,
      project_status_list: null,
      deployment_mode_list: [],
      module_codes: [],
      table_definitions: [],
      is_enabled: true,
      sort_order: rules.length,
      description: "",
    });
    setModuleSearch("");
    setTableSearch("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (rule: SchemaRule) => {
    setEditingId(rule.id);
    setFormData({
      ...rule,
      module_codes: rule.module_codes || [],
    });
    setModuleSearch("");
    setTableSearch("");
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        const response = await fetch(`/api/schema-rules/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || "更新失败");
        }
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingId ? { ...r, ...formData } as SchemaRule : r
          )
        );
        toast.success("规则更新成功");
      } else {
        const response = await fetch("/api/schema-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || "创建失败");
        }
        toast.success("规则创建成功");
        loadRules();
      }
      setDrawerOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast.error(`操作失败: ${message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此规则？")) return;
    try {
      const response = await fetch(`/api/schema-rules/${id}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("删除失败");
      toast.success("规则已删除");
      loadRules();
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/schema-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_enabled: enabled }),
      });
      if (!response.ok) throw new Error("更新失败");
      loadRules();
    } catch (error) {
      toast.error("更新失败");
    }
  };

  const toggleTableDefinition = (tableCode: string) => {
    setFormData((prev) => {
      const current = prev.table_definitions || [];
      const updated = current.includes(tableCode)
        ? current.filter((t) => t !== tableCode)
        : [...current, tableCode];
      return { ...prev, table_definitions: updated };
    });
  };

  const toggleModuleCode = (moduleCode: string) => {
    setFormData((prev) => {
      const current = prev.module_codes || [];
      const updated = current.includes(moduleCode)
        ? current.filter((m) => m !== moduleCode)
        : [...current, moduleCode];
      return { ...prev, module_codes: updated };
    });
  };

  const getRuleTypeName = (ruleType: string) => {
    return ruleType === 'module' ? '产品规则' : '类型阶段规则';
  };

  const getRuleConditionDisplay = (rule: SchemaRule) => {
    if (rule.rule_type === 'module') {
      const parts: string[] = [];
      if (rule.module_codes && rule.module_codes.length > 0) {
        const moduleNames = rule.module_codes.map(code => {
          const productModule = productModules.find(m => m.code === code);
          return productModule?.module_name || code;
        });
        parts.push(moduleNames.join("、"));
      } else {
        parts.push("未配置模块");
      }
      if (rule.project_type) {
        const type = projectTypes.find((t) => t.code === rule.project_type);
        parts.push(type?.name || rule.project_type);
      }
      if (rule.project_status) {
        const status = projectStatuses.find((s) => s.code === rule.project_status);
        parts.push(`状态: ${status?.name || rule.project_status}`);
      }
      return parts.join(" / ");
    }

    const parts: string[] = [];
    if (rule.project_type) {
      const type = projectTypes.find((t) => t.code === rule.project_type);
      parts.push(type?.name || rule.project_type);
    }
    if (rule.project_status) {
      const status = projectStatuses.find((s) => s.code === rule.project_status);
      parts.push(status?.name || rule.project_status);
    }
    return parts.length > 0 ? parts.join(" / ") : "全部项目";
  };

  // 过滤后的表定义和产品模块
  const filteredTables = tableDefinitions.filter(
    (def) => !tableSearch ||
      def.table_name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      def.table_code.toLowerCase().includes(tableSearch.toLowerCase())
  );
  const filteredModules = productModules.filter(
    (m) => !moduleSearch ||
      m.module_name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
      (m.product_name || "").toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <div>
          <h2 className="text-base font-semibold">项目 Schema 规则配置</h2>
          <p className="text-xs text-muted-foreground">
            配置新建项目时自动复制的规范表规则
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDrawer} size="sm" className="h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            新建规则
          </Button>
        </div>
      </div>

      {/* 规则列表 — 紧凑版 */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {rules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无规则配置</p>
            <p className="text-xs mt-1">点击"新建规则"开始配置</p>
          </div>
        ) : (
          <div className="border rounded-md bg-card">
            {/* 表头 */}
            <div className="flex items-center px-4 py-2 border-b bg-muted/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <span className="w-[180px] shrink-0">规则名称</span>
              <span className="w-[90px] shrink-0">类型</span>
              <span className="flex-1 min-w-0">匹配条件</span>
              <span className="w-[180px] shrink-0">规范表</span>
              <span className="w-[60px] shrink-0 text-center">启用</span>
              <span className="w-[72px] shrink-0 text-right">操作</span>
            </div>
            {/* 行 */}
            {rules
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center px-4 py-2 border-b last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => openEditDrawer(rule)}
                >
                  <span className="w-[180px] shrink-0 text-[13px] font-medium truncate pr-2">
                    {rule.rule_name}
                  </span>
                  <span className="w-[90px] shrink-0">
                    <Badge variant={rule.rule_type === 'module' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
                      {rule.rule_type === 'module' ? (
                        <><Layers className="w-3 h-3 mr-0.5" />模块</>
                      ) : (
                        <><Settings className="w-3 h-3 mr-0.5" />类型阶段</>
                      )}
                    </Badge>
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate pr-2">
                    {getRuleConditionDisplay(rule)}
                  </span>
                  <span className="w-[180px] shrink-0">
                    <div className="flex flex-wrap gap-0.5">
                      {rule.table_definitions?.slice(0, 3).map((code) => {
                        const def = tableDefinitions.find((d) => d.table_code === code);
                        return (
                          <Badge key={code} variant="secondary" className="text-[10px] h-4 px-1">
                            {def?.table_name || code}
                          </Badge>
                        );
                      })}
                      {(rule.table_definitions?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          +{(rule.table_definitions?.length || 0) - 3}
                        </Badge>
                      )}
                    </div>
                  </span>
                  <span className="w-[60px] shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                      className="scale-75"
                    />
                  </span>
                  <span className="w-[72px] shrink-0 flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDrawer(rule)}
                      className="h-7 w-7"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ═══ 抽屉式编辑面板（从右侧滑入） ═══ */}
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* 抽屉面板 */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[640px] max-w-[90vw] bg-background border-l shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">
              {editingId ? "编辑规则" : "新建规则"}
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-3 text-xs" side="left" align="start">
                <p className="font-semibold mb-2">规则匹配说明</p>
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-0.5">类型阶段规则</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>三个条件（类型/阶段/状态）<strong className="text-foreground">必须全部精确匹配</strong></li>
                      <li>任一条件不满足则整个规则不命中</li>
                      <li>多条规则同时命中时，<strong className="text-foreground">全部合并收集</strong>（Set 去重）</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-0.5">产品规则</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>模块必须有交集（<strong className="text-foreground">AND</strong>）</li>
                      <li>三个条件必须全部精确匹配</li>
                    </ul>
                  </div>
                  <div className="border-t pt-2">
                    <p className="text-foreground">两类规则独立计算，结果合并去重</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrawerOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 抽屉内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">规则名称 *</Label>
              <Input
                value={formData.rule_name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rule_name: e.target.value }))
                }
                placeholder="输入规则名称"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">规则类型</Label>
              <Select
                value={formData.rule_type || "type_stage"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    rule_type: value as 'type_stage' | 'module',
                    project_type: value === 'module' ? null : prev.project_type,
                    project_stage: value === 'module' ? null : prev.project_stage,
                    project_status: null,
                    module_codes: value === 'type_stage' ? [] : prev.module_codes,
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="type_stage">类型阶段规则</SelectItem>
                  <SelectItem value="module">产品规则</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 匹配条件 */}
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs">
                {formData.rule_type === 'module' ? '产品目录' : '匹配条件'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {formData.rule_type === 'module' ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    选择产品目录后，当新建项目采购了这些模块时，会自动复制对应的规范表
                  </p>
                  {/* 已选模块 */}
                  {formData.module_codes && formData.module_codes.length > 0 && (
                    <div className="grid grid-cols-2 gap-1">
                      {formData.module_codes.map((code) => {
                        const mod = productModules.find(m => m.code === code);
                        return (
                          <Badge key={code} variant="secondary" className="text-[10px] h-5 gap-1 px-1.5 justify-between truncate">
                            <span className="truncate">{mod?.module_name || code}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleModuleCode(code); }}
                              className="flex-shrink-0 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  {/* 带搜索的产品模块列表 */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="搜索产品模块..."
                      className="h-8 text-xs pl-8"
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto border rounded-md">
                    {filteredModules.map((module) => (
                      <label
                        key={module.code}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0"
                      >
                        <Checkbox
                          checked={formData.module_codes?.includes(module.code)}
                          onCheckedChange={() => toggleModuleCode(module.code)}
                          className="h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium">{module.module_name}</span>
                          {module.product_name && (
                            <span className="text-[10px] text-muted-foreground ml-1.5">{module.product_name}</span>
                          )}
                        </div>
                      </label>
                    ))}
                    {filteredModules.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        {productModules.length === 0 ? '暂无产品目录，请先在基础数据中添加' : '未找到匹配的产品目录'}
                      </p>
                    )}
                  </div>
                  {/* 附加过滤条件 */}
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">项目类型 *（多选，严格匹配）</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex w-full items-center justify-between min-h-[2rem] rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm hover:bg-accent hover:text-accent-foreground">
                            {(formData.project_type_list || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(formData.project_type_list || []).map((code) => (
                                  <Badge key={code} variant="secondary" className="text-[10px] h-4 px-1">
                                    {projectTypes.find(t => t.code === code)?.name || code}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">请选择类型</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-1" align="start">
                          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                            {projectTypes.map((type) => {
                              const checked = (formData.project_type_list || []).includes(type.code);
                              return (
                                <label key={type.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-gray-100 ${checked ? 'bg-blue-50' : ''}`}>
                                  <Checkbox checked={checked} onCheckedChange={() => {
                                    const list = formData.project_type_list || [];
                                    setFormData(prev => ({ ...prev, project_type_list: list.includes(type.code) ? list.filter(c => c !== type.code) : [...list, type.code] }));
                                  }} />
                                  {type.name}
                                </label>
                              );
                            })}
                          </div>
                          {(formData.project_type_list || []).length > 0 && (
                            <div className="border-t pt-1 mt-1">
                              <button className="text-xs text-red-500 hover:underline w-full text-center" onClick={() => setFormData(prev => ({ ...prev, project_type_list: null }))}>清除全部</button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">项目状态 *（多选，严格匹配）</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex w-full items-center justify-between min-h-[2rem] rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm hover:bg-accent hover:text-accent-foreground">
                            {(formData.project_status_list || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(formData.project_status_list || []).map((code) => (
                                  <Badge key={code} variant="secondary" className="text-[10px] h-4 px-1">
                                    {projectStatuses.find(s => s.code === code)?.name || code}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">不限状态</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-1" align="start">
                          <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                            {projectStatuses.map((status) => {
                              const checked = (formData.project_status_list || []).includes(status.code);
                              return (
                                <label key={status.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-gray-100 ${checked ? 'bg-blue-50' : ''}`}>
                                  <Checkbox checked={checked} onCheckedChange={() => {
                                    const list = formData.project_status_list || [];
                                    setFormData(prev => ({ ...prev, project_status_list: list.includes(status.code) ? list.filter(c => c !== status.code) : [...list, status.code] }));
                                  }} />
                                  {status.name}
                                </label>
                              );
                            })}
                          </div>
                          {(formData.project_status_list || []).length > 0 && (
                            <div className="border-t pt-1 mt-1">
                              <button className="text-xs text-red-500 hover:underline w-full text-center" onClick={() => setFormData(prev => ({ ...prev, project_status_list: null }))}>清除全部</button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">项目类型 *</Label>
                      <Select
                        value={formData.project_type || ""}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, project_type: value || null }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="请选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectTypes.map((type) => (
                            <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">项目状态（可选）</Label>
                      <Select
                        value={formData.project_status || ""}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, project_status: value || null }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="不限状态" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectStatuses.map((status) => (
                            <SelectItem key={status.code} value={status.code}>{status.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <Label className="text-[11px]">部署模式（可选，多选）</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex w-full items-center justify-between min-h-[2rem] rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm hover:bg-accent hover:text-accent-foreground">
                          {(formData.deployment_mode_list || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(formData.deployment_mode_list || []).map((code) => (
                                <Badge key={code} variant="secondary" className="text-[10px] h-4 px-1">
                                  {deploymentModes.find(d => d.code === code)?.name || code}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">不限部署模式</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-1" align="start">
                        <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                          {deploymentModes.map((dm) => {
                            const checked = (formData.deployment_mode_list || []).includes(dm.code);
                            return (
                              <label key={dm.code} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-gray-100 ${checked ? 'bg-blue-50' : ''}`}>
                                <Checkbox checked={checked} onCheckedChange={() => {
                                  const list = formData.deployment_mode_list || [];
                                  setFormData(prev => ({ ...prev, deployment_mode_list: list.includes(dm.code) ? list.filter(c => c !== dm.code) : [...list, dm.code] }));
                                }} />
                                {dm.name}
                              </label>
                            );
                          })}
                        </div>
                        {(formData.deployment_mode_list || []).length > 0 && (
                          <div className="border-t pt-1 mt-1">
                            <button className="text-xs text-red-500 hover:underline w-full text-center" onClick={() => setFormData(prev => ({ ...prev, deployment_mode_list: [] }))}>清除全部</button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    类型必选，状态可选。匹配后将在项目所有阶段中创建这些规范表，表在哪个阶段显示由规范管理中的「适用范围」决定。多条规则同时命中时全部合并（Set 去重）。
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 规范表选择（带搜索） */}
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs flex items-center justify-between">
                <span>复制规范表（{formData.table_definitions?.length || 0} 个已选）</span>
                {formData.table_definitions && formData.table_definitions.length > 0 && (
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, table_definitions: [] }))}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    清空全部
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {/* 已选标签 */}
              {formData.table_definitions && formData.table_definitions.length > 0 && (
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {formData.table_definitions.map((code) => {
                    const def = tableDefinitions.find((d) => d.table_code === code);
                    return (
                      <Badge key={code} variant="secondary" className="text-[10px] h-5 gap-1 px-1.5 justify-between truncate">
                        <span className="truncate">{def?.table_name || code}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTableDefinition(code); }}
                          className="flex-shrink-0 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="搜索表名或表代码..."
                  className="h-8 text-xs pl-8"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
              {/* 表列表 */}
              <div className="max-h-[240px] overflow-y-auto border rounded-md">
                {filteredTables.map((def) => (
                  <label
                    key={def.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0 ${
                      formData.table_definitions?.includes(def.table_code)
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Checkbox
                      checked={formData.table_definitions?.includes(def.table_code)}
                      onCheckedChange={() => toggleTableDefinition(def.table_code)}
                      className="h-3.5 w-3.5"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <Database className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-xs font-medium">{def.table_name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{def.table_code}</span>
                    </div>
                  </label>
                ))}
                {filteredTables.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {tableDefinitions.length === 0 ? '暂无规范表定义，请先在规范管理中创建' : '未找到匹配的规范表'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 描述和排序 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">描述</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="规则描述"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">排序</Label>
              <Input
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_enabled: checked }))
              }
            />
            <Label className="text-xs">启用此规则</Label>
          </div>
        </div>

        {/* 抽屉底部按钮 */}
        <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" onClick={() => setDrawerOpen(false)} size="sm" className="h-8 text-xs">
            取消
          </Button>
          <Button onClick={handleSubmit} size="sm" className="h-8 text-xs">
            {editingId ? "保存" : "创建"}
          </Button>
        </div>
      </div>
    </div>
  );
}
