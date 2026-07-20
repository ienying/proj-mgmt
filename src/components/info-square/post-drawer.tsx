"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  X, MessageCircle, Send, Download, Share2,
  FileText, User, Clock, Eye, Copy, Check, Maximize2, Minimize2,
  Lock, Unlock, Trash2, History, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/markdown";
import { toast } from "sonner";
import { parseTags } from "./tag-utils";
import { copyToClipboard } from "@/lib/utils";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  file_type?: string;
  tags?: string;
  download_count?: number;
}

interface Comment {
  id: string;
  content: string;
  author_id?: string;
  author_name?: string;
  user_id?: string;
  user_name?: string;
  created_at: string;
}

interface Version {
  id: string;
  version: number;
  title: string;
  content: string;
  content_type: string;
  created_at: string;
  change_summary?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  category_id?: string;
  author_id?: string;
  created_by?: string;
  created_by_name?: string;
  is_pinned: boolean;
  tags?: string;
  module_name?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  share_token?: string;
  _liked?: boolean;
  _favorited?: boolean;
}

interface PostDrawerProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onPostUpdated: () => void;
  onEdit: (post: Post) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

function extractHeadings(content: string, contentType: string): { level: number; text: string; id: string }[] {
  if (contentType === "markdown") {
    const re = /^(#{1,4})\s+(.+)$/gm;
    const headings: { level: number; text: string; id: string }[] = [];
    let m;
    while ((m = re.exec(content)) !== null) {
      headings.push({
        level: m[1].length,
        text: m[2].trim(),
        id: "heading-" + headings.length,
      });
    }
    return headings;
  }
  const re = /<h([1-4])[^>]*>(.+?)<\/h\1>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    headings.push({
      level: parseInt(m[1]),
      text,
      id: "heading-" + headings.length,
    });
  }
  return headings;
}

