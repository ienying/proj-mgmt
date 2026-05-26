"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Video, Trash2, Play, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// 视频信息接口
export interface VideoInfo {
  url: string;
  name: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

interface VideoUploadFieldProps {
  projectCode: string;
  value: string; // JSON 字符串: [{url, name, size}]
  onChange: (value: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function VideoUploadField({
  projectCode,
  value,
  onChange,
  disabled = false,
  maxFiles = 3,
  maxSizeMB = 1024,
}: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVideo, setPreviewVideo] = useState<VideoInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析已有视频列表
  const videos: VideoInfo[] = (() => {
    try {
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // 上传视频
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      // 检查数量限制
      if (videos.length + selectedFiles.length > maxFiles) {
        toast.error(`最多上传 ${maxFiles} 个视频`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const newVideos: VideoInfo[] = [...videos];

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];

          // 检查单文件大小
          if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`文件 ${file.name} 超过 ${maxSizeMB >= 1024 ? (maxSizeMB / 1024) + 'GB' : maxSizeMB + 'MB'} 限制`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("projectCode", projectCode);

          // 使用 XMLHttpRequest 以支持进度显示
          const result = await new Promise<VideoInfo>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload-video");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(progress);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data.data) {
                    resolve(data.data as VideoInfo);
                  } else {
                    reject(new Error(data.error || "上传失败"));
                  }
                } catch {
                  reject(new Error("解析响应失败"));
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  reject(new Error(errorData.error || "上传失败"));
                } catch {
                  reject(new Error("上传失败"));
                }
              }
            };

            xhr.onerror = () => reject(new Error("网络错误"));
            xhr.send(formData);
          });

          newVideos.push(result);
        }

        onChange(JSON.stringify(newVideos));
        toast.success("视频上传成功");
      } catch (error) {
        toast.error("上传失败: " + (error instanceof Error ? error.message : String(error)));
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [videos, projectCode, maxFiles, maxSizeMB, onChange]
  );

  // 删除视频
  const handleRemove = useCallback(
    async (index: number) => {
      const videoToRemove = videos[index];
      const newVideos = videos.filter((_, i) => i !== index);

      // 从服务端删除
      try {
        await fetch(`/api/upload-video?path=${encodeURIComponent(videoToRemove.url)}`, {
          method: "DELETE",
        });
      } catch {
        // 删除存储文件失败不影响本地状态更新
      }

      onChange(newVideos.length > 0 ? JSON.stringify(newVideos) : "");
    },
    [videos, onChange]
  );

  return (
    <div className="space-y-2">
      {/* 已上传视频列表 */}
      {videos.length > 0 && (
        <div className="space-y-1.5">
          {videos.map((video, index) => (
            <div
              key={video.url}
              className="flex items-center gap-2 rounded-md border px-3 py-2 group hover:bg-muted/50 transition-colors"
            >
              <Video className="h-4 w-4 shrink-0 text-purple-500" />
              <span className="text-sm flex-1 truncate" title={video.name}>
                {video.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(video.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setPreviewVideo(video)}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
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
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading || videos.length >= maxFiles}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                上传中 {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                上传视频{videos.length > 0 ? ` (${videos.length}/${maxFiles})` : ""}
              </>
            )}
          </Button>
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {videos.length === 0 && disabled && (
        <span className="text-sm text-muted-foreground">暂无视频</span>
      )}

      {/* 视频预览弹窗 */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {previewVideo?.name || "视频预览"}
            </DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={previewVideo.url}
                controls
                className="w-full h-full"
                autoPlay
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * 渲染视频类型的只读显示（用于表格单元格）
 */
export function renderVideoCellDisplay(value: string): React.ReactNode {
  try {
    if (!value) return <span className="text-slate-400">-</span>;
    const videos: VideoInfo[] = JSON.parse(value);
    if (!Array.isArray(videos) || videos.length === 0) return <span className="text-slate-400">-</span>;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {videos.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
            <Video className="h-3 w-3" />
            <span className="truncate max-w-[120px]" title={v.name}>
              {v.name}
            </span>
          </span>
        ))}
      </div>
    );
  } catch {
    return <span className="text-slate-400">-</span>;
  }
}
