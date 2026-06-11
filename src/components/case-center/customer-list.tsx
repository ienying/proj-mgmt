"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, School, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHOOL_TYPE_OPTIONS, INFO_LEVEL_OPTIONS } from "@/lib/case-center-constants";
import { toast } from "sonner";

interface CustomerRow {
  id: string;
  school_name: string;
  school_type: string;
  province: string;
  city: string;
  info_level: string;
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
  const [schoolType, setSchoolType] = useState("all");
  const [infoLevel, setInfoLevel] = useState("all");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [province, setProvince] = useState("all");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (schoolType !== "all") params.set("school_type", schoolType);
      if (infoLevel !== "all") params.set("info_level", infoLevel);
      if (province !== "all") params.set("province", province);

      const res = await fetch(`/api/case-center/customers?${params.toString()}`);
      if (res.ok) {
        const { data } = await res.json();
        setCustomers(data || []);

        // 提取省份列表（去重）
        const uniqueProvinces = Array.from(
          new Set((data || []).map((c: CustomerRow) => c.province).filter(Boolean))
        ) as string[];
        setProvinces(uniqueProvinces);
      }
    } catch {
      toast.error("加载客户列表失败");
    } finally {
      setLoading(false);
    }
  }, [search, schoolType, infoLevel, province]);

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
        <Select value={schoolType} onValueChange={setSchoolType}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {SCHOOL_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={infoLevel} onValueChange={setInfoLevel}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部等级</SelectItem>
            {INFO_LEVEL_OPTIONS.map((l) => (
              <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {provinces.length > 0 && (
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="省份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部省份</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                <th className="text-left px-4 py-3 font-medium">等级</th>
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
                    {c.province && (
                      <span className="text-xs text-muted-foreground ml-6">{c.province} {c.city}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{c.school_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`
                        text-xs
                        ${c.info_level === "高级" ? "border-green-500 text-green-600" : ""}
                        ${c.info_level === "中级" ? "border-blue-500 text-blue-600" : ""}
                        ${c.info_level === "初级" ? "border-orange-500 text-orange-600" : ""}
                      `}
                    >
                      {c.info_level}
                    </Badge>
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
