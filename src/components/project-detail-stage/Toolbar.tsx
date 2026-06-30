"use client";

interface ToolbarProps {
  onNavToggle: () => void;
  navActive: boolean;
  onSearch: () => void;
  onAIToggle: () => void;
  aiActive: boolean;
  isDark: boolean;
  onThemeToggle: () => void;
  onSwitchLayout: () => void;
}

export function Toolbar({ onNavToggle, navActive, onSearch, onAIToggle, aiActive, isDark, onThemeToggle, onSwitchLayout }: ToolbarProps) {
  const btnClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 h-[38px] cursor-pointer whitespace-nowrap text-xs font-medium tracking-[0.3px] transition-all border border-[var(--s-border)] bg-[var(--s-surface)] ${
      active
        ? "text-[var(--s-orange)] border-l-2 border-l-[var(--s-orange)]"
        : "text-[var(--s-text-muted)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
    }`;

  return (
    <div className="fixed z-35 flex gap-0" style={{ top: "76px", right: "24px" }}>
      {/* 导航抽屉 */}
      <button onClick={onNavToggle} className={btnClass(navActive)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        导航
      </button>

      {/* 搜索 */}
      <button onClick={onSearch} className={btnClass(false)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        搜索
      </button>

      {/* AI */}
      <button onClick={onAIToggle} className={btnClass(aiActive)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        AI助手
      </button>

      {/* 主题 */}
      <button onClick={onThemeToggle} className={btnClass(false)}>
        <span className="text-sm mr-0.5">{isDark ? "☾" : "☀"}</span>
        主题
      </button>

      {/* 切换布局 */}
      <button onClick={onSwitchLayout}
        className="flex items-center gap-1.5 px-3 h-[38px] cursor-pointer whitespace-nowrap text-xs font-medium tracking-[0.3px] transition-all border border-[var(--s-orange)] text-[var(--s-orange)] bg-[var(--s-surface)] hover:bg-[rgba(232,89,12,.06)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        切换布局
      </button>
    </div>
  );
}
