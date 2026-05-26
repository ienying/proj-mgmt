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

    const tryReload = () => {
      if (hasReloaded) return;
      hasReloaded = true;
      console.warn('[ChunkErrorHandler] 检测到 chunk 加载失败，正在自动刷新页面...');
      // 使用 replace 避免用户按后退键回到损坏的页面
      window.location.replace(window.location.href);
    };

    // 匹配 chunk 加载失败的错误消息
    const isChunkError = (msg: string): boolean => {
      if (!msg) return false;
      const lower = msg.toLowerCase();
      return (
        lower.includes('chunkloaderror') ||
        lower.includes('loading chunk') ||
        lower.includes('failed to load chunk') ||
        lower.includes('loading css chunk') ||
        lower.includes('dynamically imported module') ||
        (lower.includes('import') && lower.includes('failed'))
      );
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

    // 方式3: 拦截 Next.js RSC 的 chunk 加载失败
    // Next.js 内部使用 dynamic import，失败时会抛出错误
    // 但这个错误可能被 React 内部 catch 掉，不会触发上面两个事件
    // 通过 monkey-patch console.error 来捕获
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (hasReloaded) {
        originalConsoleError.apply(console, args);
        return;
      }
      const msg = args.map(a => (typeof a === 'string' ? a : a?.toString?.() || '')).join(' ');
      if (isChunkError(msg)) {
        tryReload();
        return; // 不输出这个错误，直接刷新
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
