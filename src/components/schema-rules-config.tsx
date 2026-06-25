"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { X, HelpCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  Database,
  ArrowUp,
  ArrowDown,
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
  const [moduleSearch, setModuleSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<SchemaRule>>({
    rule_name: "",
    rule_type: "type_stage",
    project_type: null,
    project_stage: null,
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

  // 加载产品模块
  const loadProductModules = async () => {
    try {
      const response = await fetch("/api/dicts?type=product_module_types");
      if (response.ok) {
        const data = await response.json();
        setProductModules(data.data || []);
      }
    } catch (error) {
      console.error("加载产品模块失败:", error);
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
  }, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      rule_name: "",
      rule_type: "type_stage",
      project_type: null,
      project_stage: null,
      project_status: null,
      module_codes: [],
      table_definitions: [],
      is_enabled: true,
      sort_order: rules.length,
      description: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (rule: SchemaRule) => {
    setEditingId(rule.id);
    setFormData({ 
      ...rule,
      module_codes: rule.module_codes || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // 更新
        const response = await fetch(`/api/schema-rules/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
        if (!response.ok) throw new Error("更新失败");
        // 直接更新本地 state，避免 loadRules 时序问题导致 UI 不刷新
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingId ? { ...r, ...formData } as SchemaRule : r
          )
        );
        toast.success("规则更新成功");
      } else {
        // 创建
        const response = await fetch("/api/schema-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("创建失败");
        toast.success("规则创建成功");
        loadRules();
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error("操作失败");
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
      if (rule.project_stage) {
        const stage = projectStages.find((s) => s.code === rule.project_stage);
        parts.push(`阶段: ${stage?.name || rule.project_stage}`);
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
    if (rule.project_stage) {
      const stage = projectStages.find((s) => s.code === rule.project_stage);
      parts.push(stage?.name || rule.project_stage);
    }
    if (rule.project_status) {
      const status = projectStatuses.find((s) => s.code === rule.project_status);
      parts.push(status?.name || rule.project_status);
    }
    return parts.length > 0 ? parts.join(" / ") : "全部项目";
  };

  return (
    <div className="h-full flex flex-col bg-muted">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-lg font-semibold">项目 Schema 规则配置</h2>
          <p className="text-sm text-muted-foreground">
            配置新建项目时自动复制的规范表规则
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            新建规则
          </Button>

          {/* 新建/编辑对话框 */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent 
              className="!max-w-[900px] !w-[90vw] flex flex-col max-h-[85vh] p-0"
            >
              <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle>{editingId ? "编辑规则" : "新建规则"}</DialogTitle>
                    <DialogDescription>
                      配置规则条件和要复制的规范表
                    </DialogDescription>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-4" side="left" align="start">
                      <p className="text-sm font-semibold mb-3">规则匹配关系说明</p>
                      <div className="space-y-3 text-xs text-muted-foreground">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">类型阶段规则</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>三个条件（类型/阶段/状态）<strong className="text-foreground">必须全部精确匹配</strong>，缺一不可</li>
                            <li>任一条件不满足则整个规则不命中</li>
                            <li>多条规则同时命中时，<strong className="text-foreground">全部合并收集</strong>（Set 去重）</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">产品规则</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>模块必须有交集（<strong className="text-foreground">AND</strong>，硬性条件）</li>
                            <li>三个条件（类型/阶段/状态）<strong className="text-foreground">必须全部精确匹配</strong></li>
                            <li>以上条件全部满足才命中</li>
                          </ul>
                        </div>
                        <div className="border-t pt-2">
                          <p className="text-foreground">两类规则之间：各自独立计算，表定义结果合并</p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                <div className="space-y-5">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">规则名称 *</Label>
                      <Input
                        value={formData.rule_name || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, rule_name: e.target.value }))
                        }
                        placeholder="输入规则名称"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">规则类型</Label>
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
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="type_stage">类型阶段规则</SelectItem>
                          <SelectItem value="module">产品规则</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 匹配条件 - 根据规则类型显示不同内容 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        {formData.rule_type === 'module' ? '产品模块' : '匹配条件'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {formData.rule_type === 'module' ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            选择产品模块后，当新建项目采购了这些模块时，会自动复制对应的规范表
                          </p>
                          {/* 产品模块选择 */}
                          <Input
                            placeholder="搜索产品模块..."
                            className="h-8 text-xs"
                            value={moduleSearch}
                            onChange={(e) => setModuleSearch(e.target.value)}
                          />
                          {formData.module_codes && formData.module_codes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {formData.module_codes.map((code) => {
                                const mod = productModules.find(m => m.code === code);
                                return (
                                  <Badge key={code} variant="secondary" className="text-xs gap-1">
                                    {mod?.module_name || code}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleModuleCode(code)} />
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <div className="max-h-[240px] overflow-y-auto border rounded-md">
                            {productModules
                              .filter(m => !moduleSearch || m.module_name.includes(moduleSearch) || m.product_name?.includes(moduleSearch))
                              .map((module) => (
                              <label
                                key={module.code}
                                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0"
                              >
                                <Checkbox
                                  checked={formData.module_codes?.includes(module.code)}
                                  onCheckedChange={() => toggleModuleCode(module.code)}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-medium">{module.module_name}</span>
                                  {module.product_name && (
                                    <span className="text-[10px] text-muted-foreground ml-2">{module.product_name}</span>
                                  )}
                                </div>
                              </label>
                            ))}
                            {productModules.filter(m => !moduleSearch || m.module_name.includes(moduleSearch) || m.product_name?.includes(moduleSearch)).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                {productModules.length === 0 ? '暂无产品模块，请先在基础数据中添加' : '未找到匹配的产品模块'}
                              </p>
                            )}
                          </div>
                          {/* 附加过滤条件：项目阶段 + 项目状态 */}
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                              <Label className="text-xs">项目阶段</Label>
                              <Select
                                value={formData.project_stage || ""}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    project_stage: value || null,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="请选择阶段" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectStages.map((stage) => (
                                    <SelectItem key={stage.code} value={stage.code}>
                                      {stage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">项目状态</Label>
                              <Select
                                value={formData.project_status || ""}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    project_status: value || null,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="请选择状态" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(projectStatuses.length > 0 ? projectStatuses : []).map((status) => (
                                    <SelectItem key={status.code} value={status.code}>
                                      {status.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">项目类型</Label>
                              <Select
                                value={formData.project_type || ""}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    project_type: value || null,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="请选择类型" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectTypes.map((type) => (
                                    <SelectItem key={type.code} value={type.code}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">项目阶段</Label>
                              <Select
                                value={formData.project_stage || ""}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    project_stage: value || null,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="请选择阶段" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectStages.map((stage) => (
                                    <SelectItem key={stage.code} value={stage.code}>
                                      {stage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">项目状态</Label>
                              <Select
                                value={formData.project_status || ""}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    project_status: value || null,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="请选择状态" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projectStatuses.map((status) => (
                                    <SelectItem key={status.code} value={status.code}>
                                      {status.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            三项均为必选，必须与项目完全匹配才命中。多条规则同时命中时全部合并（Set 去重）。
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* 规范表选择 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        复制规范表 ({formData.table_definitions?.length || 0} 个已选)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                        {tableDefinitions.map((def) => (
                          <label
                            key={def.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors has-[:checked]:bg-primary/10"
                          >
                            <Checkbox
                              checked={formData.table_definitions?.includes(def.table_code)}
                              onCheckedChange={() => toggleTableDefinition(def.table_code)}
                              className="h-4 w-4"
                            />
                            <span className="truncate text-xs">{def.table_name}</span>
                            <span className="text-[10px] text-muted-foreground">({def.table_code})</span>
                          </label>
                        ))}
                      </div>
                      {tableDefinitions.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          暂无规范表定义，请先在规范管理中创建
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 描述和启用状态 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">描述</Label>
                      <Input
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="规则描述"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">排序</Label>
                      <Input
                        type="number"
                        value={formData.sort_order || 0}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                        }
                        className="h-9"
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
              </div>

              <div className="shrink-0 flex justify-end gap-3 pt-4 border-t bg-background px-6 pb-6">
                <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">
                  取消
                </Button>
                <Button onClick={handleSubmit} size="sm">
                  {editingId ? "保存" : "创建"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 规则列表 */}
      <div className="flex-1 overflow-auto p-6">
        {rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无规则配置</p>
            <p className="text-sm mt-2">点击"新建规则"开始配置</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">规则名称</TableHead>
                <TableHead className="w-[100px]">规则类型</TableHead>
                <TableHead>匹配条件</TableHead>
                <TableHead className="w-[150px]">复制规范表</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant={rule.rule_type === 'module' ? 'secondary' : 'outline'} className="text-xs">
                        {rule.rule_type === 'module' ? (
                          <><Layers className="w-3 h-3 mr-1" />模块</>
                        ) : (
                          <><Settings className="w-3 h-3 mr-1" />类型阶段</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getRuleConditionDisplay(rule)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.table_definitions?.slice(0, 3).map((code) => {
                          const def = tableDefinitions.find((d) => d.table_code === code);
                          return (
                            <Badge key={code} variant="secondary" className="text-[10px]">
                              {def?.table_name || code}
                            </Badge>
                          );
                        })}
                        {(rule.table_definitions?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{(rule.table_definitions?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(rule)}
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
