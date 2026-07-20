"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Video, Upload, Search, X, RefreshCw, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VideoGrid from "./video-center/video-grid";
import VideoUploadDialog from "./video-center/video-upload-dialog";
import VideoDetailDrawer from "./video-center/video-detail-drawer";
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

interface VideoCenterProps {
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onBack?: () => void;
}

export default function VideoCenter({ currentUser, onBack }: VideoCenterProps) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailVideo, setDetailVideo] = useState<VideoItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterModule !== "all") params.set("module", filterModule);
      if (filterTag) params.set("tags", filterTag);
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page_size", "999");

      const res = await fetch(`/api/video-center/videos?${params.toString()}`);
      const json = await res.json();
      if (json.data) setVideos(json.data);
    } catch (e) {
      console.error("Failed to fetch videos:", e);
    }
    setLoading(false);
  }, [filterModule, filterTag, searchKeyword]);

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
    } catch (e) {
      console.error("Failed to fetch modules:", e);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchModules();
  }, [fetchVideos, fetchModules, refreshKey]);

  const handleUploadSuccess = () => {
    setUploadOpen(false);
    setRefreshKey((k) => k + 1);
    toast.success("视频上传成功");
  };

  const handleDelete = async (video: VideoItem) => {
    if (!window.confirm(`确定删除视频"${video.title}"吗？此操作不可恢复。`)) return;
    try {
      const res = await fetch(
        `/api/video-center/videos/${video.id}?user_id=${currentUser?.id || ""}&role=${currentUser?.role || ""}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      toast.success("视频已删除");
      setRefreshKey((k) => k + 1);
      if (detailVideo?.id === video.id) {
        setDetailOpen(false);
        setDetailVideo(null);
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleVideoClick = (video: VideoItem) => {
    setDetailVideo(video);
    setDetailOpen(true);
  };

  const handleDetailUpdated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className={onBack ? "" : "p-6"}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-7 h-7 text-purple-600" />
              视频中心
            </h2>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            上传视频
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="搜索视频名称、描述、标签..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setRefreshKey((k) => k + 1); }}
              className="pl-10 h-12 text-base border-0 focus-visible:ring-0 bg-gray-50 rounded-xl"
            />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[180px] h-12 rounded-xl">
              <SelectValue placeholder="全部模块" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模块</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="标签筛选..."
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setRefreshKey((k) => k + 1); }}
            className="w-[160px] h-12 rounded-xl bg-gray-50"
          />
          {(filterModule !== "all" || filterTag || searchKeyword) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setFilterModule("all"); setFilterTag(""); setSearchKeyword(""); setRefreshKey((k) => k + 1); }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-12 w-12 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Grid */}
        <VideoGrid
          videos={videos}
          loading={loading}
          currentUser={currentUser}
          onVideoClick={handleVideoClick}
          onDelete={handleDelete}
        />
      </div>

      {/* Upload Dialog */}
      <VideoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        modules={modules}
        currentUser={currentUser}
        onSuccess={handleUploadSuccess}
      />

      {/* Detail Drawer */}
      <VideoDetailDrawer
        video={detailVideo}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentUser={currentUser}
        onUpdated={handleDetailUpdated}
        onDelete={handleDelete}
      />
    </div>
  );
}
