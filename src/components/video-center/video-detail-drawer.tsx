"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download, Trash2, Share2, Eye, MessageCircle, Tag, Package,
  Paperclip, Send, X, User, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface VideoItem {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  duration?: string;
  module_name?: string;
  tags?: string;
  description?: string;
  thumbnail?: string;
  created_by?: string;
  created_by_name?: string;
  view_count: number;
  download_count: number;
  share_token?: string;
  attachment_count?: number;
  comment_count?: number;
  created_at: string;
  updated_at?: string;
}

interface Attachment {
  id: string;
  video_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface Comment {
  id: string;
  video_id: string;
  content: string;
  user_id?: string;
  user_name?: string;
  parent_id?: string;
  created_at: string;
  replies?: Comment[];
}

interface VideoDetailDrawerProps {
  video: VideoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onUpdated: () => void;
  onDelete: (video: VideoItem) => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function VideoDetailDrawer({
  video,
  open,
  onOpenChange,
  currentUser,
  onUpdated,
  onDelete,
}: VideoDetailDrawerProps) {
  const [fullVideo, setFullVideo] = useState<VideoItem | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editModuleSearch, setEditModuleSearch] = useState("");
  const [editModuleOpen, setEditModuleOpen] = useState(false);
  const [readHistory, setReadHistory] = useState<Array<{ user_name?: string; read_at: string }>>([]);
  const [readHistoryOpen, setReadHistoryOpen] = useState(false);
  const [editTags, setEditTags] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [modules, setModules] = useState<string[]>([]);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/dicts?type=product_module_types");
      const json = await res.json();
      if (json.data) {
        const names = (json.data as Array<{ module_name: string }>)
          .map((m) => m.module_name)
          .filter(Boolean);
        setModules([...new Set(names)]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (open) fetchModules();
  }, [open, fetchModules]);

