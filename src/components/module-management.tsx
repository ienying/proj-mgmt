'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, TrendingUp, Check, DollarSign, UsersIcon, MessageSquare,
  Shield, ShoppingCart, Briefcase, Archive, Plus, Pencil, Trash2,
  CheckCircle2, XCircle, Save, GripVertical,
  FolderKanban, Layers, BarChart3, FileText, Cpu, Globe, Palette,
  Zap, Activity, Database, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

// 图标映射 - 20个内置图标
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, TrendingUp, Check, DollarSign, UsersIcon, MessageSquare,
  Shield, ShoppingCart, Briefcase, Archive,
  FolderKanban, Layers, BarChart3, FileText, Cpu,
  Globe, Palette, Zap, Activity, Database,
};

// 颜色映射
const COLOR_MAP: Record<string, { bg: string; text: string; light: string }> = {
  blue:      { bg: 'bg-blue-500',      text: 'text-blue-600',      light: 'bg-blue-50' },
  emerald:   { bg: 'bg-emerald-500',   text: 'text-emerald-600',   light: 'bg-emerald-50' },
  violet:    { bg: 'bg-violet-500',    text: 'text-violet-600',    light: 'bg-violet-50' },
  amber:     { bg: 'bg-amber-500',     text: 'text-amber-600',     light: 'bg-amber-50' },
  cyan:      { bg: 'bg-cyan-500',      text: 'text-cyan-600',      light: 'bg-cyan-50' },
  pink:      { bg: 'bg-pink-500',      text: 'text-pink-600',      light: 'bg-pink-50' },
  red:       { bg: 'bg-red-500',       text: 'text-red-600',       light: 'bg-red-50' },
  orange:    { bg: 'bg-orange-500',    text: 'text-orange-600',    light: 'bg-orange-50' },
  teal:      { bg: 'bg-teal-500',      text: 'text-teal-600',      light: 'bg-teal-50' },
  indigo:    { bg: 'bg-indigo-500',    text: 'text-indigo-600',    light: 'bg-indigo-50' },
  green:     { bg: 'bg-green-500',     text: 'text-green-600',     light: 'bg-green-50' },
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);
const AVAILABLE_COLORS = Object.keys(COLOR_MAP);

interface ModuleType {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  description: string;
  is_enabled: boolean;
  sort_order: number;
}

interface ProjectType {
  id: string;
  name: string;
  code: string;
}

interface ProjectStage {
  id: string;
  name: string;
  code: string;
}

interface ModuleConfig {
  id: string;
  project_type_code: string;
  project_stage_code: string;
  module_code: string;
  is_enabled: boolean;
  sort_order: number;
}

