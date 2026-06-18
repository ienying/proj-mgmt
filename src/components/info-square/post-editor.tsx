"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Upload, FileText, Plus, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
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
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    formData.append("category_type", categoryType || "tech_doc");

    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.data) {
        const newFiles = Array.isArray(json.data) ? json.data : [json.data];
        setUploadedFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (e) {
      console.error("Upload failed:", e);
    }
    setUploading(false);
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
      author_id: currentUser?.id,
      author_name: currentUser?.name,
      attachments: uploadedFiles.map((f) => ({
        file_name: f.file_name,
        file_path: f.file_path,
        file_size: f.file_size,
        mime_type: f.mime_type,
        file_type: f.file_type,
        tags: f.tags || "",
      })),
    };

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
        onOpenChange(false);
        onSaved();
      }
    } catch (e) {
      console.error("Save failed:", e);
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
          <Button onClick={handleSave} disabled={!title.trim()}>
            <Save className="w-4 h-4 mr-1" /> {isEditing ? "更新" : "发布"}
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
            <Label className="text-xs font-semibold text-gray-500 uppercase">标签（用逗号分隔）</Label>
            <Input
              value={tagStr}
              onChange={(e) => setTagStr(e.target.value)}
              placeholder="标签1, 标签2"
              className="mt-1"
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
                {uploading ? "上传中..." : "点击上传文件"}
              </p>
              <p className="text-xs text-gray-400">Word, Excel, PPT, PDF, 压缩包</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.zip,.rar,.7z,.tar,.gz"
              />
            </div>

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
                      value={file.tags || ""}
                      onValueChange={(v) => handleUpdateFileTags(i, v)}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="选择标签" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">无标签</SelectItem>
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
