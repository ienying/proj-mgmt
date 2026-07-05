"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, FileSpreadsheet, File, Loader2, Download, Trash2, Image, Archive } from "lucide-react";
import { toast } from "sonner";

// 文件信息接口
export interface FileInfo {
  key: string;
  name: string;
  size: number;
}

// 文件类型对应的 accept 和图标
const FILE_TYPE_CONFIG: Record<string, { accept: string; icon: React.ElementType; color: string }> = {
  attachment: { accept: ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.md,.markdown,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.ico,.zip,.rar,.7z,.tar,.gz", icon: FileText, color: "text-blue-600" },
  office: { accept: ".doc,.docx,.xls,.xlsx,.ppt,.pptx", icon: FileSpreadsheet, color: "text-blue-600" },
  pdf: { accept: ".pdf", icon: FileText, color: "text-red-500" },
  md: { accept: ".md,.markdown,.txt", icon: FileText, color: "text-purple-600" },
  image: { accept: ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.ico", icon: Image, color: "text-emerald-500" },
  archive: { accept: ".zip,.rar,.7z,.tar,.gz,.bz2,.xz,.tar.gz,.tgz", icon: Archive, color: "text-amber-600" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface FileUploadFieldProps {
  fileType: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  projectCode?: string;
}

export function FileUploadField({
  fileType,
  value,
  onChange,
  disabled = false,
  maxFiles = 10,
  projectCode,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.office;
  const IconComp = config.icon;

  // 解析已有文件列表
  const files: FileInfo[] = (() => {
    try {
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // 上传文件
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      // 检查数量限制
      if (files.length + selectedFiles.length > maxFiles) {
        toast.error(`最多上传 ${maxFiles} 个文件`);
        return;
      }

      setUploading(true);
      try {
        const newFiles: FileInfo[] = [...files];

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileType", fileType);
          if (projectCode) formData.append("projectCode", projectCode);

          const res = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "上传失败");
          }

          const data = await res.json();
          newFiles.push({
            key: data.key,
            name: data.name,
            size: data.size,
          });
        }

        onChange(JSON.stringify(newFiles));
        toast.success("文件上传成功");
      } catch (error) {
        toast.error("上传失败: " + (error instanceof Error ? error.message : String(error)));
      } finally {
        setUploading(false);
        // 重置 input 以允许重新选择相同文件
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [files, fileType, maxFiles, onChange]
  );

  // 删除文件
  const handleRemove = useCallback(
    async (index: number) => {
      const fileToRemove = files[index];
      const newFiles = files.filter((_, i) => i !== index);

      // 从对象存储删除
      try {
        await fetch(`/api/files/download?key=${encodeURIComponent(fileToRemove.key)}`, {
          method: "DELETE",
        });
      } catch {
        // 删除存储文件失败不影响本地状态更新
      }

      onChange(newFiles.length > 0 ? JSON.stringify(newFiles) : "");
    },
    [files, onChange]
  );

  // 下载文件
  const handleDownload = useCallback(async (file: FileInfo) => {
    try {
      const res = await fetch(`/api/files/download?key=${encodeURIComponent(file.key)}`);
      if (!res.ok) throw new Error("获取下载链接失败");
      const { url } = await res.json();

      // 使用 fetch + blob 下载
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("下载失败");
    }
  }, []);

  return (
    <div className="space-y-2">
      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={file.key}
              className="flex items-center gap-2 rounded-md border px-3 py-2 group hover:bg-muted/50 transition-colors"
            >
              {fileType === "image" ? (
                <ImageThumbnail fileKey={file.key} fileName={file.name} />
              ) : (
                <IconComp className={`h-4 w-4 shrink-0 ${config.color}`} />
              )}
              <span className="text-sm flex-1 truncate" title={file.name}>
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(file.size)}
              </span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleDownload(file)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {!disabled && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading || files.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                上传{files.length > 0 ? "" : "文件"}
                {files.length > 0 && ` (${files.length}/${maxFiles})`}
              </>
            )}
          </Button>
        </div>
      )}

      {/* 空状态 */}
      {files.length === 0 && disabled && (
        <span className="text-sm text-muted-foreground">暂无文件</span>
      )}
    </div>
  );
}

/**
 * 图片缩略图组件
 */
function ImageThumbnail({ fileKey, fileName }: { fileKey: string; fileName: string }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/files/download?key=${encodeURIComponent(fileKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setSrc(data.url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fileKey]);

  if (loading) {
    return (
      <span className="inline-flex items-center justify-center w-10 h-10 rounded bg-muted">
        <Image className="h-4 w-4 text-emerald-500 animate-pulse" />
      </span>
    );
  }

  if (!src) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted" title={fileName}>
        <Image className="h-3 w-3 text-emerald-500" />
        <span className="truncate max-w-[80px]">{fileName}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      title={fileName}
      className="w-10 h-10 rounded object-cover border"
    />
  );
}

/**
 * 渲染文件类型的只读显示（用于表格单元格）
 * 显示文件图标 + 文件数量
 */
export function renderFileCellDisplay(value: string, fileType: string): React.ReactNode {
  const config = FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.office;
  const IconComp = config.icon;

  try {
    if (!value) return <span className="text-slate-400">-</span>;
    const files: FileInfo[] = JSON.parse(value);
    if (!Array.isArray(files) || files.length === 0) return <span className="text-slate-400">-</span>;

    // 图片类型显示缩略图
    if (fileType === "image") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {files.map((f, i) => (
            <ImageThumbnail key={i} fileKey={f.key} fileName={f.name} />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {files.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted">
            <IconComp className={`h-3 w-3 ${config.color}`} />
            <span className="truncate max-w-[120px]" title={f.name}>
              {f.name}
            </span>
          </span>
        ))}
      </div>
    );
  } catch {
    return <span className="text-slate-400">-</span>;
  }
}

/**
 * 获取文件类型配置（供其他组件使用）
 */
export function getFileTypeConfig(fileType: string) {
  return FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.office;
}
