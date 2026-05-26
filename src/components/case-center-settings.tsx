"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Info,
  Plus,
  X,
  Loader2,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  School,
  Building2,
  Briefcase,
  Cpu,
  BarChart3,
  Target,
  UserCheck,
  DollarSign,
  Wrench,
  CalendarClock,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CaseCenterConfig {
  id?: string;
  type: string;
  table_code: string;
  title_field: string;
  subtitle_field?: string;
  description_field?: string;
  image_field?: string;
  tags_field?: string;
  stat_fields: Array<{ field: string; label: string; chart: string }>;
  is_enabled: boolean;
  sort_order: number;
  modules?: ModuleConfig[];
  overview_metrics?: OverviewMetric[];
}

interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  table_code: string;
  display_type: string;
  fields: ModuleField[];
}

interface ModuleField {
  column: string;
  label: string;
  render: string;
}

interface OverviewMetric {
  label: string;
  table_code: string;
  column?: string;
  filter_value?: string;
  calc: string;
}

interface TableDefinition {
  id: string;
  table_code: string;
  table_name: string;
  columns_config: Array<{
    name: string;
    type: string;
    options?: string[];
    multiple?: boolean;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  product_case: "产品案例",
  user_profile: "用户画像",
};

// 预设10大模块
const PRESET_MODULES: Omit<ModuleConfig, "table_code" | "fields">[] = [
  { id: "school_info", name: "学校基础信息", icon: "School", display_type: "card" },
  { id: "org_structure", name: "组织架构与科室", icon: "Building2", display_type: "card" },
  { id: "core_business", name: "核心业务全景", icon: "Briefcase", display_type: "card" },
  { id: "it_status", name: "信息化现状", icon: "Cpu", display_type: "card" },
  { id: "product_usage", name: "我司产品使用情况", icon: "BarChart3", display_type: "card" },
  { id: "needs_pain", name: "需求与痛点", icon: "Target", display_type: "card" },
  { id: "key_contacts", name: "关键联系人", icon: "UserCheck", display_type: "card" },
  { id: "sales_leads", name: "二次销售线索", icon: "DollarSign", display_type: "card" },
  { id: "service_records", name: "服务与巡检记录", icon: "Wrench", display_type: "card" },
  { id: "project_plan", name: "项目推进计划", icon: "CalendarClock", display_type: "card" },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  School: <School className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  CalendarClock: <CalendarClock className="w-4 h-4" />,
  LayoutGrid: <LayoutGrid className="w-4 h-4" />,
};

const DISPLAY_TYPE_OPTIONS = [
  { value: "card", label: "卡片" },
  { value: "table", label: "表格" },
  { value: "timeline", label: "时间线" },
  { value: "tag_cloud", label: "标签云" },
];

const RENDER_TYPE_OPTIONS = [
  { value: "text", label: "文本" },
  { value: "tag", label: "标签" },
  { value: "badge", label: "徽章" },
  { value: "link", label: "链接" },
  { value: "progress", label: "进度条" },
];

const CALC_TYPE_OPTIONS = [
  { value: "total", label: "总数" },
  { value: "count", label: "条件计数" },
  { value: "percent", label: "百分比" },
];

export function CaseCenterSettings() {
  const [activeTab, setActiveTab] = useState<"product_case" | "user_profile">(
    "product_case"
  );
  const [configs, setConfigs] = useState<Record<string, CaseCenterConfig>>({});
  const [standards, setStandards] = useState<TableDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, standardsRes] = await Promise.all([
        fetch("/api/case-center/config"),
        fetch("/api/standards"),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        const configMap: Record<string, CaseCenterConfig> = {};
        for (const item of configData.data || []) {
          configMap[item.type] = {
            ...item,
            subtitle_field: item.subtitle_field || "__none__",
            description_field: item.description_field || "__none__",
            image_field: item.image_field || "__none__",
            tags_field: item.tags_field || "__none__",
            modules: item.modules || [],
            overview_metrics: item.overview_metrics || [],
          };
        }
        setConfigs(configMap);
      }

      if (standardsRes.ok) {
        const standardsData = await standardsRes.json();
        setStandards(standardsData.data || []);
      }
    } catch (err) {
      console.error("加载配置失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentConfig = configs[activeTab] || {
    type: activeTab,
    table_code: "",
    title_field: "",
    subtitle_field: "__none__",
    description_field: "__none__",
    image_field: "__none__",
    tags_field: "__none__",
    stat_fields: [],
    is_enabled: true,
    sort_order: 0,
    modules: [],
    overview_metrics: [],
  };

  const selectedStandard = standards.find(
    (s) => s.table_code === currentConfig.table_code
  );

  const columnOptions = selectedStandard?.columns_config || [];

  const updateConfig = (field: string, value: unknown) => {
    setConfigs((prev) => ({
      ...prev,
      [activeTab]: {
        ...currentConfig,
        [field]: value,
      },
    }));
  };

  // ============= Product Case Save =============
  const handleProductSave = async () => {
    if (!currentConfig.table_code) {
      toast.error("请选择关联的规范表");
      return;
    }
    if (!currentConfig.title_field) {
      toast.error("请选择标题映射字段");
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        type: currentConfig.type,
        table_code: currentConfig.table_code,
        title_field: currentConfig.title_field,
        subtitle_field: (!currentConfig.subtitle_field || currentConfig.subtitle_field === "__none__") ? null : currentConfig.subtitle_field,
        description_field: (!currentConfig.description_field || currentConfig.description_field === "__none__") ? null : currentConfig.description_field,
        image_field: (!currentConfig.image_field || currentConfig.image_field === "__none__") ? null : currentConfig.image_field,
        tags_field: (!currentConfig.tags_field || currentConfig.tags_field === "__none__") ? null : currentConfig.tags_field,
        stat_fields: (currentConfig.stat_fields || []).map((sf: { field: string; label: string; chart: string }) => ({
          ...sf,
          field: sf.field === "__none__" ? "" : sf.field,
        })).filter((sf: { field: string }) => sf.field),
        is_enabled: currentConfig.is_enabled,
        sort_order: currentConfig.sort_order ?? 0,
      };
      const res = await fetch("/api/case-center/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `保存失败 (HTTP ${res.status})`);
      }

      toast.success("配置保存成功");
      loadData();
    } catch (err: unknown) {
      console.error("案例中心配置保存失败:", err);
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // ============= User Profile Save =============
  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const saveData = {
        type: "user_profile",
        is_enabled: currentConfig.is_enabled,
        sort_order: currentConfig.sort_order ?? 0,
        modules: (currentConfig.modules || []).filter(m => m.table_code),
        overview_metrics: (currentConfig.overview_metrics || []).filter(m => m.label && m.table_code),
      };
      const res = await fetch("/api/case-center/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `保存失败 (HTTP ${res.status})`);
      }

      toast.success("用户画像配置保存成功");
      loadData();
    } catch (err: unknown) {
      console.error("用户画像配置保存失败:", err);
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // Stat field management
  const addStatField = () => {
    const statFields = [...(currentConfig.stat_fields || [])];
    statFields.push({ field: "", label: "", chart: "bar" });
    updateConfig("stat_fields", statFields);
  };

  const removeStatField = (index: number) => {
    const statFields = [...(currentConfig.stat_fields || [])];
    statFields.splice(index, 1);
    updateConfig("stat_fields", statFields);
  };

  const updateStatField = (
    index: number,
    key: string,
    value: string
  ) => {
    const statFields = [...(currentConfig.stat_fields || [])];
    statFields[index] = { ...statFields[index], [key]: value };
    updateConfig("stat_fields", statFields);
  };

  // Module management
  const addModule = (preset: typeof PRESET_MODULES[number]) => {
    const modules = [...(currentConfig.modules || [])];
    modules.push({
      id: preset.id,
      name: preset.name,
      icon: preset.icon,
      table_code: "",
      display_type: preset.display_type,
      fields: [],
    });
    updateConfig("modules", modules);
  };

  const removeModule = (index: number) => {
    const modules = [...(currentConfig.modules || [])];
    modules.splice(index, 1);
    updateConfig("modules", modules);
  };

  const moveModule = (index: number, direction: "up" | "down") => {
    const modules = [...(currentConfig.modules || [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;
    [modules[index], modules[newIndex]] = [modules[newIndex], modules[index]];
    updateConfig("modules", modules);
  };

  const updateModule = (index: number, field: string, value: unknown) => {
    const modules = [...(currentConfig.modules || [])];
    modules[index] = { ...modules[index], [field]: value };
    // Reset fields when table changes
    if (field === "table_code") {
      modules[index].fields = [];
    }
    updateConfig("modules", modules);
  };

  // Module field management
  const addModuleField = (moduleIndex: number) => {
    const modules = [...(currentConfig.modules || [])];
    const fields = [...(modules[moduleIndex].fields || [])];
    fields.push({ column: "", label: "", render: "text" });
    modules[moduleIndex] = { ...modules[moduleIndex], fields };
    updateConfig("modules", modules);
  };

  const removeModuleField = (moduleIndex: number, fieldIndex: number) => {
    const modules = [...(currentConfig.modules || [])];
    const fields = [...(modules[moduleIndex].fields || [])];
    fields.splice(fieldIndex, 1);
    modules[moduleIndex] = { ...modules[moduleIndex], fields };
    updateConfig("modules", modules);
  };

  const updateModuleField = (moduleIndex: number, fieldIndex: number, key: string, value: string) => {
    const modules = [...(currentConfig.modules || [])];
    const fields = [...(modules[moduleIndex].fields || [])];
    fields[fieldIndex] = { ...fields[fieldIndex], [key]: value };
    modules[moduleIndex] = { ...modules[moduleIndex], fields };
    updateConfig("modules", modules);
  };

  // Overview metrics management
  const addOverviewMetric = () => {
    const metrics = [...(currentConfig.overview_metrics || [])];
    metrics.push({ label: "", table_code: "", column: "", filter_value: "", calc: "total" });
    updateConfig("overview_metrics", metrics);
  };

  const removeOverviewMetric = (index: number) => {
    const metrics = [...(currentConfig.overview_metrics || [])];
    metrics.splice(index, 1);
    updateConfig("overview_metrics", metrics);
  };

  const updateOverviewMetric = (index: number, key: string, value: string) => {
    const metrics = [...(currentConfig.overview_metrics || [])];
    metrics[index] = { ...metrics[index], [key]: value };
    updateConfig("overview_metrics", metrics);
  };

  // Get column options for a specific table
  const getColumnOptions = (tableCode: string) => {
    const standard = standards.find((s) => s.table_code === tableCode);
    return standard?.columns_config || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-500">加载中...</span>
      </div>
    );
  }

  const getFieldTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      text: "文本",
      number: "数字",
      date: "日期",
      select: "单选",
      multiselect: "多选",
      textarea: "多行文本",
      procurement_module: "采购模块",
      image: "图片",
      video: "视频",
      procurement_record: "采购模块记录",
    };
    return map[type] || type;
  };

  // ============= PRODUCT CASE TAB =============
  const renderProductCaseTab = () => (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">启用</Label>
          <span className="text-xs text-slate-400">
            关闭后案例中心不显示该类型
          </span>
        </div>
        <Switch
          checked={currentConfig.is_enabled}
          onCheckedChange={(checked) => updateConfig("is_enabled", checked)}
        />
      </div>

      {/* Table Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          关联规范表 <span className="text-red-500">*</span>
        </Label>
        <Select
          value={currentConfig.table_code || ""}
          onValueChange={(val) => {
            const newConfig = {
              ...currentConfig,
              table_code: val,
              title_field: "",
              subtitle_field: "",
              description_field: "",
              image_field: "",
              tags_field: "",
              stat_fields: [],
            };
            setConfigs((prev) => ({
              ...prev,
              [activeTab]: newConfig,
            }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择规范表..." />
          </SelectTrigger>
          <SelectContent>
            {standards.map((s) => (
              <SelectItem key={s.table_code} value={s.table_code}>
                {s.table_name} ({s.table_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedStandard && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5" />
            已有 {columnOptions.length} 个字段
          </div>
        )}
      </div>

      {/* Field Mappings */}
      {currentConfig.table_code && columnOptions.length > 0 && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-700">字段映射</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">
                标题 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={currentConfig.title_field || ""}
                onValueChange={(val) => updateConfig("title_field", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择标题字段" />
                </SelectTrigger>
                <SelectContent>
                  {columnOptions.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name} ({getFieldTypeLabel(col.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">副标题</Label>
              <Select
                value={currentConfig.subtitle_field || "__none__"}
                onValueChange={(val) => updateConfig("subtitle_field", val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择副标题字段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不映射</SelectItem>
                  {columnOptions.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name} ({getFieldTypeLabel(col.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">描述</Label>
              <Select
                value={currentConfig.description_field || "__none__"}
                onValueChange={(val) =>
                  updateConfig("description_field", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择描述字段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不映射</SelectItem>
                  {columnOptions.map((col) => (
                    <SelectItem key={col.name} value={col.name}>
                      {col.name} ({getFieldTypeLabel(col.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">封面图</Label>
              <Select
                value={currentConfig.image_field || "__none__"}
                onValueChange={(val) =>
                  updateConfig("image_field", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择图片字段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不映射</SelectItem>
                  {columnOptions
                    .filter((col) => col.type === "image" || col.type === "text" || col.type === "textarea")
                    .map((col) => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name} ({getFieldTypeLabel(col.type)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">标签</Label>
              <Select
                value={currentConfig.tags_field || "__none__"}
                onValueChange={(val) =>
                  updateConfig("tags_field", val === "__none__" ? "" : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择标签字段" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不映射</SelectItem>
                  {columnOptions
                    .filter((col) => col.type === "select" || col.type === "multiselect" || col.type === "text")
                    .map((col) => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name} ({getFieldTypeLabel(col.type)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Stat Fields Config */}
      {currentConfig.table_code && (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-700">统计字段配置</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                配置哪些字段在数据看板中进行统计分析
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addStatField} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加统计字段
            </Button>
          </div>
          {(currentConfig.stat_fields || []).length === 0 && (
            <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-lg">
              暂未配置统计字段，点击上方按钮添加
            </div>
          )}
          {(currentConfig.stat_fields || []).map((sf, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <Select value={sf.field || ""} onValueChange={(val) => updateStatField(index, "field", val)}>
                  <SelectTrigger><SelectValue placeholder="选择字段" /></SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={sf.label} onChange={(e) => updateStatField(index, "label", e.target.value)} placeholder="统计标签" className="text-sm" />
                <Select value={sf.chart} onValueChange={(val) => updateStatField(index, "chart", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">柱状图</SelectItem>
                    <SelectItem value="pie">饼图</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeStatField(index)} className="text-slate-400 hover:text-red-500 shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <Button onClick={handleProductSave} disabled={saving}>
          {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>) : (<><Save className="w-4 h-4 mr-2" />保存配置</>)}
        </Button>
      </div>
    </div>
  );

  // ============= USER PROFILE TAB =============
  const renderUserProfileTab = () => {
    const existingModuleIds = (currentConfig.modules || []).map(m => m.id);
    const availablePresets = PRESET_MODULES.filter(p => !existingModuleIds.includes(p.id));

    return (
      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">启用用户画像</Label>
              <p className="text-xs text-slate-400 mt-0.5">关闭后案例中心不显示用户画像入口</p>
            </div>
            <Switch
              checked={currentConfig.is_enabled}
              onCheckedChange={(checked) => updateConfig("is_enabled", checked)}
            />
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-700">概览指标配置</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                配置用户画像顶部展示的关键指标
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addOverviewMetric} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加指标
            </Button>
          </div>
          {(currentConfig.overview_metrics || []).length === 0 && (
            <div className="text-center py-4 text-sm text-slate-400 bg-slate-50 rounded-lg">
              暂未配置概览指标
            </div>
          )}
          {(currentConfig.overview_metrics || []).map((metric, index) => (
            <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    value={metric.label}
                    onChange={(e) => updateOverviewMetric(index, "label", e.target.value)}
                    placeholder="指标名称，如：应用落地率"
                    className="text-sm"
                  />
                  <Select
                    value={metric.calc}
                    onValueChange={(val) => updateOverviewMetric(index, "calc", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALC_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeOverviewMetric(index)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={metric.table_code || ""}
                  onValueChange={(val) => updateOverviewMetric(index, "table_code", val)}
                >
                  <SelectTrigger><SelectValue placeholder="选择规范表" /></SelectTrigger>
                  <SelectContent>
                    {standards.map((s) => (
                      <SelectItem key={s.table_code} value={s.table_code}>
                        {s.table_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {metric.table_code && (
                  <Select
                    value={metric.column || ""}
                    onValueChange={(val) => updateOverviewMetric(index, "column", val)}
                  >
                    <SelectTrigger><SelectValue placeholder="选择字段" /></SelectTrigger>
                    <SelectContent>
                      {getColumnOptions(metric.table_code).map((col) => (
                        <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {metric.table_code && metric.column && metric.calc !== "total" && (
                  <Input
                    value={metric.filter_value || ""}
                    onChange={(e) => updateOverviewMetric(index, "filter_value", e.target.value)}
                    placeholder="筛选值"
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modules Config */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-700">模块配置</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                配置用户画像的10大展示模块，每个模块可选择数据源和展示字段
              </p>
            </div>
            {availablePresets.length > 0 && (
              <Select value="" onValueChange={(val) => {
                const preset = PRESET_MODULES.find(p => p.id === val);
                if (preset) addModule(preset);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="添加模块..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span className="flex items-center gap-2">
                        {ICON_MAP[preset.icon]}
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {(currentConfig.modules || []).length === 0 && (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">暂未配置模块</p>
              <p className="text-xs mt-1">从上方下拉中选择预设模块添加</p>
            </div>
          )}

          {(currentConfig.modules || []).map((mod, mIndex) => {
            const isExpanded = expandedModule === mod.id;
            const modColumns = getColumnOptions(mod.table_code);

            return (
              <div key={mod.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Module Header */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <div className="flex items-center gap-2 text-blue-500">
                    {ICON_MAP[mod.icon] || <LayoutGrid className="w-4 h-4" />}
                  </div>
                  <Input
                    value={mod.name}
                    onChange={(e) => updateModule(mIndex, "name", e.target.value)}
                    className="text-sm font-medium text-slate-700 flex-1 h-7 px-2 py-0 border-transparent hover:border-slate-300 focus:border-blue-400 bg-transparent hover:bg-white"
                    style={{ boxShadow: 'none' }}
                  />
                  <Badge variant="secondary" className="text-[10px]">
                    {DISPLAY_TYPE_OPTIONS.find(d => d.value === mod.display_type)?.label || mod.display_type}
                  </Badge>
                  {mod.table_code && (
                    <Badge variant="outline" className="text-[10px]">
                      {standards.find(s => s.table_code === mod.table_code)?.table_name || mod.table_code}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveModule(mIndex, "up")} disabled={mIndex === 0}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveModule(mIndex, "down")} disabled={mIndex === (currentConfig.modules || []).length - 1}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedModule(isExpanded ? null : mod.id)}>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => removeModule(mIndex)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Module Detail Config (expandable) */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-100">
                    {/* Module Name */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">模块名称</Label>
                        <Input
                          value={mod.name}
                          onChange={(e) => updateModule(mIndex, "name", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">关联规范表</Label>
                        <Select
                          value={mod.table_code || ""}
                          onValueChange={(val) => updateModule(mIndex, "table_code", val)}
                        >
                          <SelectTrigger><SelectValue placeholder="选择规范表..." /></SelectTrigger>
                          <SelectContent>
                            {standards.map((s) => (
                              <SelectItem key={s.table_code} value={s.table_code}>
                                {s.table_name} ({s.table_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">展示方式</Label>
                        <Select
                          value={mod.display_type}
                          onValueChange={(val) => updateModule(mIndex, "display_type", val)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DISPLAY_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Field Mapping */}
                    {mod.table_code && modColumns.length > 0 && (
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-medium text-slate-500">字段映射</h4>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500" onClick={() => addModuleField(mIndex)}>
                            <Plus className="w-3 h-3 mr-1" />
                            添加字段
                          </Button>
                        </div>
                        {(mod.fields || []).length === 0 && (
                          <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 rounded">
                            暂未映射字段，点击添加
                          </div>
                        )}
                        {(mod.fields || []).map((field, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Select
                                value={field.column || ""}
                                onValueChange={(val) => updateModuleField(mIndex, fIndex, "column", val)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择列" /></SelectTrigger>
                                <SelectContent>
                                  {modColumns.map((col) => (
                                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={field.label}
                                onChange={(e) => updateModuleField(mIndex, fIndex, "label", e.target.value)}
                                placeholder="显示名称"
                                className="h-8 text-xs"
                              />
                              <Select
                                value={field.render}
                                onValueChange={(val) => updateModuleField(mIndex, fIndex, "render", val)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {RENDER_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 shrink-0" onClick={() => removeModuleField(mIndex, fIndex)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {mod.table_code && modColumns.length === 0 && (
                      <div className="text-xs text-amber-500 bg-amber-50 p-2 rounded">
                        该规范表暂无字段定义
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleProfileSave} disabled={saving}>
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>) : (<><Save className="w-4 h-4 mr-2" />保存用户画像配置</>)}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {(["product_case", "user_profile"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === type
                ? "bg-blue-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {activeTab === "product_case" ? renderProductCaseTab() : renderUserProfileTab()}
    </div>
  );
}
