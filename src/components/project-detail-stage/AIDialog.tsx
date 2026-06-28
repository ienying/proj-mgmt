"use client";

import { useState, useRef, useEffect } from "react";

interface AIDialogProps {
  open: boolean;
  onClose: () => void;
  replies: string[];
}

export function AIDialog({ open, onClose, replies }: AIDialogProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // 点击外部关闭 + Escape 键关闭
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const reply = replies[Math.floor(Math.random() * replies.length)];
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "ai", text: reply },
    ]);
    setInput("");
  };

  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-38 bg-black/15 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-39 w-[520px] max-h-[70vh] bg-[var(--s-surface)] border border-[var(--s-border)] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--s-border)]">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--s-text)]">
            <span className="w-2 h-2 rounded-full bg-[var(--s-orange)] animate-[pulse_2s_infinite]" />
            AI 项目助手
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-[var(--s-border)] bg-[var(--s-surface)] text-[var(--s-text-muted)] text-sm cursor-pointer transition-all hover:bg-[var(--s-surface2)] hover:text-[var(--s-red)] hover:border-[var(--s-red)]"
          >
            ✕
          </button>
        </div>

        {/* 消息区 */}
        <div ref={bodyRef} className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-xs text-[var(--s-text-secondary)] leading-relaxed p-3 bg-[var(--s-surface2)] border-l-2 border-[var(--s-orange)]">
              你好！我是 AI 项目助手，可以帮你分析项目数据、回答进度问题、提供管理建议。请输入你的问题。
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className="text-xs leading-relaxed p-3"
              style={{
                backgroundColor: m.role === "user" ? "var(--s-surface)" : "var(--s-surface2)",
                borderLeft: m.role === "user" ? "2px solid var(--s-blue)" : "2px solid var(--s-orange)",
              }}
            >
              {m.role === "user" ? `👤 ${m.text}` : `🤖 ${m.text}`}
            </div>
          ))}
        </div>

        {/* 输入区 */}
        <div className="flex gap-2 px-5 py-3 border-t border-[var(--s-border)]">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入问题..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-[var(--s-surface2)] border border-[var(--s-border)] text-[var(--s-text)] outline-none font-sans focus:border-[var(--s-orange)]"
          />
          <button
            onClick={handleSend}
            className="px-4.5 py-2.5 text-xs font-semibold bg-[var(--s-orange)] text-white border-none cursor-pointer transition-all hover:bg-[var(--s-orange-dim)]"
          >
            发送
          </button>
        </div>
      </div>
    </>
  );
}
