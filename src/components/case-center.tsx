"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Users,
  ArrowLeft,
  Search,
  Eye,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  BarChart3,
  ExternalLink,
  School,
  Building2,
  Briefcase,
  Cpu,
  Target,
  UserCheck,
  DollarSign,
  Wrench,
  CalendarClock,
  LayoutGrid,
  Tag,
  Link2,
  TrendingUp,
  Settings,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProfileConfigDialog } from "@/components/profile-config-dialog";

interface CaseCard {
  [key: string]: unknown;
  _project_name?: string;
  _project_code?: string;
  _project_id?: string;
  _schema?: string;
}

interface CaseConfig {
  id?: string;
  type: string;
  table_code: string;
  title_field: string;
  subtitle_field?: string;
  description_field?: string;
  image_field?: string;
  tags_field?: string;
  stat_fields?: { field: string; label: string; chart: string }[];
  is_enabled?: boolean;
  sort_order?: number;
  modules?: ModuleConfig[];
  overview_metrics?: OverviewMetric[];
  project_id?: string;
}

interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  table_code: string;
  display_type: string;
  fields: ModuleField[];
}

interface ModuleField {
  column: string;
  label: string;
  render: string;
}

interface OverviewMetric {
  label: string;
  table_code: string;
  column?: string;
  filter_value?: string;
  calc: string;
}

interface StatOverview {
  total: number;
  projectCount: number;
  totalProjects: number;
}

interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

// Default 10 modules shown when no modules configured
const DEFAULT_PROFILE_MODULES: ModuleConfig[] = [
  { id: "school_info", name: "学校基础信息", icon: "School", table_code: "", display_type: "card", fields: [] },
  { id: "org_structure", name: "组织架构与科室", icon: "Building2", table_code: "", display_type: "card", fields: [] },
  { id: "core_business", name: "核心业务全景", icon: "Briefcase", table_code: "", display_type: "card", fields: [] },
  { id: "it_status", name: "信息化现状", icon: "Cpu", table_code: "", display_type: "card", fields: [] },
  { id: "product_usage", name: "我司产品使用情况", icon: "BarChart3", table_code: "", display_type: "card", fields: [] },
  { id: "needs_pain", name: "需求与痛点", icon: "Target", table_code: "", display_type: "card", fields: [] },
  { id: "key_contacts", name: "关键联系人", icon: "UserCheck", table_code: "", display_type: "card", fields: [] },
  { id: "sales_leads", name: "二次销售线索", icon: "DollarSign", table_code: "", display_type: "card", fields: [] },
  { id: "service_records", name: "服务与巡检记录", icon: "Wrench", table_code: "", display_type: "card", fields: [] },
  { id: "project_plan", name: "项目推进计划", icon: "CalendarClock", table_code: "", display_type: "card", fields: [] },
];

interface StatDistribution {
  field: string;
  label: string;
  items: { value: string; count: number }[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  School,
  Building2,
  Briefcase,
  Cpu,
  BarChart3,
  Target,
  UserCheck,
  DollarSign,
  Wrench,
  CalendarClock,
  LayoutGrid,
};

export function CaseCenter({ currentUser }: { currentUser?: CurrentUser }) {
  const [viewMode, setViewMode] = useState<
    "home" | "product" | "profile" | "profile_detail"
  >("home");
  const [productCards, setProductCards] = useState<CaseCard[]>([]);
  const [profileCards, setProfileCards] = useState<CaseCard[]>([]);
  const [productConfig, setProductConfig] = useState<CaseConfig | null>(null);
  const [profileConfig, setProfileConfig] = useState<CaseConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [statsOverview, setStatsOverview] = useState<StatOverview>({
    total: 0,
    projectCount: 0,
    totalProjects: 0,
  });
  const [statsDistributions, setStatsDistributions] = useState<
    StatDistribution[]
  >([]);
  const [selectedCard, setSelectedCard] = useState<CaseCard | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<{
    field: string;
    value: string;
  } | null>(null);

  // User profile detail states
  const [activeModuleId, setActiveModuleId] = useState<string>("");
  const [profileModuleData, setProfileModuleData] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [profileMetrics, setProfileMetrics] = useState<Record<string, unknown>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedProfileProject, setSelectedProfileProject] =
    useState<CaseCard | null>(null);

