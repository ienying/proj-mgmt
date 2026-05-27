"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pin, PinOff, LogOut, User, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color?: string; // Tailwind bg class for active state, e.g. "bg-indigo-500"
  badge?: number; // 角标数量，0或不传则不显示
}

interface TopDockProps {
  items: DockItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  userName: string;
  onLogout: () => void;
  onChangePassword?: () => void;
}

export function TopDock({
  items,
  activeItem,
  onItemClick,
  userName,
  onLogout,
  onChangePassword,
}: TopDockProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const isPinnedRef = useRef(true);
  const isHoveringDockRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    isPinnedRef.current = isPinned;
  }, [isPinned]);

  const scheduleHide = useCallback((delay: number) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (!isPinnedRef.current && !isHoveringDockRef.current) {
        setIsVisible(false);
      }
    }, delay);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Mouse near top → show dock (only when not pinned)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPinnedRef.current) return;

      if (e.clientY < 60) {
        // Mouse near top edge — show dock
        cancelHide();
        setIsVisible(true);
      } else if (!isHoveringDockRef.current) {
        // Mouse moved away from top and not hovering dock — schedule hide
        scheduleHide(600);
      }
    };

    const handleMouseLeaveWindow = () => {
      if (!isPinnedRef.current) {
        scheduleHide(300);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeaveWindow);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeaveWindow);
      cancelHide();
    };
  }, [cancelHide, scheduleHide]);

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (newPinned) {
      // Pinned — always visible
      cancelHide();
      setIsVisible(true);
    }
    // If unpinning, the mousemove effect will handle auto-hide naturally
  };

  return (
    <>
      {/* Invisible hover zone at top of screen to trigger dock appearance */}
      {!isPinned && !isVisible && (
        <div
          className="fixed top-0 left-0 right-0 h-[60px] z-[99]"
          onMouseEnter={() => {
            cancelHide();
            setIsVisible(true);
          }}
        />
      )}

      {/* Floating Dock - Flat style */}
      <nav
        onMouseEnter={() => {
          isHoveringDockRef.current = true;
          if (!isPinnedRef.current) {
            cancelHide();
            setIsVisible(true);
          }
        }}
        onMouseLeave={() => {
          isHoveringDockRef.current = false;
          if (!isPinnedRef.current) {
            scheduleHide(400);
          }
        }}
        className={cn(
          "fixed z-[100] transition-all duration-300 ease-out",
          "left-1/2 -translate-x-1/2",
          "top-3",
          "flex items-center gap-0.5 px-1.5 py-1",
          "rounded-xl",
          "bg-white dark:bg-zinc-800",
          "border border-gray-200 dark:border-zinc-700",
          "shadow-md shadow-black/[0.04]",
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-[calc(100%+24px)] opacity-0 pointer-events-none"
        )}
      >
        {/* Left - Logo */}
        <div className="flex items-center gap-2.5 pr-4 mr-2 border-r border-gray-100 dark:border-white/10">
          <img
            src="/logo-element.png"
            alt="元素科技"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Center - Dock Items (icon + label) */}
        <div className="flex items-center gap-0.5">
          {items.map((item) => {
            const isActive = activeItem === item.id;
            const isHovered = hoveredItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg transition-all duration-200",
                  "text-[12px] font-medium whitespace-nowrap",
                  isActive
                    ? cn("px-2.5 py-1 text-white shadow-sm", item.color || "bg-blue-500")
                    : isHovered
                      ? "px-2.5 py-1 bg-gray-100 text-black"
                      : "px-2.5 py-1 text-black hover:text-black",
                  "active:scale-95"
                )}
              >
                <span className={cn(
                  "relative flex items-center justify-center transition-transform duration-200",
                  isActive ? "scale-110" : "scale-100"
                )}>
                  {item.icon}
                  {/* 角标 - 类似微信：0不显示，1显示红点无数字，>1显示数字，>99显示99+ */}
                  {item.badge && item.badge > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5",
                      item.badge === 1
                        ? "w-[10px] h-[10px]"
                        : "min-w-[16px] h-[16px] px-1",
                      "flex items-center justify-center",
                      "rounded-full text-[9px] font-bold leading-none text-white",
                      "bg-red-500",
                      "ring-[2px] ring-white",
                      "animate-in fade-in zoom-in duration-200"
                    )}>
                      {item.badge === 1 ? '' : item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right - Separator + Pin + User */}
        <div className="flex items-center gap-1 pl-3 ml-1 border-l border-gray-100 dark:border-white/10">
          {/* Pin Toggle */}
          <button
            onClick={handlePinToggle}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              "hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90",
              isPinned
                ? "text-black"
                : "text-black/40"
            )}
            title={isPinned ? "取消固定" : "固定导航栏"}
          >
            {isPinned ? (
              <Pin className="w-3.5 h-3.5" />
            ) : (
              <PinOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95"
              )}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white text-base font-semibold leading-none">
                    {userName.slice(0, 1)}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5" sideOffset={12}>
              <div className="px-2.5 py-2 mb-1 border-b border-border/50">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">在线</p>
              </div>
              <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-[13px]">
                <User className="w-3.5 h-3.5" />
                <span>个人中心</span>
              </DropdownMenuItem>
              {onChangePassword && (
                <DropdownMenuItem
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-[13px]"
                  onClick={onChangePassword}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>修改密码</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/5 text-[13px]"
                onClick={onLogout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
}
