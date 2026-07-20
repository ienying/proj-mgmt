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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/markdown";
import { toast } from "sonner";
import { parseTags } from "./tag-utils";
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
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const [mdPreview, setMdPreview] = useState(""); // markdown 预览内容，手动触发
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [iframePreviewOpen, setIframePreviewOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [tagStr, setTagStr] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Attachment[]>([]);
  const [activeUploads, setActiveUploads] = useState<{ fileName: string; progress: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Ensure preview is reset on every open
  useEffect(() => { if (open) setShowPreview(false); }, [open]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [editorInstance, setEditorInstance] = useState<import("@wangeditor/editor").IDomEditor | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const orphanedFilesRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // Track auto-uploaded image paths for cleanup if editor closes without saving
  const handleFileUploaded = (filePath: string) => {
    orphanedFilesRef.current.push(filePath);
  };

  // Cleanup orphaned files on unsaved close
  const handleClose = () => {
    const orphaned = orphanedFilesRef.current;
    if (orphaned.length > 0) {
      fetch("/api/knowledge/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_paths: orphaned }),
      }).catch(() => {});
    }
    orphanedFilesRef.current = [];
    onOpenChange(false);
  };

  // Extract headings from rich text HTML
  const headings = (() => {
    if (contentType !== "rich_text") return [];
    const re = /<h([1-4])[^>]*>(.+?)<\/h\1>/gi;
    const result: { level: number; text: string }[] = [];
    let m;
    while ((m = re.exec(content)) !== null) {
      result.push({
        level: parseInt(m[1]),
        text: m[2].replace(/<[^>]+>/g, "").trim(),
      });
    }
    return result;
  })();

  const isEditing = !!editPost;
  const nextVersion = editPost ? editPost.version + 1 : 1;

  useEffect(() => {
    if (open) {
      orphanedFilesRef.current = [];
      setShowPreview(false); // Always start in edit mode

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
        setTagStr(parseTags(editPost.tags).join(", "));
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
        // Extract server error message
        let errMsg = `${file.name} 上传失败`;
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.error) errMsg = json.error;
        } catch {}
        toast.error(errMsg);
        setActiveUploads((prev) => prev.filter((u) => u.fileName !== file.name));
        resolve(null);
      });

      xhr.addEventListener("error", () => {
        toast.error(`${file.name} 网络错误，请重试`);
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

  const doSave = async (payload: Record<string, unknown>) => {
    if (saving) return;
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
        orphanedFilesRef.current = [];
        var isDraft = payload.status === "draft";
        toast.success(isDraft ? "草稿已保存" : isEditing ? "更新成功" : "发布成功");
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

  const handleSave = async () => {
    if (!title.trim() || saving) return;

    // 从 markdown 编辑器的 textarea 同步内容到 state
    const finalContent = contentType === "markdown" && markdownRef.current
      ? markdownRef.current.value
      : content;

    const tags = tagStr.split(",").map((t) => t.trim()).filter(Boolean);

    const payload = {
      title,
      content: finalContent,
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

    if (isEditing) {
      setPendingPayload(payload);
      setVersionDialogOpen(true);
    } else {
      await doSave(payload);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) return;
    if (saving) return;

    var tags = tagStr.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var payload: Record<string, unknown> = {
      title: title,
      content: content,
      content_type: contentType,
      category_id: selectedCategoryId || categoryId,
      is_pinned: isPinned,
      tags: tags,
      status: "draft",
      created_by: currentUser?.id,
      created_by_name: currentUser?.name,
      attachments: uploadedFiles.map(function (f) {
        return {
          file_name: f.file_name,
          file_path: f.file_path,
          file_size: f.file_size,
          mime_type: f.mime_type,
          file_type: f.file_type,
          tags: f.tags || "",
        };
      }),
    };
    await doSave(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-gradient-to-r from-indigo-50 via-white to-purple-50 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleClose} className="hover:bg-red-50 hover:text-red-500">
            <X className="w-4 h-4 mr-1" /> 关闭
          </Button>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {isEditing ? `编辑 (v${editPost!.version} → v${nextVersion})` : "发布内容"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (contentType === "markdown") {
              const val = markdownRef.current?.value || "";
              setContent(val);
              setIframePreviewOpen(true);
              // 延迟写入 iframe，确保 DOM 已挂载
              setTimeout(() => {
                const iframe = iframeRef.current;
                if (iframe && iframe.contentDocument) {
                  const doc = iframe.contentDocument;
                  doc.open();
                  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:-apple-system,sans-serif;max-width:100%;margin:40px auto;padding:0 20px;line-height:1.8;color:#333;word-break:break-word;overflow-x:hidden}pre{background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-all}code{background:#f5f5f5;padding:2px 4px;border-radius:2px;word-break:break-all}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}td,th{border:1px solid #ddd;padding:8px}img{max-width:100%}blockquote{border-left:3px solid #ddd;padding-left:16px;color:#666;margin:0}</style></head><body><div id="root"></div></body></html>`);
                  doc.close();
                  const el = doc.getElementById("root");
                  if (el) el.innerHTML = val
                    .replace(/### (.+)/g, "<h4>$1</h4>")
                    .replace(/## (.+)/g, "<h3>$1</h3>")
                    .replace(/# (.+)/g, "<h2>$1</h2>")
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n- (.+)/g, "<li>$1</li>")
                    .replace(/\n\n/g, "<br><br>")
                    .replace(/\n/g, "<br>");
                }
              }, 100);
            } else {
              setShowPreview(!showPreview);
            }
          }}>
            <Eye className="w-4 h-4 mr-1" />
            预览
          </Button>
          {!isEditing && (
            <Button variant="outline" onClick={handleSaveDraft} disabled={!title.trim() || saving} className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <Save className="w-4 h-4 mr-1" /> 存草稿
            </Button>
          )}
          <Button onClick={handleSave} disabled={!title.trim() || saving} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
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
                <div className="prose max-w-none post-content break-words [overflow-wrap:anywhere] [&_img]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_table]:block [&_table]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: content }} />
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
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <Button
                  variant={contentType === "rich_text" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (contentType === "markdown" && content && content.length > 0) {
                      if (!confirm("切换到富文本将丢失 Markdown 格式，确定继续？")) return;
                      setContent("");
                    }
                    setContentType("rich_text");
                  }}
                  className={contentType === "rich_text" ? "bg-white shadow-sm text-indigo-600 hover:bg-white" : "text-gray-500 hover:text-gray-700"}
                >
                  富文本
                </Button>
                <Button
                  variant={contentType === "markdown" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setContentType("markdown")}
                  className={contentType === "markdown" ? "bg-white shadow-sm text-indigo-600 hover:bg-white" : "text-gray-500 hover:text-gray-700"}
                >
                  Markdown
                </Button>
              </div>

              {/* Content editor */}
              {contentType === "markdown" ? (
                <textarea
                  ref={markdownRef}
                  defaultValue={content}
                  onChange={() => {
                    // 去抖 200ms，避免大内容频繁触发 React 重渲染
                    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                    syncTimerRef.current = setTimeout(() => setContent(markdownRef.current?.value || ""), 200);
                  }}
                  onBlur={() => setContent(markdownRef.current?.value || "")}
                  placeholder="请输入 Markdown 内容..."
                  className="flex-1 min-h-[400px] w-full font-mono text-sm p-4 border rounded-lg resize-y outline-none focus:border-indigo-400"
                />
              ) : (
                <div ref={editorAreaRef} className="relative">
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="请输入内容..."
                    onEditorCreated={setEditorInstance}
                    onFileUploaded={handleFileUploaded}
                  />

                  {/* Live TOC */}
                  {headings.length > 0 && (
                    <>
                      <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg text-xs shadow border transition-colors ${
                          tocOpen ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        目录 ({headings.length})
                      </button>
                      {tocOpen && (
                        <div className="absolute top-10 right-2 z-10 w-52 max-h-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                          <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                            <span>文档目录</span>
                            <button onClick={() => setTocOpen(false)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="overflow-y-auto max-h-52 p-2">
                            {headings.map((h, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  const el = editorAreaRef.current?.querySelector(
                                    `h${h.level}`
                                  ) as HTMLElement;
                                  if (editorInstance) {
                                    const all = editorAreaRef.current?.querySelectorAll(`h${h.level}`);
                                    if (all) {
                                      let idx = 0;
                                      let target: Element | null = null;
                                      for (const node of Array.from(all)) {
                                        if (node.textContent?.trim() === h.text) {
                                          if (idx === headings.filter((x, j) => j < i && x.level === h.level && x.text === h.text).length) {
                                            target = node;
                                            break;
                                          }
                                          idx++;
                                        }
                                      }
                                      if (target) {
                                        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                                        // Also focus editor after scroll
                                        setTimeout(() => editorInstance?.focus(), 100);
                                      }
                                    }
                                  }
                                }}
                                className={`block text-left text-xs w-full truncate rounded px-2 py-1 hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                                  h.level === 1 ? "font-medium text-gray-700" : h.level === 2 ? "text-gray-600 pl-3" : "text-gray-500 pl-5"
                                }`}
                              >
                                {h.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - metadata */}
        <div className="w-80 shrink-0 border-l bg-gradient-to-b from-indigo-50/50 via-white to-purple-50/50 p-4 overflow-y-auto space-y-5">
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
              className="mt-1 border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 mx-auto text-indigo-300 mb-1" />
              <p className="text-xs text-gray-600 font-medium">
                {activeUploads.length > 0 ? "上传中..." : "点击上传文件"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">文档、表格、图片、视频、压缩包</p>
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

      {/* Version confirmation dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>保存为新版本</DialogTitle>
            <DialogDescription>
              编辑后将保存为 v{nextVersion}，由 {currentUser?.name || "当前用户"} 提交。
              确认保存？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setVersionDialogOpen(false); setPendingPayload(null); }}>
              取消
            </Button>
            <Button
              onClick={() => {
                setVersionDialogOpen(false);
                if (pendingPayload) doSave(pendingPayload);
                setPendingPayload(null);
              }}
            >
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* markdown 预览弹窗（iframe，不卡主线程） */}
      {iframePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setIframePreviewOpen(false)}>
          <div className="bg-white w-[90vw] h-[85vh] rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="text-sm font-semibold">预览</span>
              <button onClick={() => setIframePreviewOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <iframe ref={iframeRef} className="flex-1 w-full border-0" sandbox="allow-same-origin" />
          </div>
        </div>
      )}
    </div>
  );
}