  useEffect(() => {
    if (!video || !open) return;
    setLoading(true);
    setFullVideo(null);
    setAttachments([]);
    setComments([]);
    setNewComment("");
    setReplyTo(null);
    setEditing(false);
    setEditModuleSearch("");
    setEditModuleOpen(false);

    // 记录已读
    if (currentUser?.id) {
      fetch(`/api/video-center/videos/${video.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      }).catch(() => {});
    }

    fetch(`/api/video-center/videos/${video.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setFullVideo(json.data);
          setAttachments((json.data.attachments as Attachment[]) || []);
          setComments((json.data.comments as Comment[]) || []);
          setEditTitle(String(json.data.title || ""));
          const moduleNameStr = String(json.data.module_name || "");
          setEditModules(moduleNameStr ? moduleNameStr.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
          setEditTags(String(json.data.tags || ""));
          setEditDesc(String(json.data.description || ""));
        }
        // 加载阅读记录
        fetch(`/api/video-center/videos/${video.id}/reads`)
          .then(r => r.json())
          .then(j => { if (j.data) setReadHistory(j.data); })
          .catch(() => {});
      })
      .catch(() => toast.error("加载视频详情失败"))
      .finally(() => setLoading(false));
  }, [video, open]);

  const canDelete = () => {
    if (!fullVideo) return false;
    return (
      currentUser?.role === "super_admin" ||
      (currentUser?.id && fullVideo.created_by === currentUser.id)
    );
  };

  const handleSaveEdit = async () => {
    if (!fullVideo) return;
    try {
      const res = await fetch(`/api/video-center/videos/${fullVideo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          module_name: editModules.length > 0 ? editModules.join(",") : null,
          tags: editTags || null,
          description: editDesc || null,
        }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      toast.success("已更新");
      setEditing(false);
      setEditModuleSearch("");
      setEditModuleOpen(false);
      onUpdated();
    } catch {
      toast.error("更新失败");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !fullVideo) return;
    try {
      const res = await fetch(`/api/video-center/videos/${fullVideo.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          user_id: currentUser?.id,
          user_name: currentUser?.name || "匿名",
        }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      setNewComment("");
      onUpdated();
    } catch {
      toast.error("评论失败");
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || !fullVideo) return;
    try {
      const res = await fetch(`/api/video-center/videos/${fullVideo.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          user_id: currentUser?.id,
          user_name: currentUser?.name || "匿名",
          parent_id: parentId,
        }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      setReplyContent("");
      setReplyTo(null);
      onUpdated();
    } catch {
      toast.error("回复失败");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("确定删除此留言？")) return;
    try {
      const res = await fetch(
        `/api/video-center/comments/${commentId}?role=${currentUser?.role || ""}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      toast.success("留言已删除");
      onUpdated();
    } catch {
      toast.error("删除失败");
    }
  };

  const handleDownload = (file: string, name: string, isAttachment = false) => {
    const param = isAttachment ? "att" : "file";
    const url = `/api/video-center/download?${param}=${encodeURIComponent(file)}&id=${fullVideo?.id || ""}`;
    window.open(url, "_blank");
  };

  const handleShare = () => {
    if (!fullVideo?.share_token) return;
    const shareUrl = `${window.location.origin}/video-center/share/${fullVideo.share_token}`;
    copyToClipboard(shareUrl).then(() => {
      toast.success("分享链接已复制到剪贴板");
    }).catch(() => {
      toast.error("复制失败，请手动复制");
    });
  };

  const videoUrl = fullVideo
    ? `/api/video-center/download?file=${encodeURIComponent(fullVideo.file_path)}`
    : "";

  if (!video) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <SheetHeader className="p-4 pb-2 border-b shrink-0">
          <SheetTitle className="text-lg truncate pr-2">
            {loading ? "加载中..." : fullVideo ? (editing ? "编辑视频信息" : fullVideo.title) : "视频详情"}
          </SheetTitle>
        </SheetHeader>
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3" />
            加载中...
          </div>
        ) : fullVideo ? (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between px-4 pb-2">
              <div />
              <div className="flex items-center gap-1">
                {canDelete() && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(fullVideo)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    preload="metadata"
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>

                {/* Edit mode */}
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-title">视频名称</Label>
                      <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                    <div>
                      <Label>产品目录</Label>
                      <Popover open={editModuleOpen} onOpenChange={setEditModuleOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                          >
                            {editModules.length > 0
                              ? `已选 ${editModules.length} 个产品目录`
                              : "选择产品目录"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="搜索产品目录..."
                              value={editModuleSearch}
                              onChange={(e) => setEditModuleSearch(e.target.value)}
                              className="h-8 text-sm border-0 focus-visible:ring-0"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {(editModuleSearch
                              ? modules.filter((m) => m.toLowerCase().includes(editModuleSearch.toLowerCase()))
                              : modules
                            ).length === 0 ? (
                              <p className="text-sm text-gray-400 text-center py-4">未找到匹配的模块</p>
                            ) : (
                              (editModuleSearch
                                ? modules.filter((m) => m.toLowerCase().includes(editModuleSearch.toLowerCase()))
                                : modules
                              ).map((m) => {
                                const isSelected = editModules.includes(m);
                                return (
                                  <div
                                    key={m}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      if (isSelected) {
                                        setEditModules((prev) => prev.filter((n) => n !== m));
                                      } else {
                                        setEditModules((prev) => [...prev, m]);
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
                          {editModules.length > 0 && (
                            <div className="border-t p-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-gray-500"
                                onClick={() => setEditModules([])}
                              >
                                清除全部
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      {/* Selected module badges */}
                      {editModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {editModules.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-gray-200"
                              onClick={() => setEditModules((prev) => prev.filter((n) => n !== name))}
                            >
                              {name}
                              <X className="w-3 h-3 ml-0.5" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-tags">标签</Label>
                      <Input id="edit-tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="逗号分隔" />
                    </div>
                    <div>
                      <Label htmlFor="edit-desc">描述</Label>
                      <Textarea id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditModuleSearch(""); setEditModuleOpen(false); }}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {fullVideo.view_count || 0} 次观看
                      </span>
                      {readHistory.length > 0 && (
                        <Popover open={readHistoryOpen} onOpenChange={setReadHistoryOpen}>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer">
                              <User className="w-3.5 h-3.5" /> 浏览记录
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="start">
                            <div className="text-xs font-medium text-gray-500 mb-2">最近浏览</div>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {readHistory.map((r, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">{r.user_name || "匿名"}</span>
                                  <span className="text-gray-400">{new Date(r.read_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" /> {fullVideo.download_count || 0} 次下载
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {comments.length} 条留言
                      </span>
                    </div>

                    {/* Module badges */}
                    {fullVideo.module_name && (() => {
                      const moduleList = String(fullVideo.module_name).split(",").map((s: string) => s.trim()).filter(Boolean);
                      return moduleList.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Package className="w-4 h-4 text-purple-500 shrink-0" />
                          {moduleList.map((name: string) => (
                            <span key={name} className="text-sm text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Tags */}
                    {fullVideo.tags && (
                      <div className="flex flex-wrap gap-1.5">
                        {fullVideo.tags.split(",").map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            <Tag className="w-3 h-3" />
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {fullVideo.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">描述</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{fullVideo.description}</p>
                      </div>
                    )}

                    {/* File info */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">文件名</span>
                        <span className="text-gray-800 truncate max-w-[200px]">{fullVideo.file_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">大小</span>
                        <span className="text-gray-800">{formatFileSize(fullVideo.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">上传者</span>
                        <span className="text-gray-800">{fullVideo.created_by_name || "匿名"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">上传时间</span>
                        <span className="text-gray-800">{formatDate(fullVideo.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(fullVideo.file_path, fullVideo.file_name)}
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        下载视频
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleShare}
                      >
                        <Share2 className="w-4 h-4 mr-1.5" />
                        分享链接
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditing(true); setEditModuleSearch(""); setEditModuleOpen(false); }}
                      >
                        编辑
                      </Button>
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Paperclip className="w-4 h-4" />
                          配套文件 ({attachments.length})
                        </h4>
                        <div className="space-y-1.5">
                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={() => handleDownload(att.file_path, att.file_name, true)}
                            >
                              <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{att.file_name}</p>
                                <p className="text-xs text-gray-400">
                                  {att.file_type?.toUpperCase()} · {formatFileSize(att.file_size)}
                                </p>
                              </div>
                              <Download className="w-4 h-4 text-gray-400 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Comments Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    留言 ({comments.length})
                  </h4>

                  {/* Comment input */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="写下你的留言..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id}>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-700">
                                {comment.user_name || "匿名"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              {currentUser?.role === "super_admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <X className="w-3 h-3 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>

                        {/* Reply input */}
                        {replyTo === comment.id && (
                          <div className="ml-6 mt-2 flex gap-2">
                            <Input
                              placeholder="写下回复..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleReply(comment.id); }}
                              className="flex-1 h-8 text-sm"
                            />
                            <Button size="sm" className="h-8" onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}>
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-6 mt-2 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="bg-gray-50/50 rounded-xl p-2.5 border border-gray-100">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {reply.user_name || "匿名"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  {currentUser?.role === "super_admin" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => handleDeleteComment(reply.id)}
                                    >
                                      <X className="w-2.5 h-2.5 text-red-400" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            视频加载失败
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
