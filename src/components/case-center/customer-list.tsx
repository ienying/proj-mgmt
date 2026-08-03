"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, School, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CUSTOMER_TYPE_OPTIONS } from "@/lib/case-center-constants";
import { toast } from "sonner";

interface CustomerRow {
  id: string; school_name: string; customer_types: string[]; location: Record<string, string>;
  department_count: string; module_count: string; landed_count: string; updated_at: string; created_at: string;
}

interface CustomerListProps { onViewCustomer: (id: string) => void; onCreateCustomer: () => void; }

export function CustomerList({ onViewCustomer, onCreateCustomer }: CustomerListProps) {
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除"${name}"的画像数据？此操作不可撤销。`)) return;
    const res = await fetch(`/api/case-center/customers/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("删除成功"); fetchCustomers(); } else { toast.error("删除失败"); }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("zh-CN") : "-";
  const totalModules = customers.reduce((sum, c) => sum + Number(c.module_count || 0), 0);
  const totalLanded = customers.reduce((sum, c) => sum + Number(c.landed_count || 0), 0);
  const totalDepts = customers.reduce((sum, c) => sum + Number(c.department_count || 0), 0);

  return (
    <div className="max-w-[820px] mx-auto px-6 pb-16">
      {/* Stats row */}
      {customers.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-4 mb-5">
          {[
            { n: customers.length, l: "画像总数" }, { n: totalDepts, l: "科室总数" },
            { n: totalModules, l: "已购模块" }, { n: totalLanded, l: "已落地模块" },
          ].map((s, i) => (
            <div key={i} className="bg-[#fdfcf8] border border-[#d1c7b7] p-3 text-center">
              <div className="text-2xl font-bold text-red-900">{s.n}</div>
              <div className="text-[10px] text-gray-400 tracking-wide mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="搜索学校..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm border-[#d1c7b7]" />
        </div>
        <Select value={customerType} onValueChange={setCustomerType}>
          <SelectTrigger className="w-[110px] h-9 text-sm border-[#d1c7b7]">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((t) => (<SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-9 text-xs border-[#d1c7b7] text-gray-500">📥 模板</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs border-[#d1c7b7] text-gray-500">📤 导入</Button>
        <Button onClick={onCreateCustomer} size="sm" className="h-9 bg-red-700 hover:bg-red-800">
          <Plus className="w-4 h-4 mr-1" />新建画像
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 bg-[#fdfcf8] border border-[#d1c7b7]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700 mr-2" />加载中...
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-[#fdfcf8] border border-[#d1c7b7]">
          <School className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">暂无客户画像数据</p>
          <Button variant="outline" size="sm" className="mt-3 border-[#d1c7b7]" onClick={onCreateCustomer}><Plus className="w-4 h-4 mr-1" />新建画像</Button>
        </div>
      ) : (
        <div className="border border-[#d1c7b7] bg-[#fdfcf8] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d1c7b7] bg-amber-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">学校</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">类型</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">科室</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">模块</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">已落地</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">更新</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e0d0]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-amber-50/30 cursor-pointer transition-colors" onClick={() => onViewCustomer(c.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-red-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{c.school_name?.charAt(0) || "?"}</div>
                      <div>
                        <div className="font-semibold text-gray-900 text-[13px]">{c.school_name}</div>
                        {c.location && (c.location.province || c.location.city) && (
                          <div className="text-[10px] text-gray-400">{[c.location.province, c.location.city, c.location.district].filter(Boolean).join(" ")}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(c.customer_types || []).map((t) => (<Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>))}</div></td>
                  <td className="px-4 py-3 text-center font-medium">{c.department_count}</td>
                  <td className="px-4 py-3 text-center font-medium">{c.module_count}</td>
                  <td className="px-4 py-3 text-center"><span className={Number(c.landed_count) > 0 ? "text-green-600 font-semibold" : "text-gray-300"}>{c.landed_count}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-[11px]">{formatDate(c.updated_at)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] text-gray-500 hover:text-red-700" onClick={() => onViewCustomer(c.id)}><ChevronRight className="w-3 h-3 mr-0.5" />查看</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] text-gray-400 hover:text-red-500" onClick={() => handleDelete(c.id, c.school_name)}>删除</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { CustomerList as default };