export default function ModuleManagement() {
  const [modules, setModules] = useState<ModuleType[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [configs, setConfigs] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 模块编辑弹窗
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<ModuleType> | null>(null);

  // 矩阵配置 - 选中的类型
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>('');

  // 用 ref 保存 selectedTypeCode，避免 loadData 闭包问题
  const selectedTypeCodeRef = useRef(selectedTypeCode);
  selectedTypeCodeRef.current = selectedTypeCode;

  // 加载数据（不依赖 selectedTypeCode，避免切换类型时重新加载导致滚动回顶部）
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [modRes, configRes, batchRes] = await Promise.all([
        fetch('/api/module-types'),
        fetch('/api/module-config'),
        fetch('/api/dicts/batch?types=project_types,project_stages'),
      ]);
      const modData = await modRes.json();
      const configData = await configRes.json();
      const batchJson = await batchRes.json();
      const batch = batchJson.data || {};

      const sorted = (modData.data || []).sort((a: ModuleType, b: ModuleType) => a.sort_order - b.sort_order);
      setModules(sorted);
      setProjectTypes(batch.project_types || []);
      setProjectStages(batch.project_stages || []);
      setConfigs(configData.data || []);

      // 仅在初始加载时设置默认类型
      if ((batch.project_types || []).length && !selectedTypeCodeRef.current) {
        setSelectedTypeCode(batch.project_types[0].code);
      }
    } catch (err) {
      console.error('加载模块数据失败:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 保存模块
  const handleSaveModule = async () => {
    if (!editingModule?.name || !editingModule?.code) return;
    try {
      if (editingModule.id) {
        await fetch('/api/module-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingModule.id, ...editingModule }),
        });
      } else {
        await fetch('/api/module-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingModule.name,
            code: editingModule.code,
            icon: editingModule.icon || 'Target',
            color: editingModule.color || 'blue',
            description: editingModule.description || '',
            is_enabled: editingModule.is_enabled !== false,
            sort_order: editingModule.sort_order || (modules.length + 1),
          }),
        });
      }
      setShowModuleDialog(false);
      setEditingModule(null);
      loadData(false);
    } catch (err) {
      console.error('保存模块失败:', err);
    }
  };

  // 删除模块
  const handleDeleteModule = async (id: string) => {
    if (!confirm('确定删除此模块？删除后关联配置也会清除。')) return;
    try {
      await fetch(`/api/module-types?id=${id}`, { method: 'DELETE' });
      loadData(false);
    } catch (err) {
      console.error('删除模块失败:', err);
    }
  };

  // 切换模块启用
  const handleToggleModule = async (mod: ModuleType) => {
    try {
      await fetch('/api/module-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mod.id, is_enabled: !mod.is_enabled }),
      });
      loadData(false);
    } catch (err) {
      console.error('切换模块状态失败:', err);
    }
  };

  // 矩阵配置：获取某类型+阶段下启用的模块codes
  const getEnabledModules = (typeCode: string, stageCode: string): string[] => {
    return configs
      .filter(c => c.project_type_code === typeCode && c.project_stage_code === stageCode && c.is_enabled)
      .map(c => c.module_code);
  };

  // 矩阵配置：切换某个单元格
  const handleToggleConfig = async (typeCode: string, stageCode: string, moduleCode: string, isEnabled: boolean) => {
    try {
      if (isEnabled) {
        await fetch('/api/module-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_type_code: typeCode,
            project_stage_code: stageCode,
            module_code: moduleCode,
            is_enabled: true,
          }),
        });
      } else {
        const existing = configs.find(
          c => c.project_type_code === typeCode && c.project_stage_code === stageCode && c.module_code === moduleCode
        );
        if (existing) {
          await fetch(`/api/module-config?id=${existing.id}`, { method: 'DELETE' });
        }
      }
      loadData(false);
    } catch (err) {
      console.error('切换配置失败:', err);
    }
  };

  // 批量保存某类型+阶段的配置
  const handleSaveTypeStageConfig = async (typeCode: string, stageCode: string, enabledModules: string[]) => {
    try {
      await fetch('/api/module-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type_code: typeCode,
          project_stage_code: stageCode,
          modules: enabledModules.map((code, idx) => ({ module_code: code, is_enabled: true, sort_order: idx })),
        }),
      });
      loadData(false);
    } catch (err) {
      console.error('保存配置失败:', err);
    }
  };

  // 一键全选/全取消某类型+阶段
  const handleSelectAllForStage = async (typeCode: string, stageCode: string, selectAll: boolean) => {
    if (selectAll) {
      const allModuleCodes = modules.filter(m => m.is_enabled).map(m => m.code);
      await handleSaveTypeStageConfig(typeCode, stageCode, allModuleCodes);
    } else {
      await handleSaveTypeStageConfig(typeCode, stageCode, []);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">模块定义</CardTitle>
              <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">模块启用配置</CardTitle>
            <p className="text-xs text-gray-500 mt-1">按项目类型和阶段配置启用的模块，点击单元格切换启用状态</p>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 模块定义 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">模块定义</CardTitle>
            <Button size="sm" onClick={() => { setEditingModule({ name: '', code: '', icon: 'Target', color: 'blue', is_enabled: true, sort_order: modules.length + 1 }); setShowModuleDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> 新增模块
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {modules.map((mod) => {
              const IconComp = ICON_MAP[mod.icon] || Target;
              const colorInfo = COLOR_MAP[mod.color] || COLOR_MAP.blue;
              return (
                <div key={mod.id} className={`flex items-center gap-3 p-3 rounded-lg border ${mod.is_enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorInfo.light}`}>
                    <IconComp className={`h-4 w-4 ${colorInfo.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{mod.name}</div>
                    <div className="text-xs text-gray-400">{mod.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={mod.is_enabled} onCheckedChange={() => handleToggleModule(mod)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingModule({ ...mod }); setShowModuleDialog(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteModule(mod.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 模块启用配置矩阵 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">模块启用配置</CardTitle>
          <p className="text-xs text-gray-500 mt-1">按项目类型和阶段配置启用的模块，点击单元格切换启用状态</p>
        </CardHeader>
        <CardContent>
          {/* 选择项目类型 */}
          <div className="mb-4">
            <Label className="text-sm text-gray-600 mb-1.5 block">选择项目类型</Label>
            <div className="flex gap-2 flex-wrap">
              {projectTypes.map(pt => (
                <Button
                  key={pt.code}
                  variant={selectedTypeCode === pt.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTypeCode(pt.code)}
                  className={selectedTypeCode === pt.code ? 'bg-blue-600' : ''}
                >
                  {pt.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 矩阵表格 */}
          {selectedTypeCode && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-600 w-32">模块 ↓ \ 阶段 →</th>
                    {projectStages.map(stage => (
                      <th key={stage.code} className="border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-medium text-gray-600 min-w-[100px]">
                        <div>{stage.name}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] text-blue-500 hover:text-blue-700 mt-0.5"
                          onClick={() => {
                            const allEnabled = modules.filter(m => m.is_enabled).every(m => getEnabledModules(selectedTypeCode, stage.code).includes(m.code));
                            handleSelectAllForStage(selectedTypeCode, stage.code, !allEnabled);
                          }}
                        >
                          全选/全消
                        </Button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.filter(m => m.is_enabled).map(mod => {
                    const IconComp = ICON_MAP[mod.icon] || Target;
                    const colorInfo = COLOR_MAP[mod.color] || COLOR_MAP.blue;
                    return (
                      <tr key={mod.code}>
                        <td className="border border-gray-200 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${colorInfo.light}`}>
                              <IconComp className={`h-3 w-3 ${colorInfo.text}`} />
                            </div>
                            <span>{mod.name}</span>
                          </div>
                        </td>
                        {projectStages.map(stage => {
                          const enabled = getEnabledModules(selectedTypeCode, stage.code).includes(mod.code);
                          return (
                            <td key={stage.code} className="border border-gray-200 px-2 py-2 text-center">
                              <button
                                onClick={() => handleToggleConfig(selectedTypeCode, stage.code, mod.code, !enabled)}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                                  enabled
                                    ? `${colorInfo.bg} text-white hover:opacity-80`
                                    : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                {enabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 模块编辑弹窗 */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModule?.id ? '编辑模块' : '新增模块'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">模块名称</Label>
                <Input
                  value={editingModule?.name || ''}
                  onChange={e => setEditingModule(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="如：范围管理"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">模块编码</Label>
                <Input
                  value={editingModule?.code || ''}
                  onChange={e => setEditingModule(prev => prev ? { ...prev, code: e.target.value } : null)}
                  placeholder="如：scope"
                  disabled={!!editingModule?.id}
                />
              </div>
            </div>

            {/* 图标选择器 - 纯图标网格 */}
            <div>
              <Label className="text-sm font-medium">图标</Label>
              <div className="grid grid-cols-10 gap-1 mt-1 p-2 border rounded-lg bg-gray-50/50">
                {AVAILABLE_ICONS.map(iconName => {
                  const Comp = ICON_MAP[iconName];
                  const isSelected = editingModule?.icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      title={iconName}
                      onClick={() => setEditingModule(prev => prev ? { ...prev, icon: iconName } : null)}
                      className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-100 ring-2 ring-blue-400 text-blue-600'
                          : 'hover:bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Comp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 颜色选择器 - 纯色块网格 */}
            <div>
              <Label className="text-sm font-medium">主题色</Label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {AVAILABLE_COLORS.map(c => {
                  const ci = COLOR_MAP[c];
                  const isSelected = editingModule?.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      onClick={() => setEditingModule(prev => prev ? { ...prev, color: c } : null)}
                      className={`w-7 h-7 rounded-md transition-all ${ci.bg} ${
                        isSelected ? 'ring-2 ring-offset-1 ring-gray-800 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">描述</Label>
              <Input
                value={editingModule?.description || ''}
                onChange={e => setEditingModule(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="模块功能描述"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">排序</Label>
                <Input
                  type="number"
                  value={editingModule?.sort_order || 0}
                  onChange={e => setEditingModule(prev => prev ? { ...prev, sort_order: parseInt(e.target.value) || 0 } : null)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={editingModule?.is_enabled !== false}
                  onCheckedChange={v => setEditingModule(prev => prev ? { ...prev, is_enabled: v } : null)}
                />
                <Label className="text-sm">启用</Label>
              </div>
            </div>

            {/* 预览 */}
            {editingModule?.name && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">预览效果</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const PrevIcon = ICON_MAP[editingModule?.icon || 'Target'] || Target;
                    const prevColor = COLOR_MAP[editingModule?.color || 'blue'] || COLOR_MAP.blue;
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${prevColor.light}`}>
                          <PrevIcon className={`h-4 w-4 ${prevColor.text}`} />
                        </div>
                        <span className="font-medium text-sm">{editingModule.name}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>取消</Button>
            <Button onClick={handleSaveModule} disabled={!editingModule?.name || !editingModule?.code}>
              <Save className="h-4 w-4 mr-1" /> 保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
