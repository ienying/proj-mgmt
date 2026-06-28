"use client";

interface ProductGridProps {
  modules?: string[];
}

const MOCK_PRODUCTS = [
  "统一身份认证平台", "基础教务管理系统", "成绩管理系统", "在线考试系统",
  "校园一卡通系统", "家校互通平台", "数据中台", "智慧食堂系统",
  "智慧图书馆系统", "校园安防监控", "智慧教育云平台", "在线学习平台",
  "教学资源库系统", "智慧评价系统", "学籍管理系统", "教师发展平台",
  "教育大数据分析", "智慧办公系统", "智慧校园门户", "移动校园App",
  "智慧课堂互动系统", "校园广播系统", "电子班牌系统", "智慧实验室管理",
  "体育健康管理", "心理健康平台", "校友管理系统", "智慧教育课堂教学分析系统",
];

const DEPLOY_STATUS: Record<number, "deployed" | "partial" | "none"> = {
  0: "deployed", 1: "deployed", 2: "deployed", 3: "deployed",
  4: "deployed", 5: "deployed", 6: "deployed", 7: "deployed",
  8: "deployed", 9: "deployed", 10: "deployed", 11: "deployed",
  12: "deployed", 13: "deployed", 14: "deployed", 15: "deployed",
  16: "deployed", 17: "deployed", 18: "deployed", 19: "deployed",
  20: "deployed", 21: "deployed", 22: "deployed", 23: "deployed",
  24: "deployed", 25: "deployed", 26: "partial", 27: "partial",
};

export function ProductGrid({ modules }: ProductGridProps) {
  const products = modules && modules.length > 0 ? modules : MOCK_PRODUCTS;

  return (
    <div className="px-16 py-6" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div
        className="text-[9px] uppercase tracking-[2px] mb-4 flex items-center gap-2"
        style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)" }}
      >
        采购产品清单
        <span className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
      >
        {products.map((name, i) => {
          const status = DEPLOY_STATUS[i] || "none";
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-[var(--s-border)] rounded text-xs text-[var(--s-text-secondary)] transition-all hover:bg-[var(--s-surface)] hover:border-[var(--s-orange)] hover:text-[var(--s-text)] cursor-default"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--s-orange)] opacity-50 flex-shrink-0" />
              <span className="truncate">{name}</span>
              {status === "deployed" && (
                <span className="text-[9px] px-1.5 font-semibold border border-[var(--s-green)] text-[var(--s-green)] ml-auto flex-shrink-0">
                  已部署
                </span>
              )}
              {status === "partial" && (
                <span className="text-[9px] px-1.5 font-semibold border border-[var(--s-blue)] text-[var(--s-blue)] ml-auto flex-shrink-0">
                  部分部署
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
