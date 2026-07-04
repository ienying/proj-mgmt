"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), { ssr: false });
import { toast } from "sonner";
import {
  Plus, Search, Filter, FileText, AlertTriangle, CheckCircle2,
  Clock, XCircle, Archive, Send, Eye, Bell, BarChart3,
  ChevronRight, Upload, User, Phone, Calendar, Tag,
  MessageSquare, Shield, ChevronDown, X, Image as ImageIcon,
  Video, Paperclip, CheckCircle, ClipboardList, Inbox,
  Users, BarChart2, TrendingUp, ArrowRight,
  Edit3, FolderOpen, FolderTree, UserCheck, Layers, Timer,
  Building2, Package, AlertCircle, QrCode, Copy, Check, ChevronsUpDown
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

/* ─── 类型定义 ─── */
interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

interface Issue {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string;
  department: string;
  reporter_id: string;
  reporter_name: string;
  reporter_phone: string;
  handler_id: string | null;
  handler_name: string | null;
  handler_phone: string | null;
  category_id: string;
  product_module_id: string | null;
  product_module_ids?: string[];
  product_module_names?: string[];
  is_major: boolean;
  urgency_id: string;
  warranty_status_id: string | null;
  description: string;
  is_first_report: boolean;
  has_similar_history: boolean;
  remarks: string | null;
  expected_handle_time: string | null;
  status: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  source?: string;
  customer_name?: string;
  contact_person?: string;
  contact_title?: string;
  contact_info?: string;
  evidence_files?: { url: string; name: string; size: number; type: string }[];
}

interface Category {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  is_enabled: boolean;
  sort_order: number;
}

interface Urgency {
  id: string;
  name: string;
  code: string;
  is_enabled: boolean;
  sort_order: number;
}

interface WarrantyStatus {
  id: string;
  name: string;
  code: string;
  is_enabled: boolean;
  sort_order: number;
}

interface UserItem {
  id: string;
  name: string;
  phone?: string;
  department?: string;
}

interface ProductModule {
  id: string;
  module_name: string;
  product_name: string;
  category: string;
}

interface ProjectItem {
  id: string;
  project_name: string;
  project_code: string;
}

interface ProcessingRecord {
  id: string;
  issue_id: string;
  action_type: string;
  operator_id: string;
  operator_name: string;
  to_user_id: string | null;
  to_user_name: string | null;
  comment: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  is_read: boolean;
  created_at: string;
  issue?: Issue;
}

/* ─── 状态映射 ─── */
const STATUS_MAP: Record<string, { label: string; color: string; barColor: string; dotColor: string }> = {
  pending: { label: "待受理", color: "bg-yellow-50 text-yellow-700 border-yellow-200", barColor: "bg-yellow-400", dotColor: "#d4b106" },
  accepted: { label: "已受理", color: "bg-blue-50 text-blue-700 border-blue-200", barColor: "bg-blue-400", dotColor: "#1677ff" },
  processing: { label: "处理中", color: "bg-indigo-50 text-indigo-700 border-indigo-200", barColor: "bg-indigo-400", dotColor: "#fa8c16" },
  completed: { label: "已完结", color: "bg-green-50 text-green-700 border-green-200", barColor: "bg-green-400", dotColor: "#52c41a" },
  rejected: { label: "已驳回", color: "bg-red-50 text-red-700 border-red-200", barColor: "bg-red-400", dotColor: "#f5222d" },
  closed: { label: "已关闭", color: "bg-gray-100 text-black border-gray-200", barColor: "bg-gray-300", dotColor: "#8c8c8c" },
};

const URGENCY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

/* ─── Props ─── */
interface IssueManagementProps {
  currentUser: CurrentUser;
}

/* ─── 主组件 ─── */
export default function IssueManagement({ currentUser }: IssueManagementProps) {
  // Tab 状态
  const [activeTab, setActiveTab] = useState("dashboard");

  // 数据状态
  const [issues, setIssues] = useState<Issue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [urgencyList, setUrgencyList] = useState<Urgency[]>([]);
  const [warrantyList, setWarrantyList] = useState<WarrantyStatus[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [productModules, setProductModules] = useState<ProductModule[]>([]);
  const [departments, setDepartments] = useState<{ code: string; name: string }[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [actionType, setActionType] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [actionToUser, setActionToUser] = useState("");

  // 筛选状态
  const [issueStatusFilter, setIssueStatusFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 发起问题表单
  const [form, setForm] = useState({
    title: "",
    project_id: undefined as string | undefined,
    project_name: "",
    department: currentUser.department || "",
    reporter_id: currentUser.id,
    reporter_name: currentUser.name,
    reporter_phone: currentUser.phone || "",
    handler_id: undefined as string | undefined,
    handler_name: "",
    handler_phone: "",
    notify_users: [] as { id: string; name: string }[],
    category_id: undefined as string | undefined,
    sub_category_id: undefined as string | undefined,
    product_module_id: undefined as string | undefined,
    is_major: false,
    urgency_id: undefined as string | undefined,
    warranty_status_id: undefined as string | undefined,
    description: "",
    is_first_report: true,
    has_similar_history: false,
    remarks: "",
    expected_handle_time: "",
  });
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当前用户的待办任务实例（用于判断外部工单）
  const [userTodos, setUserTodos] = useState<Record<string, unknown>[]>([]);

  // 处理过程
  const [processingNotes, setProcessingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // 发布到信息广场
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishContent, setPublishContent] = useState("");
  const [publishCategory, setPublishCategory] = useState("");
  const [publishTags, setPublishTags] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [knowledgeCategories, setKnowledgeCategories] = useState<{ id: string; name: string }[]>([]);

  // 扫码提报入口
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const submissionUrl = typeof window !== "undefined"
    ? `${window.location.origin}/external/submit`
    : "/external/submit";

  // 待办中心子Tab
  const [todoSubTab, setTodoSubTab] = useState("pending");

  // 数据加载
  const loadDicts = useCallback(async () => {
    try {
      const [catRes, urgRes, warRes, userRes, modRes, projRes] = await Promise.all([
        fetch("/api/issue-dicts/categories"),
        fetch("/api/issue-dicts/urgency"),
        fetch("/api/issue-dicts/warranty"),
        fetch("/api/users"),
        fetch("/api/dicts"),
        fetch("/api/projects"),
      ]);
      if (catRes.ok) { const d = await catRes.json(); setCategories(d.data || []); }
      if (urgRes.ok) { const d = await urgRes.json(); setUrgencyList(d.data || []); }
      if (warRes.ok) { const d = await warRes.json(); setWarrantyList(d.data || []); }
      if (userRes.ok) {
        const d = await userRes.json();
        const userList: UserItem[] = (d.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string, name: u.name as string, phone: u.phone as string || "", department: u.department as string || "",
        }));
        setUsers(userList);
      }
      if (modRes.ok) {
        const d = await modRes.json();
        const modList = d.product_modules || d.data || [];
        setProductModules(modList.map((m: Record<string, unknown>) => ({
          id: m.id as string, module_name: m.module_name as string, product_name: m.product_name as string || "", category: m.category as string || "",
        })));
      }
      if (projRes.ok) {
        const d = await projRes.json();
        setProjects((d.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string, project_name: p.project_name as string, project_code: p.project_code as string || "",
        })));
      }
      const deptRes = await fetch("/api/dicts?type=departments");
      if (deptRes.ok) {
        const d = await deptRes.json();
        const deptList = (d.data || []).filter((dd: Record<string, unknown>) => dd.is_enabled);
        setDepartments(deptList.map((dd: Record<string, unknown>) => ({
          code: dd.code as string,
          name: dd.name as string,
        })));
      }
    } catch (e) {
      console.error("加载字典失败:", e);
    }
  }, []);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/issues");
      if (res.ok) { const d = await res.json(); setIssues(d.data || []); }
    } catch (e) {
      console.error("加载问题列表失败:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/issues/records");
      if (res.ok) { const d = await res.json(); setRecords(d.data || []); }
    } catch (e) {
      console.error("加载处理记录失败:", e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/issues/notifications");
      if (res.ok) { const d = await res.json(); setNotifications(d.data || []); }
    } catch (e) {
      console.error("加载知会抄送失败:", e);
    }
  }, []);

  const loadUserTodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues/my-external-todos?user_id=${currentUser.id}`);
      if (res.ok) {
        const d = await res.json();
        const todos = (d.data?.issue_ids || []).map((id: string) => ({ source_id: id } as Record<string, unknown>));
        setUserTodos(todos);
      }
    } catch (e) {
      console.error("加载外部待办失败:", e);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadDicts();
    loadIssues();
    loadRecords();
    loadNotifications();
    loadUserTodos();
  }, [loadDicts, loadIssues, loadRecords, loadNotifications, loadUserTodos]);

  // 查看工单时加载处理过程
  useEffect(() => {
    if (selectedIssue) {
      // 从 remarks 或 processing_notes 字段加载已有的处理过程
      setProcessingNotes((selectedIssue as any).processing_notes || "");
    }
  }, [selectedIssue?.id]);

  // 辅助函数
  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return "";
    if (cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id);
      return parent ? `${parent.name} - ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const getUrgencyName = (urgId: string) => urgencyList.find(u => u.id === urgId)?.name || "";
  const getUrgencyCode = (urgId: string) => urgencyList.find(u => u.id === urgId)?.code || "";
  const getWarrantyName = (wId: string) => warrantyList.find(w => w.id === wId)?.name || "";

  // 筛选逻辑
  const myReports = issues.filter(i => i.creator_id === currentUser.id);
  const userExternalIssueIds = new Set(
    userTodos.map((t: Record<string, unknown>) => String(t.source_id))
  );
  const myHandleIssues = issues.filter(i => {
    if (i.handler_id === currentUser.id && ["pending", "accepted", "processing"].includes(i.status)) return true;
    if (i.source === "external" && !i.handler_id && i.status === "pending" && userExternalIssueIds.has(i.id)) return true;
    return false;
  });

  const filteredIssues = issues.filter(i => {
    if (issueStatusFilter !== "all" && i.status !== issueStatusFilter) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      return i.title.toLowerCase().includes(kw) ||
        i.reporter_name.toLowerCase().includes(kw) ||
        i.department.toLowerCase().includes(kw) ||
        (i.handler_name || "").toLowerCase().includes(kw);
    }
    return true;
  });

  // 待办中心数据
  const todoPending = issues.filter(i => {
    if (i.handler_id === currentUser.id && ["pending", "accepted", "processing"].includes(i.status)) return true;
    if (i.source === "external" && !i.handler_id && i.status === "pending" && userExternalIssueIds.has(i.id)) return true;
    return false;
  });
  const todoDone = records.filter(r => r.operator_id === currentUser.id).map(r => {
    const issue = issues.find(i => i.id === r.issue_id);
    return { ...r, issue };
  }).filter(r => r.issue);
  const todoTransfer = records.filter(r => r.operator_id === currentUser.id && r.action_type === "transfer").map(r => {
    const issue = issues.find(i => i.id === r.issue_id);
    return { ...r, issue };
  }).filter(r => r.issue);
  const todoWithdraw = records.filter(r => r.operator_id === currentUser.id && r.action_type === "withdraw").map(r => {
    const issue = issues.find(i => i.id === r.issue_id);
    return { ...r, issue };
  }).filter(r => r.issue);

  // 统计数据
  const statsData = {
    total: issues.length,
    pending: issues.filter(i => i.status === "pending").length,
    processing: issues.filter(i => ["accepted", "processing"].includes(i.status)).length,
    completed: issues.filter(i => i.status === "completed").length,
    major: issues.filter(i => i.is_major).length,
  };

  // 发起问题
  const resetForm = () => {
    setForm({
      title: "", project_id: undefined, project_name: "",
      department: currentUser.department || "",
      reporter_id: currentUser.id, reporter_name: currentUser.name, reporter_phone: currentUser.phone || "",
      handler_id: undefined, handler_name: "", handler_phone: "",
      notify_users: [],
      category_id: undefined, sub_category_id: undefined,
      product_module_id: undefined,
      is_major: false, urgency_id: undefined, warranty_status_id: undefined,
      description: "", is_first_report: true, has_similar_history: false,
      remarks: "", expected_handle_time: "",
    });
    setFormFiles([]);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { alert("请输入问题标题"); return; }
    if (!form.project_id && !form.project_name.trim()) { alert("请选择所属项目"); return; }
    if (!form.handler_id) { alert("请选择指定处理人"); return; }
    if (!form.category_id && !form.sub_category_id) { alert("请选择问题类别"); return; }
    if (!form.product_module_id) { alert("请选择对应产品模块"); return; }
    if (!form.urgency_id) { alert("请选择紧急程度"); return; }

    try {
      const categoryId = form.sub_category_id || form.category_id;
      const body = {
        title: form.title,
        project_id: form.project_id || null,
        project_name: form.project_name || "",
        department: form.department,
        reporter_id: form.reporter_id,
        reporter_name: form.reporter_name,
        reporter_phone: form.reporter_phone,
        handler_id: form.handler_id || null,
        handler_name: form.handler_name || null,
        handler_phone: form.handler_phone || null,
        category_id: categoryId,
        product_module_id: form.product_module_id || null,
        is_major: form.is_major,
        urgency_id: form.urgency_id,
        warranty_status_id: form.warranty_status_id || null,
        description: form.description,
        is_first_report: form.is_first_report,
        has_similar_history: form.has_similar_history,
        remarks: form.remarks || null,
        expected_handle_time: form.expected_handle_time || null,
        creator_id: currentUser.id,
      };

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const result = await res.json();
        const issueId = result.data?.id;

        for (const file of formFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("issue_id", issueId);
          formData.append("file_type", file.type.startsWith("video") ? "video" : "image");
          await fetch("/api/issues/attachments", { method: "POST", body: formData });
        }

        for (const nu of form.notify_users) {
          await fetch("/api/issues/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issue_id: issueId, user_id: nu.id, user_name: nu.name }),
          });
        }

        setShowCreateDialog(false);
        resetForm();
        loadIssues();
        loadRecords();
        loadNotifications();
      } else {
        const err = await res.json();
        alert("创建失败: " + (err.error || "未知错误"));
      }
    } catch (e) {
      alert("创建失败: " + String(e));
    }
  };

  // 状态操作
  const handleAction = async () => {
    if (!selectedIssue) return;
    try {
      const body: Record<string, string> = {
        status: actionType === "accept" ? "accepted"
          : actionType === "process" ? "processing"
          : actionType === "complete" ? "completed"
          : actionType === "reject" ? "rejected"
          : actionType === "close" ? "closed"
          : actionType === "reopen" ? "pending"
          : selectedIssue.status,
        action_type: actionType,
        operator_id: currentUser.id,
        operator_name: currentUser.name,
        comment: actionComment || "",
      };
      if ((actionType === "assign" || actionType === "transfer") && actionToUser) {
        body.handler_id = actionToUser;
        const toUser = users.find(u => u.id === actionToUser);
        body.handler_name = toUser?.name || "";
        body.handler_phone = toUser?.phone || "";
        body.to_user_id = actionToUser;
        body.to_user_name = toUser?.name || "";
        if (actionType === "assign") body.status = "accepted";
      }

      const res = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const result = await res.json();
        // 刷新列表和记录
        await Promise.all([loadIssues(), loadRecords()]);
        // 用 API 返回的最新数据更新 selectedIssue
        if (result.data) {
          setSelectedIssue(result.data);
        }
        setShowActionDialog(false);
        setActionComment("");
        setActionToUser("");
        // 如果是完结或驳回等终态操作，保持在查看页面；否则也保持
      } else {
        const err = await res.json();
        alert("操作失败: " + (err.error || "未知错误"));
      }
    } catch (e) {
      alert("操作失败: " + String(e));
    }
  };

  const markNotificationRead = async (notifId: string) => {
    try {
      await fetch("/api/issues/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notifId }),
      });
      loadNotifications();
    } catch (e) {
      console.error("标记已读失败:", e);
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  /* ─── 渲染：问题卡片 ─── */
  const renderIssueCard = (issue: Issue, showActions = false) => {
    const statusInfo = STATUS_MAP[issue.status] || STATUS_MAP.pending;
    const urgCode = getUrgencyCode(issue.urgency_id);
    const isOverdue = issue.expected_handle_time && new Date(issue.expected_handle_time) < new Date() && issue.status !== "completed" && issue.status !== "closed";
    return (
      <div key={issue.id}
        className={`bg-white rounded-none border transition-all duration-200 cursor-pointer group
          ${isOverdue ? "border-red-300" : "border-gray-200/80 hover:border-orange-200 hover:shadow-lg"}`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {issue.source === "external" && <span className="shrink-0 px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-green-500 text-white leading-none">外部</span>}
              {issue.is_major && <span className="shrink-0 px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-red-500 text-white leading-none">重大</span>}
              <h4 className="font-semibold text-sm truncate cursor-pointer hover:text-orange-600 transition-colors text-black"
                onClick={() => { setSelectedIssue(issue); setActiveTab("view_ticket"); }}>
                {issue.title}
              </h4>
            </div>
            <Badge className={`${statusInfo.color} text-xs shrink-0 ml-2 border`}>
              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: statusInfo.dotColor }} />
              {statusInfo.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-black mb-2">
            <span className="flex items-center gap-1"><User className="w-3 h-3 text-black" />{issue.reporter_name}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-black" />{issue.reporter_phone}</span>
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-black" />{issue.department}</span>
            <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-black" />{issue.handler_name || <em className="text-black/40">未分配</em>}</span>
            <span className="flex items-center gap-1"><FolderTree className="w-3 h-3 text-black" />{getCategoryName(issue.category_id)}</span>
            <span className="flex items-center gap-1">
              紧急: <span className={`w-2 h-2 rounded-full ${URGENCY_COLORS[urgCode] || "bg-gray-400"}`} />
              {getUrgencyName(issue.urgency_id)}
            </span>
            {issue.warranty_status_id && <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-black" />{getWarrantyName(issue.warranty_status_id)}</span>}
            {issue.product_module_names && issue.product_module_names.length > 0 ? (
              <span className="flex items-center gap-1"><Package className="w-3 h-3 text-black" />{issue.product_module_names.join('、')}</span>
            ) : issue.product_module_id ? (
              <span className="flex items-center gap-1"><Package className="w-3 h-3 text-black" />产品模块</span>
            ) : null}
          </div>
          {issue.description && (
            <p className="text-xs text-black line-clamp-2 mb-2 pl-0.5">{issue.description.replace(/<[^>]*>/g, "")}</p>
          )}
          <div className="flex items-center justify-between text-xs text-black pt-1 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(issue.created_at).toLocaleString("zh-CN")}
              {isOverdue && <span className="text-red-500 font-medium ml-1">已逾期</span>}
            </span>
            {showActions && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {issue.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-none"
                    onClick={() => { setSelectedIssue(issue); setActionType("accept"); setShowActionDialog(true); }}>
                    受理
                  </Button>
                )}
                {issue.status === "accepted" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-none"
                    onClick={() => { setSelectedIssue(issue); setActionType("process"); setShowActionDialog(true); }}>
                    处理
                  </Button>
                )}
                {issue.status === "processing" && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-green-600 rounded-none"
                      onClick={() => { setSelectedIssue(issue); setActionType("complete"); setShowActionDialog(true); }}>
                      完结
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-orange-600 rounded-none"
                      onClick={() => { setSelectedIssue(issue); setActionType("transfer"); setShowActionDialog(true); }}>
                      转交
                    </Button>
                  </>
                )}
                {issue.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs rounded-none"
                    onClick={() => { setSelectedIssue(issue); setActionType("transfer"); setShowActionDialog(true); }}>
                    转交
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs rounded-none"
                  onClick={() => { setSelectedIssue(issue); setActiveTab("view_ticket"); }}>
                  详情
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ─── 渲染：发起问题弹窗 ─── */
  const renderCreateDialog = () => {
    const topCategories = categories.filter(c => !c.parent_id && c.is_enabled);
    const subCategories = form.category_id
      ? categories.filter(c => c.parent_id === form.category_id && c.is_enabled)
      : [];

    return (
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); setCreateStep(1); } }}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden p-0 [&>button[data-slot=dialog-close]]:text-white/80 [&>button[data-slot=dialog-close]]:hover:text-white [&>button[data-slot=dialog-close]]:z-10">
          {/* Header */}
          <div className="px-6 pb-4 pt-5 bg-gray-900 shrink-0 relative">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" /> 发起问题
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-1">
              {createStep === 1 ? "填写问题基本信息" : "填写问题详细描述和辅助举证"}
            </DialogDescription>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium transition-all border
                ${createStep === 1 ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-black border-gray-200"}`}
              onClick={() => setCreateStep(1)}
            >
              <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold ${createStep > 1 ? "bg-green-500 text-white" : "bg-gray-700 text-white"}`}>
                {createStep > 1 ? "✓" : "1"}
              </span>
              基本信息
            </button>
            <div className="flex-1 h-px bg-gray-200" />
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-medium transition-all border
                ${createStep === 2 ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-black border-gray-200"}`}
              onClick={() => createStep > 1 && setCreateStep(2)}
            >
              <span className={`w-5 h-5 rounded-none flex items-center justify-center text-[10px] font-bold ${createStep === 2 ? "bg-gray-700 text-white" : "bg-gray-300 text-white"}`}>2</span>
              详细描述
            </button>
          </div>

          {createStep === 1 ? (
            /* ===== 第一步：基本信息 ===== */
            <div className="space-y-6">
              {/* 基本信息 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">基本信息</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <label className="text-xs font-semibold text-black mb-1.5 block">问题标题 <span className="text-red-500">*</span></label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="请输入问题标题" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-black mb-1.5 block">所属项目 <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value, project_id: undefined }))}
                        placeholder="输入或选择项目" className="flex-1" />
                      <Select value={form.project_id} onValueChange={v => {
                        const proj = projects.find(p => p.id === v);
                        setForm(f => ({ ...f, project_id: v, project_name: proj?.project_name || "" }));
                      }}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="选择已有项目" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">报修部门</label>
                    <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="选择部门" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* 人员与时间 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-purple-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">人员与时间</h3>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-black">报修</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">报修人 <span className="text-red-500">*</span></label>
                    <Select value={form.reporter_id} onValueChange={v => {
                      const u = users.find(u => u.id === v);
                      setForm(f => ({ ...f, reporter_id: v, reporter_name: u?.name || "", reporter_phone: u?.phone || "", department: u?.department || f.department }));
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="搜索选择" /></SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.name).map(u => <SelectItem key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">报修人电话 <span className="text-black font-normal">自动带出</span></label>
                    <Input value={form.reporter_phone} readOnly className="bg-gray-100 text-black" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">问题上报时间 <span className="text-black font-normal">系统自动</span></label>
                    <Input type="datetime-local" value={new Date().toISOString().slice(0, 16)} disabled className="bg-gray-100 text-black" />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-black">处理</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">指定处理人 <span className="text-red-500">*</span></label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex h-9 w-full items-center justify-between rounded-none border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                          <span className={form.handler_name ? "text-black" : "text-black/40"}>
                            {form.handler_name || "搜索选择"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="搜索用户名..." />
                          <CommandList>
                            <CommandEmpty>无匹配用户</CommandEmpty>
                            <CommandGroup>
                              {users.filter(u => u.name).map(u => (
                                <CommandItem key={u.id} value={u.name} onSelect={() => {
                                  setForm(f => ({ ...f, handler_id: u.id, handler_name: u.name, handler_phone: u.phone || "" }));
                                }}>
                                  {u.name}
                                  {u.department && <span className="ml-2 text-xs text-black/60">{u.department}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">处理人电话 <span className="text-black font-normal">自动带出</span></label>
                    <Input value={form.handler_phone} readOnly className="bg-gray-100 text-black" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">期望处理时间</label>
                    <Input type="datetime-local" value={form.expected_handle_time} onChange={e => setForm(f => ({ ...f, expected_handle_time: e.target.value }))} />
                  </div>
                </div>

                {/* 告知对象 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="text-xs font-semibold text-black mb-1.5 block">告知对象 <span className="text-black font-normal">可多选，对应人待办事项中可查看</span></label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {form.notify_users.map(nu => (
                      <span key={nu.id} className="inline-flex items-center gap-1 bg-gray-100 text-black text-xs px-2.5 py-1 rounded-none border border-gray-200">
                        {nu.name}
                        <button type="button" className="text-black hover:text-red-500 ml-0.5" onClick={() => setForm(f => ({ ...f, notify_users: f.notify_users.filter(n => n.id !== nu.id) }))}>×</button>
                      </span>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-none border border-input bg-transparent text-xs text-black hover:bg-gray-50">
                          + 添加告知人
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="搜索用户名..." />
                          <CommandList>
                            <CommandEmpty>无匹配用户</CommandEmpty>
                            <CommandGroup>
                              {users.filter(u => u.name && !form.notify_users.some(n => n.id === u.id)).map(u => (
                                <CommandItem key={u.id} value={u.name} onSelect={() => {
                                  setForm(f => ({ ...f, notify_users: [...f.notify_users, { id: u.id, name: u.name }] }));
                                }}>
                                  {u.name}
                                  {u.department && <span className="ml-2 text-xs text-black/60">{u.department}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* 分类信息 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">分类信息</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">问题类别（大类）<span className="text-red-500">*</span></label>
                    <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v, sub_category_id: undefined }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="选择大类" /></SelectTrigger>
                      <SelectContent>
                        {topCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">问题子类</label>
                    {subCategories.length > 0 ? (
                      <Select value={form.sub_category_id} onValueChange={v => setForm(f => ({ ...f, sub_category_id: v }))}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="选择子类" /></SelectTrigger>
                        <SelectContent>
                          {subCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="请先选择大类" className="bg-gray-100" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">对应产品模块 <span className="text-red-500">*</span></label>
                    <Select value={form.product_module_id} onValueChange={v => setForm(f => ({ ...f, product_module_id: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="选择产品模块" /></SelectTrigger>
                      <SelectContent>
                        {productModules.map(m => <SelectItem key={m.id} value={m.id}>{m.module_name}{m.product_name ? ` (${m.product_name})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">是否重大问题</label>
                    <div className="flex gap-6 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={form.is_major} onChange={() => setForm(f => ({ ...f, is_major: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={!form.is_major} onChange={() => setForm(f => ({ ...f, is_major: false }))} /> 否
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">紧急程度 <span className="text-red-500">*</span></label>
                    <Select value={form.urgency_id} onValueChange={v => setForm(f => ({ ...f, urgency_id: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="选择" /></SelectTrigger>
                      <SelectContent>
                        {urgencyList.filter(u => u.is_enabled).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">保修情况</label>
                    <Select value={form.warranty_status_id} onValueChange={v => setForm(f => ({ ...f, warranty_status_id: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="选择" /></SelectTrigger>
                      <SelectContent>
                        {warrantyList.filter(w => w.is_enabled).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            /* ===== 第二步：问题详情 ===== */
            <div className="space-y-6">
              {/* 详细描述 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">问题现象详细描述 <span className="text-red-500 text-xs">*</span></h3>
                </div>
                <div className="min-h-[350px] border border-gray-200 rounded-none">
                  <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))}
                    placeholder="什么时候开始、做了什么操作、出现什么报错、是否多人受影响" />
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* 辅助举证 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-orange-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">辅助举证</h3>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black mb-1.5 block">问题截图/照片/视频上传 <span className="text-black font-normal">提升处理效率</span></label>
                  <div className="border border-dashed border-gray-300 rounded-none p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-6 h-6 mx-auto mb-1 text-black" />
                    <p className="text-xs text-black">点击上传文件</p>
                    <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setFormFiles(prev => [...prev, ...files]);
                        e.target.value = "";
                      }} />
                  </div>
                  {formFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-gray-50 rounded-none px-2.5 py-1.5 text-xs border border-gray-200">
                          {f.type.startsWith("image") ? <ImageIcon className="w-3 h-3 text-blue-400" /> : <Video className="w-3 h-3 text-purple-400" />}
                          <span className="max-w-[120px] truncate text-black">{f.name}</span>
                          <X className="w-3 h-3 cursor-pointer text-black hover:text-red-500" onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">是否初次报修</label>
                    <div className="flex gap-4 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={form.is_first_report} onChange={() => setForm(f => ({ ...f, is_first_report: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={!form.is_first_report} onChange={() => setForm(f => ({ ...f, is_first_report: false }))} /> 否
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">历史是否同类问题</label>
                    <div className="flex gap-4 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={form.has_similar_history} onChange={() => setForm(f => ({ ...f, has_similar_history: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer text-black">
                        <input type="radio" checked={!form.has_similar_history} onChange={() => setForm(f => ({ ...f, has_similar_history: false }))} /> 否
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-black mb-1.5 block">备注补充说明</label>
                  <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="其他需要补充的信息" rows={2} />
                </div>
              </section>
            </div>
          )}

          </div>{/* end scroll area */}

          <DialogFooter className="shrink-0 px-6 py-3 border-t bg-gray-50">
            {createStep === 1 ? (
              <>
                <Button variant="outline" className="rounded-none" onClick={() => { setShowCreateDialog(false); resetForm(); }}>取消</Button>
                <Button onClick={() => setCreateStep(2)} className="bg-gray-900 hover:bg-gray-800 text-white px-6 rounded-none">下一步</Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="rounded-none" onClick={() => setCreateStep(1)}>上一步</Button>
                <Button variant="outline" className="rounded-none" onClick={() => { setShowCreateDialog(false); resetForm(); setCreateStep(1); }}>取消</Button>
                <Button onClick={handleSubmit} className="bg-gray-900 hover:bg-gray-800 text-white px-6 rounded-none">提交</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  /* ─── 渲染：问题详情弹窗 ─── */
  const renderDetailDialog = () => {
    if (!selectedIssue) return null;
    const si = selectedIssue;
    const issueRecords = records.filter(r => r.issue_id === si.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const statusInfo = STATUS_MAP[si.status] || STATUS_MAP.pending;

    return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-black">
              {si.is_major && <AlertTriangle className="w-4 h-4 text-red-500" />}
              {si.title}
              <Badge className={`${statusInfo.color} text-xs border`}>{statusInfo.label}</Badge>
            </DialogTitle>
            <DialogDescription>问题详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-black">上报时间:</span> {si.created_at ? new Date(si.created_at).toLocaleString("zh-CN") : "-"}</div>
              <div><span className="text-black">所属项目:</span> {si.project_name || "-"}</div>
              <div><span className="text-black">部门:</span> {si.department}</div>
              <div><span className="text-black">报修人:</span> {si.reporter_name} {si.reporter_phone}</div>
              <div><span className="text-black">处理人:</span> {si.handler_name || "未分配"} {si.handler_phone || ""}</div>
              <div><span className="text-black">类别:</span> {getCategoryName(si.category_id)}</div>
              <div><span className="text-black">紧急程度:</span> {getUrgencyName(si.urgency_id)}</div>
              {si.warranty_status_id && <div><span className="text-black">保修情况:</span> {getWarrantyName(si.warranty_status_id)}</div>}
              {si.expected_handle_time && <div><span className="text-black">期望处理时间:</span> {new Date(si.expected_handle_time).toLocaleString("zh-CN")}</div>}
            </div>
            {si.description && (
              <div>
                <span className="text-black block mb-1 font-semibold">问题描述:</span>
                <div className="bg-gray-50 rounded-none p-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: si.description }} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-black">
              <div>初次报修: {si.is_first_report ? "是" : "否"}</div>
              <div>同类问题: {si.has_similar_history ? "是" : "否"}</div>
              {si.remarks && <div className="col-span-2">备注: {si.remarks}</div>}
            </div>
            {/* 处理流水 */}
            {issueRecords.length > 0 && (
              <div>
                <span className="text-black block mb-2 font-semibold">处理流水:</span>
                <div className="space-y-2">
                  {issueRecords.map(r => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-black">{r.operator_name}</span>
                        <span className="text-black ml-1">
                          {r.action_type === "submit" ? "提交" : r.action_type === "accept" ? "受理" : r.action_type === "transfer" ? `转交给 ${r.to_user_name || ""}` : r.action_type === "process" ? "处理中" : r.action_type === "complete" ? "完结" : r.action_type === "reject" ? "驳回" : r.action_type === "close" ? "关闭" : r.action_type === "reopen" ? "重新打开" : r.action_type === "withdraw" ? "撤回" : r.action_type}
                        </span>
                        {r.comment && <span className="text-black ml-1">- {r.comment}</span>}
                        <span className="text-black ml-2">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 操作按钮 */}
            {si.status !== "completed" && si.status !== "closed" && (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {si.status === "pending" && (
                  <Button size="sm" className="rounded-none" onClick={() => { setSelectedIssue(si); setActionType("accept"); setShowActionDialog(true); setShowDetailDialog(false); }}>受理</Button>
                )}
                {si.status === "accepted" && (
                  <Button size="sm" className="rounded-none" onClick={() => { setSelectedIssue(si); setActionType("process"); setShowActionDialog(true); setShowDetailDialog(false); }}>开始处理</Button>
                )}
                {si.status === "processing" && (
                  <>
                    <Button size="sm" variant="outline" className="text-green-600 rounded-none" onClick={() => { setSelectedIssue(si); setActionType("complete"); setShowActionDialog(true); setShowDetailDialog(false); }}>完结</Button>
                    <Button size="sm" variant="outline" className="text-orange-600 rounded-none" onClick={() => { setSelectedIssue(si); setActionType("transfer"); setShowActionDialog(true); setShowDetailDialog(false); }}>转交</Button>
                  </>
                )}
                {(si.status === "pending" || si.status === "accepted") && (
                  <Button size="sm" variant="outline" className="text-orange-600 rounded-none" onClick={() => { setSelectedIssue(si); setActionType("transfer"); setShowActionDialog(true); setShowDetailDialog(false); }}>转交</Button>
                )}
                {si.status === "processing" && (
                  <Button size="sm" variant="outline" className="text-red-600 rounded-none" onClick={() => { setSelectedIssue(si); setActionType("reject"); setShowActionDialog(true); setShowDetailDialog(false); }}>驳回</Button>
                )}
                {si.status === "rejected" && (
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => { setSelectedIssue(si); setActionType("reopen"); setShowActionDialog(true); setShowDetailDialog(false); }}>重新打开</Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  /* ─── 渲染：操作弹窗 ─── */
  const renderActionDialog = () => {
    const handleConfirm = () => {
      if ((actionType === "transfer" || actionType === "assign") && !actionToUser) {
        alert("请选择转交对象");
        return;
      }
      if (actionType === "reject" && !actionComment.trim()) {
        alert("驳回必须填写驳回理由");
        return;
      }
      handleAction();
    };

    return (
    <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle className="text-black">
            {actionType === "accept" ? "受理" : actionType === "process" ? "开始处理" : actionType === "complete" ? "完结" : actionType === "reject" ? "驳回" : actionType === "close" ? "关闭" : actionType === "transfer" ? "转交" : actionType === "reopen" ? "重新打开" : "操作"}
          </DialogTitle>
          <DialogDescription>{selectedIssue?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {(actionType === "transfer" || actionType === "assign") && (
            <div>
              <label className="text-xs font-semibold text-black mb-1.5 block">转交给 <span className="text-red-500">*</span></label>
              <Select value={actionToUser} onValueChange={setActionToUser}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择处理人" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.name && u.id !== currentUser.id).map(u => <SelectItem key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-black mb-1.5 block">
              {actionType === "reject" ? <>驳回理由 <span className="text-red-500">*</span></> : "处理意见"}
            </label>
            <Textarea
              value={actionComment}
              onChange={e => setActionComment(e.target.value)}
              placeholder={actionType === "reject" ? "请务必填写驳回理由，说明为什么退回此工单" : "请输入处理意见"}
              rows={actionType === "reject" ? 4 : 3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setShowActionDialog(false)}>取消</Button>
          <Button className="rounded-none" onClick={handleConfirm}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  /* ─── 渲染：各 Tab 内容 ─── */

  /* ─── 渲染：总览仪表盘 ─── */
  const renderDashboard = () => {
    const recentIssues = [...issues].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    return (
      <div className="space-y-6">
        {/* 四个快捷入口卡片 */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              key: "create",
              label: "工单提报",
              desc: "快速提交新的工单问题",
              icon: "📝",
              action: () => { resetForm(); setActiveTab("create_ticket"); },
            },
            {
              key: "stats",
              label: "数据分析",
              desc: "查看工单统计与趋势分析",
              icon: "📊",
              action: () => setActiveTab("stats"),
            },
            {
              key: "issues",
              label: "工单查询",
              desc: "搜索和筛选全部工单记录",
              icon: "🔍",
              action: () => setActiveTab("issues"),
            },
            {
              key: "my_reports",
              label: "我的工单",
              desc: "查看我提交的全部工单",
              icon: "📋",
              action: () => setActiveTab("my_reports"),
            },
          ].map(card => (
            <button
              key={card.key}
              onClick={card.action}
              className="bg-white border-2 border-[#d5dfe8] p-6 text-center transition-all duration-150 hover:border-[#0d9488] hover:bg-[#edf8f7] cursor-pointer group"
            >
              <div className="text-2xl mb-3">{card.icon}</div>
              <h3 className="text-sm font-extrabold text-[#0d2137] mb-3">{card.label}</h3>
              <div className="h-1 bg-[#e0e8f2] mb-2">
                <div className="h-full bg-[#0d9488] w-0 group-hover:w-full transition-all duration-500" />
              </div>
              <p className="text-[11px] text-[#7b8fa1] font-semibold">{card.desc}</p>
            </button>
          ))}
        </div>

        {/* 最近工单 - 表格风格 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-[#0d2137] flex items-center gap-2 uppercase tracking-[1px]">
              <Clock className="w-4 h-4" />最近工单
            </h3>
            <button
              onClick={() => setActiveTab("issues")}
              className="text-xs text-[#7b8fa1] hover:text-[#0d2137] transition-colors flex items-center gap-1 font-semibold"
            >
              查看全部 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentIssues.length === 0 ? (
            <div className="border-2 border-[#0f2840] p-12 text-center text-[#7b8fa1] text-sm">
              暂无工单记录，点击上方"工单提报"发起第一个工单
            </div>
          ) : (
            <table className="w-full border-collapse border-2 border-[#0f2840]">
              <thead>
                <tr className="bg-[#f4f7fb] border-b-2 border-[#0f2840]">
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px]">标题</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">类型</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">状态</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">提交人</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[110px]">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map(i => (
                  <tr key={i.id}
                    className="border-b border-[#d5dfe8] hover:bg-[#f7f9fc] cursor-pointer transition-colors"
                    onClick={() => { setSelectedIssue(i); setActiveTab("view_ticket"); }}>
                    <td className="px-3 py-2.5 text-[13px] text-[#0d2137] font-medium">
                      <div className="flex items-center gap-2">
                        {i.is_major && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white uppercase">重大</span>}
                        {i.source === "external" && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white uppercase">外部</span>}
                        <span className="truncate">{i.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 border border-[#0f2840] text-[10px] font-semibold uppercase tracking-[0.3px] text-[#3d5468]">
                        {getCategoryName(i.category_id) || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px]"
                        style={{ borderColor: STATUS_MAP[i.status]?.dotColor || "#8c8c8c", color: STATUS_MAP[i.status]?.dotColor || "#8c8c8c" }}>
                        {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#0d2137]">{i.reporter_name}</td>
                    <td className="px-3 py-2.5 text-[13px] text-[#7b8fa1]">{fmtDate(i.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  /* ─── 渲染：发起工单（设计稿风格） ─── */
  const renderCreateTicket = () => {
    const topCategories = categories.filter(c => !c.parent_id && c.is_enabled);
    const subCategories = form.category_id
      ? categories.filter(c => c.parent_id === form.category_id && c.is_enabled)
      : [];
    return (
      <div className="bg-white max-w-[960px] mx-auto p-10">
        {/* 标题 */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-1.5 bg-[#2563eb] shrink-0 self-stretch min-h-[40px]" />
          <div>
            <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[1.5px] mb-1">CREATE NEW</div>
            <h2 className="text-2xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">发起工单</h2>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4">基本信息</div>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">问题标题 <span className="text-red-500">*</span></label>
            <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#0d2137] bg-white placeholder:text-[#7b8fa1] focus:outline-none focus:border-[#2563eb] transition-colors"
              placeholder="请输入问题标题" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">所属项目</label>
              <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#0d2137] bg-white placeholder:text-[#7b8fa1] focus:outline-none focus:border-[#2563eb] transition-colors"
                placeholder="输入或选择项目" value={form.project_name}
                onChange={e => setForm(f => ({ ...f, project_name: e.target.value, project_id: undefined }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">选择已有项目</label>
              <Select value={form.project_id} onValueChange={v => {
                const proj = projects.find(p => p.id === v);
                setForm(f => ({ ...f, project_id: v, project_name: proj?.project_name || "" }));
              }}>
                <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择已有项目" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 人员与时间 */}
        <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4">人员与时间</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">报修人</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex h-[42px] w-full items-center justify-between border-2 border-[#0f2840] bg-white px-3 text-sm focus:outline-none focus:border-[#2563eb] transition-colors">
                  <span className={form.reporter_name ? "text-[#0d2137]" : "text-[#7b8fa1]"}>{form.reporter_name || "搜索选择报修人"}</span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 rounded-none" align="start">
                <Command>
                  <CommandInput placeholder="搜索用户名..." />
                  <CommandList>
                    <CommandEmpty>无匹配用户</CommandEmpty>
                    <CommandGroup>
                      {users.filter(u => u.name).map(u => (
                        <CommandItem key={u.id} value={u.name} onSelect={() => {
                          setForm(f => ({ ...f, reporter_id: u.id, reporter_name: u.name, reporter_phone: u.phone || "", department: u.department || f.department }));
                        }}>{u.name}{u.department && <span className="ml-2 text-xs text-[#7b8fa1]">{u.department}</span>}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">报修人电话</label>
            <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#7b8fa1] bg-[#f4f7fb]" readOnly value={form.reporter_phone} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">报修部门</label>
            <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择部门" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">指定处理人 <span className="text-red-500">*</span></label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex h-[42px] w-full items-center justify-between border-2 border-[#0f2840] bg-white px-3 text-sm focus:outline-none focus:border-[#2563eb] transition-colors">
                  <span className={form.handler_name ? "text-[#0d2137]" : "text-[#7b8fa1]"}>{form.handler_name || "搜索选择处理人"}</span>
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 rounded-none" align="start">
                <Command>
                  <CommandInput placeholder="搜索用户名..." />
                  <CommandList>
                    <CommandEmpty>无匹配用户</CommandEmpty>
                    <CommandGroup>
                      {users.filter(u => u.name).map(u => (
                        <CommandItem key={u.id} value={u.name} onSelect={() => {
                          setForm(f => ({ ...f, handler_id: u.id, handler_name: u.name, handler_phone: u.phone || "" }));
                        }}>{u.name}{u.department && <span className="ml-2 text-xs text-[#7b8fa1]">{u.department}</span>}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">处理人电话</label>
            <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#7b8fa1] bg-[#f4f7fb]" readOnly value={form.handler_phone} />
          </div>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">告知对象（可多选，对应人待办事项中可查看）</label>
          <div className="flex flex-wrap gap-2 items-center border-2 border-[#0f2840] p-2 min-h-[42px]">
            {form.notify_users.map(nu => (
              <span key={nu.id} className="inline-flex items-center gap-1 border border-[#0f2840] text-[#0d2137] text-xs px-2.5 py-1">
                {nu.name}
                <button type="button" className="hover:text-red-500 ml-0.5" onClick={() => setForm(f => ({ ...f, notify_users: f.notify_users.filter(n => n.id !== nu.id) }))}>×</button>
              </span>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-xs text-[#7b8fa1] hover:text-[#0d2137] px-1">+ 添加告知人</button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0 rounded-none" align="start">
                <Command>
                  <CommandInput placeholder="搜索用户名..." />
                  <CommandList>
                    <CommandEmpty>无匹配用户</CommandEmpty>
                    <CommandGroup>
                      {users.filter(u => u.name && !form.notify_users.some(n => n.id === u.id)).map(u => (
                        <CommandItem key={u.id} value={u.name} onSelect={() => {
                          setForm(f => ({ ...f, notify_users: [...f.notify_users, { id: u.id, name: u.name }] }));
                        }}>{u.name}{u.department && <span className="ml-2 text-xs text-[#7b8fa1]">{u.department}</span>}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">问题上报时间</label>
            <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#7b8fa1] bg-[#f4f7fb]" value={new Date().toLocaleString("zh-CN")} readOnly />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">期望处理时间</label>
            <input type="datetime-local" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#0d2137] bg-white focus:outline-none focus:border-[#2563eb] transition-colors"
              value={form.expected_handle_time} onChange={e => setForm(f => ({ ...f, expected_handle_time: e.target.value }))} />
          </div>
        </div>

        {/* 详细描述 */}
        <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4 mt-6">详细描述</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">问题类别（大类） <span className="text-red-500">*</span></label>
            <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v, sub_category_id: undefined }))}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择大类" /></SelectTrigger>
              <SelectContent>
                {topCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">问题子类</label>
            {subCategories.length > 0 ? (
              <Select value={form.sub_category_id} onValueChange={v => setForm(f => ({ ...f, sub_category_id: v }))}>
                <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择子类" /></SelectTrigger>
                <SelectContent>
                  {subCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <input type="text" className="border-2 border-[#0f2840] h-[42px] px-3 text-sm text-[#7b8fa1] bg-[#f4f7fb]" disabled placeholder="请先选择大类" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">紧急程度 <span className="text-red-500">*</span></label>
            <Select value={form.urgency_id} onValueChange={v => setForm(f => ({ ...f, urgency_id: v }))}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                {urgencyList.filter(u => u.is_enabled).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">保修情况</label>
            <Select value={form.warranty_status_id} onValueChange={v => setForm(f => ({ ...f, warranty_status_id: v }))}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择" /></SelectTrigger>
              <SelectContent>
                {warrantyList.filter(w => w.is_enabled).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">对应产品模块 <span className="text-red-500">*</span></label>
            <Select value={form.product_module_id} onValueChange={v => setForm(f => ({ ...f, product_module_id: v }))}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none h-[42px] text-sm bg-white"><SelectValue placeholder="选择产品模块" /></SelectTrigger>
              <SelectContent>
                {productModules.map(m => <SelectItem key={m.id} value={m.id}>{m.module_name}{m.product_name ? ` (${m.product_name})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">是否重大问题</label>
            <div className="flex h-[42px]">
              <button
                type="button"
                className={`px-8 border-2 border-[#0f2840] text-sm font-semibold transition-all ${!form.is_major ? "bg-[#0d2137] text-white border-[#0d2137]" : "bg-white text-[#3d5468] hover:bg-[#f4f7fb]"}`}
                onClick={() => setForm(f => ({ ...f, is_major: false }))}
              >否</button>
              <button
                type="button"
                className={`px-8 border-2 border-l-0 border-[#0f2840] text-sm font-semibold transition-all ${form.is_major ? "bg-[#0d2137] text-white border-[#0d2137]" : "bg-white text-[#3d5468] hover:bg-[#f4f7fb]"}`}
                onClick={() => setForm(f => ({ ...f, is_major: true }))}
              >是</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">问题现象详细描述 <span className="text-red-500">*</span></label>
          <div className="border-2 border-[#0f2840] min-h-[200px]">
            <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))}
              placeholder="请详细描述问题现象、复现步骤、影响范围等..." />
          </div>
        </div>

        {/* 辅助举证 */}
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px]">辅助举证</label>
          <div className="border-2 border-dashed border-[#d5dfe8] bg-[#f4f7fb] p-4 flex items-center gap-3"
            onClick={() => fileInputRef.current?.click()}>
            <span className="text-xs text-[#7b8fa1] flex-1">📎 问题截图 / 照片 / 视频上传，提升处理效率</span>
            <button type="button" className="px-3 py-1.5 border-2 border-[#0f2840] bg-white text-[11px] font-semibold text-[#3d5468] hover:bg-[#0d2137] hover:text-white transition-colors">选择文件</button>
            <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setFormFiles(prev => [...prev, ...files]);
                e.target.value = "";
              }} />
          </div>
          {formFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formFiles.map((f, idx) => (
                <div key={idx} className="flex items-center gap-1.5 border-2 border-[#0f2840] px-3 py-1.5 text-xs">
                  {f.type.startsWith("image") ? <ImageIcon className="w-3 h-3 text-[#2563eb]" /> : <Video className="w-3 h-3 text-purple-400" />}
                  <span className="max-w-[120px] truncate text-[#0d2137]">{f.name}</span>
                  <X className="w-3 h-3 cursor-pointer text-[#7b8fa1] hover:text-red-500" onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2.5 mt-7">
          <button
            className="px-6 py-2.5 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
            onClick={handleSubmit}
          >提交工单</button>
          <button className="px-6 py-2.5 border-2 border-[#0f2840] bg-white text-[#3d5468] text-xs font-bold uppercase tracking-[1px] hover:bg-[#0d2137] hover:text-white transition-colors">存为草稿</button>
          <button
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-[1px] text-[#7b8fa1] hover:text-[#0d2137] transition-colors"
            onClick={() => { resetForm(); setActiveTab("dashboard"); }}
          >取消</button>
        </div>
      </div>
    );
  };

  // 我的工单 - 表格页风格
  const renderMyReports = () => (
    <div className="bg-white max-w-[960px] mx-auto p-10">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-1.5 bg-[#2563eb] shrink-0 self-stretch min-h-[40px]" />
        <div>
          <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[1.5px] mb-1">MY TICKETS</div>
          <h2 className="text-2xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">我的工单</h2>
        </div>
      </div>
      {/* 工具栏 */}
      <div className="flex gap-2 mb-5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8fa1] text-sm">⌕</span>
          <input type="text" className="w-full border-2 border-[#0f2840] pl-8 pr-3 py-2 text-[13px] bg-white placeholder:text-[#7b8fa1] focus:outline-none focus:border-[#2563eb]"
            placeholder="搜索我的工单..." />
        </div>
        <button className="px-4 py-2 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] uppercase tracking-[0.5px] hover:bg-[#0d2137] hover:text-white transition-colors">状态 ▾</button>
        <button className="px-4 py-2 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] uppercase tracking-[0.5px] hover:bg-[#0d2137] hover:text-white transition-colors">类型 ▾</button>
        <button
          onClick={() => { resetForm(); setActiveTab("create_ticket"); }}
          className="px-4 py-2 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[0.5px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
        >发起工单</button>
      </div>
      {myReports.length === 0 ? (
        <div className="border-2 border-[#0f2840] p-16 text-center text-[#7b8fa1] text-sm">暂无工单记录</div>
      ) : (
        <table className="w-full border-collapse border-2 border-[#0f2840]">
          <thead>
            <tr className="bg-[#f4f7fb] border-b-2 border-[#0f2840]">
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px]">标题</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">类型</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">状态</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">处理人</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[110px]">提交时间</th>
            </tr>
          </thead>
          <tbody>
            {myReports.map(i => (
              <tr key={i.id}
                className="border-b border-[#d5dfe8] hover:bg-[#f7f9fc] cursor-pointer transition-colors"
                onClick={() => { setSelectedIssue(i); setActiveTab("view_ticket"); }}>
                <td className="px-3 py-2.5 text-[13px] text-[#0d2137] font-medium">
                  <div className="flex items-center gap-2">
                    {i.is_major && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white uppercase">重大</span>}
                    <span className="truncate">{i.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-block px-2 py-0.5 border border-[#0f2840] text-[10px] font-semibold uppercase tracking-[0.3px] text-[#3d5468]">
                    {getCategoryName(i.category_id) || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px]"
                    style={{ borderColor: STATUS_MAP[i.status]?.dotColor || "#8c8c8c", color: STATUS_MAP[i.status]?.dotColor || "#8c8c8c" }}>
                    {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[13px] text-[#0d2137]">{i.handler_name || "—"}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#7b8fa1]">{fmtDate(i.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // 工单查询 - 表格页风格
  const renderIssues = () => (
    <div className="bg-white max-w-[960px] mx-auto p-10">
      {/* 标题 */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-1.5 bg-[#2563eb] shrink-0 self-stretch min-h-[40px]" />
        <div>
          <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[1.5px] mb-1">SEARCH</div>
          <h2 className="text-2xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">工单查询</h2>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex gap-2 mb-5 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8fa1] text-sm">⌕</span>
          <input
            type="text"
            className="w-full border-2 border-[#0f2840] pl-8 pr-3 py-2 text-[13px] text-[#0d2137] bg-white placeholder:text-[#7b8fa1] focus:outline-none focus:border-[#2563eb] transition-colors"
            placeholder="输入编号、标题、提交人..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
          />
        </div>
        {[
          { key: "all", label: "状态 ▾" },
          { key: "pending", label: "待受理" },
          { key: "accepted", label: "已受理" },
          { key: "processing", label: "处理中" },
          { key: "completed", label: "已完结" },
          { key: "rejected", label: "已驳回" },
        ].map(s => (
          <button key={s.key}
            className={`px-4 py-2 border-2 text-xs font-bold uppercase tracking-[0.5px] transition-colors
              ${issueStatusFilter === s.key
                ? "border-[#0d2137] bg-[#0d2137] text-white"
                : "border-[#0f2840] bg-white text-[#3d5468] hover:bg-[#0d2137] hover:text-white"}`}
            onClick={() => setIssueStatusFilter(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* 表格 */}
      {filteredIssues.length === 0 ? (
        <div className="border-2 border-[#0f2840] p-16 text-center text-[#7b8fa1] text-sm">暂无匹配的工单</div>
      ) : (
        <table className="w-full border-collapse border-2 border-[#0f2840]">
          <thead>
            <tr className="bg-[#f4f7fb] border-b-2 border-[#0f2840]">
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px]">标题</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px]">类型</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">状态</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">提交人</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[110px]">时间</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map(i => {
              const urgCode = getUrgencyCode(i.urgency_id);
              const urgencyColor = URGENCY_COLORS[urgCode] || "border-[#0f2840] text-[#3d5468]";
              return (
                <tr key={i.id}
                  className="border-b border-[#d5dfe8] hover:bg-[#f7f9fc] cursor-pointer transition-colors"
                  onClick={() => { setSelectedIssue(i); setActiveTab("view_ticket"); }}>
                  <td className="px-3 py-2.5 text-[13px] text-[#0d2137] font-medium">
                    <div className="flex items-center gap-2">
                      {i.is_major && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white uppercase">重大</span>}
                      {i.source === "external" && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white uppercase">外部</span>}
                      <span className="truncate">{i.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 border border-[#0f2840] text-[10px] font-semibold uppercase tracking-[0.3px] text-[#3d5468]">{getCategoryName(i.category_id) || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px]"
                      style={{
                        borderColor: STATUS_MAP[i.status]?.dotColor || "#8c8c8c",
                        color: STATUS_MAP[i.status]?.dotColor || "#8c8c8c",
                      }}>
                      {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#0d2137]">{i.reporter_name}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#7b8fa1]">{fmtDate(i.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  // 需我处理 - 表格页风格
  const renderMyHandle = () => (
    <div className="bg-white max-w-[960px] mx-auto p-10">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-1.5 bg-[#2563eb] shrink-0 self-stretch min-h-[40px]" />
        <div>
          <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[1.5px] mb-1">MY TASK · 待办</div>
          <h2 className="text-2xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">需我处理</h2>
        </div>
      </div>
      {myHandleIssues.length === 0 ? (
        <div className="border-2 border-[#0f2840] p-16 text-center text-[#7b8fa1] text-sm">暂无需要处理的问题，所有问题已处理完毕</div>
      ) : (
        <table className="w-full border-collapse border-2 border-[#0f2840]">
          <thead>
            <tr className="bg-[#f4f7fb] border-b-2 border-[#0f2840]">
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px]">标题</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">类型</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">优先级</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[80px]">状态</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-[#3d5468] uppercase tracking-[0.8px] w-[110px]">提交时间</th>
            </tr>
          </thead>
          <tbody>
            {myHandleIssues.map(i => {
              const urgCode = getUrgencyCode(i.urgency_id);
              return (
                <tr key={i.id}
                  className="border-b border-[#d5dfe8] hover:bg-[#f7f9fc] cursor-pointer transition-colors"
                  onClick={() => { setSelectedIssue(i); setActiveTab("view_ticket"); }}>
                  <td className="px-3 py-2.5 text-[13px] text-[#0d2137] font-medium">
                    <div className="flex items-center gap-2">
                      {i.is_major && <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white uppercase">重大</span>}
                      <span className="truncate">{i.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 border border-[#0f2840] text-[10px] font-semibold uppercase tracking-[0.3px] text-[#3d5468]">
                      {getCategoryName(i.category_id) || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px] ${URGENCY_COLORS[urgCode] ? "border-[#2563eb] text-[#2563eb]" : "border-[#0f2840] text-[#3d5468]"}`}>
                      {(URGENCY_COLORS[urgCode] ? getUrgencyName(i.urgency_id) : "—") || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.3px]"
                      style={{ borderColor: STATUS_MAP[i.status]?.dotColor || "#8c8c8c", color: STATUS_MAP[i.status]?.dotColor || "#8c8c8c" }}>
                      {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#7b8fa1]">{fmtDate(i.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  // 待办中心
  const renderTodo = () => {
    const subTabs = [
      { key: "pending", label: "待办", count: todoPending.length },
      { key: "done", label: "已办", count: todoDone.length },
      { key: "transfer", label: "转交", count: todoTransfer.length },
      { key: "withdraw", label: "撤回", count: todoWithdraw.length },
    ];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {subTabs.map(st => (
            <button key={st.key}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-none
                ${todoSubTab === st.key ? "bg-gray-900 text-white" : "text-black hover:bg-gray-100"}`}
              onClick={() => setTodoSubTab(st.key)}>
              {st.label} ({st.count})
            </button>
          ))}
        </div>
        {todoSubTab === "pending" && (
          myHandleIssues.length === 0 ? (
            <div className="text-center py-12 text-black">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>暂无待办</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myHandleIssues.map(i => renderIssueCard(i, true))}
            </div>
          )
        )}
        {todoSubTab === "done" && (
          todoDone.length === 0 ? (
            <div className="text-center py-12 text-black"><p>暂无已办记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoDone.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-none border border-gray-200 p-3 flex items-center gap-3 cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => { setSelectedIssue(r.issue as Issue); setActiveTab("view_ticket"); }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-black">{(r.issue as Issue).title}</p>
                    <p className="text-xs text-black/60">{r.operator_name} - {r.action_type} - {new Date(r.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/30" />
                </div>
              ))}
            </div>
          )
        )}
        {todoSubTab === "transfer" && (
          todoTransfer.length === 0 ? (
            <div className="text-center py-12 text-black"><p>暂无转交记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoTransfer.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-none border border-gray-200 p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-black">{(r.issue as Issue).title}</p>
                    <p className="text-xs text-black/60">转交给 {r.to_user_name} - {new Date(r.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {todoSubTab === "withdraw" && (
          todoWithdraw.length === 0 ? (
            <div className="text-center py-12 text-black"><p>暂无撤回记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoWithdraw.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-none border border-gray-200 p-3">
                  <p className="text-sm font-semibold text-black">{(r.issue as Issue).title}</p>
                  <p className="text-xs text-black/60">{new Date(r.created_at).toLocaleString("zh-CN")}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  };

  /* ─── 渲染：查看工单（设计稿风格） ─── */
  const renderViewTicket = () => {
    if (!selectedIssue) return null;
    const si = selectedIssue;
    const issueRecords = records.filter(r => r.issue_id === si.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const statusInfo = STATUS_MAP[si.status] || STATUS_MAP.pending;
    return (
      <div className="bg-white max-w-[960px] mx-auto p-10">
        {/* 标题 */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="w-1.5 bg-[#2563eb] shrink-0 self-stretch min-h-[40px]" />
            <div>
              <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[1.5px] mb-1">TICKET DETAIL</div>
              <h2 className="text-2xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">
                {si.is_major && <AlertTriangle className="w-5 h-5 text-red-500 inline mr-2" />}
                {si.title}
              </h2>
            </div>
          </div>
          <span className="inline-block px-3 py-1.5 border text-[10px] font-bold uppercase tracking-[0.5px] shrink-0"
            style={{ borderColor: statusInfo.dotColor, color: statusInfo.dotColor }}>
            {statusInfo.label}
          </span>
        </div>

        {/* 基本信息 */}
        <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4">基本信息</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">上报时间</label>
            <span className="text-sm text-[#0d2137] font-medium">{si.created_at ? new Date(si.created_at).toLocaleString("zh-CN") : "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">所属项目</label>
            <span className="text-sm text-[#0d2137] font-medium">{si.project_name || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">部门</label>
            <span className="text-sm text-[#0d2137] font-medium">{si.department || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">报修人</label>
            <span className="text-sm text-[#0d2137] font-medium">{si.reporter_name} {si.reporter_phone ? `· ${si.reporter_phone}` : ""}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">处理人</label>
            <span className="text-sm text-[#0d2137] font-medium">{si.handler_name || "未分配"} {si.handler_phone ? `· ${si.handler_phone}` : ""}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">紧急程度</label>
            <span className="text-sm text-[#0d2137] font-medium">{getUrgencyName(si.urgency_id) || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">问题类别</label>
            <span className="text-sm text-[#0d2137] font-medium">{getCategoryName(si.category_id) || "—"}</span>
          </div>
          {si.warranty_status_id && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">保修情况</label>
              <span className="text-sm text-[#0d2137] font-medium">{getWarrantyName(si.warranty_status_id)}</span>
            </div>
          )}
          {si.expected_handle_time && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-[#7b8fa1] uppercase tracking-[1px]">期望处理时间</label>
              <span className="text-sm text-[#0d2137] font-medium">{new Date(si.expected_handle_time).toLocaleString("zh-CN")}</span>
            </div>
          )}
        </div>

        {/* 问题描述 */}
        <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4 mt-6">问题描述</div>
        {si.description ? (
          <div className="border-2 border-[#0f2840] p-4 prose prose-sm max-w-none text-[#0d2137] mb-4" dangerouslySetInnerHTML={{ __html: si.description }} />
        ) : (
          <div className="text-sm text-[#7b8fa1] mb-4">暂无描述</div>
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 text-sm text-[#0d2137]">
          <div>初次报修: {si.is_first_report ? "是" : "否"}</div>
          <div>同类问题: {si.has_similar_history ? "是" : "否"}</div>
          {si.remarks && <div className="col-span-2">备注: {si.remarks}</div>}
        </div>

        {/* 处理过程（处理人填写） */}
        {si.status === "processing" && si.handler_id === currentUser.id && (
          <div className="mt-6">
            <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4">处理过程记录</div>
            <p className="text-[11px] text-[#7b8fa1] mb-2">记录你的处理步骤、排查方法和解决方案，完成后可发布到信息广场</p>
            <div className="min-h-[200px] border-2 border-[#0f2840] mb-3">
              <RichTextEditor
                value={processingNotes}
                onChange={setProcessingNotes}
                placeholder="详细记录处理过程：排查了哪些问题、尝试了什么方法、最终如何解决的..."
              />
            </div>
            <button
              className="px-4 py-2 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
              onClick={async () => {
                setSavingNotes(true);
                try {
                  const res = await fetch(`/api/issues/${si.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ processing_notes: processingNotes }),
                  });
                  if (res.ok) {
                    toast.success("处理过程已保存");
                  } else {
                    alert("保存失败");
                  }
                } catch (e) {
                  alert("保存失败");
                } finally {
                  setSavingNotes(false);
                }
              }}
              disabled={savingNotes}
            >
              {savingNotes ? "保存中..." : "保存处理过程"}
            </button>
          </div>
        )}

        {/* 已保存的处理过程（非处理人查看） */}
        {(si.status === "completed" || si.status === "closed" || si.handler_id !== currentUser.id) && (si as any).processing_notes && (
          <div className="mt-6">
            <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4">处理过程记录</div>
            <div className="border-2 border-[#0f2840] p-4 prose prose-sm max-w-none text-[#0d2137]" dangerouslySetInnerHTML={{ __html: (si as any).processing_notes }} />
          </div>
        )}

        {/* 处理流水 */}
        {issueRecords.length > 0 && (
          <>
            <div className="text-xs font-extrabold text-[#0d2137] uppercase tracking-[1px] border-b-2 border-[#0f2840] pb-3 mb-4 mt-6">处理流水</div>
            <div className="space-y-2 mb-6">
              {issueRecords.map(r => (
                <div key={r.id} className="flex items-start gap-3 text-xs border-b border-[#d5dfe8] pb-2">
                  <div className="w-1.5 h-1.5 bg-[#2563eb] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-[#0d2137]">{r.operator_name}</span>
                    <span className="text-[#3d5468] ml-1">
                      {r.action_type === "submit" ? "提交" : r.action_type === "accept" ? "受理" : r.action_type === "transfer" ? `转交给 ${r.to_user_name || ""}` : r.action_type === "process" ? "处理中" : r.action_type === "complete" ? "完结" : r.action_type === "reject" ? "驳回" : r.action_type === "close" ? "关闭" : r.action_type === "reopen" ? "重新打开" : r.action_type === "withdraw" ? "撤回" : r.action_type}
                    </span>
                    {r.comment && <span className="text-[#7b8fa1] ml-1">- {r.comment}</span>}
                    <span className="text-[#7b8fa1] ml-2">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 操作按钮 */}
        {si.status !== "completed" && si.status !== "closed" && (
          <div className="flex gap-2.5 mt-7 border-t-2 border-[#d5dfe8] pt-6">
            {si.status === "pending" && (
              <>
                <button className="px-6 py-2.5 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
                  onClick={() => { setActionType("accept"); setShowActionDialog(true); }}>受理</button>
                <button className="px-6 py-2.5 border-2 border-red-500 text-red-500 bg-white text-xs font-bold uppercase tracking-[1px] hover:bg-red-500 hover:text-white transition-colors"
                  onClick={() => {
                    if (confirm(`确定要删除工单「${si.title}」吗？此操作不可恢复。`)) {
                      fetch(`/api/issues/${si.id}`, { method: "DELETE" }).then(r => {
                        if (r.ok) { toast.success("工单已删除"); setActiveTab("dashboard"); loadIssues(); }
                        else alert("删除失败");
                      });
                    }
                  }}>删除</button>
              </>
            )}
            {si.status === "accepted" && (
              <button className="px-6 py-2.5 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
                onClick={() => { setActionType("process"); setShowActionDialog(true); }}>开始处理</button>
            )}
            {si.status === "processing" && (
              <>
                <button className="px-6 py-2.5 border-2 border-[#0d9488] text-[#0d9488] bg-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#0d9488] hover:text-white transition-colors"
                  onClick={() => { setActionType("complete"); setShowActionDialog(true); }}>完结</button>
                <button className="px-6 py-2.5 border-2 border-[#2563eb] text-[#2563eb] bg-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:text-white transition-colors"
                  onClick={() => { setActionType("transfer"); setShowActionDialog(true); }}>转交</button>
              </>
            )}
            {(si.status === "pending" || si.status === "accepted") && (
              <button className="px-6 py-2.5 border-2 border-[#2563eb] text-[#2563eb] bg-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:text-white transition-colors"
                onClick={() => { setActionType("transfer"); setShowActionDialog(true); }}>转交</button>
            )}
            {si.status === "processing" && (
              <button className="px-6 py-2.5 border-2 border-red-500 text-red-500 bg-white text-xs font-bold uppercase tracking-[1px] hover:bg-red-500 hover:text-white transition-colors"
                onClick={() => { setActionType("reject"); setShowActionDialog(true); }}>驳回</button>
            )}
            {si.status === "rejected" && (
              <button className="px-6 py-2.5 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
                onClick={() => { setActionType("reopen"); setShowActionDialog(true); }}>重新打开</button>
            )}
            <button className="px-6 py-2.5 text-xs font-bold uppercase tracking-[1px] text-[#7b8fa1] hover:text-[#0d2137] transition-colors"
              onClick={() => setActiveTab("dashboard")}>返回</button>
          </div>
        )}
        {si.status !== "completed" && si.status !== "closed" ? null : (
          <div className="flex gap-2.5 mt-7 border-t-2 border-[#d5dfe8] pt-6">
            <button
              className="px-6 py-2.5 border-2 border-[#0d9488] bg-[#0d9488] text-white text-xs font-bold uppercase tracking-[1px] hover:bg-[#0d9488]/80 transition-colors"
              onClick={async () => {
                // 预填发布内容：问题描述 + 处理过程
                const descText = si.description ? si.description.replace(/<[^>]*>/g, "") : "";
                // 从处理记录中提取 comment
                const processComments = issueRecords
                  .filter(r => r.comment && (r.action_type === "complete" || r.action_type === "process" || r.action_type === "note"))
                  .map(r => r.comment)
                  .join("\n\n");
                const combined = `## 问题描述\n\n${descText}\n\n## 处理过程\n\n${processComments || "详见处理流水"}`;
                setPublishTitle(si.title);
                setPublishContent(combined);
                setPublishCategory("");
                setPublishTags("");
                // 加载知识分类
                try {
                  const catRes = await fetch("/api/knowledge/categories");
                  if (catRes.ok) {
                    const d = await catRes.json();
                    setKnowledgeCategories((d.data || d.categories || []).map((c: any) => ({
                      id: c.id, name: c.name,
                    })));
                  }
                } catch (e) {}
                setShowPublishDialog(true);
              }}
            >发布到信息广场</button>
            <button className="px-6 py-2.5 text-xs font-bold uppercase tracking-[1px] text-[#7b8fa1] hover:text-[#0d2137] transition-colors"
              onClick={() => setActiveTab("dashboard")}>返回</button>
          </div>
        )}
      </div>
    );
  };

  /* ─── 渲染：发布到信息广场弹窗 ─── */
  const renderPublishDialog = () => (
    <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle className="text-[#0d2137] flex items-center gap-2">
            <FileText className="w-5 h-5" />发布到信息广场
          </DialogTitle>
          <DialogDescription>
            工单内容已自动填入，你可以编辑修改后再发布
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px] mb-1.5 block">发布标题</label>
            <Input
              value={publishTitle}
              onChange={e => setPublishTitle(e.target.value)}
              className="border-2 border-[#0f2840] rounded-none"
              placeholder="输入标题"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px] mb-1.5 block">选择分类板块 <span className="text-red-500">*</span></label>
            <Select value={publishCategory} onValueChange={setPublishCategory}>
              <SelectTrigger className="border-2 border-[#0f2840] rounded-none">
                <SelectValue placeholder="选择信息广场分类" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px] mb-1.5 block">标签（用逗号或空格分隔）</label>
            <Input
              value={publishTags}
              onChange={e => setPublishTags(e.target.value)}
              className="border-2 border-[#0f2840] rounded-none"
              placeholder="如: 系统故障, 登录问题, 已解决"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#3d5468] uppercase tracking-[1px] mb-1.5 block">发布内容（可二次编辑）</label>
            <div className="min-h-[250px] border-2 border-[#0f2840]">
              <RichTextEditor
                value={publishContent}
                onChange={setPublishContent}
                placeholder="编辑你要发布的内容..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setShowPublishDialog(false)}>取消</Button>
          <Button
            className="rounded-none bg-[#0d2137] hover:bg-[#2563eb] text-white"
            onClick={async () => {
              if (!publishCategory) { alert("请选择分类板块"); return; }
              if (!publishTitle.trim()) { alert("请输入标题"); return; }
              setPublishing(true);
              try {
                const res = await fetch("/api/knowledge/posts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: publishTitle,
                    content: publishContent,
                    content_type: "rich_text",
                    category_id: publishCategory,
                    tags: publishTags,
                    is_pinned: false,
                  }),
                });
                if (res.ok) {
                  toast.success("已成功发布到信息广场");
                  setShowPublishDialog(false);
                } else {
                  const err = await res.json();
                  alert("发布失败: " + (err.error || "未知错误"));
                }
              } catch (e) {
                alert("发布失败");
              } finally {
                setPublishing(false);
              }
            }}
            disabled={publishing}
          >
            {publishing ? "发布中..." : "确认发布"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // 知会抄送
  const renderNotify = () => (
    <div className="space-y-3">
      <span className="text-sm text-black flex items-center gap-1.5">
        <Bell className="w-4 h-4 text-black" />
        共 <span className="font-semibold text-black">{notifications.length}</span> 条知会
        {notifications.filter(n => !n.is_read).length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-none text-[10px] bg-gray-900 text-white">
            {notifications.filter(n => !n.is_read).length} 条未读
          </span>
        )}
      </span>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-black">
          <div className="w-16 h-16 rounded-none bg-gray-100 flex items-center justify-center mb-3">
            <Bell className="w-8 h-8 text-black/30" />
          </div>
          <p className="text-sm mb-1">暂无知会抄送</p>
          <p className="text-xs text-black/40">有人抄送你时会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const issue = issues.find(i => i.id === n.issue_id);
            if (!issue) return null;
            return (
              <div key={n.id} className={`bg-white rounded-none border overflow-hidden transition-all duration-200 ${
                !n.is_read ? "border-gray-900 bg-gray-50" : "border-gray-200"
              }`}>
                <div className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-none flex items-center justify-center shrink-0 ${
                    !n.is_read ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => { setSelectedIssue(issue); setActiveTab("view_ticket"); }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                      <p className="text-sm font-semibold truncate cursor-pointer hover:text-orange-600 transition-colors text-black">{issue.title}</p>
                    </div>
                    <p className="text-xs text-black/60">
                      {issue.reporter_name} 上报于 {new Date(n.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 rounded-none border-gray-300 text-black hover:bg-gray-50"
                      onClick={() => markNotificationRead(n.id)}>
                      标记已读
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 数据统计 - 海报风格
  const renderStats = () => (
    <div className="space-y-4">
      <div className="bg-white max-w-[900px] mx-auto p-8">
        {/* 标题 */}
        <div className="flex items-start gap-5 mb-12">
          <div className="w-2 bg-[#2563eb] shrink-0 self-stretch min-h-[60px]" />
          <div>
            <div className="text-xs font-semibold text-[#7b8fa1] uppercase tracking-[2px] mb-1">TICKET REPORT · 本周</div>
            <h2 className="text-3xl font-black tracking-[-0.5px] text-[#0d2137] leading-tight">
              工单数据统计<br />
              已完结 <span className="text-[#0d9488] font-black">{statsData.completed}</span>
            </h2>
          </div>
        </div>

        {/* 统计数字 */}
        <div className="border-2 border-[#0f2840] flex mb-10">
          {[
            { label: "已完结", value: statsData.completed, color: "#0d9488" },
            { label: "处理中", value: statsData.processing, color: "#2563eb" },
            { label: "待受理", value: statsData.pending, color: "#2563eb" },
            { label: "重大问题", value: statsData.major, color: "#7b8fa1" },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 p-7 text-center ${i < 3 ? "border-r-2 border-[#0f2840]" : ""}`}>
              <div className="text-5xl font-black tracking-[-2px] leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-bold text-[#7b8fa1] uppercase tracking-[1.5px] mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 状态分布 */}
        <div className="text-[11px] font-extrabold text-white bg-[#0f2840] inline-block px-4 py-2.5 uppercase tracking-[2px] mb-5">状态分布</div>
        <div className="space-y-1.5 mb-10">
          {Object.entries(STATUS_MAP).map(([key, info]) => {
            const count = issues.filter(i => i.status === key).length;
            const pct = statsData.total > 0 ? (count / statsData.total * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-4 py-2">
                <span className="w-20 text-right text-[13px] font-bold text-[#3d5468] shrink-0">{info.label}</span>
                <div className="flex-1 h-5 bg-[#e0e8f2]">
                  <div className="h-full transition-all duration-800" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: info.dotColor }} />
                </div>
                <span className="w-16 text-[13px] font-extrabold text-[#0d2137] shrink-0">{count} 件</span>
              </div>
            );
          })}
        </div>

        {/* 类别统计 */}
        <div className="text-[11px] font-extrabold text-white bg-[#0f2840] inline-block px-4 py-2.5 uppercase tracking-[2px] mb-5">类别统计</div>
        <div className="grid grid-cols-4 gap-2.5 mb-10">
          {categories.filter(c => !c.parent_id).slice(0, 8).map(cat => {
            const count = issues.filter(i => {
              const catIds = categories.filter(cc => cc.parent_id === cat.id).map(cc => cc.id);
              return i.category_id === cat.id || catIds.includes(i.category_id);
            }).length;
            const pct = count > 0 && statsData.total > 0 ? Math.round(count / statsData.total * 100) : 0;
            const isActive = count > 0;
            return (
              <div key={cat.id} className={`border-2 p-4 text-center transition-all ${isActive ? "border-[#0d9488] bg-[#edf8f7]" : "border-[#d5dfe8] bg-[#f7f9fc]"}`}>
                <div className="text-xl mb-2">{isActive ? "✅" : "📋"}</div>
                <div className="text-[13px] font-extrabold text-[#0d2137] mb-3">{cat.name}</div>
                <div className="h-1 bg-[#e0e8f2] mb-1.5">
                  <div className={`h-full transition-all duration-800 ${isActive ? "bg-[#0d9488]" : "bg-[#d9d3c8]"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <div className="text-[11px] font-semibold text-[#7b8fa1]">
                  {count > 0 ? `已完成 ${count} · ${count}/${statsData.total}` : "暂无工单"}
                </div>
              </div>
            );
          })}
        </div>

        {/* 重大问题 */}
        {issues.filter(i => i.is_major).length > 0 && (
          <div>
            <div className="text-[11px] font-extrabold text-white bg-[#0f2840] inline-block px-4 py-2.5 uppercase tracking-[2px] mb-5 text-red-400">重大问题</div>
            <div className="space-y-2">
              {issues.filter(i => i.is_major).map(i => (
                <div key={i.id} className="flex items-center gap-3 text-sm border-l-2 border-l-red-400 pl-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="flex-1 truncate text-[#0d2137] font-medium">{i.title}</span>
                  <span className="text-xs font-bold px-2 py-1 border border-[#0f2840] text-[#3d5468] uppercase">
                    {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="flex justify-between items-center pt-7 border-t border-[#d5dfe8] mt-10">
          <div className="flex gap-6 text-[11px] text-[#7b8fa1] font-semibold">
            <span>元素科技</span>
            <strong className="text-[#3d5468]">400-xxx-xxxx</strong>
          </div>
          <div className="text-[11px] text-[#7b8fa1] font-semibold">2026-07-04 · 工单系统</div>
        </div>
      </div>
    </div>
  );

  /* ─── 主渲染 ─── */
  const tabCounts = useMemo(() => ({
    my_reports: myReports.length,
    issues: issues.length,
    my_handle: myHandleIssues.length,
    todo: myHandleIssues.filter(i => i.status === "pending" || i.status === "accepted").length,
    notify: notifications.filter(n => !n.is_read).length,
    stats: 0,
  }), [myReports, issues, myHandleIssues, notifications]);

  return (
    <div className="h-full flex bg-[#f4f7fb] p-6">
      {/* ==================== 左侧：品牌色块面板 ==================== */}
      <div className="w-[240px] shrink-0 flex flex-col bg-transparent">
        {/* Logo + 标题 */}
        <div className="px-4 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 bg-[#2563eb]" />
            <h1 className="text-base font-extrabold text-[#0d2137] tracking-wide">工单系统</h1>
          </div>
          <p className="text-[11px] text-[#3d5468] leading-relaxed">
            高效处理校园各类问题，工单流转全程可追溯，数据可视化实时监控。
          </p>
        </div>

        <div className="mx-4 h-px bg-[#d5dfe8]" />

        {/* 导航菜单 */}
        <div className="flex-1 py-4 space-y-0">
          <p className="text-[9px] font-bold text-[#0d2137] uppercase tracking-[1.5px] px-4 pb-2">工单系统</p>
          {[
            { key: "create_ticket" as const, label: "工单提报", icon: <FileText className="w-3.5 h-3.5" />, count: tabCounts.my_reports },
            { key: "my_handle" as const, label: "需我处理", icon: <Inbox className="w-3.5 h-3.5" />, count: tabCounts.my_handle },
            { key: "stats" as const, label: "数据统计", icon: <BarChart3 className="w-3.5 h-3.5" />, count: 0 },
            { key: "issues" as const, label: "工单查询", icon: <Search className="w-3.5 h-3.5" />, count: tabCounts.issues },
            { key: "my_reports" as const, label: "我的工单", icon: <ClipboardList className="w-3.5 h-3.5" />, count: tabCounts.my_reports },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-150 text-left border-l-2
                ${activeTab === item.key
                  ? "text-[#0d2137] font-semibold border-l-[#2563eb] bg-[#eef4ff]"
                  : "text-[#0d2137] border-l-transparent hover:bg-black/[0.03]"}`}
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.count > 0 && (
                <span className="text-[10px] px-2 py-0.5 font-semibold bg-black/[0.05] text-[#0d2137]">
                  {item.count > 99 ? "99+" : item.count}
                </span>
              )}
            </button>
          ))}

          <div className="mx-4 h-px bg-[#d5dfe8] my-2" />

          <p className="text-[9px] font-bold text-[#0d2137] uppercase tracking-[1.5px] px-4 pb-2">快捷入口</p>
          <button
            onClick={() => { resetForm(); setActiveTab("create_ticket"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-150 text-left border-l-2 border-l-transparent text-[#0d2137] hover:bg-black/[0.03]"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 opacity-70" />
            发起工单
          </button>
          <button
            onClick={() => setShowQrDialog(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-150 text-left border-l-2 border-l-transparent text-[#0d2137] hover:bg-black/[0.03]"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
            扫码提报
          </button>
          <button
            onClick={() => setActiveTab("todo")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-150 text-left border-l-2 border-l-transparent text-[#0d2137] hover:bg-black/[0.03]"
          >
            <CheckCircle className="w-3.5 h-3.5 shrink-0 opacity-70" />
            待办中心
          </button>
          <button
            onClick={() => setActiveTab("notify")}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all duration-150 text-left border-l-2 border-l-transparent text-[#0d2137] hover:bg-black/[0.03]"
          >
            <Bell className="w-3.5 h-3.5 shrink-0 opacity-70" />
            知会抄送
          </button>
        </div>

        {/* 底部联系信息 */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 text-[11px] text-[#3d5468] font-semibold">
            <span>元素科技</span>
            <strong className="text-[#0d2137]">400-xxx-xxxx</strong>
          </div>
          <p className="text-[10px] text-[#7b8fa1] mt-1">2026-07-04 · 工单系统</p>
        </div>
      </div>

      {/* ==================== 右侧：内容区 ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部操作按钮 */}
        <div className="shrink-0 px-6 pt-3 pb-3 flex items-center justify-end gap-2">
          <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] uppercase tracking-[0.5px] hover:bg-[#0d2137] hover:text-white transition-colors">扫码提报</button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-none">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#0d2137]">
                  <QrCode className="w-4 h-4" />
                  扫码提报入口
                </DialogTitle>
                <DialogDescription>
                  将以下链接或二维码分享给外部客户，客户无需登录即可提交工单。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white border-2 border-[#0f2840] rounded-none p-3">
                  <QRCodeSVG value={submissionUrl} size={200} level="M" marginSize={4} />
                </div>
                <div className="flex items-center gap-2 w-full">
                  <Input value={submissionUrl} readOnly className="h-8 text-xs font-mono bg-[#f4f7fb] flex-1 rounded-none border-2 border-[#0f2840]" />
                  <button className="px-3 py-1.5 border-2 border-[#0f2840] bg-white text-xs font-bold text-[#3d5468] hover:bg-[#0d2137] hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(submissionUrl).then(() => {
                        setQrCopied(true); setTimeout(() => setQrCopied(false), 2000);
                      });
                    }}>
                    {qrCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="ml-1 text-xs">{qrCopied ? "已复制" : "复制"}</span>
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <button
            onClick={() => { resetForm(); setActiveTab("create_ticket"); }}
            className="px-4 py-2 border-2 border-[#0d2137] bg-[#0d2137] text-white text-xs font-bold uppercase tracking-[0.5px] hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
          >
            发起工单
          </button>
        </div>


        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-black">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">加载中...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && renderDashboard()}
              {activeTab === "create_ticket" && renderCreateTicket()}
              {activeTab === "view_ticket" && renderViewTicket()}
              {activeTab === "my_reports" && renderMyReports()}
              {activeTab === "issues" && renderIssues()}
              {activeTab === "my_handle" && renderMyHandle()}
              {activeTab === "todo" && renderTodo()}
              {activeTab === "notify" && renderNotify()}
              {activeTab === "stats" && renderStats()}
            </>
          )}
        </div>
      </div>

      {/* 弹窗 */}
      {renderCreateDialog()}
      {renderDetailDialog()}
      {renderActionDialog()}
      {renderPublishDialog()}
    </div>
  );
}
