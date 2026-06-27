import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { ensureAITables } from "@/lib/ai-settings";

export async function GET() {
  try {
    await ensureAITables();
    const client = await createServerClient();

    // 获取全部使用日志
    const { data: logsData } = await client.rpc("dp_select", {
      p_table: "design_public.ai_usage_logs",
    });
    const logs = (logsData as Record<string, unknown>[]) || [];

    // 按用户汇总
    const userMap = new Map<
      string,
      { userId: string; userName: string; calls: number; tokens: number; features: Record<string, number>; lastUsed: string }
    >();

    let totalCalls = 0;
    let totalTokens = 0;

    for (const log of logs) {
      const uid = String(log.user_id || "unknown");
      const uname = String(log.user_name || uid);
      const tokens = Number(log.tokens_used) || 0;
      const feature = String(log.feature || "unknown");
      const createdAt = String(log.created_at || "");

      totalCalls++;
      totalTokens += tokens;

      if (!userMap.has(uid)) {
        userMap.set(uid, { userId: uid, userName: uname, calls: 0, tokens: 0, features: {}, lastUsed: "" });
      }
      const entry = userMap.get(uid)!;
      entry.calls++;
      entry.tokens += tokens;
      entry.features[feature] = (entry.features[feature] || 0) + 1;
      if (createdAt > entry.lastUsed) entry.lastUsed = createdAt;
    }

    const users = Array.from(userMap.values()).sort((a, b) => b.calls - a.calls);

    // 按日期趋势（最近 30 天）
    const thirtyDays: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      thirtyDays[d.toISOString().slice(0, 10)] = 0;
    }

    const featureByDate: Record<string, Record<string, number>> = {};
    for (const log of logs) {
      const date = String(log.created_at || "").slice(0, 10);
      const feature = String(log.feature || "unknown");
      if (thirtyDays[date] !== undefined) {
        thirtyDays[date] = (thirtyDays[date] || 0) + 1;
        if (!featureByDate[feature]) featureByDate[feature] = {};
        featureByDate[feature][date] = (featureByDate[feature][date] || 0) + 1;
      }
    }

    const trendData = Object.entries(thirtyDays).map(([date, count]) => {
      const entry: Record<string, unknown> = { date, count };
      for (const feat of Object.keys(featureByDate)) {
        entry[feat] = featureByDate[feat]?.[date] || 0;
      }
      return entry;
    });

    // 功能分布
    const featureDist: Record<string, number> = {};
    for (const log of logs) {
      const f = String(log.feature || "unknown");
      featureDist[f] = (featureDist[f] || 0) + 1;
    }

    return NextResponse.json({
      data: {
        overview: {
          totalCalls,
          totalTokens,
          activeUsers: users.length,
        },
        users,
        trendData,
        featureDistribution: featureDist,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
