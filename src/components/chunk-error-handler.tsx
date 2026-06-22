'use client';

import { useEffect } from 'react';

/**
 * 全局 ChunkLoadError 处理器
 *
 * Next.js Turbopack 开发模式下，热更新后旧 chunk 文件名会失效，
 * 浏览器仍在请求旧文件导致 ChunkLoadError。
 *
 * 该组件通过多种方式监听错误，检测到 chunk 加载失败时自动刷新页面，
 * 让浏览器加载最新的 chunk 文件。
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    let hasReloaded = false;

    let lastReloadTime = 0;
    const RELOAD_COOLDOWN = 60000; // 60s cooldown between reloads

    const tryReload = () => {
      if (hasReloaded) return;
      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOLDOWN) return;
      lastReloadTime = now;
      hasReloaded = true;
      console.warn('[ChunkErrorHandler] 检测到 chunk 加载失败，正在自动刷新页面...');
      window.location.replace(window.location.href);
    };

    // 仅匹配 Next.js / Turbopack 的 chunk 加载失败错误
    // 额外要求包含 /_next/static/ 路径，避免匹配第三方库的无关错误
    const isChunkError = (msg: string): boolean => {
      if (!msg) return false;
      const lower = msg.toLowerCase();
      const hasChunkKeyword = (
        lower.includes('chunkloaderror') ||
        lower.includes('loading chunk') ||
        lower.includes('failed to load chunk') ||
        lower.includes('loading css chunk')
      );
      const hasNextPath = lower.includes('/_next/static/');
      return hasChunkKeyword && hasNextPath;
    };

    // 方式1: window.error 事件
    const handleError = (e: ErrorEvent) => {
      if (hasReloaded) return;
      const msg = (e.message || '').toString();
      if (isChunkError(msg)) {
        e.preventDefault();
        tryReload();
      }
    };

    // 方式2: unhandledrejection 事件（Promise 中抛出的错误）
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (hasReloaded) return;
      const reason = e.reason;
      const msg = (
        reason?.message ||
        reason?.toString?.() ||
        (typeof reason === 'string' ? reason : '')
      ).toString();
      if (isChunkError(msg)) {
        e.preventDefault();
        tryReload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
