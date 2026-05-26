"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  title: string;
  content?: string;
  priority: "low" | "normal" | "high";
  status: "pending" | "completed";
  due_date?: string;
}

interface TodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todos: TodoItem[];
  onComplete: (id: string) => void;
  onConfirm: () => void;
}

export function TodoDialog({
  open,
  onOpenChange,
  todos,
  onComplete,
  onConfirm,
}: TodoDialogProps) {
  const [localTodos, setLocalTodos] = useState<TodoItem[]>(todos);

  const pendingCount = localTodos.filter(
    (t) => t.status === "pending"
  ).length;
  const completedCount = localTodos.filter(
    (t) => t.status === "completed"
  ).length;

  const handleComplete = (id: string) => {
    setLocalTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              status:
                todo.status === "completed" ? "pending" : "completed",
            }
          : todo
      )
    );
    onComplete(id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "normal":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              今日待办事项
            </DialogTitle>
            <div className="flex gap-2">
              <Badge variant="secondary" className="font-normal">
                待处理 {pendingCount}
              </Badge>
              <Badge
                variant="secondary"
                className="font-normal text-green-600"
              >
                已完成 {completedCount}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {localTodos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">太棒了！</p>
                <p className="text-sm">当前没有待处理的事项</p>
              </div>
            ) : (
              localTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border transition-all duration-200",
                    todo.status === "completed"
                      ? "bg-muted/50 border-muted"
                      : "bg-background hover:bg-muted/30 border-border"
                  )}
                >
                  <button
                    onClick={() => handleComplete(todo.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {todo.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          "font-medium",
                          todo.status === "completed" &&
                            "line-through text-muted-foreground"
                        )}
                      >
                        {todo.title}
                      </h4>
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-normal",
                          getPriorityColor(todo.priority)
                        )}
                      >
                        {todo.priority === "high"
                          ? "紧急"
                          : todo.priority === "normal"
                          ? "普通"
                          : "低"}
                      </Badge>
                    </div>
                    {todo.content && (
                      <p
                        className={cn(
                          "text-sm text-muted-foreground",
                          todo.status === "completed" && "line-through"
                        )}
                      >
                        {todo.content}
                      </p>
                    )}
                    {todo.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        截止: {todo.due_date}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => {
                      setLocalTodos((prev) =>
                        prev.filter((t) => t.id !== todo.id)
                      );
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            稍后处理
          </Button>
          <Button onClick={onConfirm} disabled={pendingCount === 0}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            确认进入 ({pendingCount})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
