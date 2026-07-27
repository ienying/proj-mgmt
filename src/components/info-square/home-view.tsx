"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronRight, FileText, BookOpen, Wrench, CheckCircle, FileEdit,
  BarChart3, Eye, ThumbsUp, MessageCircle, Download, User, Users, X,
  Video, Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InfoBanner from "./info-banner";
import { parseTags } from "./tag-utils";

interface Category {
  id: string;
  name: string;
  category_type: string;
  icon?: string;
  description?: string;
  sort_order: number;
}

interface CategoryStat {
  category_name: string;
  category_type: string;
  post_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  download_count: number;
  contributor_count: number;
  latest_post_at: string | null;
}

interface StatsData {
  categories: CategoryStat[];
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_downloads: number;
  total_contributors: number;
  contributors?: Array<{
    name: string;
    post_count: number;
    categories: string;
    total_views: number;
    total_likes: number;
  }>;
}

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  category_id?: string;
  created_by?: string;
  created_by_name?: string;
  is_pinned: boolean;
  tags?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface HomeViewProps {
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onEnterCategory: (categoryId: string, categoryName: string, categoryType: string) => void;
  onPostClick: (post: Post) => void;
  onEnterDrafts: () => void;
  onEnterVideoCenter: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-9 h-9" />,
  BookOpen: <BookOpen className="w-9 h-9" />,
  Wrench: <Wrench className="w-9 h-9" />,
  CheckCircle: <CheckCircle className="w-9 h-9" />,
  FileEdit: <FileEdit className="w-9 h-9" />,
  Video: <Video className="w-9 h-9" />,
};

