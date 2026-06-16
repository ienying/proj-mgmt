"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Zap, Users, Coins, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MEDAL_COLORS: Record<number, string> = { 1: "text-amber-500", 2: "text-gray-400", 3: "text-orange-500" };
const MEDAL_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PIE_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b"];

export default function AIStatsPanel() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ totalCalls: 0, totalTokens: 0, activeUsers: 0 });
  const [users, setUsers] = useState<Array<{
    userId: string; userName: string; calls: number; tokens: number;
    features: Record<string, number>; lastUsed: string;
  }>>([]);
  const [trendData, setTrendData] = useState<Array<Record<string, unknown>>>([]);
  const [featDist, setFeatDist] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<"calls" | "tokens">("calls");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const featureLabels: Record<string, string> = {
    "analyze-project": "数据分析",
    "speech-to-text": "语音转文字",
    "file-transcribe": "文件解析",
    "field-match": "字段匹配",
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/stats");
      const json = await res.json();
      if (json.data) {
        setOverview(json.data.overview);
        setUsers(json.data.users || []);
        setTrendData(json.data.trendData || []);
        setFeatDist(json.data.featureDistribution || {});
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const sortedUsers = [...users].sort((a, b) =>
    sortBy === "calls" ? b.calls - a.calls : b.tokens - a.tokens
  );

  const featPieData = Object.entries(featDist).map(([name, value]) => ({
    name: featureLabels[name] || name,
    value,
  }));

  const trendLines = Array.from(new Set(Object.keys(featDist)));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        AI 使用统计
      </h3>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "总调用次数", value: overview.totalCalls.toLocaleString(), sub: "全平台累计", icon: Zap, bg: "from-indigo-500 to-indigo-600", color: "text-indigo-600" },
          { label: "总 Token 消耗", value: `${(overview.totalTokens / 1000).toFixed(1)}K`, sub: `≈ ¥${(overview.totalTokens / 1000000 * 2).toFixed(2)}`, icon: Coins, bg: "from-emerald-500 to-emerald-600", color: "text-emerald-600" },
          { label: "活跃用户数", value: overview.activeUsers.toString(), sub: "使用过 AI 功能的用户", icon: Users, bg: "from-violet-500 to-violet-600", color: "text-violet-600" },
          { label: "功能类型", value: Object.keys(featDist).length.toString(), sub: "种 AI 能力已启用", icon: TrendingUp, bg: "from-amber-500 to-amber-600", color: "text-amber-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white border rounded-xl p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", card.bg)}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-[10px] text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 趋势图 */}
      {trendData.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-700 mb-3">30 天调用趋势</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              {trendLines.map((feat, i) => (
                <Line
                  key={feat}
                  type="monotone"
                  dataKey={feat}
                  name={featureLabels[feat] || feat}
                  stroke={PIE_COLORS[i % PIE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 排行榜 + 饼图 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">用户排行榜</h4>
            <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
              {(["calls", "tokens"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    sortBy === key ? "bg-white shadow-sm text-gray-800" : "text-gray-500"
                  )}
                >
                  {key === "calls" ? "调用次数" : "Token 消耗"}
                </button>
              ))}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>用户</TableHead>
                <TableHead className="text-right">调用次数</TableHead>
                <TableHead className="text-right">Token 消耗</TableHead>
                <TableHead className="text-right">最近使用</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">暂无使用数据</TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((u, i) => (
                  <TableRow
                    key={u.userId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedUser(expandedUser === u.userId ? null : u.userId)}
                  >
                    <TableCell className="font-medium">
                      {i < 3 ? <span className="text-lg">{MEDAL_ICONS[i + 1]}</span> : <span className="text-gray-400">{i + 1}</span>}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{u.userName}</TableCell>
                    <TableCell className="text-right text-sm">{u.calls.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{(u.tokens / 1000).toFixed(1)}K</TableCell>
                    <TableCell className="text-right text-xs text-gray-400">
                      {u.lastUsed ? new Date(u.lastUsed).toLocaleDateString("zh-CN") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 功能分布饼图 */}
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-sm font-medium text-gray-700 mb-3">功能分布</h4>
          {featPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={featPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value">
                    {featPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {featPieData.map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-gray-600">{f.name}</span>
                    </div>
                    <span className="text-gray-900 font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
