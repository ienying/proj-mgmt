"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download, Trash2, Share2, Eye, MessageCircle, Tag, Package,
  Paperclip, Send, X, User, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

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
  const [editModule, setEditModule] = useState("");
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

    fetch(`/api/video-center/videos/${video.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setFullVideo(json.data);
          setAttachments((json.data.attachments as Attachment[]) || []);
          setComments((json.data.comments as Comment[]) || []);
          setEditTitle(String(json.data.title || ""));
          setEditModule(String(json.data.module_name || ""));
          setEditTags(String(json.data.tags || ""));
          setEditDesc(String(json.data.description || ""));
        }
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
          module_name: editModule && editModule !== "none" ? editModule : null,
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
    navigator.clipboard.writeText(shareUrl).then(() => {
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
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3" />
            加载中...
          </div>
        ) : fullVideo ? (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 pb-2 border-b shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg truncate pr-2">
                  {editing ? "编辑视频信息" : fullVideo.title}
                </SheetTitle>
                <div className="flex items-center gap-1 shrink-0">
                  {canDelete() && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(fullVideo)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </SheetHeader>

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
                      <Label htmlFor="edit-module">产品模块</Label>
                      <Select value={editModule} onValueChange={setEditModule}>
                        <SelectTrigger id="edit-module">
                          <SelectValue placeholder="选择产品模块" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不选择模块</SelectItem>
                          {modules.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {fullVideo.view_count || 0} 次观看
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" /> {fullVideo.download_count || 0} 次下载
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {comments.length} 条留言
                      </span>
                    </div>

                    {/* Module badge */}
                    {fullVideo.module_name && (
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                          {fullVideo.module_name}
                        </span>
                      </div>
                    )}

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
                        onClick={() => setEditing(true)}
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
