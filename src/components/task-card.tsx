"use client";

import { cn } from "@/lib/utils";
import { Clock, User, Building2, GitBranch, AlertCircle } from "lucide-react";

export interface TaskCardData {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled";
  priority?: "high" | "normal" | "low";
  assignee_name?: string;
  project_name?: string;
  due_date?: string;
  task_type?: "periodic" | "regular";
  task_mode?: "form" | "project" | "approval";
  is_late?: boolean;
  source_type?: string;
  progress?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待处理", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  in_progress: { label: "进行中", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  completed: { label: "已完成", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  overdue: { label: "已逾期", color: "text-red-600", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "已取消", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  high: { label: "高", dot: "bg-red-500" },
  normal: { label: "中", dot: "bg-amber-500" },
  low: { label: "低", dot: "bg-green-500" },
};

const MODE_CONFIG: Record<string, string> = {
  form: "📝", project: "📋", approval: "🔀",
};

interface TaskCardProps {
  task: TaskCardData;
  compact?: boolean;
  onClick?: () => void;
  onAction?: (action: string) => void;
  selected?: boolean;
}

export function TaskCard({ task, compact, onClick, onAction, selected }: TaskCardProps) {
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const isLate = task.is_late || task.status === "overdue";

  const card = (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border p-3 transition-all cursor-pointer",
        selected ? "ring-2 ring-indigo-400 shadow-md" : "hover:shadow-md hover:border-gray-300",
        compact ? "p-2.5" : "p-3.5",
        isLate && "border-red-200 bg-red-50/30"
      )}
    >
      {/* 顶部：优先级 + 类型 */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {priorityCfg && <span className={cn("w-2 h-2 rounded-full", priorityCfg.dot)} />}
        {priorityCfg && <span className="text-[10px] text-gray-400">{priorityCfg.label}</span>}
        {task.task_mode && <span className="text-[10px] ml-auto">{MODE_CONFIG[task.task_mode] || ""}</span>}
        {task.source_type === "issue" && <AlertCircle className="w-3 h-3 text-orange-400 ml-auto" />}
      </div>

      {/* 标题 */}
      <h4 className={cn("font-medium text-gray-900 line-clamp-2", compact ? "text-xs" : "text-sm")}>
        {task.title}
      </h4>

      {/* 元信息 */}
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 mt-2", compact ? "text-[10px]" : "text-xs")}>
        {task.assignee_name && (
          <span className="flex items-center gap-1 text-gray-500">
            <User className="w-3 h-3" /> {task.assignee_name}
          </span>
        )}
        {task.project_name && (
          <span className="flex items-center gap-1 text-gray-500">
            <Building2 className="w-3 h-3" /> {task.project_name}
          </span>
        )}
        {task.due_date && (
          <span className={cn("flex items-center gap-1", isLate ? "text-red-500 font-medium" : "text-gray-400")}>
            <Clock className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* 状态徽标 */}
      {!compact && (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", statusCfg.bg, statusCfg.color)}>
            {statusCfg.label}
          </span>
          {task.progress !== undefined && task.progress > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.progress}%` }} />
              </div>
              <span className="text-[10px] text-gray-400">{task.progress}%</span>
            </div>
          )}
        </div>
      )}

      {/* 紧凑模式状态条 */}
      {compact && (
        <div className={cn("mt-1.5 h-1 rounded-full", isLate ? "bg-red-200" : "bg-gray-100")}>
          <div
            className={cn("h-full rounded-full", task.status === "completed" ? "bg-emerald-400" : isLate ? "bg-red-400" : "bg-indigo-400")}
            style={{ width: task.status === "completed" ? "100%" : task.status === "in_progress" ? "60%" : "20%" }}
          />
        </div>
      )}
    </div>
  );

  if (compact) return card;

  return (
    <div className="group relative">
      {card}
      {onAction && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {task.status === "pending" && (
            <button onClick={(e) => { e.stopPropagation(); onAction("start"); }}
              className="px-2 py-1 rounded text-[10px] bg-indigo-500 text-white hover:bg-indigo-600">开始</button>
          )}
          {(task.status === "pending" || task.status === "in_progress") && (
            <button onClick={(e) => { e.stopPropagation(); onAction("complete"); }}
              className="px-2 py-1 rounded text-[10px] bg-emerald-500 text-white hover:bg-emerald-600">完成</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onAction("delegate"); }}
            className="px-2 py-1 rounded text-[10px] bg-gray-100 text-gray-600 hover:bg-gray-200">转办</button>
        </div>
      )}
    </div>
  );
}