  // Layout & permission states
  const [profileLayouts, setProfileLayouts] = useState<Record<string, "system" | "project">>({});
  const [projectMemberMap, setProjectMemberMap] = useState<Record<string, boolean>>({});
  const [projectConfigMap, setProjectConfigMap] = useState<Record<string, CaseConfig>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configDialogProjectId, setConfigDialogProjectId] = useState<string>("");

  const [currentDetailLayout, setCurrentDetailLayout] = useState<"system" | "project">("system");

  // Load config
  useEffect(() => {
    fetch("/api/case-center/config")
      .then((res) => res.json())
      .then((data) => {
        const configs: CaseConfig[] = data.data || [];
        setProductConfig(
          configs.find((c) => c.type === "product_case" && !c.project_id) || null
        );
        setProfileConfig(
          configs.find((c) => c.type === "user_profile" && !c.project_id) || null
        );
      })
      .catch(console.error);
  }, []);

  // Load data when entering a section
  const loadProductCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/case-center/product-cases");
      const data = await res.json();
      setProductCards(data.data || []);
      setProductConfig(data.config || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const loadProductStats = useCallback(async () => {
    try {
      const res = await fetch("/api/case-center/product-stats");
      const data = await res.json();
      setStatsOverview(data.data?.overview || { total: 0, projectCount: 0, totalProjects: 0 });
      setStatsDistributions(data.data?.distributions || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadUserProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/case-center/user-profiles");
      const data = await res.json();
      setProfileCards(data.data || []);
      setProfileConfig(data.config || null);

      // Load project-level configs
      const pcm: Record<string, CaseConfig> = {};
      if (data.projectConfigMap) {
        for (const [pid, cfg] of Object.entries(data.projectConfigMap)) {
          pcm[pid] = cfg as CaseConfig;
        }
      }
      setProjectConfigMap(pcm);

      // Load layout preferences from localStorage
      const savedLayouts: Record<string, "system" | "project"> = {};
      for (const card of data.data || []) {
        const pid = card._project_id as string;
        if (pid) {
          const saved = localStorage.getItem(`profile_layout_${pid}`);
          savedLayouts[pid] = (saved === "project" ? "project" : "system") as "system" | "project";
        }
      }
      setProfileLayouts(savedLayouts);

      // Check membership for each project (batch)
      if (currentUser?.name) {
        const memberChecks: Promise<void>[] = [];
        for (const card of data.data || []) {
          const pid = card._project_id as string;
          if (pid) {
            memberChecks.push(
              fetch(`/api/case-center/check-member?project_id=${pid}&user_name=${encodeURIComponent(currentUser.name)}`)
                .then((r) => r.json())
                .then((d) => {
                  setProjectMemberMap((prev) => ({ ...prev, [pid]: d.isMember === true }));
                })
                .catch(() => {
                  setProjectMemberMap((prev) => ({ ...prev, [pid]: false }));
                })
            );
          }
        }
        await Promise.all(memberChecks);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [currentUser]);

  // Load user profile detail data for a specific project/schema
  const loadProfileDetail = useCallback(
    async (projectSchema: string, layout: "system" | "project", projectId: string) => {
      // Determine which config to use based on layout
      let activeConfig: CaseConfig | null = null;
      if (layout === "project" && projectId && projectConfigMap[projectId]) {
        activeConfig = projectConfigMap[projectId];
      } else {
        activeConfig = profileConfig;
      }

      // Always show all 10 modules; merge configured fields on top of defaults
      const modules = DEFAULT_PROFILE_MODULES.map((def) => {
        const configured = activeConfig?.modules?.find((m) => m.id === def.id);
        return configured || def;
      });
      const overviewMetrics = activeConfig?.overview_metrics || [];
      setProfileLoading(true);
      // Set first module as active immediately
      if (modules.length > 0) {
        setActiveModuleId(modules[0].id);
      }
      try {
        // Only send modules that have a table_code configured
        const modulesWithTable = modules.filter(m => m.table_code);
        if (modulesWithTable.length > 0 || overviewMetrics.length > 0) {
          const res = await fetch("/api/case-center/user-profile-detail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectSchema,
              modules: modulesWithTable,
              overviewMetrics,
            }),
          });
          const data = await res.json();
          setProfileModuleData(data.data || {});
          setProfileMetrics(data.metrics || {});
        }
      } catch (e) {
        console.error(e);
      }
      setProfileLoading(false);
    },
    [profileConfig, projectConfigMap]
  );

  const enterSection = (section: "product" | "profile") => {
    setViewMode(section);
    setSearch("");
    setSelectedCard(null);
    setDrillDown(null);
    setShowStats(false);
    if (section === "product") {
      loadProductCases();
    } else {
      loadUserProfiles();
    }
  };

  const enterProfileDetail = (card: CaseCard) => {
    const schema = (card._schema as string) || "";
    const projectId = (card._project_id as string) || "";
    setSelectedProfileProject(card);

    // Determine layout
    const layout = profileLayouts[projectId] || "system";
    setCurrentDetailLayout(layout);
    setViewMode("profile_detail");
    if (schema) {
      loadProfileDetail(schema, layout, projectId);
    }
  };

  const handleLayoutChange = (card: CaseCard, layout: "system" | "project") => {
    const projectId = (card._project_id as string) || "";
    setProfileLayouts((prev) => ({ ...prev, [projectId]: layout }));
    localStorage.setItem(`profile_layout_${projectId}`, layout);
    // Enter detail with the selected layout
    setSelectedProfileProject(card);
    setCurrentDetailLayout(layout);
    setViewMode("profile_detail");
    const schema = (card._schema as string) || "";
    if (schema) {
      loadProfileDetail(schema, layout, projectId);
    }
  };

  const openConfigDialog = (projectId: string) => {
    setConfigDialogProjectId(projectId);
    setConfigDialogOpen(true);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleDrillDown = (field: string, value: string) => {
    setDrillDown({ field, value });
  };

  const clearDrillDown = () => {
    setDrillDown(null);
  };

  const filterCards = (cards: CaseCard[], config: CaseConfig | null) => {
    const isProfile = viewMode === "profile";
    let filtered = cards;
    if (search && config) {
      const q = search.toLowerCase();
      filtered = filtered.filter((card) => {
        const title = config.title_field
          ? String(card[config.title_field] || "").toLowerCase()
          : isProfile
            ? String(card._project_name || "").toLowerCase()
            : "";
        const subtitle = config.subtitle_field
          ? String(card[config.subtitle_field] || "").toLowerCase()
          : isProfile
            ? String(card._project_code || "").toLowerCase()
            : "";
        const desc = config.description_field
          ? String(card[config.description_field] || "").toLowerCase()
          : "";
        return title.includes(q) || subtitle.includes(q) || desc.includes(q);
      });
    }
    if (drillDown) {
      filtered = filtered.filter(
        (card) => String(card[drillDown.field] || "") === drillDown.value
      );
    }
    return filtered;
  };

  useEffect(() => {
    if (showStats && viewMode === "product") {
      loadProductStats();
    }
  }, [showStats, viewMode, loadProductStats]);

  const getCardValue = (card: CaseCard, field: string): string => {
    const val = card[field];
    return val != null ? String(val) : "";
  };

  const getImageUrl = (card: CaseCard, field: string) => {
    const val = card[field];
    if (!val) return "";
    if (typeof val === "string" && val.startsWith("http")) return val;
    if (typeof val === "string" && val.startsWith("/api/")) return val;
    if (typeof val === "string" && val.startsWith("/uploads/")) return val;
    return "";
  };

  const getTags = (card: CaseCard, field: string): string[] => {
    const val = card[field];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return val.split(",").map((s) => s.trim());
      }
    }
    return [];
  };

  // Card rendering for product case
  const renderProductCard = (card: CaseCard, config: CaseConfig, _index: number) => {
    const title = config.title_field
      ? String(getCardValue(card, config.title_field))
      : "未命名";
    const subtitle = config.subtitle_field
      ? String(getCardValue(card, config.subtitle_field))
      : "";
    const description = config.description_field
      ? String(getCardValue(card, config.description_field))
      : "";
    const imageUrl = config.image_field
      ? getImageUrl(card, config.image_field)
      : "";
    const tags = config.tags_field ? getTags(card, config.tags_field) : [];

    return (
      <button
        key={card.id as string || _index}
        onClick={() => setSelectedCard(card)}
        className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-300 text-left group"
      >
        {imageUrl ? (
          <div className="h-40 overflow-hidden">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <Package className="w-10 h-10 text-blue-300" />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 text-sm truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
          {description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              {description}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600 hover:bg-blue-100"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-slate-400 self-center">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
          {card._project_name && (
            <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-400">
              <ExternalLink className="w-2.5 h-2.5" />
              {card._project_name as string}
            </div>
          )}
        </div>
      </button>
    );
  };

  // Card rendering for user profile (school card with layout buttons + settings)
  const renderProfileCard = (card: CaseCard, _index: number) => {
    const projectId = (card._project_id as string) || "";
    const projectName = (card._project_name as string) || "未命名";
    const projectCode = (card._project_code as string) || "";
    const layout = profileLayouts[projectId] || "system";
    const isMember = projectMemberMap[projectId] === true;

    return (
      <div
        key={card.id as string || _index}
        className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-300 relative"
        onMouseEnter={() => setHoveredCardId(projectId)}
        onMouseLeave={() => setHoveredCardId(null)}
      >
        {/* Card content - clickable to enter detail */}
        <div
          className="cursor-pointer p-1"
          onClick={() => enterProfileDetail(card)}
        >
          <div className="h-28 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <School className="w-10 h-10 text-blue-300" />
          </div>
          <div className="p-4 pb-5 text-center">
            <h3 className="font-semibold text-slate-900 text-sm truncate">
              {projectName}
            </h3>
            {projectCode && (
              <p className="text-xs text-slate-500 mt-1 truncate">{projectCode}</p>
            )}
          </div>
        </div>

        {/* Hover overlay - absolutely centered in the whole card, only visible on hover */}
        {hoveredCardId === projectId && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20 rounded-xl">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleLayoutChange(card, "system"); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  layout === "system"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-500"
                )}
              >
                系统定义
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleLayoutChange(card, "project"); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  layout === "project"
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-green-50 hover:text-green-500"
                )}
              >
                项目维护
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openConfigDialog(projectId);
                }}
                className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer"
                title="配置用户画像"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Simple tooltip icon component
  const TooltipIcon = ({ text }: { text: string }) => (
    <div className="group/tip relative">
      <Shield className="w-3.5 h-3.5 text-slate-300" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </div>
    </div>
  );

  // Stats rendering
  const renderStats = () => {
    const overview = statsOverview;
    const distributions = statsDistributions;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <div className="text-xl font-bold text-blue-600">{overview.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">总案例数</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <div className="text-xl font-bold text-blue-600">{overview.projectCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">覆盖项目</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <div className="text-xl font-bold text-blue-600">{overview.totalProjects}</div>
            <div className="text-[11px] text-slate-400 mt-1">活跃项目</div>
          </div>
        </div>
        {distributions.map((dist) => {
          const maxCount = Math.max(...dist.items.map((i) => i.count), 1);
          return (
            <div key={dist.field} className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-medium text-slate-500 mb-3">
                {dist.label || dist.field}
              </h3>
              <div className="space-y-2">
                {dist.items.slice(0, 10).map((item) => (
                  <div
                    key={item.value}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => handleDrillDown(dist.field, item.value)}
                  >
                    <div className="w-20 text-[11px] text-slate-500 truncate group-hover:text-blue-600 transition-colors">
                      {item.value}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-full h-4 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500 group-hover:from-blue-500 group-hover:to-blue-600"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                      <span className="absolute right-2 top-0 text-[10px] font-medium text-slate-500">
                        {item.count}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
                {dist.items.length === 0 && (
                  <div className="text-[11px] text-slate-300 text-center py-3">暂无数据</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Detail dialog (for product case)
  const renderDetailDialog = () => {
    if (!selectedCard) return null;
    const config = productConfig;
    const imageUrl = config?.image_field
      ? getImageUrl(selectedCard, config.image_field)
      : "";

    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="relative">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-48 object-cover rounded-t-2xl" />
            ) : (
              <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
            )}
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {config?.title_field ? getCardValue(selectedCard, config.title_field) : "详情"}
            </h2>
            {selectedCard._project_name && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <ExternalLink className="w-3.5 h-3.5" />
                所属项目: {selectedCard._project_name}
              </div>
            )}
            {config?.subtitle_field && getCardValue(selectedCard, config.subtitle_field) && (
              <p className="text-sm text-slate-500">{getCardValue(selectedCard, config.subtitle_field)}</p>
            )}
            {config?.description_field && getCardValue(selectedCard, config.description_field) && (
              <div className="bg-blue-50/50 rounded-lg p-4 text-sm text-slate-600 whitespace-pre-wrap">
                {getCardValue(selectedCard, config.description_field)}
              </div>
            )}
            {config?.tags_field && (
              <div className="flex flex-wrap gap-1.5">
                {getTags(selectedCard, config.tags_field).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-medium text-slate-400 mb-3">全部字段</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedCard)
                  .filter(([key]) => !key.startsWith("_") && key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "sort_order" && key !== "data_source" && key !== "allow_delete" && key !== "_module_code")
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-slate-400">{key}:</span>{" "}
                      <span className="text-slate-700">
                        {Array.isArray(value) ? value.join(", ") : String(value || "-")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============= USER PROFILE DETAIL VIEW =============
  const renderProfileDetail = () => {
    const projectId = (selectedProfileProject?._project_id as string) || "";
    const layout = currentDetailLayout;
    const isMember = projectMemberMap[projectId] === true;

    // Determine which config to use based on layout
    let activeConfig: CaseConfig | null = null;
    if (layout === "project" && projectId && projectConfigMap[projectId]) {
      activeConfig = projectConfigMap[projectId];
    } else {
      activeConfig = profileConfig;
    }

    // Always show all 10 modules; merge configured fields on top of defaults
    const modules = DEFAULT_PROFILE_MODULES.map((def) => {
      const configured = activeConfig?.modules?.find((m) => m.id === def.id);
      return configured || def;
    });
    const activeModule = modules.find((m) => m.id === activeModuleId);
    const moduleData = activeModuleId ? profileModuleData[activeModuleId] || [] : [];
    const metrics = profileMetrics;

    // Get the school name from selected project card
    const schoolName = selectedProfileProject
      ? (selectedProfileProject._project_name as string) || "学校"
      : "学校";

    const renderModuleContent = () => {
      if (!activeModule) return null;
      if (!activeModule.table_code) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300">
            <LayoutGrid className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-slate-400">未配置数据源</p>
            <p className="text-xs mt-1">请在设置中为该模块选择规范表</p>
          </div>
        );
      }
      if (moduleData.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300">
            <Eye className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-slate-400">暂无数据</p>
            <p className="text-xs mt-1">该模块尚未录入数据</p>
          </div>
        );
      }

      const fields = activeModule.fields || [];

      if (activeModule.display_type === "card") {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moduleData.map((row, ri) => (
              <div key={ri} className="bg-white rounded-xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
                {fields.length > 0 ? (
                  <div className="space-y-3">
                    {fields.map((field, fi) => {
                      const val = row[field.column];
                      if (val == null || val === "") return null;
                      return (
                        <div key={fi}>
                          <span className="text-[11px] text-slate-400 font-medium">{field.label}</span>
                          {renderFieldValue(val, field.render)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(row)
                      .filter(([key]) => !key.startsWith("_") && key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "sort_order" && key !== "data_source" && key !== "allow_delete" && key !== "_module_code")
                      .map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-[11px] text-slate-400">{key}</span>
                          <div className="text-slate-700">{Array.isArray(value) ? value.join(", ") : String(value || "-")}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      if (activeModule.display_type === "table") {
        const allCols = fields.length > 0
          ? fields
          : moduleData[0]
            ? Object.keys(moduleData[0])
                .filter((k) => !k.startsWith("_") && k !== "id" && k !== "created_at" && k !== "updated_at" && k !== "sort_order" && k !== "data_source" && k !== "allow_delete" && k !== "_module_code")
                .map((k) => ({ column: k, label: k, render: "text" }))
            : [];

        return (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {allCols.map((col, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {moduleData.map((row, ri) => (
                    <tr key={ri} className="border-b border-slate-50 hover:bg-slate-50/50">
                      {allCols.map((col, ci) => {
                        const val = row[col.column];
                        return (
                          <td key={ci} className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {Array.isArray(val) ? val.join(", ") : val != null ? String(val) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      if (activeModule.display_type === "timeline") {
        return (
          <div className="space-y-4">
            {moduleData.map((row, ri) => {
              const titleField = fields.find((f) => f.render === "text");
              const title = titleField ? String(row[titleField.column] || `记录 ${ri + 1}`) : `记录 ${ri + 1}`;
              return (
                <div key={ri} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                    {ri < moduleData.length - 1 && <div className="w-0.5 flex-1 bg-blue-100 my-1" />}
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 mb-2">
                    <h4 className="font-medium text-slate-800 text-sm mb-2">{title}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {fields.filter(f => f.column !== titleField?.column).map((field, fi) => {
                        const val = row[field.column];
                        if (val == null || val === "") return null;
                        return (
                          <div key={fi}>
                            <span className="text-[11px] text-slate-400">{field.label}</span>
                            {renderFieldValue(val, field.render)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      if (activeModule.display_type === "tag_cloud") {
        const tagFields = fields.filter((f) => f.render === "tag" || f.render === "badge");
        const allTags: { label: string; value: string; fieldLabel: string }[] = [];
        for (const row of moduleData) {
          for (const field of tagFields.length > 0 ? tagFields : fields.slice(0, 3)) {
            const val = row[field.column];
            if (val != null && val !== "") {
              if (Array.isArray(val)) {
                val.forEach((v) => allTags.push({ label: field.label, value: String(v), fieldLabel: field.label }));
              } else {
                allTags.push({ label: field.label, value: String(val), fieldLabel: field.label });
              }
            }
          }
        }
        return (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex flex-wrap gap-3">
              {allTags.map((tag, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                >
                  <span className="text-[10px] text-blue-400">{tag.fieldLabel}</span>
                  <span className="font-medium">{tag.value}</span>
                </div>
              ))}
              {allTags.length === 0 && (
                <div className="text-sm text-slate-400">暂无标签数据</div>
              )}
            </div>
          </div>
        );
      }

      // Fallback: card view
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {moduleData.map((row, ri) => (
            <div key={ri} className="bg-white rounded-xl border border-slate-100 p-5">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(row)
                  .filter(([key]) => !key.startsWith("_") && key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "sort_order" && key !== "data_source" && key !== "allow_delete" && key !== "_module_code")
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-[11px] text-slate-400">{key}</span>
                      <div className="text-slate-700">{Array.isArray(value) ? value.join(", ") : String(value || "-")}</div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* 页面标题 */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => {
                setViewMode("profile");
                setSelectedProfileProject(null);
                setProfileModuleData({});
                setProfileMetrics({});
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <School className="w-6 h-6" />
              {schoolName}
            </h2>
            {selectedProfileProject?._project_code && (
              <span className="text-xs text-slate-400">
                {selectedProfileProject._project_code as string}
              </span>
            )}
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-2 py-0.5",
                layout === "system"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-green-50 text-green-600"
              )}
            >
              {layout === "system" ? "系统定义" : "项目维护"}
            </Badge>
            <button
              onClick={() => openConfigDialog(projectId)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-slate-400 hover:text-blue-500"
              title="配置用户画像"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">查看学校详细信息与各模块信息</p>
        </div>

        {/* Overview Metrics Bar */}
        {Object.keys(metrics).length > 0 && (
          <div className="px-6 py-3 bg-white/60 border-b border-slate-100 shrink-0">
            <div className="flex gap-4">
              {Object.entries(metrics).filter(([k]) => !k.endsWith("_type")).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-100 shadow-sm"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px] text-slate-400">{label}</span>
                  <span className="text-sm font-bold text-blue-600">
                    {typeof value === "number" && value <= 100 && String(metrics[`${label}_type`]) !== "count"
                      ? `${value}%`
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - Module Navigation */}
          <div className="w-56 shrink-0 bg-white border-r border-slate-100 overflow-y-auto">
            <div className="p-3 space-y-1">
              {modules.map((mod) => {
                const IconComp = ICON_MAP[mod.icon];
                const isActive = activeModuleId === mod.id;
                const count = profileModuleData[mod.id]?.length || 0;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModuleId(mod.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    )}
                  >
                    {IconComp ? (
                      <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-500" : "text-slate-400")} />
                    ) : (
                      <LayoutGrid className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-500" : "text-slate-400")} />
                    )}
                    <span className="flex-1 truncate">{mod.name}</span>
                    {!mod.table_code ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" title="未配置数据源" />
                    ) : count > 0 ? (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                        isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {profileLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="ml-2 text-slate-400">加载中...</span>
              </div>
            ) : (
              <div>
                {/* Module Header */}
                {activeModule && (
                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const IconComp = ICON_MAP[activeModule.icon];
                      return IconComp ? <IconComp className="w-5 h-5 text-blue-500" /> : null;
                    })()}
                    <h2 className="text-base font-semibold text-slate-800">{activeModule.name}</h2>
                    {activeModule.table_code ? (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-500">
                        {moduleData.length} 条记录
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300">
                        未配置
                      </Badge>
                    )}
                  </div>
                )}
                {renderModuleContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render field value based on render type
  const renderFieldValue = (val: unknown, renderType: string) => {
    const strVal = Array.isArray(val) ? val.join(", ") : String(val ?? "");

    switch (renderType) {
      case "tag":
        return (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {strVal.split(",").map((v, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-600">
                {v.trim()}
              </Badge>
            ))}
          </div>
        );
      case "badge":
        return (
          <div className="mt-0.5">
            <Badge className="text-[11px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-0">
              {strVal}
            </Badge>
          </div>
        );
      case "link":
        return (
          <a
            href={strVal.startsWith("http") ? strVal : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-0.5"
          >
            <Link2 className="w-3 h-3" />
            {strVal}
          </a>
        );
      case "progress":
        const numVal = parseFloat(strVal);
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
          return (
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${numVal}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 w-10 text-right">{numVal}%</span>
              </div>
            </div>
          );
        }
        return <p className="text-sm text-slate-700 mt-0.5">{strVal}</p>;
      default:
        return <p className="text-sm text-slate-700 mt-0.5">{strVal}</p>;
    }
  };

  // ============= HOME VIEW =============
  if (viewMode === "home") {
    return (
      <div className="h-full bg-gray-50">
        {/* 页面标题 */}
        <div className="p-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="w-6 h-6" />
            案例中心
          </h2>
          <p className="text-sm text-muted-foreground mt-1">查看产品案例与用户画像</p>
        </div>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => enterSection("product")}
              className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg hover:border-blue-100 transition-all duration-300 text-left group"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500 transition-colors duration-300">
                <Package className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">产品案例</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                跨项目查看产品使用案例，统计分析产品使用情况
              </p>
              <div className="flex items-center gap-1 mt-5 text-xs text-blue-500 font-medium">
                查看详情
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => enterSection("profile")}
              className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg hover:border-blue-100 transition-all duration-300 text-left group"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500 transition-colors duration-300">
                <Users className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors duration-300" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">用户画像</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                查看学校用户画像，10大模块全方位展示学校全貌
              </p>
              <div className="flex items-center gap-1 mt-5 text-xs text-blue-500 font-medium">
                查看详情
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============= PROFILE DETAIL VIEW =============
  if (viewMode === "profile_detail") {
    return (
      <>
        {renderProfileDetail()}
        {/* Config dialog */}
        {configDialogOpen && (
          <ProfileConfigDialog
            projectId={configDialogProjectId}
            onClose={() => {
              setConfigDialogOpen(false);
              // Reload the detail if we're viewing this project
              if (selectedProfileProject?._project_id === configDialogProjectId && selectedProfileProject._schema) {
                loadProfileDetail(selectedProfileProject._schema as string, currentDetailLayout, configDialogProjectId);
              }
              // Also reload user profiles to refresh projectConfigMap
              loadUserProfiles();
            }}
          />
        )}
      </>
    );
  }

  // ============= PRODUCT / PROFILE VIEW =============
  const isProduct = viewMode === "product";
  const cards = isProduct ? productCards : profileCards;
  const config = isProduct ? productConfig : profileConfig;
  const title = isProduct ? "产品案例" : "用户画像";
  const filteredCards = filterCards(cards, config);

  return (
    <div className="h-full bg-gray-50">
      {/* 页面标题 */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("home")}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            {isProduct ? <Package className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            {title}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{isProduct ? "跨项目查看产品使用案例，统计分析产品使用情况" : "查看学校用户画像，10大模块全方位展示学校全貌"}</p>
      </div>

      {/* 搜索栏 */}
      <div className="px-6 pb-3 flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索案例..."
              className="pl-9 h-9 bg-white border-slate-200 focus:border-blue-200"
            />
          </div>
        </div>
        {isProduct && (
          <Button
            variant={showStats ? "default" : "outline"}
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className={cn(
              showStats
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            {showStats ? "隐藏统计" : "数据统计"}
          </Button>
        )}
      </div>

      {drillDown && (
        <div className="px-6 pb-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">筛选:</span>
          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">
            {drillDown.field} = {drillDown.value}
            <button onClick={clearDrillDown} className="ml-1 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* 内容 */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="ml-2 text-slate-400">加载中...</span>
          </div>
        ) : !isProduct ? (
          // User profile - always show school cards
          filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <Eye className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium text-slate-400">暂无用户画像数据</p>
              <p className="text-xs mt-1">请先创建项目</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCards.map((card, index) => renderProfileCard(card, index))}
            </div>
          )
        ) : !config ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300">
            <AlertCircle className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-slate-400">未配置{title}</p>
            <p className="text-xs mt-1">请在系统设置 - 案例中心设置中配置关联规范表</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300">
            <Eye className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium text-slate-400">暂无{title}数据</p>
            <p className="text-xs mt-1">请在项目中录入相关数据</p>
          </div>
        ) : (
          <div className={cn("flex gap-6", showStats ? "flex-row" : "flex-col")}>
            {showStats && <div className="w-80 shrink-0">{renderStats()}</div>}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCards.map((card, index) => renderProductCard(card, config, index))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedCard && renderDetailDialog()}

      {/* Config dialog for profile cards */}
      {configDialogOpen && (
        <ProfileConfigDialog
          projectId={configDialogProjectId}
          onClose={() => {
            setConfigDialogOpen(false);
            loadUserProfiles();
          }}
        />
      )}
    </div>
  );
}
