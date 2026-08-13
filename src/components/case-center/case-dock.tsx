"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface DockDept {
  code: string;
  name: string;
  icon: string;
  landedCount: number;
  totalCount: number;
}

interface CaseDockProps {
  onBack: () => void;
  departments: DockDept[];
  onScrollTo: (id: string) => void;
  activeId?: string;
  onExpandedChange?: (expanded: boolean) => void;
  onVersionHistory?: () => void;
  profileId?: string;
  hwId?: string;
}

export function CaseDock({ onBack, departments, onScrollTo, activeId, onExpandedChange, onVersionHistory, profileId = "detail-profile", hwId = "detail-hw" }: CaseDockProps) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  const handleMouseEnter = useCallback(() => {
    if (!pinned) setExpanded(true);
  }, [pinned]);

  const handleMouseLeave = useCallback(() => {
    if (!pinned) setExpanded(false);
  }, [pinned]);

  const handleTogglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      setExpanded(next);
      return next;
    });
  }, []);

  const handleClick = useCallback(
    (id: string) => {
      onScrollTo(id);
    },
    [onScrollTo]
  );

  const getBadgeClass = (landed: number, total: number) => {
    if (total === 0) return "bg-gray-300";
    if (landed === total) return "bg-emerald-700";
    if (landed > 0) return "bg-orange-600";
    return "bg-red-500";
  };

  return (
    <nav
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed top-6 left-6 bottom-6 z-[100] flex flex-col",
        "bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,.06),0_0_0_1px_rgba(0,0,0,.04)]",
        "py-3 px-2 transition-all duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
        "overflow-hidden",
        expanded ? "w-[220px]" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-gray-100 whitespace-nowrap overflow-hidden flex-shrink-0">
        <div className="w-8 h-8 rounded-[10px] bg-black text-white flex items-center justify-center text-base font-extrabold flex-shrink-0">
          案
        </div>
        <span
          className={cn(
            "text-[15px] font-bold text-black transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0"
          )}
        >
          案例中心
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {/* Back to list */}
        <button
          onClick={onBack}
          title="返回画像列表"
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-[12px] text-[#555] text-[13px] font-semibold transition-colors hover:bg-gray-100 hover:text-black whitespace-nowrap overflow-hidden flex-shrink-0"
        >
          <span className="text-lg w-6 text-center flex-shrink-0">←</span>
          <span
            className={cn(
              "transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0"
            )}
          >
            返回列表
          </span>
        </button>

        <div className="h-px bg-gray-100 mx-2 my-1.5" />

        {/* Basic info */}
        <button
          onClick={() => handleClick(profileId)}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all whitespace-nowrap overflow-hidden flex-shrink-0",
            activeId === profileId
              ? "bg-black text-white"
              : "text-[#555] hover:bg-gray-100 hover:text-black"
          )}
        >
          <span className="text-lg w-6 text-center flex-shrink-0">👤</span>
          <span
            className={cn(
              "transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0"
            )}
          >
            基本信息
          </span>
        </button>

        {/* Hardware */}
        <button
          onClick={() => handleClick(hwId)}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all whitespace-nowrap overflow-hidden flex-shrink-0",
            activeId === hwId
              ? "bg-black text-white"
              : "text-[#555] hover:bg-gray-100 hover:text-black"
          )}
        >
          <span className="text-lg w-6 text-center flex-shrink-0">🖥️</span>
          <span
            className={cn(
              "transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0"
            )}
          >
            硬件环境
          </span>
        </button>

        <div className="h-px bg-gray-100 mx-2 my-1.5" />

        {/* Department section label */}
        <span
          className={cn(
            "text-[9px] font-bold text-[#aaa] uppercase tracking-[1.5px] px-2.5 py-1 whitespace-nowrap overflow-hidden transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0"
          )}
        >
          科室导航
        </span>

        {/* Department items */}
        {departments.map((dept) => (
          <button
            key={dept.code}
            onClick={() => handleClick(dept.code)}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all whitespace-nowrap overflow-hidden flex-shrink-0",
              activeId === dept.code
                ? "bg-black text-white"
                : "text-[#555] hover:bg-gray-100 hover:text-black"
            )}
          >
            <span className="text-base w-6 text-center flex-shrink-0 leading-none">
              {dept.icon}
            </span>
            <span
              className={cn(
                "transition-opacity duration-200",
                expanded ? "opacity-100" : "opacity-0"
              )}
            >
              {dept.name}
            </span>
            {/* Badge */}
            <span
              className={cn(
                "ml-auto text-[10px] font-bold text-white min-w-[18px] h-[18px] rounded-[9px] flex items-center justify-center px-1 transition-opacity duration-200 flex-shrink-0",
                getBadgeClass(dept.landedCount, dept.totalCount),
                expanded ? "opacity-100" : "opacity-0",
                activeId === dept.code && "!bg-white !text-black"
              )}
            >
              {dept.landedCount}/{dept.totalCount}
            </span>
          </button>
        ))}

        <div className="h-px bg-gray-100 mx-2 my-1.5" />

        {/* Version history */}
        <button
          onClick={onVersionHistory}
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-[12px] text-[#555] text-[13px] font-semibold transition-colors hover:bg-gray-100 hover:text-black whitespace-nowrap overflow-hidden flex-shrink-0"
        >
          <span className="text-lg w-6 text-center flex-shrink-0">📋</span>
          <span
            className={cn(
              "transition-opacity duration-200",
              expanded ? "opacity-100" : "opacity-0"
            )}
          >
            版本历史
          </span>
        </button>
      </div>

      {/* Pin toggle */}
      <button
        onClick={handleTogglePin}
        title={pinned ? "取消固定" : "固定展开"}
        className={cn(
          "flex items-center justify-center p-2 mt-1 rounded-[10px] transition-all flex-shrink-0",
          pinned ? "text-black" : "text-[#aaa]",
          "hover:text-black hover:bg-gray-100"
        )}
      >
        <span className="text-sm">{pinned ? "📌" : "📍"}</span>
      </button>
    </nav>
  );
}
