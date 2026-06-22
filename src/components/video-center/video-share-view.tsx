"use client";

import { useState, useEffect } from "react";
import { Video, Download, Package, Tag, Paperclip, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoData {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  module_name?: string;
  tags?: string;
  description?: string;
  created_by_name?: string;
  view_count: number;
  download_count: number;
  created_at: string;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
  }>;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

export default function VideoShareView({ token }: { token: string }) {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/video-center/share/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setVideo(json.data);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = (file: string, name: string, isAttachment = false) => {
    const param = isAttachment ? "att" : "file";
    window.open(`/api/video-center/download?${param}=${encodeURIComponent(file)}&id=${video?.id || ""}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4" />
          加载中...
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500 max-w-md">
          <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">{error || "视频不存在"}</p>
          <p className="text-sm mt-1">链接可能已过期或无效</p>
        </div>
      </div>
    );
  }

  const videoUrl = `/api/video-center/download?file=${encodeURIComponent(video.file_path)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="aspect-video bg-black">
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
              preload="metadata"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{video.title}</h1>

            {video.module_name && (
              <div className="flex items-center gap-1 mb-3">
                <Package className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                  {video.module_name}
                </span>
              </div>
            )}

            {video.tags && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {video.tags.split(",").map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    <Tag className="w-3 h-3" />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {video.description && (
              <p className="text-gray-600 mb-4 whitespace-pre-wrap">{video.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {video.view_count} 次观看</span>
              <span>{video.created_by_name || "匿名"}</span>
              <span>{formatFileSize(video.file_size)}</span>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => handleDownload(video.file_path, video.file_name)} className="bg-purple-600 hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                下载视频
              </Button>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {video.attachments && video.attachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              配套文件
            </h2>
            <div className="space-y-2">
              {video.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleDownload(att.file_path, att.file_name, true)}
                >
                  <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.file_name}</p>
                    <p className="text-xs text-gray-400">{att.file_type?.toUpperCase()} · {formatFileSize(att.file_size)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