const COLOR_MAP: Record<string, { iconBg: string; iconColor: string; border: string; badge: string }> = {
  tech_doc: {
    iconBg: "bg-gradient-to-br from-blue-100 to-indigo-100",
    iconColor: "text-blue-600",
    border: "hover:border-blue-300/60",
    badge: "bg-blue-100/60 text-blue-700",
  },
  product_manual: {
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-100",
    iconColor: "text-amber-600",
    border: "hover:border-amber-300/60",
    badge: "bg-amber-100/60 text-amber-700",
  },
  ops_tool: {
    iconBg: "bg-gradient-to-br from-cyan-100 to-teal-100",
    iconColor: "text-cyan-600",
    border: "hover:border-cyan-300/60",
    badge: "bg-cyan-100/60 text-cyan-700",
  },
  acceptance: {
    iconBg: "bg-gradient-to-br from-emerald-100 to-green-100",
    iconColor: "text-emerald-600",
    border: "hover:border-emerald-300/60",
    badge: "bg-emerald-100/60 text-emerald-700",
  },
  solution_template: {
    iconBg: "bg-gradient-to-br from-orange-100 to-red-100",
    iconColor: "text-orange-600",
    border: "hover:border-orange-300/60",
    badge: "bg-orange-100/60 text-orange-700",
  },
  video_center: {
    iconBg: "bg-gradient-to-br from-fuchsia-100 to-pink-100",
    iconColor: "text-fuchsia-600",
    border: "hover:border-fuchsia-300/60",
    badge: "bg-fuchsia-100/60 text-fuchsia-700",
  },
  drafts: {
    iconBg: "bg-gradient-to-br from-amber-100 to-yellow-100",
    iconColor: "text-amber-600",
    border: "hover:border-amber-300/60",
    badge: "bg-amber-100/60 text-amber-700",
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export default function HomeView({ onEnterCategory, onPostClick, onEnterDrafts, onEnterVideoCenter, currentUser }: HomeViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [draftCount, setDraftCount] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [expandedContributor, setExpandedContributor] = useState<number | null>(null);
  const [videoCount, setVideoCount] = useState(0);
  const [popularTags, setPopularTags] = useState<Array<{ name: string; count: number }>>([]);
  const [activeTag, setActiveTag] = useState("");

  const loadData = useCallback(async () => {
    // 进入信息广场时更新最后访问时间，清除角标
    fetch("/api/knowledge/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUser?.id || "anonymous" }),
    }).catch(() => {});
    try {
      const [catRes, postsRes, statsRes, draftsRes] = await Promise.all([
        fetch("/api/knowledge/categories"),
        fetch("/api/knowledge/posts?page_size=999"),
        fetch("/api/knowledge/stats"),
        fetch("/api/knowledge/posts?status=draft&page_size=999"),
      ]);

      // Check HTTP status before parsing JSON to avoid "Unexpected token '<'" errors
      if (!catRes.ok) throw new Error(`Categories API returned ${catRes.status}`);
      if (!postsRes.ok) throw new Error(`Posts API returned ${postsRes.status}`);
      if (!statsRes.ok) throw new Error(`Stats API returned ${statsRes.status}`);
      if (!draftsRes.ok) throw new Error(`Drafts API returned ${draftsRes.status}`);

      const catJson = await catRes.json();
      const cats = (catJson.data || []) as Category[];
      setCategories(cats);

      const postsJson = await postsRes.json();
      const posts = (postsJson.data || []) as Array<{ category_id: string; tags?: string }>;
      const counts: Record<string, number> = {};
      cats.forEach((c) => {
        counts[c.id] = posts.filter((p) => p.category_id === c.id).length;
      });
      setPostCounts(counts);

      // Extract popular tags from all posts
      const tagCounts: Record<string, number> = {};
      posts.forEach((p) => {
        const tags = parseTags(p.tags);
        tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      });
      const sortedTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15); // top 15 tags
      setPopularTags(sortedTags);

      const statsJson = await statsRes.json();
      if (statsJson.data) setStatsData(statsJson.data);
      const draftsJson = await draftsRes.json();
      setDraftCount(draftsJson.total || draftsJson.data?.length || 0);
      // 视频数量
      try { const vRes = await fetch("/api/video-center/videos?page_size=1"); const vJson = await vRes.json(); setVideoCount(vJson.total || vJson.data?.length || 0); } catch {}
    } catch (e) {
      console.error("Failed to load home data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [searchResults, setSearchResults] = useState<Array<Record<string, unknown>> | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (tagOverride?: string) => {
    const tag = tagOverride ?? activeTag;
    const hasKeyword = searchKeyword.trim().length > 0;
    if (!hasKeyword && !tag) return;
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (hasKeyword) params.set("keyword", searchKeyword);
      if (searchCategory !== "all") params.set("category_id", searchCategory);
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/knowledge/search?${params.toString()}`);
      const json = await res.json();
      if (json.data) setSearchResults(json.data);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const handleTagClick = (tagName: string) => {
    if (activeTag === tagName) {
      // Toggle off: clear tag filter and results
      setActiveTag("");
      setSearchResults(null);
    } else {
      setActiveTag(tagName);
      handleSearch(tagName);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchKeyword("");
    setActiveTag("");
  };

  // Build uniform card list
  const allCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const uniformCards: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    icon: string;
    count: number;
    onClick: () => void;
    badgeLabel: string;
  }> = [
    ...allCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || "",
      type: cat.category_type,
      icon: cat.icon || "FileText",
      count: postCounts[cat.id] || 0,
      onClick: () => onEnterCategory(cat.id, cat.name, cat.category_type),
      badgeLabel: "篇内容",
    })),
    {
      id: "video_center",
      name: "视频中心",
      description: "产品视频上传、查看与分享",
      type: "video_center",
      icon: "Video",
      count: videoCount,
      onClick: onEnterVideoCenter,
      badgeLabel: "个视频",
    },
    {
      id: "drafts",
      name: "我的草稿",
      description: "未发布的内容草稿",
      type: "drafts",
      icon: "FileEdit",
      count: draftCount,
      onClick: onEnterDrafts,
      badgeLabel: "篇草稿",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Bar + Stats button */}
      <div className="flex items-center gap-3 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="搜索文档、手册、工具、资料..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="pl-10 h-12 text-base border-0 focus-visible:ring-0 bg-gray-50 rounded-xl"
          />
        </div>
        <Select value={searchCategory} onValueChange={setSearchCategory}>
          <SelectTrigger className="w-[140px] h-12 rounded-xl">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => handleSearch()} size="lg" className="h-12 px-6 rounded-xl">
          <Search className="w-4 h-4 mr-2" /> 搜索
        </Button>
        {/* Stats button — icon only, top-right corner */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0 hover:bg-violet-100 hover:text-violet-600"
          onClick={() => { setStatsOpen(true); setExpandedContributor(null); loadData(); }}
          title="信息统计"
        >
          <BarChart3 className="w-5 h-5" />
        </Button>
      </div>

      {/* Post Tag Chips */}
      {popularTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-gray-400 shrink-0" />
          {popularTags.map((t) => (
            <button
              key={t.name}
              onClick={() => handleTagClick(t.name)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                activeTag === t.name
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
              }`}
            >
              {t.name}
              <span className="opacity-60">{t.count}</span>
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => { setActiveTag(""); setSearchResults(null); }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> 清除
            </button>
          )}
        </div>
      )}

      {/* Search Results */}
      {searchResults !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              {activeTag && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mr-2 rounded-full bg-indigo-100 text-indigo-700 text-sm">
                  <Tag className="w-3.5 h-3.5" /> {activeTag}
                </span>
              )}
              {searchKeyword ? <>搜索 &ldquo;{searchKeyword}&rdquo;</> : <>标签筛选</>} — {searchResults.length} 条结果
            </h3>
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              <X className="w-4 h-4 mr-1" /> 返回首页
            </Button>
          </div>
          {searchLoading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3" />
              搜索中...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>未找到相关内容</p>
              <p className="text-xs mt-1">试试其他关键词</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((item: Record<string, unknown>) => {
                const isVideo = item._type === "video";
                const catName = !isVideo ? (categories.find((c) => c.id === item.category_id)?.name || "") : "";
                const snippet = isVideo ? String(item.description || item.file_name || "") : String(item.content || "").replace(/<[^>]+>/g, "").substring(0, 200);
                return (
                  <div
                    key={String(item.id) + (isVideo ? "_v" : "")}
                    onClick={() => {
                      if (isVideo) {
                        window.open(`/video-center?video=${item.id}`, "_blank");
                      } else {
                        onPostClick({
                          id: String(item.id),
                          title: String(item.title || ""),
                          content: String(item.content || ""),
                          content_type: String(item.content_type || "rich_text"),
                          version: Number(item.version || 1),
                          category_id: String(item.category_id || ""),
                          created_by: String(item.created_by || ""),
                          created_by_name: String(item.created_by_name || ""),
                          is_pinned: Boolean(item.is_pinned),
                          tags: String(item.tags || ""),
                          view_count: Number(item.view_count || 0),
                          like_count: Number(item.like_count || 0),
                          comment_count: Number(item.comment_count || 0),
                          created_at: String(item.created_at || ""),
                        });
                      }
                    }}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 truncate">
                          {isVideo && <Video className="w-3.5 h-3.5 inline mr-1 text-purple-500" />}
                          {String(item.title || "")}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{snippet}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {isVideo && <span className="bg-purple-100 rounded-full px-2 py-0.5 text-purple-600">🎬 视频</span>}
                          {!isVideo && catName && (
                            <span className="bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">{catName}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {String(item.created_by_name || "匿名")}
                          </span>
                          <span>{formatDate(String(item.created_at || ""))}</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {String(item.view_count || 0)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Uniform Card Grid */}
      {searchResults === null && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {uniformCards.map((card) => {
            const colors = COLOR_MAP[card.type] || COLOR_MAP.tech_doc;
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className={`group cursor-pointer bg-white/60 backdrop-blur-xl rounded-2xl border border-white/30 ${colors.border} shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-400 overflow-hidden flex flex-col`}
              >
                <div className="p-6 text-center flex flex-col items-center justify-between h-full">
                  <div className="space-y-3">
                    <div className={`w-16 h-16 ${colors.iconBg} rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-400`}>
                      <div className={colors.iconColor}>
                        {ICON_MAP[card.icon] || ICON_MAP.FileText}
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-gray-800">{card.name}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{card.description}</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${colors.badge} text-xs font-medium`}>
                      {card.count > 0 ? (
                        <>
                          <span className="text-sm font-bold">{card.count}</span>
                          <span>{card.badgeLabel}</span>
                        </>
                      ) : (
                        <span>{card.count === 0 && card.type === "video_center" ? "暂无视频" : card.count === 0 ? "暂无内容" : ""}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center text-xs text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                      <span>进入查看</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rotating Info Banner */}
      <InfoBanner />

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              信息统计
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {statsData ? (
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "总发布", value: statsData.total_posts, icon: FileText, color: "text-blue-600 bg-blue-50" },
                    { label: "总浏览", value: statsData.total_views, icon: Eye, color: "text-green-600 bg-green-50" },
                    { label: "总点赞", value: statsData.total_likes, icon: ThumbsUp, color: "text-amber-600 bg-amber-50" },
                    { label: "总下载", value: statsData.total_downloads, icon: Download, color: "text-cyan-600 bg-cyan-50" },
                    { label: "贡献者", value: statsData.total_contributors, icon: User, color: "text-violet-600 bg-violet-50" },
                  ].map((item) => (
                    <div key={item.label} className={`${item.color} rounded-xl p-4 text-center`}>
                      <item.icon className="w-5 h-5 mx-auto mb-1 opacity-70" />
                      <div className="text-2xl font-bold">{item.value}</div>
                      <div className="text-xs opacity-70">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">分类</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">发布数</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">浏览</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">点赞</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">评论</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">下载</th>
                        <th className="text-center px-3 py-3 font-medium text-gray-600">贡献人</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">最近发布</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.categories.map((cat) => (
                        <tr key={cat.category_type} className="border-b last:border-0 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-800">{cat.category_name}</td>
                          <td className="text-center px-3 py-3">{cat.post_count}</td>
                          <td className="text-center px-3 py-3">{cat.view_count}</td>
                          <td className="text-center px-3 py-3">{cat.like_count}</td>
                          <td className="text-center px-3 py-3">{cat.comment_count}</td>
                          <td className="text-center px-3 py-3">{cat.download_count}</td>
                          <td className="text-center px-3 py-3">{cat.contributor_count}</td>
                          <td className="text-right px-4 py-3 text-gray-500">{formatDate(cat.latest_post_at || "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* 贡献者排行 */}
                {statsData.contributors && statsData.contributors.length > 0 && (() => {
                  const maxPosts = Math.max(...statsData.contributors.map((c) => c.post_count), 1);
                  return (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-violet-500" />
                        贡献者排行
                        <span className="text-xs text-gray-400 font-normal ml-1">共 {statsData.contributors.length} 人</span>
                      </h3>
                      <div className="border rounded-xl divide-y max-h-[260px] overflow-y-auto">
                        {statsData.contributors.map((c, i) => {
                          const isExpanded = expandedContributor === i;
                          const rankClass =
                            i === 0 ? "text-amber-500" :
                            i === 1 ? "text-slate-400" :
                            i === 2 ? "text-orange-500" : "text-gray-400";
                          return (
                            <div key={c.name}>
                              <div
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isExpanded ? "bg-violet-50" : "hover:bg-gray-50"}`}
                                onClick={() => setExpandedContributor(isExpanded ? null : i)}
                              >
                                <span className={`w-6 text-center text-xs font-bold shrink-0 ${rankClass}`}>
                                  {i + 1}
                                </span>
                                <span className="text-sm font-medium text-gray-800 w-16 shrink-0 truncate">
                                  {c.name}
                                </span>
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round((c.post_count / maxPosts) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-600 w-10 text-right shrink-0">
                                  {c.post_count}篇
                                </span>
                              </div>
                              {isExpanded && (
                                <div className="px-4 py-2 bg-gray-50/50 text-xs text-gray-500 flex items-center gap-4 ml-14">
                                  <span>👁 {c.total_views} 浏览</span>
                                  <span>👍 {c.total_likes} 点赞</span>
                                  <span className="truncate">📂 {c.categories}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500 mr-2" />
                加载中...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
