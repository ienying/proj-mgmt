"use client";

interface ProductGridProps {
  modules?: Array<string | { code?: string; module_code?: string; module_name?: string; name?: string; quantity?: number }>;
  moduleDict?: { code: string; name: string }[];
}

// 辅助：安全提取字符串
function s(v: unknown): string {
  if (typeof v === "string") return v;
  return "";
}

// 辅助：安全提取数字
function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? 1 : p; }
  return 1;
}

// code → 字典查找中文名
function lookupName(code: string, dict?: { code: string; name: string }[]): string {
  const found = (dict || []).find((d) => d.code === code);
  return found?.name || code;
}

// 从模块数据中提取名称和数量
function parseModule(m: string | Record<string, unknown>, dict?: { code: string; name: string }[]): { name: string; qty: number } {
  if (typeof m === "string") return { name: lookupName(m, dict), qty: 1 };
  const rawCode = s(m.module_code || m.code || "");
  const rawName = s(m.module_name || m.name || "");
  const name = rawName || lookupName(rawCode, dict);
  const qty = n(m.quantity || 1);
  return { name, qty };
}

export function ProductGrid({ modules, moduleDict }: ProductGridProps) {
  const parsedModules = (modules || []).map((m) => parseModule(m, moduleDict)).filter((m) => m.name);

  // 汇总每个模块的数量
  const merged = new Map<string, number>();
  for (const m of parsedModules) {
    merged.set(m.name, (merged.get(m.name) || 0) + m.qty);
  }
  const items = Array.from(merged.entries()).map(([name, qty]) => ({ name, qty }));
  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  const totalModules = items.length;

  return (
    <div className="px-16 py-6" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div
        className="text-[9px] uppercase tracking-[2px] mb-4 flex items-center gap-2"
        style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)" }}
      >
        已采购产品清单 · {totalModules} 项 · 共 {totalQty} 套
        <span className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--s-text-muted)]">暂无采购产品数据</p>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-[var(--s-border)] rounded text-xs text-[var(--s-text-secondary)] transition-all hover:bg-[var(--s-surface)] hover:border-[var(--s-orange)] hover:text-[var(--s-text)] cursor-default"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--s-orange)] opacity-50 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
              <span
                className="ml-auto flex-shrink-0 text-[10px] font-medium"
                style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
              >
                ×{item.qty}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
