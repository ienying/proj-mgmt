"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Download,
  GripVertical,
  Briefcase,
  Layers,
  Package,
  Users,
  LayoutGrid,
  Settings,
  ClipboardList,
  Pencil,
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Building2,
  Server,
  Flag,
  Square,
  CheckSquare,
  Hammer,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DictItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
  is_enabled?: boolean;
  created_at: string;
  module_name?: string;
  product_name?: string;
  tech_specs?: string;
  bidding_instructions?: string;
  remarks?: string;
  software_name?: string;
  category?: string;
  vendor?: string;
  scope?: string;
  contact_person?: string;
  contact_phone?: string;
  phone?: string;
  cooperation_level?: string;
  contact_email?: string;
  address?: string;
  [key: string]: string | number | boolean | undefined;
}

// Excel 导出函数
function exportToExcel(data: DictItem[], productCategories: DictItem[], productVendors: DictItem[]) {
  if (data.length === 0) {
    toast.error("没有数据可导出");
    return;
  }

  import("xlsx").then((XLSX) => {
    const categoryMap = new Map(productCategories.map((c) => [c.id, c.name]));
    const vendorMap = new Map(productVendors.map((v) => [v.name, v.name]));

    const exportData = data.map((item) => ({
      编码: item.code || "",
      产品名称: item.product_name || "",
      模块名称: item.module_name || "",
      技术规格及配置要求: item.tech_specs || "",
      控标性说明: item.bidding_instructions || "",
      备注: item.remarks || "",
      软著名称: item.software_name || "",
      类别: item.category ? categoryMap.get(item.category) || "" : "",
      厂商: item.vendor || "",
      范围: item.scope || "",
      状态: item.is_enabled ? "启用" : "禁用",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    worksheet["!cols"] = [
      { wch: 15 }, // 编码
      { wch: 20 }, // 产品名称
      { wch: 20 }, // 模块名称
      { wch: 40 }, // 技术规格
      { wch: 30 }, // 控标性说明
      { wch: 25 }, // 备注
      { wch: 20 }, // 软著名称
      { wch: 15 }, // 类别
      { wch: 15 }, // 厂商
      { wch: 15 }, // 范围
      { wch: 10 }, // 状态
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "产品模块");

    XLSX.writeFile(workbook, "产品模块导出.xlsx");
  });
}

// API 辅助函数
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

interface BaseDataManagementProps {
  refreshTrigger?: number;
}

export function BaseDataManagement({ refreshTrigger }: BaseDataManagementProps) {
  const [activeTab, setActiveTab] = useState("project-types");
  const [projectTypes, setProjectTypes] = useState<DictItem[]>([]);
  const [projectStages, setProjectStages] = useState<DictItem[]>([]);
  const [productModules, setProductModules] = useState<DictItem[]>([]);
  const [memberRoles, setMemberRoles] = useState<DictItem[]>([]);
  const [productCategories, setProductCategories] = useState<DictItem[]>([]);
  const [productVendors, setProductVendors] = useState<DictItem[]>([]);
  const [productScopes, setProductScopes] = useState<DictItem[]>([]);
  const [customerTypes, setCustomerTypes] = useState<DictItem[]>([]);
  const [deploymentModes, setDeploymentModes] = useState<DictItem[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<DictItem[]>([]);
  const [todoStatuses, setTodoStatuses] = useState<DictItem[]>([]);
  const [constructionUnits, setConstructionUnits] = useState<DictItem[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<DictItem>>({
    name: "",
    code: "",
    description: "",
    is_active: true,
    is_enabled: true,
  });

  // 产品类别维护相关状态
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null);
  const [categoryEditingData, setCategoryEditingData] = useState<Partial<DictItem>>({
    name: "",
    code: "",
    description: "",
    is_active: true,
    is_enabled: true,
  });

  // 厂商维护相关状态
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [vendorEditingId, setVendorEditingId] = useState<string | null>(null);
  const [vendorEditingData, setVendorEditingData] = useState<Partial<DictItem>>({
    name: "",
    code: "",
    description: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    is_enabled: true,
  });

  // 范围维护相关状态
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeEditingId, setScopeEditingId] = useState<string | null>(null);
  const [scopeEditingData, setScopeEditingData] = useState<Partial<DictItem>>({
    name: "",
    code: "",
    description: "",
    is_enabled: true,
  });

  // Excel 导入相关状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; failedRows: any[] } | null>(null);

  // 只刷新当前选中类型的数据
  const loadCurrentTypeData = async () => {
    try {
      const res = await apiFetch(`/api/dicts?type=${currentType}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      switch (currentType) {
        case "project_types": setProjectTypes(data); break;
        case "project_stages": setProjectStages(data); break;
        case "product_module_types": setProductModules(data); break;
        case "member_role_types": setMemberRoles(data); break;
        case "product_categories": setProductCategories(data); break;
        case "product_vendors": setProductVendors(data); break;
        case "product_scopes": setProductScopes(data); break;
        case "customer_types": setCustomerTypes(data); break;
        case "deployment_modes": setDeploymentModes(data); break;
        case "project_statuses": setProjectStatuses(data); break;
        case "todo_statuses": setTodoStatuses(data); break;
        case "construction_units": setConstructionUnits(data); break;
      }
    } catch (error) {
      console.error("加载数据失败:", error);
    }
  };

  // 批量加载所有数据（单次请求）
  const loadData = async () => {
    try {
      const res = await apiFetch("/api/dicts/batch");
      const batch = res.data || {};
      setProjectTypes(batch.project_types || []);
      setProjectStages(batch.project_stages || []);
      setProductModules(batch.product_module_types || []);
      setMemberRoles(batch.member_role_types || []);
      setProductCategories(batch.product_categories || []);
      setProductVendors(batch.product_vendors || []);
      setProductScopes(batch.product_scopes || []);
      setCustomerTypes(batch.customer_types || []);
      setDeploymentModes(batch.deployment_modes || []);
      setProjectStatuses(batch.project_statuses || []);
      setTodoStatuses(batch.todo_statuses || []);
      setConstructionUnits(batch.construction_units || []);
    } catch (error) {
      console.error("加载基础数据失败:", error);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // 获取当前标签对应的数据
  const getCurrentData = () => {
    switch (activeTab) {
      case "project-types": return { data: projectTypes, setData: setProjectTypes, table: "project_types", type: "project_types" };
      case "project-stages": return { data: projectStages, setData: setProjectStages, table: "project_stages", type: "project_stages" };
      case "product-modules": return { data: productModules, setData: setProductModules, table: "product_module_types", type: "product_module_types" };
      case "member-roles": return { data: memberRoles, setData: setMemberRoles, table: "member_role_types", type: "member_role_types" };
      case "customer-types": return { data: customerTypes, setData: setCustomerTypes, table: "customer_types", type: "customer_types" };
      case "deployment-modes": return { data: deploymentModes, setData: setDeploymentModes, table: "deployment_modes", type: "deployment_modes" };
      case "project-statuses": return { data: projectStatuses, setData: setProjectStatuses, table: "project_statuses", type: "project_statuses" };
      case "todo-statuses": return { data: todoStatuses, setData: setTodoStatuses, table: "todo_statuses", type: "todo_statuses" };
      case "product-categories": return { data: productCategories, setData: setProductCategories, table: "product_categories", type: "product_categories" };
      case "construction-units": return { data: constructionUnits, setData: setConstructionUnits, table: "construction_units", type: "construction_units" };
      default: return { data: [], setData: () => {}, table: "", type: "" };
    }
  };

  const { type: currentType } = getCurrentData();
  const currentData = getCurrentData().data;

  // 打开创建对话框
  const openCreateDialog = () => {
    setEditingId(null);
    setEditingData({
      name: "",
      code: "",
      description: "",
      is_enabled: true,
      is_active: true,
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const openEditDialog = (item: DictItem) => {
    setEditingId(item.id);
    setEditingData({ ...item });
    setDialogOpen(true);
  };

  // 保存数据
  const handleSubmit = async () => {
    // 产品模块需要验证 product_name 或 module_name
    if (activeTab === "product-modules") {
      if (!editingData.product_name?.trim() && !editingData.module_name?.trim()) return;
    } else {
      if (!editingData.name?.trim()) return;
    }

    try {
      if (editingId) {
        // 更新
        const updateData: Record<string, unknown> = {
          type: currentType,
          id: editingId,
          name: editingData.name,
          code: editingData.code,
          description: editingData.description,
          is_enabled: editingData.is_enabled,
        };
        
        // 产品模块额外字段
        if (activeTab === "product-modules") {
          updateData.name = editingData.product_name || editingData.name;
          updateData.module_name = editingData.module_name;
          updateData.product_name = editingData.product_name;
          updateData.tech_specs = editingData.tech_specs;
          updateData.bidding_instructions = editingData.bidding_instructions;
          updateData.remarks = editingData.remarks;
          updateData.software_name = editingData.software_name;
          updateData.category = editingData.category;
          updateData.vendor = editingData.vendor;
          updateData.scope = editingData.scope;
        }

        // 项目状态/事项状态额外字段
        if (activeTab === "project-statuses" || activeTab === "todo-statuses") {
          updateData.color = editingData.color || null;
        }

        // 施工单位额外字段
        if (activeTab === "construction-units") {
          updateData.contact_person = editingData.contact_person || null;
          updateData.phone = editingData.phone || null;
          updateData.cooperation_level = editingData.cooperation_level || null;
        }

        await apiFetch(`/api/dicts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
      } else {
        // 创建
        const maxSort = currentData.reduce((max, item) => 
          Math.max(max, item.sort_order || 0), 0);
        
        const insertData: Record<string, unknown> = {
          type: currentType,
          name: editingData.name,
          code: editingData.code,
          description: editingData.description,
          sort_order: maxSort + 1,
          is_enabled: editingData.is_enabled ?? true,
        };
        
        // 产品模块额外字段
        if (activeTab === "product-modules") {
          insertData.module_name = editingData.module_name;
          insertData.product_name = editingData.product_name;
          insertData.tech_specs = editingData.tech_specs;
          insertData.bidding_instructions = editingData.bidding_instructions;
          insertData.remarks = editingData.remarks;
          insertData.software_name = editingData.software_name;
          insertData.category = editingData.category;
          insertData.vendor = editingData.vendor;
          insertData.scope = editingData.scope;
        }

        // 项目状态/事项状态额外字段
        if (activeTab === "project-statuses" || activeTab === "todo-statuses") {
          insertData.color = editingData.color || null;
        }

        // 施工单位额外字段
        if (activeTab === "construction-units") {
          insertData.contact_person = editingData.contact_person || null;
          insertData.phone = editingData.phone || null;
          insertData.cooperation_level = editingData.cooperation_level || null;
        }

        await apiFetch("/api/dicts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(insertData),
        });
      }

      await loadCurrentTypeData();
      setDialogOpen(false);
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  // 批量删除数据
  const handleBatchDelete = async (ids: string[]) => {
    try {
      const res = await fetch("/api/dicts/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: currentType, ids }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "批量删除失败");
      }
      if (result.failed && result.failed.length > 0) {
        toast.warning(`成功删除 ${result.deleted.length} 条，${result.failed.length} 条失败`);
      } else {
        toast.success(`成功删除 ${result.deleted.length} 条数据`);
      }
      await loadCurrentTypeData();
    } catch (error) {
      console.error("批量删除失败:", error);
      toast.error("批量删除失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  // 删除数据
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条数据吗？")) return;

    try {
      await apiFetch(`/api/dicts/${id}?type=${currentType}&id=${id}`, {
        method: "DELETE",
      });
      await loadCurrentTypeData();
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const { data, setData, table } = getCurrentData();
    const oldIndex = data.findIndex((item: DictItem) => item.id === active.id);
    const newIndex = data.findIndex((item: DictItem) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(data, oldIndex, newIndex);
    setData(newItems);

    // 批量更新排序
    try {
      await Promise.all(
        newItems.map((item: DictItem, i: number) =>
          apiFetch(`/api/dicts/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: table, id: item.id, sort_order: i + 1 }),
          })
        )
      );
    } catch (error) {
      console.error("排序更新失败:", error);
      toast.error("排序更新失败");
      loadCurrentTypeData();
    }
  };

  // 拖拽排序回调（供DataTable调用，传入已排好序的数组）
  const handleReorder = async (reorderedItems: DictItem[]) => {
    const { setData, table } = getCurrentData();
    setData(reorderedItems);
    try {
      await Promise.all(
        reorderedItems.map((item: DictItem, i: number) =>
          apiFetch(`/api/dicts/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: table, id: item.id, sort_order: i + 1 }),
          })
        )
      );
    } catch (error) {
      console.error("排序更新失败:", error);
      toast.error("排序更新失败");
      loadCurrentTypeData();
    }
  };

  // 切换启用状态
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await apiFetch(`/api/dicts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentType,
          id: id,
          is_enabled: isActive,
        }),
      });
      await loadCurrentTypeData();
    } catch (error) {
      console.error("切换状态失败:", error);
    }
  };

  // 维护产品类别 - 提交表单
  const handleCategorySubmit = async () => {
    if (!categoryEditingData.name || !categoryEditingData.code) {
      toast.error("请填写名称和编码");
      return;
    }

    try {
      if (categoryEditingId) {
        // 更新
        await apiFetch(`/api/dicts/${categoryEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_categories",
            id: categoryEditingId,
            name: categoryEditingData.name,
            code: categoryEditingData.code,
            description: categoryEditingData.description || "",
          }),
        });
      } else {
        // 创建
        await apiFetch("/api/dicts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_categories",
            name: categoryEditingData.name,
            code: categoryEditingData.code,
            description: categoryEditingData.description || "",
            sort_order: productCategories.length + 1,
            is_enabled: true,
          }),
        });
      }

      await apiFetch("/api/dicts?type=product_categories").then(res => setProductCategories(res.data || []));
      setCategoryDialogOpen(false);
      setCategoryEditingId(null);
      setCategoryEditingData({ name: "", code: "", description: "", is_active: true, is_enabled: true });
    } catch (error) {
      console.error("保存类别失败:", error);
      toast.error("保存失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  // 维护产品类别 - 编辑
  const handleCategoryEdit = (item: DictItem) => {
    setCategoryEditingId(item.id);
    setCategoryEditingData(item);
    setCategoryDialogOpen(true);
  };

  // 维护产品类别 - 删除
  const handleCategoryDelete = async (id: string) => {
    if (!confirm("确定要删除此类别吗？")) return;

    try {
      await apiFetch(`/api/dicts/${id}?type=product_categories&id=${id}`, {
        method: "DELETE",
      });
      await apiFetch("/api/dicts?type=product_categories").then(res => setProductCategories(res.data || []));
    } catch (error) {
      console.error("删除类别失败:", error);
      toast.error("删除失败");
    }
  };

  // 维护厂商 - 提交
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorEditingData.name || !vendorEditingData.code) {
      toast.error("请填写名称和编码");
      return;
    }

    try {
      if (vendorEditingId) {
        // 更新
        await apiFetch(`/api/dicts/${vendorEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_vendors",
            id: vendorEditingId,
            name: vendorEditingData.name,
            code: vendorEditingData.code,
            description: vendorEditingData.description || null,
            contact_person: vendorEditingData.contact_person || null,
            contact_phone: vendorEditingData.contact_phone || null,
            contact_email: vendorEditingData.contact_email || null,
            address: vendorEditingData.address || null,
            is_enabled: vendorEditingData.is_enabled !== false,
          }),
        });
      } else {
        // 创建
        await apiFetch("/api/dicts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_vendors",
            name: vendorEditingData.name,
            code: vendorEditingData.code,
            description: vendorEditingData.description || null,
            contact_person: vendorEditingData.contact_person || null,
            contact_phone: vendorEditingData.contact_phone || null,
            contact_email: vendorEditingData.contact_email || null,
            address: vendorEditingData.address || null,
            is_enabled: vendorEditingData.is_enabled !== false,
            sort_order: 0,
          }),
        });
      }

      setVendorDialogOpen(false);
      await apiFetch("/api/dicts?type=product_vendors").then(res => setProductVendors(res.data || []));
    } catch (error: any) {
      console.error("保存厂商失败:", error);
      const errorMessage = error?.message || "未知错误";
      toast.error("保存失败: " + errorMessage);
    }
  };

  // 维护厂商 - 编辑
  const handleVendorEdit = (item: DictItem) => {
    setVendorEditingId(item.id);
    setVendorEditingData(item);
    setVendorDialogOpen(true);
  };

  // 维护厂商 - 删除
  const handleVendorDelete = async (id: string) => {
    if (!confirm("确定要删除此厂商吗？")) return;

    try {
      await apiFetch(`/api/dicts/${id}?type=product_vendors&id=${id}`, {
        method: "DELETE",
      });
      await apiFetch("/api/dicts?type=product_vendors").then(res => setProductVendors(res.data || []));
    } catch (error) {
      console.error("删除厂商失败:", error);
      toast.error("删除失败");
    }
  };

  // 维护范围 - 提交
  const handleScopeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scopeEditingData.name || !scopeEditingData.code) {
      toast.error("请填写名称和编码");
      return;
    }

    try {
      if (scopeEditingId) {
        await apiFetch(`/api/dicts/${scopeEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_scopes",
            id: scopeEditingId,
            name: scopeEditingData.name,
            code: scopeEditingData.code,
            description: scopeEditingData.description || null,
            is_enabled: scopeEditingData.is_enabled !== false,
          }),
        });
      } else {
        await apiFetch("/api/dicts/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product_scopes",
            name: scopeEditingData.name,
            code: scopeEditingData.code,
            description: scopeEditingData.description || null,
            is_enabled: scopeEditingData.is_enabled !== false,
            sort_order: 0,
          }),
        });
      }

      setScopeDialogOpen(false);
      await apiFetch("/api/dicts?type=product_scopes").then(res => setProductScopes(res.data || []));
    } catch (error: any) {
      console.error("保存范围失败:", error);
      const errorMessage = error?.message || "未知错误";
      toast.error("保存失败: " + errorMessage);
    }
  };

  // 维护范围 - 编辑
  const handleScopeEdit = (item: DictItem) => {
    setScopeEditingId(item.id);
    setScopeEditingData(item);
    setScopeDialogOpen(true);
  };

  // 维护范围 - 删除
  const handleScopeDelete = async (id: string) => {
    if (!confirm("确定要删除此范围吗？")) return;

    try {
      await apiFetch(`/api/dicts/${id}?type=product_scopes&id=${id}`, {
        method: "DELETE",
      });
      await apiFetch("/api/dicts?type=product_scopes").then(res => setProductScopes(res.data || []));
    } catch (error) {
      console.error("删除范围失败:", error);
      toast.error("删除失败");
    }
  };

  // ========== 施工单位导入/导出 ==========
  const [cuImporting, setCuImporting] = useState(false);
  const [cuImportResult, setCuImportResult] = useState<{ created: number; skipped: number; failed: number; total: number; results: { row: number; name: string; status: string; error?: string }[] } | null>(null);
  const cuFileInputRef = useRef<HTMLInputElement>(null);

  const handleCuImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCuImporting(true);
    setCuImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/construction-units/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "导入失败"); return; }
      setCuImportResult(json.data);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导入失败");
    } finally {
      setCuImporting(false);
      if (cuFileInputRef.current) cuFileInputRef.current.value = "";
    }
  };

  const handleCuExport = async () => {
    try {
      const res = await fetch("/api/construction-units/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "施工单位导出.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("导出失败");
    }
  };

  const handleCuDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/construction-units/template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "施工单位导入模板.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("下载模板失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Database className="w-5 h-5" />
            基础数据维护
          </h3>
          <p className="text-sm text-muted-foreground">
            管理项目类型、项目阶段、产品模块等基础数据
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="project-types" className="gap-1.5 text-xs">
            <Briefcase className="w-3.5 h-3.5" />
            项目类型
          </TabsTrigger>
          <TabsTrigger value="project-stages" className="gap-1.5 text-xs">
            <Layers className="w-3.5 h-3.5" />
            项目阶段
          </TabsTrigger>
          <TabsTrigger value="project-statuses" className="gap-1.5 text-xs">
            <Flag className="w-3.5 h-3.5" />
            项目状态
          </TabsTrigger>
          <TabsTrigger value="todo-statuses" className="gap-1.5 text-xs">
            <ClipboardList className="w-3.5 h-3.5" />
            事项状态
          </TabsTrigger>
          <TabsTrigger value="customer-types" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            客户类型
          </TabsTrigger>
          <TabsTrigger value="construction-units" className="gap-1.5 text-xs">
            <Hammer className="w-3.5 h-3.5" />
            施工单位
          </TabsTrigger>
          <TabsTrigger value="member-roles" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            成员角色
          </TabsTrigger>
          <TabsTrigger value="product-modules" className="gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" />
            产品模块
          </TabsTrigger>
          <TabsTrigger value="deployment-modes" className="gap-1.5 text-xs">
            <Server className="w-3.5 h-3.5" />
            部署模式
          </TabsTrigger>
        </TabsList>

        {/* 项目类型 */}
        <TabsContent value="project-types" className="mt-4">
          <DataTable
            data={projectTypes}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 项目阶段 */}
        <TabsContent value="project-stages" className="mt-4">
          <DataTable
            data={projectStages}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 项目状态 */}
        <TabsContent value="project-statuses" className="mt-4">
          <DataTable
            data={projectStatuses}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 事项状态 */}
        <TabsContent value="todo-statuses" className="mt-4">
          <DataTable
            data={todoStatuses}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 客户类型 */}
        <TabsContent value="customer-types" className="mt-4">
          <DataTable
            data={customerTypes}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 成员角色 */}
        <TabsContent value="member-roles" className="mt-4">
          <DataTable
            data={memberRoles}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 产品模块 */}
        <TabsContent value="product-modules" className="mt-4">
          <div className="mb-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryDialogOpen(true);
                setCategoryEditingId(null);
                setCategoryEditingData({ name: "", code: "", description: "", is_enabled: true });
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              维护产品类别
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVendorDialogOpen(true);
                setVendorEditingId(null);
                setVendorEditingData({ name: "", code: "", description: "", contact_person: "", contact_phone: "", contact_email: "", address: "", is_enabled: true });
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              维护厂商
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setScopeDialogOpen(true);
                setScopeEditingId(null);
                setScopeEditingData({ name: "", code: "", description: "", is_enabled: true });
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              维护范围
            </Button>
          </div>
          <DataTable
            data={productModules}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            productVendors={productVendors}
            productScopes={productScopes}
            onExport={(data, cats, vendors) => exportToExcel(data, cats, vendors)}
            onImport={() => {
              setImportDialogOpen(true);
              setImportData([]);
              setImportResult(null);
            }}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 部署模式 */}
        <TabsContent value="deployment-modes" className="mt-4">
          <DataTable
            data={deploymentModes}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>

        {/* 施工单位 */}
        <TabsContent value="construction-units" className="mt-4">
          {/* 隐藏的文件上传 */}
          <input
            ref={cuFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleCuImport}
            className="hidden"
          />
          {/* 顶部操作栏 */}
          <div className="flex items-center gap-2 mb-3">
            <Button size="sm" variant="outline" onClick={handleCuDownloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              下载模板
            </Button>
            <Button size="sm" variant="outline" onClick={() => cuFileInputRef.current?.click()} disabled={cuImporting}>
              <Upload className="w-4 h-4 mr-1" />
              {cuImporting ? "导入中..." : "Excel导入"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCuExport}>
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              导出
            </Button>
          </div>
          {/* 导入结果弹窗 */}
          <Dialog open={!!cuImportResult} onOpenChange={(open) => { if (!open) setCuImportResult(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>导入结果</DialogTitle>
                <DialogDescription>
                  共 {cuImportResult?.total} 行，成功 {cuImportResult?.created} 行，跳过 {cuImportResult?.skipped} 行，失败 {cuImportResult?.failed} 行
                </DialogDescription>
              </DialogHeader>
              {cuImportResult && (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>行号</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuImportResult.results.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{r.row}</TableCell>
                          <TableCell className="text-sm font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              r.status === "成功" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                              r.status === "跳过" ? "border-amber-200 bg-amber-50 text-amber-700" :
                              "border-red-200 bg-red-50 text-red-700"
                            )}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{r.error || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setCuImportResult(null)}>关闭</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DataTable
            data={constructionUnits}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
            onToggleActive={handleToggleActive}
            onCreate={openCreateDialog}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            editingId={editingId}
            editingData={editingData}
            setEditingData={setEditingData}
            handleSubmit={handleSubmit}
            activeTab={activeTab}
            productCategories={productCategories}
            onBatchDelete={handleBatchDelete}
          />
        </TabsContent>
      </Tabs>

      {/* 维护产品类别对话框 */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {categoryEditingId ? "编辑类别" : "新增类别"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 表单区域 */}
            <div className="grid gap-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-name" className="text-right">
                  名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category-name"
                  value={categoryEditingData.name || ""}
                  onChange={(e) =>
                    setCategoryEditingData({
                      ...categoryEditingData,
                      name: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入类别名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-code" className="text-right">
                  编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category-code"
                  value={categoryEditingData.code || ""}
                  onChange={(e) =>
                    setCategoryEditingData({
                      ...categoryEditingData,
                      code: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入类别编码"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-desc" className="text-right">
                  描述
                </Label>
                <Input
                  id="category-desc"
                  value={categoryEditingData.description || ""}
                  onChange={(e) =>
                    setCategoryEditingData({
                      ...categoryEditingData,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入描述（可选）"
                />
              </div>
            </div>
            
            {/* 已添加的类别列表 */}
            {productCategories.length > 0 && (
              <div className="border rounded-lg mt-4">
                <div className="bg-muted/50 px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">已添加的类别（{productCategories.length}）</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">序号</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>编码</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productCategories.map((cat, index) => (
                        <TableRow key={cat.id} className={categoryEditingId === cat.id ? "bg-muted" : ""}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground">{cat.code || "-"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[150px] truncate">{cat.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setCategoryEditingId(cat.id);
                                  setCategoryEditingData(cat);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleCategoryDelete(cat.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {categoryEditingId && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setCategoryEditingId(null);
                  setCategoryEditingData({ name: "", code: "", description: "", is_active: true, is_enabled: true });
                }}
              >
                新增类别
              </Button>
            )}
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleCategorySubmit}>
              {categoryEditingId ? "保存修改" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 维护厂商对话框 */}
      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {vendorEditingId ? "编辑厂商" : "新增厂商"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 表单区域 */}
            <div className="grid gap-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-name" className="text-right">
                  名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor-name"
                  value={vendorEditingData.name || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      name: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入厂商名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-code" className="text-right">
                  编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendor-code"
                  value={vendorEditingData.code || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      code: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入厂商编码"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-contact" className="text-right">
                  联系人
                </Label>
                <Input
                  id="vendor-contact"
                  value={vendorEditingData.contact_person || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      contact_person: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入联系人"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-phone" className="text-right">
                  联系电话
                </Label>
                <Input
                  id="vendor-phone"
                  value={vendorEditingData.contact_phone || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      contact_phone: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入联系电话"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-email" className="text-right">
                  邮箱
                </Label>
                <Input
                  id="vendor-email"
                  value={vendorEditingData.contact_email || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      contact_email: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入邮箱"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor-address" className="text-right">
                  地址
                </Label>
                <Input
                  id="vendor-address"
                  value={vendorEditingData.address || ""}
                  onChange={(e) =>
                    setVendorEditingData({
                      ...vendorEditingData,
                      address: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入地址"
                />
              </div>
            </div>
            
            {/* 已添加的厂商列表 */}
            {productVendors.length > 0 && (
              <div className="border rounded-lg mt-4">
                <div className="bg-muted/50 px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">已添加的厂商（{productVendors.length}）</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>编码</TableHead>
                        <TableHead>联系人</TableHead>
                        <TableHead>联系电话</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productVendors.map((vendor, index) => (
                        <TableRow key={vendor.id} className={vendorEditingId === vendor.id ? "bg-muted" : ""}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell className="text-muted-foreground">{vendor.code || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{vendor.contact_person || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{vendor.contact_phone || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setVendorEditingId(vendor.id);
                                  setVendorEditingData(vendor);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleVendorDelete(vendor.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {vendorEditingId && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setVendorEditingId(null);
                  setVendorEditingData({ name: "", code: "", description: "", contact_person: "", contact_phone: "", contact_email: "", address: "", is_enabled: true });
                }}
              >
                新增厂商
              </Button>
            )}
            <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleVendorSubmit}>
              {vendorEditingId ? "保存修改" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 维护范围对话框 */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {scopeEditingId ? "编辑范围" : "维护范围"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scope-name" className="text-right">
                  名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scope-name"
                  value={scopeEditingData.name || ""}
                  onChange={(e) =>
                    setScopeEditingData({
                      ...scopeEditingData,
                      name: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入范围名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scope-code" className="text-right">
                  编码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scope-code"
                  value={scopeEditingData.code || ""}
                  onChange={(e) =>
                    setScopeEditingData({
                      ...scopeEditingData,
                      code: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入范围编码"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="scope-desc" className="text-right">
                  描述
                </Label>
                <Input
                  id="scope-desc"
                  value={scopeEditingData.description || ""}
                  onChange={(e) =>
                    setScopeEditingData({
                      ...scopeEditingData,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3"
                  placeholder="请输入描述（可选）"
                />
              </div>
            </div>

            {/* 已添加的范围列表 */}
            {productScopes.length > 0 && (
              <div className="border rounded-lg mt-4">
                <div className="bg-muted/50 px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">已添加的范围（{productScopes.length}）</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">序号</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>编码</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productScopes.map((scope, index) => (
                        <TableRow key={scope.id} className={scopeEditingId === scope.id ? "bg-muted" : ""}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium">{scope.name}</TableCell>
                          <TableCell className="text-muted-foreground">{scope.code || "-"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[150px] truncate">{scope.description || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleScopeEdit(scope)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleScopeDelete(scope.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {scopeEditingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setScopeEditingId(null);
                  setScopeEditingData({ name: "", code: "", description: "", is_enabled: true });
                }}
              >
                新增范围
              </Button>
            )}
            <Button variant="outline" onClick={() => setScopeDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleScopeSubmit}>
              {scopeEditingId ? "保存修改" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Excel 导入
            </DialogTitle>
            <DialogDescription>
              上传 Excel 文件导入产品模块数据
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {!importData.length && !importResult && (
              <div className="space-y-4">
                {/* 模板下载 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">下载导入模板</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        请按模板格式填写数据后上传
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        import("xlsx").then((XLSX) => {
                          const templateData = [
                            {
                              产品名称: "示例产品",
                              模块名称: "示例模块",
                              技术规格及配置要求: "",
                              控标性说明: "",
                              备注: "",
                              软著名称: "",
                              类别: "",
                              厂商: "",
                              范围: "",
                            },
                          ];
                          const ws = XLSX.utils.json_to_sheet(templateData);
                          ws["!cols"] = [
                            { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 20 },
                            { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                          ];
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "产品模块");
                          XLSX.writeFile(wb, "产品模块导入模板.xlsx");
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载模板
                    </Button>
                  </div>
                </div>

                {/* 文件上传 */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    点击或拖拽文件到此处上传
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      import("xlsx").then((XLSX) => {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const data = evt.target?.result;
                          const workbook = XLSX.read(data, { type: "binary" });
                          const sheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[sheetName];
                          const jsonData = XLSX.utils.sheet_to_json(worksheet);

                          const mappedData = jsonData.map((row: any) => ({
                            product_name: row["产品名称"] || "",
                            module_name: row["模块名称"] || "",
                            tech_specs: row["技术规格及配置要求"] || "",
                            bidding_instructions: row["控标性说明"] || "",
                            remarks: row["备注"] || "",
                            software_name: row["软著名称"] || "",
                            category: row["类别"] || "",
                            vendor: row["厂商"] || "",
                            scope: row["范围"] || "",
                          }));

                          setImportData(mappedData);
                        };
                        reader.readAsBinaryString(file);
                      });
                    }}
                    className="max-w-sm mx-auto"
                  />
                </div>
              </div>
            )}

            {/* 数据预览 */}
            {importData.length > 0 && !importResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    预览数据（共 {importData.length} 条）
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImportData([]);
                    }}
                  >
                    重新选择
                  </Button>
                </div>
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>产品名称</TableHead>
                        <TableHead>模块名称</TableHead>
                        <TableHead>类别</TableHead>
                        <TableHead>厂商</TableHead>
                        <TableHead>范围</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell>{row.module_name}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.vendor}</TableCell>
                          <TableCell>{row.scope}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="text-center py-8 space-y-4">
                {importResult.success > 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-lg font-medium">
                      成功导入 {importResult.success} 条
                    </span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertCircle className="w-6 h-6" />
                      <span className="text-lg font-medium">
                        失败 {importResult.failed} 条
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        import("xlsx").then((XLSX) => {
                          const exportData = importResult.failedRows.map((row: any) => ({
                            产品名称: row.product_name || "",
                            模块名称: row.module_name || "",
                            技术规格及配置要求: row.tech_specs || "",
                            控标性说明: row.bidding_instructions || "",
                            备注: row.remarks || "",
                            软著名称: row.software_name || "",
                            类别: row.category || "",
                            厂商: row.vendor || "",
                            范围: row.scope || "",
                            失败原因: row._失败原因 || "",
                          }));
                          const ws = XLSX.utils.json_to_sheet(exportData);
                          ws["!cols"] = [
                            { wch: 20 }, { wch: 20 }, { wch: 30 },
                            { wch: 20 }, { wch: 20 }, { wch: 20 },
                            { wch: 15 }, { wch: 15 }, { wch: 15 },
                            { wch: 25 },
                          ];
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "失败数据");
                          XLSX.writeFile(wb, "导入失败数据.xlsx");
                        });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载失败数据（{importResult.failedRows.length} 条）
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {importResult ? "关闭" : "取消"}
            </Button>
            {importData.length > 0 && !importResult && (
              <Button
                onClick={async () => {
                  setImporting(true);
                  setImportResult(null);
                  
                  let successCount = 0;
                  let failedCount = 0;
                  const failedRows: any[] = [];

                  try {
                    for (const row of importData) {
                      if (!row.product_name || !row.module_name) {
                        failedCount++;
                        failedRows.push({ ...row, _失败原因: "产品名称或模块名称为空" });
                        continue;
                      }

                      // 查找类别 ID
                      let categoryId = "";
                      if (row.category) {
                        const cat = productCategories.find(c => c.name === row.category);
                        if (cat) categoryId = cat.id;
                      }

                      // 查找厂商名称
                      const vendorName = row.vendor || "";

                      // 查找范围
                      const scopeName = row.scope || "";

                      // 生成唯一编码
                      const code = `PM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                      try {
                        await apiFetch("/api/dicts/create", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "product_module_types",
                            code: code,
                            product_name: row.product_name,
                            module_name: row.module_name,
                            tech_specs: row.tech_specs || "",
                            bidding_instructions: row.bidding_instructions || "",
                            remarks: row.remarks || "",
                            software_name: row.software_name || "",
                            category: categoryId,
                            vendor: vendorName,
                            scope: scopeName,
                            is_enabled: true,
                          }),
                        });
                        successCount++;
                      } catch (error) {
                        console.error("插入失败:", error, row);
                        failedCount++;
                        failedRows.push({
                          ...row,
                          _失败原因: error instanceof Error ? error.message : "未知错误",
                        });
                      }
                    }

                    setImportResult({ success: successCount, failed: failedCount, failedRows });

                    if (successCount > 0) {
                      await loadCurrentTypeData();
                    }
                  } catch (error) {
                    console.error("导入出错:", error);
                    setImportResult({ success: 0, failed: importData.length, failedRows: importData.map(r => ({ ...r, _失败原因: "导入过程异常中断" })) });
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
              >
                {importing ? "导入中..." : `导入全部 ${importData.length} 条`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 数据表格组件
interface DataTableProps {
  data: DictItem[];
  onEdit: (item: DictItem) => void;
  onDelete: (id: string) => void;
  onReorder: (newData: DictItem[]) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onCreate: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editingId: string | null;
  editingData: Partial<DictItem>;
  setEditingData: (data: Partial<DictItem> | ((prev: Partial<DictItem>) => Partial<DictItem>)) => void;
  handleSubmit: () => void;
  activeTab: string;
  productCategories: DictItem[];
  productVendors?: DictItem[];
  productScopes?: DictItem[];
  onExport?: (data: DictItem[], productCategories: DictItem[], productVendors: DictItem[]) => void;
  onImport?: () => void;
  onBatchDelete: (ids: string[]) => Promise<void>;
}

// 可拖拽行包装组件
function SortableRow({ id, checkbox, children }: { id: string; checkbox?: React.ReactNode; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-blue-50" : ""}>
      <TableCell className="w-10">
        {checkbox}
      </TableCell>
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}

function DataTable({
  data,
  onEdit,
  onDelete,
  onReorder,
  onToggleActive,
  onCreate,
  dialogOpen,
  setDialogOpen,
  editingId,
  editingData,
  setEditingData,
  handleSubmit,
  activeTab,
  productCategories,
  productVendors,
  productScopes,
  onExport,
  onImport,
  onBatchDelete,
}: DataTableProps) {
  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 筛选状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 多选状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 根据筛选条件过滤数据
  const filteredData = data.filter((item: any) => {
    // 搜索关键字筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      const matchName = (item.name || "").toLowerCase().includes(keyword);
      const matchCode = (item.code || "").toLowerCase().includes(keyword);
      const matchProductName = (item.product_name || "").toLowerCase().includes(keyword);
      const matchModuleName = (item.module_name || "").toLowerCase().includes(keyword);
      const matchContactPerson = (item.contact_person || "").toLowerCase().includes(keyword);
      const matchPhone = (item.phone || item.contact_phone || "").toLowerCase().includes(keyword);
      if (!matchName && !matchCode && !matchProductName && !matchModuleName && !matchContactPerson && !matchPhone) {
        return false;
      }
    }

    // 状态筛选
    if (statusFilter !== "all") {
      const isEnabled = item.is_enabled ?? item.is_active;
      if (statusFilter === "enabled" && !isEnabled) return false;
      if (statusFilter === "disabled" && isEnabled) return false;
    }

    // 类别筛选（产品模块）
    if (activeTab === "product-modules" && categoryFilter) {
      const itemCategory = item.category;
      if (itemCategory !== categoryFilter) return false;
    }

    // 厂商筛选（产品模块）
    if (activeTab === "product-modules" && vendorFilter) {
      const itemVendor = item.vendor;
      if (itemVendor !== vendorFilter) return false;
    }

    return true;
  });

  // 重置筛选
  const resetFilters = () => {
    setSearchKeyword("");
    setStatusFilter("all");
    setCategoryFilter("");
    setVendorFilter("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchKeyword || statusFilter !== "all" || categoryFilter || vendorFilter;

  // 分页数据
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 多选操作
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedData.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确定要删除选中的 ${ids.length} 条数据吗？此操作不可撤销。`)) return;
    setBatchDeleting(true);
    try {
      await onBatchDelete(ids);
      clearSelection();
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              共 {filteredData.length} 条数据{hasActiveFilters && <span className="text-muted-foreground text-sm">（已筛选）</span>}
              {selectedIds.size > 0 && (
                <span className="text-muted-foreground text-sm ml-2">
                  已选 {selectedIds.size} 条
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {onImport && activeTab === "product-modules" && (
                <Button size="sm" variant="outline" onClick={onImport}>
                  <Upload className="w-4 h-4 mr-1" />
                  导入
                </Button>
              )}
              {onExport && activeTab === "product-modules" && (
                <Button size="sm" variant="outline" onClick={() => onExport(filteredData, productCategories, productVendors || [])}>
                  <Download className="w-4 h-4 mr-1" />
                  导出
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={batchDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {batchDeleting ? "删除中..." : `删除选中 (${selectedIds.size})`}
                </Button>
              )}
              <Button size="sm" onClick={onCreate}>
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>
          </div>
          
          {/* 筛选区域 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索名称或编码..."
                value={searchKeyword}
                onChange={(e) => { setSearchKeyword(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-8"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as "all" | "enabled" | "disabled"); setCurrentPage(1); }}
              className="h-8 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">全部状态</option>
              <option value="enabled">仅启用</option>
              <option value="disabled">仅禁用</option>
            </select>

            {/* 类别筛选（仅产品模块） */}
            {activeTab === "product-modules" && (
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="h-8 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">全部类别</option>
                {(productCategories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}

            {/* 厂商筛选（仅产品模块） */}
            {activeTab === "product-modules" && (
              <select
                value={vendorFilter}
                onChange={(e) => { setVendorFilter(e.target.value); setCurrentPage(1); }}
                className="h-8 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">全部厂商</option>
                {(productVendors || []).map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            )}

            {/* 重置筛选按钮 */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                <X className="w-3 h-3 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{hasActiveFilters ? "没有符合筛选条件的数据" : "暂无数据"}</p>
            {hasActiveFilters ? (
              <p className="text-sm mt-2">
                <button onClick={resetFilters} className="text-primary hover:underline">清除筛选</button>
              </p>
            ) : (
              <p className="text-sm">点击&quot;添加&quot;创建第一条数据</p>
            )}
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const oldIndex = paginatedData.findIndex(i => i.id === active.id);
                const newIndex = paginatedData.findIndex(i => i.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                  const newData = arrayMove(paginatedData, oldIndex, newIndex);
                  const reordered = newData.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
                  if (onReorder) onReorder(reordered);
                }
              }
            }}
          >
            <SortableContext items={paginatedData.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={toggleSelectAll}
                      >
                        {paginatedData.length > 0 &&
                          paginatedData.every((i) => selectedIds.has(i.id)) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                {activeTab === "product-modules" ? (
                  <>
                    <TableHead>产品名称</TableHead>
                    <TableHead>模块名称</TableHead>
                    <TableHead>技术规格及配置要求</TableHead>
                    <TableHead>控标性说明</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead>软著名称</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead>厂商</TableHead>
                    <TableHead>范围</TableHead>
                    <TableHead className="w-20">状态</TableHead>
                  </>
                ) : activeTab === "construction-units" ? (
                  <>
                    <TableHead>名称</TableHead>
                    <TableHead>单位负责人</TableHead>
                    <TableHead>电话</TableHead>
                    <TableHead>合作等级</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-24">状态</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>名称</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>描述</TableHead>
                    {data[0] && "category" in data[0] && (
                      <TableHead>类别</TableHead>
                    )}
                    <TableHead className="w-24">状态</TableHead>
                  </>
                )}
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <SortableRow
                  key={item.id}
                  id={item.id}
                  checkbox={
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSelect(item.id)}
                    >
                      {selectedIds.has(item.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  }
                >
                  {activeTab === "product-modules" ? (
                    <>
                      <TableCell className="font-medium">{item.product_name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.module_name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">{item.tech_specs || "-"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[100px] truncate">{item.bidding_instructions || "-"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[100px] truncate">{item.remarks || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.software_name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category_name || item.category || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.vendor || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.scope || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant={item.is_enabled ? "default" : "secondary"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => onToggleActive(item.id, !item.is_enabled)}
                        >
                          {item.is_enabled ? "启用" : "禁用"}
                        </Button>
                      </TableCell>
                    </>
                  ) : activeTab === "construction-units" ? (
                    <>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.contact_person || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.phone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.cooperation_level || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant={(item.is_enabled ?? item.is_active) ? "default" : "secondary"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => onToggleActive(item.id, !(item.is_enabled ?? item.is_active))}
                        >
                          {(item.is_enabled ?? item.is_active) ? "启用" : "禁用"}
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {(activeTab === "project-statuses" || activeTab === "todo-statuses") && item.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {item.code || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || "-"}
                      </TableCell>
                      {item && "category" in item && (
                        <TableCell className="text-muted-foreground">
                          {item.category || "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant={(item.is_enabled ?? item.is_active) ? "default" : "secondary"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => onToggleActive(item.id, !(item.is_enabled ?? item.is_active))}
                        >
                          {(item.is_enabled ?? item.is_active) ? "启用" : "禁用"}
                        </Button>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </SortableRow>
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
        )}
      </CardContent>

      {/* 分页栏 */}
      {filteredData.length > pageSize && (
        <div className="px-4 py-3 flex items-center justify-between border-t">
          <span className="text-sm text-muted-foreground">
            共 {filteredData.length} 条数据，第 {safePage} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(1)}
              className="h-7 px-2 text-xs"
            >
              首页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs"
            >
              上一页
            </Button>
            {/* 页码按钮 */}
            {(() => {
              const pages: number[] = [];
              const start = Math.max(1, safePage - 2);
              const end = Math.min(totalPages, safePage + 2);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map(p => (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(p)}
                  className="h-7 w-7 p-0 text-xs"
                >
                  {p}
                </Button>
              ));
            })()}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs"
            >
              下一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-7 px-2 text-xs"
            >
              末页
            </Button>
          </div>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "编辑数据" : "添加数据"}
            </DialogTitle>
            <DialogDescription>
              填写数据信息
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            {activeTab === "product-modules" ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2">
                {/* 第一行：产品名称 + 模块名称 */}
                <div className="space-y-1.5">
                  <Label>产品名称 <span className="text-destructive">*</span></Label>
                  <Input
                    value={editingData.product_name || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, product_name: e.target.value }))
                    }
                    placeholder="请输入产品名称"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>模块名称 <span className="text-destructive">*</span></Label>
                  <Input
                    value={editingData.module_name || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, module_name: e.target.value }))
                    }
                    placeholder="请输入模块名称"
                  />
                </div>
                {/* 第二行：技术规格及配置要求（占两列） */}
                <div className="col-span-2 space-y-1.5">
                  <Label>技术规格及配置要求</Label>
                  <Textarea
                    value={editingData.tech_specs || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, tech_specs: e.target.value }))
                    }
                    placeholder="请输入技术规格及配置要求"
                    rows={4}
                    className="min-h-[100px]"
                  />
                </div>
                {/* 第三行：控标性说明（占两列） */}
                <div className="col-span-2 space-y-1.5">
                  <Label>控标性说明</Label>
                  <Textarea
                    value={editingData.bidding_instructions || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, bidding_instructions: e.target.value }))
                    }
                    placeholder="请输入控标性说明"
                    rows={4}
                    className="min-h-[100px]"
                  />
                </div>
                {/* 第四行：备注 + 软著名称 */}
                <div className="space-y-1.5">
                  <Label>备注</Label>
                  <Input
                    value={editingData.remarks || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    placeholder="请输入备注"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>软著名称</Label>
                  <Input
                    value={editingData.software_name || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, software_name: e.target.value }))
                    }
                    placeholder="请输入软著名称"
                  />
                </div>
                {/* 第五行：类别 + 厂商 */}
                <div className="space-y-1.5">
                  <Label>类别</Label>
                  <select
                    value={editingData.category || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">请选择类别</option>
                    {(productCategories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>厂商</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingData.vendor || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, vendor: e.target.value }))
                    }
                  >
                    <option value="">请选择厂商</option>
                    {(productVendors || []).map((vendor) => (
                      <option key={vendor.id} value={vendor.name}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>范围</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingData.scope || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, scope: e.target.value }))
                    }
                  >
                    <option value="">请选择范围</option>
                    {(productScopes || []).map((scope) => (
                      <option key={scope.id} value={scope.name}>
                        {scope.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>
                    名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editingData.name || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="请输入名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>编码</Label>
                  <Input
                    value={editingData.code || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="请输入编码（可选）"
                  />
                </div>
                {(activeTab === "project-statuses" || activeTab === "todo-statuses") && (
                  <div className="space-y-2">
                    <Label>颜色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingData.color || "#3b82f6"}
                        onChange={(e) =>
                          setEditingData((prev) => ({ ...prev, color: e.target.value }))
                        }
                        className="h-9 w-12 cursor-pointer rounded border border-input p-1"
                      />
                      <Input
                        value={editingData.color || ""}
                        onChange={(e) =>
                          setEditingData((prev) => ({ ...prev, color: e.target.value }))
                        }
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
                {activeTab === "construction-units" && (
                  <>
                    <div className="space-y-2">
                      <Label>单位负责人</Label>
                      <Input
                        value={editingData.contact_person || ""}
                        onChange={(e) =>
                          setEditingData((prev) => ({ ...prev, contact_person: e.target.value }))
                        }
                        placeholder="请输入单位负责人"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>电话</Label>
                      <Input
                        value={editingData.phone || ""}
                        onChange={(e) =>
                          setEditingData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="请输入电话"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>合作等级</Label>
                      <Input
                        value={editingData.cooperation_level || ""}
                        onChange={(e) =>
                          setEditingData((prev) => ({ ...prev, cooperation_level: e.target.value }))
                        }
                        placeholder="如：A级、B级、C级"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={editingData.description || ""}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="请输入描述（可选）"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default BaseDataManagement;
