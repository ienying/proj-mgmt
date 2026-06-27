"use client";

import React from "react";

interface LayoutSelectionDialogProps {
  onConfirm: (layout: "phase" | "manage") => void;
}

export function LayoutSelectionDialog({ onConfirm }: LayoutSelectionDialogProps) {
  const [activeLayout, setActiveLayout] = React.useState<"phase" | "manage">("phase");

  return (
    <div className="layout-select-overlay">
      <div className="layout-select-dialog">
        <h3>选择查看布局</h3>

        <div
          className={`layout-option ${activeLayout === "phase" ? "selected" : ""}`}
          onClick={() => setActiveLayout("phase")}
        >
          <div className="lo-radio" />
          <div>
            <div className="lo-title">阶段式布局（推荐）</div>
            <div className="lo-desc">
              按项目阶段拆分为 7 个步骤节点<br />
              点击阶段查看详情和任务清单
            </div>
          </div>
        </div>

        <div
          className={`layout-option ${activeLayout === "manage" ? "selected" : ""}`}
          onClick={() => setActiveLayout("manage")}
        >
          <div className="lo-radio" />
          <div>
            <div className="lo-title">管理式布局</div>
            <div className="lo-desc">
              按 10 大管理领域组织内容<br />
              范围/进度/质量/成本/协同/沟通/风险/采购/资源/资料
            </div>
          </div>
        </div>

        <button
          className="layout-confirm-btn"
          onClick={() => onConfirm(activeLayout)}
        >
          确定进入
        </button>
      </div>
    </div>
  );
}
