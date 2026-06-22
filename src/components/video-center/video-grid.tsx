"use client";

import React from "react";
import { Play, Eye, Download, MessageCircle, Tag, Trash2, Video, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

interface VideoGridProps {
  videos: VideoItem[];
  loading: boolean;
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onVideoClick: (video: VideoItem) => void;
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
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export default function VideoGrid({ videos, loading, currentUser, onVideoClick, onDelete }: VideoGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3" />
        加载中...
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg">暂无视频</p>
        <p className="text-sm mt-1">点击"上传视频"添加内容</p>
      </div>
    );
  }

  const canDelete = (video: VideoItem) => {
    return (
      currentUser?.role === "super_admin" ||
      (currentUser?.id && video.created_by === currentUser.id)
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {videos.map((video) => (
        <div
          key={video.id}
          className="group bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
          onClick={() => onVideoClick(video)}
        >
          {/* Thumbnail area */}
          <div className="relative aspect-video bg-gradient-to-br from-purple-900/90 to-indigo-900/90 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
            <Play className="w-12 h-12 text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
            {video.duration && (
              <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-md">
                {video.duration}
              </span>
            )}
            {canDelete(video) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 bg-black/40 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(video);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm" title={video.title}>
              {video.title}
            </h3>

            {video.module_name && (
              <div className="flex items-center gap-1 mb-2">
                <Package className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {video.module_name}
                </span>
              </div>
            )}

            {video.tags && (
              <div className="flex flex-wrap gap-1 mb-2">
                {video.tags.split(",").map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
              <span>{video.created_by_name || "匿名"}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {video.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-3 h-3" /> {video.download_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {video.comment_count || 0}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span>{formatFileSize(video.file_size)}</span>
              <span className="mx-2">·</span>
              <span>{formatDate(video.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