export default function PostDrawer({
  post,
  open,
  onOpenChange,
  currentUser,
  onPostUpdated,
  onEdit,
}: PostDrawerProps) {
  const [detail, setDetail] = useState<{
    attachments: (Attachment & { downloads?: Array<{ user_name?: string; downloaded_at: string }> })[];
    comments: Comment[];
    versions: Version[];
    reads?: Array<{ user_id?: string; user_name?: string; read_at: string }>;
    _readCount: number;
  } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeVersion, setActiveVersion] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [readHistoryOpen, setReadHistoryOpen] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<{ attachmentName: string; records: Array<{ user_name?: string; downloaded_at: string }> } | null>(null);

  const loadDetail = useCallback(async () => {
    if (!post) return;
    try {
      fetch(`/api/knowledge/posts/${post.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser?.id, user_name: currentUser?.name }),
      });

      const res = await fetch(`/api/knowledge/posts/${post.id}`);
      const json = await res.json();
      if (json.data) {
        setDetail({
          attachments: json.data.attachments || [],
          comments: json.data.comments || [],
          versions: json.data.versions || [],
          reads: json.data.reads || [],
          _readCount: json.data._readCount || 0,
        });
        setActiveVersion(json.data.post?.version || post.version);
      }

      const shareRes = await fetch(`/api/knowledge/posts/${post.id}/share`);
      const shareJson = await shareRes.json();
      if (shareJson.data?.share_url) {
        setShareUrl(shareJson.data.share_url);
        setHasPassword(!!shareJson.data.has_password);
        if (shareJson.data.share_password) {
          setSharePassword(shareJson.data.share_password);
        }
      }
    } catch (e) {
      console.error("Failed to load post detail:", e);
    }
  }, [post, currentUser]);

  useEffect(() => {
    if (open && post) {
      loadDetail();
    }
  }, [open, post, loadDetail]);

  const handleComment = async () => {
    if (!newComment.trim() || !post) return;
    if (!currentUser?.id) {
      toast.error("请先登录后再评论");
      return;
    }
    try {
      const res = await fetch(`/api/knowledge/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          user_id: currentUser.id,
          user_name: currentUser.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error || "评论发送失败，请重试");
        return;
      }
      setNewComment("");
      toast.success("评论已发送");
      loadDetail();
    } catch (e) {
      toast.error("网络错误，请检查网络后重试");
    }
  };

  const handleDownload = (att: Attachment) => {
    window.open(
      `/api/knowledge/download?file_path=${encodeURIComponent(att.file_path)}&post_id=${post?.id}&attachment_id=${att.id}&user_id=${currentUser?.id || ""}&user_name=${encodeURIComponent(currentUser?.name || "")}`,
      "_blank"
    );
  };

  const handlePreview = (att: Attachment) => {
    window.open(
      `/api/knowledge/download?file_path=${encodeURIComponent(att.file_path)}&preview=true`,
      "_blank"
    );
  };

  const handleSetPassword = async (pwd: string) => {
    if (!post) return;
    try {
      const res = await fetch(`/api/knowledge/posts/${post.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const json = await res.json();
      if (json.data) {
        setShareUrl(json.data.share_url);
        setSharePassword(pwd);
        setHasPassword(!!pwd);
        if (pwd) toast.success("分享密码已设置");
        else toast.success("密码保护已取消");
      } else {
        toast.error(json.error || "设置失败，请重试");
      }
    } catch (e) {
      toast.error("网络错误，请重试");
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm("确定要删除此内容吗？此操作不可撤销。")) return;
    const isAuthor = currentUser?.id === post.created_by;
    const isAdmin = currentUser?.role === "super_admin";
    const hard = (isAuthor || isAdmin) ? "true" : "false";
    try {
      const res = await fetch(
        `/api/knowledge/posts/${post.id}?hard=${hard}&user_id=${currentUser?.id || ""}&user_role=${currentUser?.role || ""}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error || "删除失败，请重试");
        return;
      }
      toast.success("删除成功");
      onOpenChange(false);
      onPostUpdated();
    } catch {
      toast.error("网络错误，请重试");
    }
  };

  const handleCopyShare = async () => {
    if (!shareUrl) {
      toast.error("请先生成分享链接");
      return;
    }
    const text = sharePassword ? `${shareUrl}\n访问密码: ${sharePassword}` : shareUrl;
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(sharePassword ? "链接和密码已复制" : "链接已复制");
    } catch {
      // Fallback for insecure context
      toast.error("复制失败，请手动复制");
    }
  };

  const handleScrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (!post) return null;

  const headings = extractHeadings(
    activeVersion !== post.version && detail?.versions
      ? detail.versions.find((v) => v.version === activeVersion)?.content || post.content
      : post.content,
    post.content_type
  );

  const displayContent = activeVersion !== post.version && detail?.versions
    ? detail.versions.find((v) => v.version === activeVersion)?.content || post.content
    : post.content;


  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => onOpenChange(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-50 transform transition-all duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        } ${isFullscreen ? "w-screen" : "w-[60vw]"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{post.title}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {post.created_by_name || "匿名"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.created_at)}
                </span>
                {detail?.versions && detail.versions.length > 1 ? (
                  <Select
                    value={String(activeVersion || post.version)}
                    onValueChange={(v) => setActiveVersion(Number(v))}
                  >
                    <SelectTrigger className="h-5 px-1.5 py-0 text-[10px] w-auto gap-0.5 border-0 bg-gray-100 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {detail.versions.map((v) => (
                        <SelectItem key={v.id} value={String(v.version)}>
                          v{v.version}{v.version === post.version ? " (最新)" : ""} - {formatDate(v.created_at)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-xs">v{post.version}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Share button with popover */}
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-800">分享链接</h4>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 break-all">
                      {shareUrl || "加载中..."}
                    </div>

                    {/* Password section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {hasPassword ? (
                          <Lock className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        访问密码
                        {hasPassword && <span className="text-amber-600">（已设置）</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={sharePassword}
                          onChange={(e) => setSharePassword(e.target.value)}
                          placeholder="留空则无需密码"
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0"
                          onClick={() => handleSetPassword(sharePassword)}
                        >
                          设置
                        </Button>
                      </div>
                    </div>

                    <Button size="sm" className="w-full" onClick={handleCopyShare}>
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" /> 已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          {sharePassword ? "复制链接和密码" : "复制链接"}
                        </>
                      )}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* TOC toggle */}
              {headings.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTocOpen(!tocOpen)}
                  className={tocOpen ? "bg-indigo-50 text-indigo-600" : ""}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}

              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>

              {(currentUser?.id === post.created_by || currentUser?.role === "super_admin") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Floating TOC Overlay */}
            {headings.length > 0 && tocOpen && (
              <div className="absolute right-4 top-4 w-60 max-h-[70vh] bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                  <span className="text-xs font-semibold text-gray-600 uppercase">目录</span>
                  <button onClick={() => setTocOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(70vh-40px)] p-3">
                  <nav className="space-y-0.5">
                    {headings.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => { handleScrollToHeading(h.id); setTocOpen(false); }}
                        className={`block text-left text-xs w-full truncate hover:text-indigo-600 hover:bg-indigo-50 rounded px-2 py-1 transition-colors ${
                          h.level === 1
                            ? "font-medium text-gray-700"
                            : h.level === 2
                            ? "text-gray-600 pl-4"
                            : "text-gray-500 pl-7"
                        }`}
                      >
                        {h.text}
                      </button>
                    ))}
                  </nav>

                  {detail?.versions && detail.versions.length > 1 && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1.5 px-2">版本历史</h4>
                      <div className="space-y-0.5">
                        {detail.versions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => { setActiveVersion(v.version); setTocOpen(false); }}
                            className={`block text-left text-xs w-full px-2 py-1 rounded hover:bg-gray-100 ${
                              activeVersion === v.version
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-500"
                            }`}
                          >
                            v{v.version}{v.version === post.version ? " · 最新" : ""} — {formatDate(v.created_at)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div
                  className="prose prose-sm max-w-none post-content [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:pb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1 [overflow-wrap:break-word] [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_iframe]:max-w-full [&_video]:max-w-full"
                  id="post-content"
                >
                  {(() => {
                    const htmlContent = post.content_type === "markdown"
                      ? ((post as any).content_html || "")
                      : (displayContent || "");
                    // 提取标题生成目录
                    const tocHeadings = [...htmlContent.matchAll(/<(h[1-4])[^>]*id="([^"]*)"[^>]*>(.*?)<\/\1>/gi)];
                    return (
                      <>
                        {tocHeadings.length >= 3 && (
                          <details className="mb-6 bg-gray-50 rounded-lg border border-gray-200" open>
                            <summary className="px-4 py-2 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-800">📑 目录</summary>
                            <div className="px-4 pb-3 space-y-0.5">
                              {tocHeadings.map((m, idx) => (
                                <a key={idx} href={`#${m[2]}`}
                                  className={`block text-sm hover:text-indigo-600 transition-colors ${
                                    m[1] === "h1" ? "font-bold pl-0" : m[1] === "h2" ? "font-semibold pl-2" : m[1] === "h3" ? "pl-4 text-gray-600" : "pl-6 text-gray-500 text-xs"
                                  }`}
                                  onClick={(e) => { e.preventDefault(); document.getElementById(m[2])?.scrollIntoView({ behavior:"smooth" }); }}>
                                  {m[3].replace(/<[^>]+>/g, "")}
                                </a>
                              ))}
                            </div>
                          </details>
                        )}
                        {post.content_type === "markdown" ? (
                          (post as any).content_html ? (
                            <div dangerouslySetInnerHTML={{ __html: (post as any).content_html }} />
                          ) : (
                            <Markdown>{post.content || ""}</Markdown>
                          )
                        ) : (
                          <div dangerouslySetInnerHTML={{
                            __html: (displayContent || "").replace(/<h([1-4])>/g, (_, n) => `<h${n} id="heading-${n}">`),
                          }} />
                        )}
                      </>
                    );
                  })()}
                </div>

                {post.module_name && (() => {
                  const moduleList = post.module_name.split(",").map((s: string) => s.trim()).filter(Boolean);
                  return moduleList.length > 0 ? (
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <Package className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      {moduleList.map((name: string) => (
                        <Badge key={name} variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : null;
                })()}

                {post.tags && (
                  <div className="flex gap-1.5 flex-wrap">
                    {parseTags(post.tags).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {detail?.attachments && detail.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">附件</h4>
                    <div className="space-y-2">
                      {detail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-sm truncate">{att.file_name}</span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {formatFileSize(att.file_size)}
                            </span>
                            {att.download_count !== undefined && (
                              <button
                                className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0 hover:underline"
                                onClick={() => setDownloadHistory({
                                  attachmentName: att.file_name,
                                  records: (att.downloads || []) as Array<{ user_name?: string; downloaded_at: string }>,
                                })}
                              >
                                <Download className="w-3 h-3 inline mr-0.5" />
                                {att.download_count} 次下载
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => handlePreview(att)}>
                              <Eye className="w-3 h-3 mr-1" /> 预览
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload(att)}>
                              <Download className="w-3 h-3 mr-1" /> 下载
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {post.comment_count}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full hover:bg-indigo-50 hover:text-indigo-600"
                    onClick={() => setReadHistoryOpen(true)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {post.view_count} 次浏览
                  </Button>
                  {currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto rounded-full hover:bg-indigo-50 hover:text-indigo-600"
                      onClick={() => onEdit(post)}
                    >
                      编辑
                    </Button>
                  )}
                </div>

                {detail?.comments && detail.comments.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-indigo-400" />
                      评论 ({detail.comments.length})
                    </h4>
                    {detail.comments.map((c) => (
                      <div key={c.id} className="bg-gradient-to-r from-gray-50 to-indigo-50/30 rounded-xl p-3.5 border border-gray-100 group">
                        <div className="flex items-center gap-2 text-sm mb-1.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {(c.author_name || c.user_name || "匿")[0]}
                          </div>
                          <span className="font-medium text-gray-700">
                            {c.author_name || c.user_name || "匿名"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(c.created_at)}
                          </span>
                          {(currentUser?.id === (c.user_id || c.author_id) || currentUser?.role === "super_admin") && (
                            <button
                              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                              onClick={async () => {
                                if (!confirm("确定要删除此评论吗？")) return;
                                try {
                                  const res = await fetch(
                                    `/api/knowledge/posts/${post.id}/comments?comment_id=${c.id}&user_id=${currentUser?.id || ""}&user_role=${currentUser?.role || ""}`,
                                    { method: "DELETE" }
                                  );
                                  const json = await res.json();
                                  if (!res.ok || json.error) {
                                    toast.error(json.error || "删除失败");
                                    return;
                                  }
                                  toast.success("评论已删除");
                                  loadDetail();
                                } catch {
                                  toast.error("网络错误，请重试");
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 pl-9">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="写下你的评论..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleComment();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleComment} disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Read History Dialog */}
      <Dialog open={readHistoryOpen} onOpenChange={setReadHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-500" />
              浏览记录
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {detail?.reads && detail.reads.length > 0 ? (
              <div className="space-y-2 pr-3">
                {detail.reads
                  .sort((a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime())
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {(r.user_name || "匿")[0]}
                        </div>
                        <span className="text-sm text-gray-700">{r.user_name || "匿名用户"}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.read_at).toLocaleString("zh-CN", {
                          month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">暂无浏览记录</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Download History Dialog */}
      <Dialog open={!!downloadHistory} onOpenChange={() => setDownloadHistory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              下载记录 — {downloadHistory?.attachmentName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {downloadHistory && downloadHistory.records.length > 0 ? (
              <div className="space-y-2 pr-3">
                {downloadHistory.records
                  .sort((a, b) => new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime())
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                          {(r.user_name || "匿")[0]}
                        </div>
                        <span className="text-sm text-gray-700">{r.user_name || "匿名用户"}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.downloaded_at).toLocaleString("zh-CN", {
                          month: "2-digit", day: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">暂无下载记录</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
