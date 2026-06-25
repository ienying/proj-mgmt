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
  id: string;
  school_name: string;
  customer_types: string[];
  location: Record<string, string>;
  department_count: string;
  module_count: string;
  landed_count: string;
  updated_at: string;
  created_at: string;
}

interface CustomerListProps {
  onViewCustomer: (id: string) => void;
  onCreateCustomer: () => void;
}

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
      if (res.ok) {
        const { data } = await res.json();
        setCustomers(data || []);
      }
    } catch {
      toast.error("加载客户列表失败");
    } finally {
      setLoading(false);
    }
  }, [search, customerType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除"${name}"的画像数据？此操作不可撤销。`)) return;

    const res = await fetch(`/api/case-center/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("删除成功");
      fetchCustomers();
    } else {
      toast.error("删除失败");
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN");
  };

  return (
    <div className="p-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索学校..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={customerType} onValueChange={setCustomerType}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onCreateCustomer} size="sm" className="ml-auto">
          <Plus className="w-4 h-4 mr-1" />
          新建画像
        </Button>
      </div>

      {/* 客户列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2" />
          加载中...
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <School className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">暂无客户画像数据</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onCreateCustomer}>
            <Plus className="w-4 h-4 mr-1" />
            新建画像
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">学校</th>
                <th className="text-left px-4 py-3 font-medium">类型</th>
                <th className="text-center px-4 py-3 font-medium">科室数</th>
                <th className="text-center px-4 py-3 font-medium">已购模块</th>
                <th className="text-center px-4 py-3 font-medium">已落地</th>
                <th className="text-left px-4 py-3 font-medium">更新时间</th>
                <th className="text-right px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onViewCustomer(c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{c.school_name}</span>
                    </div>
                    {c.location && (c.location.province || c.location.city) && (
                      <span className="text-xs text-muted-foreground ml-6">
                        {[c.location.province, c.location.city, c.location.district].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.customer_types || []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{c.department_count}</td>
                  <td className="px-4 py-3 text-center">{c.module_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={Number(c.landed_count) > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {c.landed_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.updated_at)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onViewCustomer(c.id)}>
                        <ChevronRight className="w-3.5 h-3.5 mr-0.5" />
                        查看
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(c.id, c.school_name)}
                      >
                        删除
                      </Button>
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
