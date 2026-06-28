/**
 * 采购模块工具函数
 * 兼容 procurement_modules 的两种格式：
 *   - 旧格式: string[] (仅模块 code)
 *   - 新格式: { code: string; quantity: number }[] (带数量)
 */

export interface SelectedModule {
  code: string;
  quantity: number;
}

/**
 * 从 procurement_modules 中提取模块 code 列表
 * 兼容 string[] 和 SelectedModule[] 两种格式
 */
export function extractModuleCodes(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return modules
    .map((m) => {
      if (typeof m === "string") return m;
      if (typeof m === "object" && m !== null && "code" in m) {
        return String((m as Record<string, unknown>).code || "");
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * 将 procurement_modules 规范化为 SelectedModule[] 格式
 * 兼容旧格式 string[] → 默认 quantity = 1
 */
export function normalizeProcurementModules(
  modules: unknown
): SelectedModule[] {
  if (!Array.isArray(modules)) return [];
  return modules
    .map((m) => {
      if (typeof m === "string") return { code: m, quantity: 1 };
      if (typeof m === "object" && m !== null && "code" in m) {
        const obj = m as Record<string, unknown>;
        return {
          code: String(obj.code || ""),
          quantity: Math.max(1, Number(obj.quantity) || 1),
        };
      }
      return null;
    })
    .filter((m): m is SelectedModule => m !== null && m.code !== "");
}
