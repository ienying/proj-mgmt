"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Search, Eye, ThumbsUp, MessageCircle,
  User, Clock, FileText, Download, Pin, Trash2, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  category_id?: string;
  author_id?: string;
  author_name?: string;
  created_by?: string;
  created_by_name?: string;
  is_pinned: boolean;
  tags?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at?: string;
  attachments?: Attachment[];
  share_token?: string;
}

interface ListViewProps {
  currentUser?: { id?: string; name?: string; role?: string } | null;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  isDraft?: boolean;
  onBack: () => void;
  onPostClick: (post: Post) => void;
  onPublish: () => void;
  onEdit?: (post: Post) => void;
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

export default function ListView({
  currentUser,
  categoryId,
  categoryName,
  isDraft,
  onBack,
  onPostClick,
  onPublish,
  onEdit,
}: ListViewProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [total, setTotal] = useState(0);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      let url = isDraft
        ? `/api/knowledge/posts?status=draft&page_size=50`
        : `/api/knowledge/posts?category_id=${categoryId}&page_size=50`;
      if (searchKeyword) url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setPosts(json.data);
        setTotal(json.total || json.data.length);
      }
    } catch (e) {
      console.error("Failed to load posts:", e);
    }
    setLoading(false);
  }, [categoryId, searchKeyword]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleSearch = () => {
    loadPosts();
  };

  const handleDelete = async (post: Post) => {
    if (!confirm("确定要删除此内容吗？此操作不可撤销。")) return;
    const isAuthor = currentUser?.id === post.created_by || currentUser?.id === post.author_id;
    const isAdmin = currentUser?.role === "super_admin";
    const hard = (isAuthor || isAdmin) ? "true" : "false";
    try {
      await fetch(
        `/api/knowledge/posts/${post.id}?hard=${hard}&user_id=${currentUser?.id || ""}&user_role=${currentUser?.role || ""}`,
        { method: "DELETE" }
      );
      loadPosts();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回
          </Button>
          <h3 className="text-lg font-semibold text-gray-800">{categoryName}</h3>
          <Badge variant="outline" className="text-xs">{total} 篇</Badge>
        </div>
        <Button onClick={onPublish} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 发布
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索标题或内容..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="w-3 h-3 mr-1" /> 搜索
        </Button>
      </div>

      {/* Post List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无内容</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onPublish}>
            <Plus className="w-3 h-3 mr-1" /> 发布第一篇
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onPostClick(post)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {post.is_pinned && <Pin className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                    <Badge variant="outline" className="text-xs shrink-0">v{post.version}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.created_by_name || "匿名"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(post.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {post.like_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comment_count}
                    </span>
                  </div>
                  {/* Attachments preview */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {post.attachments.slice(0, 3).map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-0.5 text-gray-500"
                        >
                          <FileText className="w-3 h-3" />
                          {att.file_name}
                        </span>
                      ))}
                      {post.attachments.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{post.attachments.length - 3}个文件
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(post);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEdit) onEdit(post);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
