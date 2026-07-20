import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 复制文本到剪贴板，兼容 HTTP 和 HTTPS 环境。
 * navigator.clipboard 在非安全上下文（HTTP、非 localhost）下不可用，此时降级为
 * document.execCommand('copy')。
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for non-HTTPS / insecure contexts
  return new Promise<void>((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      resolve();
    } catch (e) {
      document.body.removeChild(textarea);
      reject(e instanceof Error ? e : new Error('复制失败'));
    }
  });
}
