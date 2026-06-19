"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronRight, FileText, BookOpen, Wrench, CheckCircle, FileEdit,
  BarChart3, Eye, ThumbsUp, MessageCircle, Download, User, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import InfoBanner from "./info-banner";

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
}

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-10 h-10" />,
  BookOpen: <BookOpen className="w-10 h-10" />,
  Wrench: <Wrench className="w-10 h-10" />,
  CheckCircle: <CheckCircle className="w-10 h-10" />,
  FileEdit: <FileEdit className="w-10 h-10" />,
};

const COLOR_MAP: Record<string, { iconBg: string; iconColor: string; border: string; badge: string }> = {
  tech_doc: {
    iconBg: "bg-gradient-to-br from-blue-100/80 to-indigo-100/80",
    iconColor: "text-blue-600",
    border: "hover:border-blue-300/60",
    badge: "bg-blue-100/60 text-blue-700",
  },
  product_manual: {
    iconBg: "bg-gradient-to-br from-amber-100/80 to-orange-100/80",
    iconColor: "text-amber-600",
    border: "hover:border-amber-300/60",
    badge: "bg-amber-100/60 text-amber-700",
  },
  ops_tool: {
    iconBg: "bg-gradient-to-br from-gray-100/80 to-slate-100/80",
    iconColor: "text-gray-600",
    border: "hover:border-gray-300/60",
    badge: "bg-gray-100/60 text-gray-700",
  },
  acceptance: {
    iconBg: "bg-gradient-to-br from-emerald-100/80 to-green-100/80",
    iconColor: "text-emerald-600",
    border: "hover:border-emerald-300/60",
    badge: "bg-emerald-100/60 text-emerald-700",
  },
  solution_template: {
    iconBg: "bg-gradient-to-br from-orange-100/80 to-red-100/80",
    iconColor: "text-orange-600",
    border: "hover:border-orange-300/60",
    badge: "bg-orange-100/60 text-orange-700",
  },
  stats: {
    iconBg: "bg-gradient-to-br from-violet-100/80 to-purple-100/80",
    iconColor: "text-violet-600",
    border: "hover:border-violet-300/60",
    badge: "bg-violet-100/60 text-violet-700",
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export default function HomeView({ onEnterCategory, onPostClick }: HomeViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const loadData = useCallback(async () => {
    try {
      const [catRes, postsRes, statsRes] = await Promise.all([
        fetch("/api/knowledge/categories"),
        fetch("/api/knowledge/posts?page_size=999"),
        fetch("/api/knowledge/stats"),
      ]);
      const catJson = await catRes.json();
      const cats = (catJson.data || []) as Category[];
      setCategories(cats);

      const postsJson = await postsRes.json();
      const posts = (postsJson.data || []) as Array<{ category_id: string }>;
      const counts: Record<string, number> = {};
      cats.forEach((c) => {
        counts[c.id] = posts.filter((p) => p.category_id === c.id).length;
      });
      setPostCounts(counts);

      const statsJson = await statsRes.json();
      if (statsJson.data) setStatsData(statsJson.data);
    } catch (e) {
      console.error("Failed to load home data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [searchResults, setSearchResults] = useState<Array<Record<string, unknown>> | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("keyword", searchKeyword);
      if (searchCategory !== "all") params.set("category_id", searchCategory);
      const res = await fetch(`/api/knowledge/search?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setSearchResults(json.data);
      }
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchKeyword("");
  };

  // Arrange cards: top row 3, bottom row 3 (方案模板, 验收资料, 信息统计)
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const topRow = sorted.slice(0, 3);
  const bottomCats = sorted.slice(3, 5);

  return (
    <div className="space-y-6">
      {/* Global Search Bar */}
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
        <Button onClick={handleSearch} size="lg" className="h-12 px-6 rounded-xl">
          <Search className="w-4 h-4 mr-2" /> 搜索
        </Button>
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              搜索 "{searchKeyword}" — {searchResults.length} 条结果
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
                const catName = categories.find((c) => c.id === item.category_id)?.name || "";
                const snippet = String(item.content || "").replace(/<[^>]+>/g, "").substring(0, 200);
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => {
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
                    }}
                    className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 truncate">{String(item.title || "")}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{snippet}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {catName && (
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

      {/* Card Grid */}
      {searchResults === null && (
      <div className="space-y-6">
        {/* Top Row: 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topRow.map((cat) => {
            const colors = COLOR_MAP[cat.category_type] || COLOR_MAP.tech_doc;
            return (
              <div
                key={cat.id}
                onClick={() => onEnterCategory(cat.id, cat.name, cat.category_type)}
                className={`group cursor-pointer bg-white/60 backdrop-blur-xl rounded-3xl border border-white/30 ${colors.border} shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden`}
              >
                <div className="p-8 text-center">
                  <div className={`w-20 h-20 ${colors.iconBg} backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500`}>
                    <div className={colors.iconColor}>
                      {ICON_MAP[cat.icon || "FileText"] || ICON_MAP.FileText}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cat.description}</p>
                  <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium`}>
                    <span className="text-lg font-bold">{postCounts[cat.id] || 0}</span>
                    <span>篇内容</span>
                  </div>
                  <div className="mt-5 flex items-center justify-center text-sm text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                    <span>进入查看</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Row: 方案模板 + 验收资料 + 信息统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bottomCats.map((cat) => {
            const colors = COLOR_MAP[cat.category_type] || COLOR_MAP.tech_doc;
            return (
              <div
                key={cat.id}
                onClick={() => onEnterCategory(cat.id, cat.name, cat.category_type)}
                className={`group cursor-pointer bg-white/60 backdrop-blur-xl rounded-3xl border border-white/30 ${colors.border} shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden`}
              >
                <div className="p-8 text-center">
                  <div className={`w-20 h-20 ${colors.iconBg} backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500`}>
                    <div className={colors.iconColor}>
                      {ICON_MAP[cat.icon || "FileText"] || ICON_MAP.FileText}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cat.description}</p>
                  <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium`}>
                    <span className="text-lg font-bold">{postCounts[cat.id] || 0}</span>
                    <span>篇内容</span>
                  </div>
                  <div className="mt-5 flex items-center justify-center text-sm text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                    <span>进入查看</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* 信息统计 Card */}
          <div
            onClick={() => { setStatsOpen(true); loadData(); }}
            className="group cursor-pointer bg-white/60 backdrop-blur-xl rounded-3xl border border-white/30 hover:border-violet-300/60 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100/80 to-purple-100/80 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500">
                <BarChart3 className="w-10 h-10 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">信息统计</h3>
              <p className="text-sm text-gray-500 mb-4">各分类发布数量、贡献人数、阅读下载等多维度统计</p>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-100/60 text-violet-700 text-sm font-medium">
                <span className="text-lg font-bold">{statsData?.total_posts || 0}</span>
                <span>篇总内容</span>
              </div>
              <div className="mt-5 flex items-center justify-center text-sm text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                <span>查看统计</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Rotating Info Banner */}
      <InfoBanner />

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              信息统计
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            {statsData ? (
              <div className="space-y-6 pr-4">
                {/* Overview cards */}
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

                {/* Per-category table */}
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
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500 mr-2" />
                加载中...
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
