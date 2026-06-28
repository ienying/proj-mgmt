"use client";

interface ToolbarProps {
  onNavToggle: () => void;
  navActive: boolean;
  onSearch: () => void;
  onAIToggle: () => void;
  aiActive: boolean;
  isDark: boolean;
  onThemeToggle: () => void;
}

export function Toolbar({ onNavToggle, navActive, onSearch, onAIToggle, aiActive, isDark, onThemeToggle }: ToolbarProps) {
  return (
    <div className="fixed z-35 flex gap-1" style={{ top: "76px", right: "24px" }}>
      {/* 导航抽屉按钮 */}
      <button
        onClick={onNavToggle}
        className={`w-10 h-10 flex items-center justify-center border cursor-pointer transition-all ${
          navActive
            ? "bg-[var(--s-surface2)] text-[var(--s-orange)] border-[var(--s-orange)]"
            : "bg-[var(--s-surface)] text-[var(--s-text-muted)] border-[var(--s-border)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* 搜索按钮（占位） */}
      <button
        onClick={onSearch}
        className="w-10 h-10 flex items-center justify-center bg-[var(--s-surface)] border border-[var(--s-border)] text-[var(--s-text-muted)] cursor-pointer transition-all hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* AI 助手按钮 */}
      <button
        onClick={onAIToggle}
        className={`w-10 h-10 flex items-center justify-center border cursor-pointer transition-all ${
          aiActive
            ? "bg-[var(--s-surface2)] text-[var(--s-orange)] border-[var(--s-orange)]"
            : "bg-[var(--s-surface)] text-[var(--s-text-muted)] border-[var(--s-border)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {/* 主题切换按钮 */}
      <button
        onClick={onThemeToggle}
        className="w-10 h-10 flex items-center justify-center bg-[var(--s-surface)] border border-[var(--s-border)] text-[var(--s-text-muted)] cursor-pointer transition-all hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)] text-sm"
      >
        {isDark ? "☾" : "☀"}
      </button>
    </div>
  );
}
