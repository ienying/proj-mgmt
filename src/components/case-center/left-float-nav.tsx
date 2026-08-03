"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  dot?: string;
}

export interface NavGroup {
  separator: true;
  label?: string;
  items: NavItem[];
}

export type NavSection = NavItem | NavGroup;

interface LeftFloatNavProps {
  sections: NavSection[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  onBack?: () => void;
  variant?: "float" | "sidebar";
  className?: string;
}

function isGroup(s: NavSection): s is NavGroup {
  return "separator" in s;
}

export function LeftFloatNav({ sections, activeId, onNavigate, onBack, variant = "float", className }: LeftFloatNavProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    onNavigate?.(id);
  }, [onNavigate]);

  useEffect(() => {
    const ids: string[] = [];
    for (const s of sections) {
      if (isGroup(s)) { for (const item of s.items) ids.push(item.id); }
      else { ids.push(s.id); }
    }
    if (ids.length === 0) return;
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        let closest: { id: string; top: number } | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!closest || entry.boundingClientRect.top < closest.top) closest = { id: entry.target.id, top: entry.boundingClientRect.top };
          }
        }
        if (closest && navRef.current) {
          navRef.current.querySelectorAll("[data-nav-id]").forEach((btn) => {
            btn.classList.toggle("active", btn.getAttribute("data-nav-id") === closest!.id);
          });
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    for (const id of ids) { const el = document.getElementById(id); if (el) observer.observe(el); }
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [sections]);

  // ── Float variant ──
  if (variant === "float") {
    return (
      <div ref={navRef}
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 z-30",
          "flex flex-col items-center gap-[2px]",
          "bg-white/95 backdrop-blur-lg border border-[#d1c7b7] rounded-2xl py-[5px] px-0",
          "shadow-lg shadow-black/5",
          "w-[46px] hover:w-[170px] transition-all duration-300 ease-out",
          "overflow-hidden",
          className
        )}
      >
        {/* Back */}
        {onBack && (
          <>
            <button onClick={onBack} title="返回列表"
              className="flex items-center gap-2.5 w-full h-[36px] pl-[9px] rounded-[10px] border-none cursor-pointer bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-700 transition-colors flex-shrink-0">
              <span className="w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">返回列表</span>
            </button>
            <div className="w-6 h-px bg-[#e8e0d0] my-[2px]" />
          </>
        )}

        {sections.map((s, i) => {
          if (isGroup(s)) {
            return (
              <div key={i} className="contents">
                <div className="w-6 h-px bg-[#e8e0d0] my-[2px]" />
                {s.label && (
                  <span className="text-[8px] text-gray-400 uppercase tracking-[2px] font-semibold px-[8px] w-full text-left">
                    {s.label}
                  </span>
                )}
                {s.items.map((item) => (
                  <button key={item.id} data-nav-id={item.id} onClick={() => handleClick(item.id)} title={item.label}
                    className="flex items-center gap-2.5 w-full h-[36px] pl-[9px] rounded-[10px] border-none cursor-pointer bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-700 transition-colors flex-shrink-0">
                    <span className="relative w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 text-[13px]">
                      {item.icon}
                      {item.dot && (
                        <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full border-2 border-white" style={{ background: item.dot }} />
                      )}
                    </span>
                    <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </div>
            );
          }

          return (
            <button key={s.id} data-nav-id={s.id} onClick={() => handleClick(s.id)} title={s.label}
              className="flex items-center gap-2.5 w-full h-[36px] pl-[9px] rounded-[10px] border-none cursor-pointer bg-transparent text-gray-400 hover:bg-red-50 hover:text-red-700 transition-colors flex-shrink-0">
              <span className="relative w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 text-[13px]">
                {s.icon}
                {s.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full border-2 border-white" style={{ background: s.dot }} />
                )}
              </span>
              <span className="text-[11px] text-gray-600 font-medium whitespace-nowrap">{s.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Sidebar variant ──
  return (
    <div ref={navRef} className={cn("w-[200px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-y-auto", className)}>
      {onBack && (
        <div className="px-3 pt-4 pb-2">
          <button onClick={onBack} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /><span>返回列表</span>
          </button>
        </div>
      )}
      <div className="flex-1 px-3 py-1 space-y-0.5">
        {sections.map((s, i) => {
          if (isGroup(s)) {
            return (
              <div key={i}>
                {s.label && <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1.5">{s.label}</div>}
                {s.items.map((item) => (
                  <button key={item.id} data-nav-id={item.id} onClick={() => handleClick(item.id)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm border-none cursor-pointer bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150">
                    <span className="relative flex-shrink-0"><span className="text-base leading-none">{item.icon}</span>{item.dot && (<span className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full" style={{ background: item.dot }} />)}</span>
                    <span className="truncate text-left">{item.label}</span>
                  </button>
                ))}
              </div>
            );
          }
          return (
            <button key={s.id} data-nav-id={s.id} onClick={() => handleClick(s.id)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm border-none cursor-pointer bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150">
              <span className="relative flex-shrink-0"><span className="text-base leading-none">{s.icon}</span>{s.dot && (<span className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full" style={{ background: s.dot }} />)}</span>
              <span className="truncate text-left">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
