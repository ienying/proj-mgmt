/**
 * 简单的 TTL 内存缓存。
 * 用于缓存字典、规范表定义等低频变动数据。
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** 从缓存取值，过期或不存在则调用 fetcher 并缓存 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiry > now) {
    return entry.data;
  }

  const data = await fetcher();
  store.set(key, { data, expiry: now + ttlMs });
  return data;
}

/** 主动清除指定 key 的缓存 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/** 清除所有匹配前缀的缓存 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** 清除所有缓存 */
export function clearAllCache(): void {
  store.clear();
}

/** 缓存 TTL 常量（毫秒） */
export const TTL = {
  DICTS: 5 * 60 * 1000,       // 字典数据 5 分钟
  STANDARDS: 2 * 60 * 1000,   // 规范表定义 2 分钟
  MODULE_TYPES: 5 * 60 * 1000,// 模块类型 5 分钟
  USERS: 3 * 60 * 1000,       // 用户列表 3 分钟
} as const;
