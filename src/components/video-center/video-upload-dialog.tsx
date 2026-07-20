"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2, FileText, Paperclip, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: string[];
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onSuccess: () => void;
}

export default function VideoUploadDialog({
  open,
  onOpenChange,
  modules,
  currentUser,
  onSuccess,
}: VideoUploadDialogProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [moduleNames, setModuleNames] = useState<string[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleOpen, setModuleOpen] = useState(false);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const resetForm = useCallback(() => {
    setVideoFile(null);
    setTitle("");
    setModuleNames([]);
    setModuleOpen(false);
    setModuleSearch("");
    setTags("");
    setDescription("");
    setAttachments([]);
    setUploadProgress(0);
  }, []);

  // Abort upload and cleanup
  const abortUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
    toast.info("上传已取消");
  }, []);

  // Handle dialog close — abort if uploading
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (uploading) {
          abortUpload();
        }
        resetForm();
      }
      onOpenChange(open);
    },
    [uploading, abortUpload, resetForm, onOpenChange]
  );

  // Filter modules for searchable dropdown
  const filteredModules = moduleSearch
    ? modules.filter((m) => m.toLowerCase().includes(moduleSearch.toLowerCase()))
    : modules;

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    const allowedExts = [".mp4", ".webm", ".mov", ".avi"];
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");

    if (!allowed.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("仅支持 mp4/webm/mov/avi 格式");
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error("文件大小超过2GB限制");
      return;
    }

    setVideoFile(file);
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleAddAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedExts = [".ppt", ".pptx", ".doc", ".docx", ".pdf", ".md", ".zip", ".rar", ".7z", ".tar", ".gz", ".xls", ".xlsx", ".txt", ".csv"];
    const valid = files.filter((f) => {
      const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
      return allowedExts.includes(ext);
    });
    if (valid.length < files.length) {
      toast.warning(`已过滤 ${files.length - valid.length} 个不支持的文件类型`);
    }
    setAttachments((prev) => [...prev, ...valid]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error("请选择视频文件");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Track uploaded file path for potential cleanup on error
    let uploadedPath: string | null = null;

    try {
      // 1. Upload video file with abort support
      const videoForm = new FormData();
      videoForm.append("file", videoFile);

      const uploadResult = await new Promise<{ url: string; file_name: string; file_path: string; file_size: number; thumbnail?: string | null }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.open("POST", "/api/video-center/upload");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 80));
            }
          };

          xhr.onload = () => {
            xhrRef.current = null;
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              if (data.data) resolve(data.data);
              else reject(new Error(data.error || "上传失败"));
            } else {
              try {
                reject(new Error(JSON.parse(xhr.responseText).error || "上传失败"));
              } catch {
                reject(new Error("上传失败"));
              }
            }
          };

          xhr.onerror = () => {
            xhrRef.current = null;
            reject(new Error("网络错误，请检查网络连接后重试"));
          };

          xhr.onabort = () => {
            xhrRef.current = null;
            reject(new Error("ABORTED"));
          };

          xhr.send(videoForm);
        }
      );

      uploadedPath = uploadResult.file_path;

      // 2. Create video record
      const videoRes = await fetch("/api/video-center/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || videoFile.name,
          file_name: uploadResult.file_name,
          file_path: uploadResult.file_path,
          file_size: uploadResult.file_size,
          thumbnail: uploadResult.thumbnail || null,
          module_name: moduleNames.length > 0 ? moduleNames.join(",") : null,
          tags: tags || null,
          description: description || null,
          created_by: currentUser?.id || null,
          created_by_name: currentUser?.name || null,
        }),
      });
      const videoJson = await videoRes.json();
      if (videoJson.error) {
        throw new Error(videoJson.error);
      }

      const videoId = (videoJson.data as Record<string, unknown>)?.id as string;
      setUploadProgress(90);

      // 3. Upload attachments if any
      if (attachments.length > 0 && videoId) {
        const attachForm = new FormData();
        attachForm.append("video_id", videoId);
        attachments.forEach((f) => attachForm.append("files", f));

        const attachRes = await fetch("/api/video-center/upload-attachment", {
          method: "POST",
          body: attachForm,
        });
        const attachJson = await attachRes.json();
        if (attachJson.error) {
          toast.warning("配套文件上传失败: " + attachJson.error);
        }
      }

      setUploadProgress(100);
      toast.success("上传成功");
      resetForm();
      onSuccess();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "ABORTED") return; // Already handled by abortUpload

      toast.error("上传失败: " + msg);

      // Cleanup orphaned file on disk if video was uploaded but DB record failed
      if (uploadedPath) {
        try {
          await fetch(`/api/video-center/upload?file=${encodeURIComponent(uploadedPath)}`, { method: "DELETE" });
        } catch { /* best effort */ }
      }
    } finally {
      xhrRef.current = null;
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (uploading) {
      abortUpload();
      return;
    }
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传视频
          </DialogTitle>
          <DialogDescription>
            上传视频文件并填写相关信息，支持添加配套文档
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video file picker */}
          <div>
            <Label>视频文件 *</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
              className="hidden"
              onChange={handleVideoSelect}
              disabled={uploading}
            />
            {videoFile ? (
              <div className="flex items-center gap-2 mt-1.5 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-purple-900 truncate">{videoFile.name}</p>
                  <p className="text-xs text-purple-600">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setVideoFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1.5 h-20 border-dashed"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-5 h-5 mr-2" />
                点击选择视频文件
              </Button>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="vc-title">视频名称</Label>
            <Input
              id="vc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="自动从文件名读取，可修改"
              className="mt-1.5"
              disabled={uploading}
            />
          </div>

          {/* Multi-select Module dropdown */}
          <div>
            <Label>产品目录</Label>
            <Popover open={moduleOpen} onOpenChange={setModuleOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full mt-1.5 justify-between font-normal",
                    moduleNames.length === 0 && "text-muted-foreground"
                  )}
                  disabled={uploading}
                >
                  {moduleNames.length > 0
                    ? `已选 ${moduleNames.length} 个产品目录`
                    : "选择产品目录（可选）"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="搜索产品目录..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="h-8 text-sm border-0 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {filteredModules.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">未找到匹配的模块</p>
                  ) : (
                    filteredModules.map((m) => {
                      const isSelected = moduleNames.includes(m);
                      return (
                        <div
                          key={m}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            if (isSelected) {
                              setModuleNames((prev) => prev.filter((n) => n !== m));
                            } else {
                              setModuleNames((prev) => [...prev, m]);
                            }
                          }}
                        >
                          <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                          <span className="text-sm">{m}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                {moduleNames.length > 0 && (
                  <div className="border-t p-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-gray-500"
                      onClick={() => {
                        setModuleNames([]);
                        setModuleSearch("");
                        setModuleOpen(false);
                      }}
                    >
                      清除全部
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {/* Show selected module badges */}
            {moduleNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {moduleNames.map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      if (!uploading) {
                        setModuleNames((prev) => prev.filter((n) => n !== name));
                      }
                    }}
                  >
                    {name}
                    <X className="w-3 h-3 ml-0.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="vc-tags">标签</Label>
            <Input
              id="vc-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="多个标签用逗号分隔，如: 培训,入门,操作指南"
              className="mt-1.5"
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="vc-desc">描述</Label>
            <Textarea
              id="vc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="视频内容简介（可选）"
              rows={3}
              className="mt-1.5"
              disabled={uploading}
            />
          </div>

          {/* Attachments */}
          <div>
            <Label>配套文件（可选）</Label>
            <p className="text-xs text-gray-400 mb-1.5">支持 PPT、Word、PDF、Markdown、压缩包</p>
            <input
              ref={attachInputRef}
              type="file"
              multiple
              accept=".ppt,.pptx,.doc,.docx,.pdf,.md,.zip,.rar,.7z,.tar,.gz,.xls,.xlsx,.txt,.csv"
              className="hidden"
              onChange={handleAddAttachments}
              disabled={uploading}
            />
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border text-sm">
                    <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeAttachment(i)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => attachInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="w-4 h-4 mr-1.5" />
              添加配套文件
            </Button>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                上传中 {uploadProgress}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">上传中请勿关闭页面，关闭将取消上传</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              {uploading ? "取消上传" : "取消"}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!videoFile || uploading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  确认上传
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
