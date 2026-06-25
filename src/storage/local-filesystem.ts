import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const BASE_DIR =
  process.env.KNOWLEDGE_STORAGE_DIR || path.join(process.cwd(), "data", "info-square");

const CATEGORY_DIRS: Record<string, string> = {
  tech_doc: "tech_doc",
  product_manual: "product_manual",
  ops_tool: "ops_tool",
  acceptance: "acceptance",
  solution_template: "solution_template",
};

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function getCategoryDir(categoryType: string): string {
  const sub = CATEGORY_DIRS[categoryType] || "other";
  return path.join(BASE_DIR, sub);
}

export function resolveFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(BASE_DIR, filePath);
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  categoryType: string
): Promise<{
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}> {
  const categoryDir = getCategoryDir(categoryType);
  await ensureDir(categoryDir);

  const ext = path.extname(originalName);
  const storedName = `${randomUUID()}${ext}`;
  const fullPath = path.join(categoryDir, storedName);
  await fs.writeFile(fullPath, buffer);

  const relativePath = path.relative(BASE_DIR, fullPath);
  return {
    file_path: relativePath,
    file_name: originalName,
    file_size: buffer.length,
    mime_type: getMimeType(ext),
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = resolveFilePath(filePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    // File doesn't exist — already deleted, not an error
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function getFileStream(filePath: string) {
  const fullPath = resolveFilePath(filePath);
  if (!existsSync(fullPath)) return null;
  return createReadStream(fullPath);
}

export function fileExists(filePath: string): boolean {
  return existsSync(resolveFilePath(filePath));
}

export async function getFileSize(filePath: string): Promise<number> {
  const fullPath = resolveFilePath(filePath);
  const stat = await fs.stat(fullPath);
  return stat.size;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".md": "text/markdown",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

export { CATEGORY_DIRS, BASE_DIR };
