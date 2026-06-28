"use client";

import { useState } from "react";
import { LayoutDashboard, GitBranch, ArrowRight } from "lucide-react";
import type { LayoutMode } from "./types";

interface LayoutSelectorProps {
  open: boolean;
  onSelect: (mode: LayoutMode) => void;
}

export function LayoutSelector({ open, onSelect }: LayoutSelectorProps) {
  const [selected, setSelected] = useState<LayoutMode>("stage");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* 弹窗 */}
      <div className="relative z-10 bg-white dark:bg-[#252529] rounded-lg shadow-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-[#e8590c]" />
            选择查看方式
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            请选择您偏好的项目详情查看方式，进入后可随时切换
          </p>
        </div>

        {/* 选项 */}
        <div className="p-5 flex gap-4">
          {/* 管理式布局 */}
          <button
            onClick={() => setSelected("management")}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
              selected === "management"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-[#2e2e33]"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">管理式布局</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              传统数据管理视图，适合进行数据的增删改查、批量导入导出、以及多维度数据配置等后台管理操作。
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["表格视图", "卡片视图", "看板视图", "甘特图", "树形视图"].map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          </button>

          {/* 阶段式布局 */}
          <button
            onClick={() => setSelected("stage")}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
              selected === "stage"
                ? "border-[#e8590c] bg-orange-50 dark:bg-orange-500/10"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-[#2e2e33]"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-[#e8590c]" />
              </div>
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">阶段式布局</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8590c] text-white font-medium">推荐</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              按项目阶段可视化展示项目全貌，包含进度总览、阶段步骤条、任务详情、图表分析等，直观掌握项目整体状态。
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {["步骤条", "环形图", "进度总览", "阶段详情", "任务展开"].map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/30 text-[#e8590c]">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            偏好将被记住，下次进入项目详情时默认使用该布局
          </p>
          <button
            onClick={() => onSelect(selected)}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#e8590c] hover:bg-[#d9480f] text-white text-sm font-semibold rounded transition-colors cursor-pointer"
          >
            确定
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
