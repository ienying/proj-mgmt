"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, FileText, Plus, Eye, EyeOff, Save, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/markdown";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 border border-gray-200 rounded-lg text-gray-400 text-sm">
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      编辑器加载中...
    </div>
  ),
});

interface Category {
  id: string;
  name: string;
  category_type: string;
}

interface TagDef {
  id: string;
  name: string;
}

interface Attachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  file_type?: string;
  tags?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  category_id?: string;
  tags?: string;
  is_pinned: boolean;
  share_token?: string;
}

interface PostEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: { id?: string; name?: string; role?: string } | null;
  editPost?: Post | null;
  categoryId?: string;
  categoryType?: string;
  onSaved: () => void;
}

export default function PostEditor({
  open,
  onOpenChange,
  currentUser,
  editPost,
  categoryId,
  categoryType,
  onSaved,
}: PostEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"rich_text" | "markdown">("rich_text");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [tagStr, setTagStr] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Attachment[]>([]);
  const [activeUploads, setActiveUploads] = useState<{ fileName: string; progress: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!editPost;
  const nextVersion = editPost ? editPost.version + 1 : 1;

  useEffect(() => {
    if (open) {
      // Load categories
      fetch("/api/knowledge/categories")
        .then((r) => r.json())
        .then((j) => setCategories(j.data || []));

      // Load attachment tags
      fetch("/api/knowledge/categories/tags")
        .then((r) => r.json())
        .then((j) => setAllTags(j.data || []));

      // Populate form if editing
      if (editPost) {
        setTitle(editPost.title || "");
        setContent(editPost.content || "");
        setContentType((editPost.content_type as "rich_text" | "markdown") || "rich_text");
        setSelectedCategoryId(editPost.category_id || "");
        setIsPinned(editPost.is_pinned || false);
        const tags = editPost.tags;
        setTagStr(
          typeof tags === "string"
            ? tags
            : Array.isArray(tags)
            ? (tags as string[]).join(", ")
            : ""
        );
        // Load existing attachments
        fetch(`/api/knowledge/posts/${editPost.id}`)
          .then((r) => r.json())
          .then((j) => {
            if (j.data?.attachments) setUploadedFiles(j.data.attachments);
          });
      } else {
        setTitle("");
        setContent("");
        setContentType("rich_text");
        setSelectedCategoryId(categoryId || "");
        setIsPinned(false);
        setTagStr("");
        setUploadedFiles([]);
      }
    }
  }, [open, editPost, categoryId]);

  const uploadSingleFile = (file: File): Promise<Attachment | null> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("files", file);
      formData.append("category_type", categoryType || "tech_doc");

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setActiveUploads((prev) =>
            prev.map((u) => (u.fileName === file.name ? { ...u, progress: pct } : u))
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.data) {
              const result = Array.isArray(json.data) ? json.data[0] : json.data;
              setActiveUploads((prev) => prev.filter((u) => u.fileName !== file.name));
              setUploadedFiles((prev) => [...prev, result]);
              resolve(result);
              return;
            }
          } catch {}
        }
        toast.error(`${file.name} 上传失败`);
        setActiveUploads((prev) => prev.filter((u) => u.fileName !== file.name));
        resolve(null);
      });

      xhr.addEventListener("error", () => {
        toast.error(`${file.name} 上传失败`);
        setActiveUploads((prev) => prev.filter((u) => u.fileName !== file.name));
        resolve(null);
      });

      xhr.open("POST", "/api/knowledge/upload");
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setActiveUploads((prev) => [
      ...prev,
      ...fileList.map((f) => ({ fileName: f.name, progress: 0 })),
    ]);

    // Upload sequentially to avoid overwhelming the server
    for (const file of fileList) {
      await uploadSingleFile(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFileTags = (index: number, tags: string) => {
    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, tags } : f))
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (saving) return;

    const tags = tagStr.split(",").map((t) => t.trim()).filter(Boolean);

    const payload = {
      title,
      content,
      content_type: contentType,
      category_id: selectedCategoryId || categoryId,
      is_pinned: isPinned,
      tags,
      created_by: currentUser?.id,
      created_by_name: currentUser?.name,
      attachments: uploadedFiles.map((f) => ({
        file_name: f.file_name,
        file_path: f.file_path,
        file_size: f.file_size,
        mime_type: f.mime_type,
        file_type: f.file_type,
        tags: f.tags || "",
      })),
    };

    setSaving(true);
    try {
      const url = isEditing
        ? `/api/knowledge/posts/${editPost!.id}`
        : "/api/knowledge/posts";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.data) {
        toast.success(isEditing ? "更新成功" : "发布成功");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(json.error || "保存失败，请重试");
      }
    } catch (e) {
      toast.error("网络错误，请检查网络后重试");
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" /> 关闭
          </Button>
          <h2 className="text-lg font-semibold">
            {isEditing ? `编辑 (v${editPost!.version} → v${nextVersion})` : "发布内容"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showPreview ? "编辑" : "预览"}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {saving ? "保存中..." : isEditing ? "更新" : "发布"}
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showPreview ? (
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
              <h1 className="text-3xl font-bold mb-6">{title || "未命名"}</h1>
              {contentType === "markdown" ? (
                <Markdown>{content}</Markdown>
              ) : (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
              {/* Title */}
              <div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入标题..."
                  className="text-2xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0"
                />
              </div>

              {/* Content type toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={contentType === "rich_text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContentType("rich_text")}
                >
                  富文本
                </Button>
                <Button
                  variant={contentType === "markdown" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContentType("markdown")}
                >
                  Markdown
                </Button>
              </div>

              {/* Content editor */}
              {contentType === "markdown" ? (
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="请输入 Markdown 内容..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="border rounded-lg p-4 overflow-y-auto min-h-[400px] bg-gray-50">
                    <Markdown>{content}</Markdown>
                  </div>
                </div>
              ) : (
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="请输入内容..."
                />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - metadata */}
        <div className="w-80 shrink-0 border-l bg-gray-50 p-4 overflow-y-auto space-y-5">
          {/* Category */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">分类</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">标签</Label>
            {allTags.length > 0 && (
              <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mt-1 justify-between h-auto min-h-9 py-1.5">
                    <span className="text-muted-foreground text-xs">
                      {tagStr ? tagStr : "选择标签..."}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 ml-2 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allTags.map((tag) => {
                      const selected = tagStr.split(",").map((t) => t.trim()).includes(tag.name);
                      return (
                        <div
                          key={tag.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            const current = tagStr.split(",").map((t) => t.trim()).filter(Boolean);
                            const next = selected
                              ? current.filter((t) => t !== tag.name)
                              : [...current, tag.name];
                            setTagStr(next.join(", "));
                          }}
                        >
                          <Checkbox checked={selected} className="h-3.5 w-3.5" />
                          <span className="text-sm">{tag.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Input
              value={tagStr}
              onChange={(e) => setTagStr(e.target.value)}
              placeholder="或手动输入，用逗号分隔"
              className="mt-1 text-xs"
            />
          </div>

          {/* Pinned */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned-check"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="pinned-check" className="text-sm">置顶</Label>
          </div>

          {/* Version */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">版本</Label>
            <p className="text-sm text-gray-600 mt-1">v{nextVersion}</p>
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase">附件</Label>
            <div
              className="mt-1 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 mx-auto text-gray-300 mb-1" />
              <p className="text-xs text-gray-500">
                {activeUploads.length > 0 ? "上传中..." : "点击上传文件"}
              </p>
              <p className="text-xs text-gray-400">文档、表格、图片、视频、压缩包</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.zip,.rar,.7z,.tar,.gz,.mp4,.webm,.mov,.avi,.mkv,.jpg,.jpeg,.png,.gif,.webp"
              />
            </div>

            {/* Active uploads with progress */}
            {activeUploads.length > 0 && (
              <div className="mt-2 space-y-2">
                {activeUploads.map((u) => (
                  <div key={u.fileName} className="bg-indigo-50 rounded border border-indigo-100 p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 flex items-center gap-1 text-indigo-700">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        {u.fileName}
                      </span>
                      <span className="text-indigo-500 shrink-0 ml-2">{u.progress}%</span>
                    </div>
                    <Progress value={u.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="bg-white rounded border p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                        {file.file_name}
                      </span>
                      <button
                        onClick={() => handleRemoveFile(i)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <Select
                      value={file.tags || "__none__"}
                      onValueChange={(v) => handleUpdateFileTags(i, v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="选择标签" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">无标签</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag.id} value={tag.name}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
