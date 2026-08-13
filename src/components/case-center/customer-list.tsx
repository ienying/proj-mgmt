"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CUSTOMER_TYPE_OPTIONS } from "@/lib/case-center-constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TopTab = "customer" | "product";

interface CustomerRow {
  id: string; school_name: string; customer_types: string[]; location: Record<string, string>;
  department_count: string; module_count: string; landed_count: string; updated_at: string; created_at: string;
}

interface CustomerListProps {
  onViewCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  activeTab?: TopTab;
  onTabChange?: (tab: TopTab) => void;
}

function getAvatarColor(index: number): string {
  const colors = ["bg-black", "bg-[#ff6b35]", "bg-[#004ecc]"];
  return colors[index % colors.length];
}

export function CustomerList({ onViewCustomer, onCreateCustomer, activeTab = "customer", onTabChange }: CustomerListProps) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState("all");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (customerType !== "all") params.set("customer_type", customerType);
      const res = await fetch(`/api/case-center/customers?${params.toString()}`);
      if (res.ok) { const { data } = await res.json(); setCustomers(data || []); }
    } catch { toast.error("加载客户列表失败"); }
    finally { setLoading(false); }
  }, [search, customerType]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("zh-CN") : "-";
  const getLandingRate = (landed: string, modules: string) => {
    const m = Number(modules || 0);
    if (m === 0) return "—";
    return Math.round((Number(landed || 0) / m) * 100) + "%";
  };

  return (
    <div>
      {/* Hero */}
      <div className="py-8 text-center">
        <h1 className="text-[40px] font-extrabold tracking-[-1px] text-black">案例中心</h1>
        <p className="text-[15px] text-[#555] mt-2 font-medium">Customer Profile &amp; Product Archive</p>
        <p className="text-[13px] text-[#777] max-w-[520px] mx-auto mt-3.5 leading-relaxed">
          面向教育行业售前与实施团队，统一管理客户学校画像、软硬件环境、科室业务需求与模块落地状态。
        </p>
      </div>

      {/* Tabs */}
      {onTabChange && (
        <div className="flex justify-center gap-1 mb-11">
          {[
            { key: "customer" as TopTab, label: "用户画像" },
            { key: "product" as TopTab, label: "产品案例" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
                activeTab === tab.key
                  ? "bg-black text-white"
                  : "text-[#555] hover:text-black hover:bg-black/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3 items-center mb-6">
        <div className="relative flex-1 max-w-[360px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            placeholder="搜索学校名称、地区…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-[42px] h-11 text-sm border-[1.5px] border-[#e0e0e0] rounded-xl bg-white focus:border-black focus:ring-0"
          />
        </div>
        <Select value={customerType} onValueChange={setCustomerType}>
          <SelectTrigger className="w-[120px] h-11 text-sm border-[1.5px] border-[#e0e0e0] rounded-xl bg-white focus:border-black">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" className="h-11 px-[22px] rounded-xl text-sm font-semibold border-[1.5px] border-[#e0e0e0] text-black bg-white hover:bg-gray-100">
          📥 模板
        </Button>
        <Button variant="outline" className="h-11 px-[22px] rounded-xl text-sm font-semibold border-[1.5px] border-[#e0e0e0] text-black bg-white hover:bg-gray-100">
          📤 导入
        </Button>
        <Button onClick={onCreateCustomer} className="h-11 px-[22px] rounded-xl text-sm font-semibold bg-black text-white hover:bg-[#222]">
          ＋ 新建画像
        </Button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mr-2" />加载中...
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-sm">暂无客户画像数据</p>
          <Button variant="outline" className="mt-3" onClick={onCreateCustomer}>＋ 新建画像</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {customers.map((c, i) => (
              <div
                key={c.id}
                onClick={() => onViewCustomer(c.id)}
                className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,.04)] cursor-pointer transition-all duration-[250ms] border-[1.5px] border-transparent relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,.1)] hover:border-black group"
              >
                {/* Top row: name + avatar */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[17px] font-bold text-black tracking-[-0.2px] leading-tight">
                      {c.school_name}
                    </div>
                    {c.location && (c.location.province || c.location.city) && (
                      <div className="text-xs text-[#666] mt-1">
                        {[c.location.province, c.location.city, c.location.district].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-[14px] flex items-center justify-center text-xl font-extrabold text-white flex-shrink-0",
                      getAvatarColor(i)
                    )}
                  >
                    {c.school_name?.charAt(0) || "?"}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-[18px]">
                  {(c.customer_types || []).map((t) => (
                    <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#f5f5f5] text-black">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-black tracking-[-0.5px]">{c.department_count || 0}</div>
                    <div className="text-[10px] font-semibold text-[#888] uppercase">科室</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-black tracking-[-0.5px]">{c.module_count || 0}</div>
                    <div className="text-[10px] font-semibold text-[#888] uppercase">模块</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-black tracking-[-0.5px]">
                      {getLandingRate(c.landed_count, c.module_count)}
                    </div>
                    <div className="text-[10px] font-semibold text-[#888] uppercase">落地率</div>
                  </div>
                </div>

                {/* Arrow on hover */}
                <span className="absolute top-6 right-6 text-lg opacity-0 -translate-x-2 transition-all duration-[250ms] group-hover:opacity-100 group-hover:translate-x-0">
                  →
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-9 pb-16">
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">←</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold bg-black text-white">1</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">2</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">3</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">…</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">13</button>
            <button className="w-[38px] h-[38px] rounded-[10px] text-[13px] font-semibold text-[#555] hover:bg-gray-200 transition-colors">→</button>
          </div>
        </>
      )}
    </div>
  );
}

export { CustomerList as default };
