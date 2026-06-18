"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ChevronRight, FileText, BookOpen, Wrench, CheckCircle, FileEdit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InfoBanner from "./info-banner";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  category_type: string;
  icon?: string;
  description?: string;
  sort_order: number;
}

interface HomeViewProps {
  currentUser?: { id?: string; name?: string; role?: string } | null;
  onEnterCategory: (categoryId: string, categoryName: string, categoryType: string) => void;
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
};

export default function HomeView({ onEnterCategory }: HomeViewProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [catRes] = await Promise.all([
        fetch("/api/knowledge/categories"),
      ]);
      const catJson = await catRes.json();
      const cats = (catJson.data || []) as Category[];
      setCategories(cats);

      // Load post counts per category
      const postsRes = await fetch("/api/knowledge/posts?page_size=999");
      const postsJson = await postsRes.json();
      const posts = (postsJson.data || []) as Array<{ category_id: string }>;
      const counts: Record<string, number> = {};
      cats.forEach((c) => {
        counts[c.id] = posts.filter((p) => p.category_id === c.id).length;
      });
      setStats(counts);
    } catch (e) {
      console.error("Failed to load home data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    const params = new URLSearchParams();
    params.set("keyword", searchKeyword);
    if (searchCategory !== "all") params.set("category_id", searchCategory);
    // Navigate to a search results view - for now, just enter the first matching category
    router.push(`?search=${encodeURIComponent(searchKeyword)}&cat=${searchCategory}`);
  };

  // Arrange cards: top row 3, bottom row 2
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const topRow = sorted.slice(0, 3);
  const bottomRow = sorted.slice(3, 5);

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

      {/* Card Grid */}
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
                  <div
                    className={`w-20 h-20 ${colors.iconBg} backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500`}
                  >
                    <div className={colors.iconColor}>
                      {ICON_MAP[cat.icon || "FileText"] || ICON_MAP.FileText}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cat.description}</p>
                  <div
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium`}
                  >
                    <span className="text-lg font-bold">{stats[cat.id] || 0}</span>
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

        {/* Bottom Row: 2 cards, centered */}
        {bottomRow.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {bottomRow.map((cat) => {
              const colors = COLOR_MAP[cat.category_type] || COLOR_MAP.tech_doc;
              return (
                <div
                  key={cat.id}
                  onClick={() => onEnterCategory(cat.id, cat.name, cat.category_type)}
                  className={`group cursor-pointer bg-white/60 backdrop-blur-xl rounded-3xl border border-white/30 ${colors.border} shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden`}
                >
                  <div className="p-8 text-center">
                    <div
                      className={`w-20 h-20 ${colors.iconBg} backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500`}
                    >
                      <div className={colors.iconColor}>
                        {ICON_MAP[cat.icon || "FileText"] || ICON_MAP.FileText}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{cat.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{cat.description}</p>
                    <div
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${colors.badge} text-sm font-medium`}
                    >
                      <span className="text-lg font-bold">{stats[cat.id] || 0}</span>
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
        )}
      </div>

      {/* Rotating Info Banner */}
      <InfoBanner />
    </div>
  );
}
