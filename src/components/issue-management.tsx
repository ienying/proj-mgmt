"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), { ssr: false });
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

// WangEditor Word-style Rich Text Editor
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
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "待受理", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3.5 h-3.5" /> },
  accepted: { label: "已受理", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  processing: { label: "处理中", color: "bg-indigo-100 text-indigo-800", icon: <FileText className="w-3.5 h-3.5" /> },
  completed: { label: "已完结", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-800", icon: <XCircle className="w-3.5 h-3.5" /> },
  closed: { label: "已关闭", color: "bg-gray-100 text-gray-600", icon: <Archive className="w-3.5 h-3.5" /> },
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
  const [activeTab, setActiveTab] = useState("my_reports");

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
  // 当前用户有 pending todo 的外部工单 source_id 集合
  const userExternalIssueIds = new Set(
    userTodos.map((t: Record<string, unknown>) => String(t.source_id))
  );
  const myHandleIssues = issues.filter(i => {
    // 标准内部工单：当前用户是 handler
    if (i.handler_id === currentUser.id && ["pending", "accepted", "processing"].includes(i.status)) return true;
    // 外部工单：source=external 且无 handler 且当前用户是 pending 接收人
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

        // 上传附件
        for (const file of formFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("issue_id", issueId);
          formData.append("file_type", file.type.startsWith("video") ? "video" : "image");
          await fetch("/api/issues/attachments", { method: "POST", body: formData });
        }

        // 创建知会抄送
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
        setShowActionDialog(false);
        setActionComment("");
        setActionToUser("");
        loadIssues();
        loadRecords();
      } else {
        const err = await res.json();
        alert("操作失败: " + (err.error || "未知错误"));
      }
    } catch (e) {
      alert("操作失败: " + String(e));
    }
  };

  // 标记知会已读
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

  /* ─── 渲染：问题卡片 ─── */
  // 状态对应的左边条颜色
  const STATUS_BAR_COLORS: Record<string, string> = {
    pending: "bg-yellow-400",
    accepted: "bg-blue-400",
    processing: "bg-indigo-400",
    completed: "bg-green-400",
    rejected: "bg-red-400",
    closed: "bg-gray-300",
  };

  const renderIssueCard = (issue: Issue, showActions = false) => {
    const statusInfo = STATUS_MAP[issue.status] || STATUS_MAP.pending;
    const urgCode = getUrgencyCode(issue.urgency_id);
    const barColor = STATUS_BAR_COLORS[issue.status] || "bg-gray-300";
    const isOverdue = issue.expected_handle_time && new Date(issue.expected_handle_time) < new Date() && issue.status !== "completed" && issue.status !== "closed";
    return (
      <div key={issue.id}
        className={`bg-white rounded-lg border border-gray-200/80 overflow-hidden hover:shadow-lg hover:border-gray-300/80 transition-all duration-200 group ${
          isOverdue ? "ring-1 ring-red-200" : ""
        }`}>
        {/* 顶部状态色条 */}
        <div className={`h-1 ${barColor}`} />
        <div className="p-4 pt-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {issue.source === "external" && <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white leading-none">外部</span>}
              {issue.is_major && <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white leading-none">重大</span>}
              <h4 className="font-medium text-sm truncate cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => { setSelectedIssue(issue); setShowDetailDialog(true); }}>
                {issue.title}
              </h4>
            </div>
            <Badge className={`${statusInfo.color} text-xs shrink-0 ml-2`}>
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.label}</span>
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" />{issue.reporter_name}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{issue.reporter_phone}</span>
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{issue.department}</span>
            <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-gray-400" />{issue.handler_name || <em className="text-gray-300">未分配</em>}</span>
            <span className="flex items-center gap-1"><FolderTree className="w-3 h-3 text-gray-400" />{getCategoryName(issue.category_id)}</span>
            <span className="flex items-center gap-1">
              紧急: <span className={`w-2 h-2 rounded-full ${URGENCY_COLORS[urgCode] || "bg-gray-400"}`} />
              {getUrgencyName(issue.urgency_id)}
            </span>
            {issue.warranty_status_id && <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-gray-400" />{getWarrantyName(issue.warranty_status_id)}</span>}
            {issue.product_module_names && issue.product_module_names.length > 0 ? (
              <span className="flex items-center gap-1"><Package className="w-3 h-3 text-gray-400" />{issue.product_module_names.join('、')}</span>
            ) : issue.product_module_id ? (
              <span className="flex items-center gap-1"><Package className="w-3 h-3 text-gray-400" />产品模块</span>
            ) : null}
          </div>
          {issue.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2 pl-0.5">{issue.description.replace(/<[^>]*>/g, "")}</p>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(issue.created_at).toLocaleString("zh-CN")}
              {isOverdue && <span className="text-red-500 font-medium ml-1">已逾期</span>}
            </span>
            {showActions && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {issue.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs"
                    onClick={() => { setSelectedIssue(issue); setActionType("accept"); setShowActionDialog(true); }}>
                    受理
                  </Button>
                )}
                {issue.status === "accepted" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs"
                    onClick={() => { setSelectedIssue(issue); setActionType("process"); setShowActionDialog(true); }}>
                    处理
                  </Button>
                )}
                {issue.status === "processing" && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-green-600"
                      onClick={() => { setSelectedIssue(issue); setActionType("complete"); setShowActionDialog(true); }}>
                      完结
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-orange-600"
                      onClick={() => { setSelectedIssue(issue); setActionType("transfer"); setShowActionDialog(true); }}>
                      转交
                    </Button>
                  </>
                )}
                {issue.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-6 text-xs"
                    onClick={() => { setSelectedIssue(issue); setActionType("transfer"); setShowActionDialog(true); }}>
                    转交
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => { setSelectedIssue(issue); setShowDetailDialog(true); }}>
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
          {/* Gradient Header */}
          <div className="px-6 pb-4 pt-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-t-lg shrink-0 relative">
            <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" /> 发起问题
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1">
              {createStep === 1 ? "填写问题基本信息" : "填写问题详细描述和辅助举证"}
            </DialogDescription>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Step indicator - pill style */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${createStep === 1 ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" : "bg-green-50 text-green-700"}`}
              onClick={() => setCreateStep(1)}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${createStep > 1 ? "bg-green-500 text-white" : "bg-blue-500 text-white"}`}>
                {createStep > 1 ? "✓" : "1"}
              </span>
              基本信息
            </button>
            <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-blue-100" />
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${createStep === 2 ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" : "bg-gray-50 text-gray-400"}`}
              onClick={() => createStep > 1 && setCreateStep(2)}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${createStep === 2 ? "bg-blue-500 text-white" : "bg-gray-300 text-white"}`}>2</span>
              详细描述
            </button>
          </div>

          {createStep === 1 ? (
            /* ===== 第一步：基本信息（卡片分组） ===== */
            <div className="space-y-4 mt-2">
              {/* 基本信息 Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-blue-500" /></span>
                  基本信息
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">问题标题 <span className="text-red-400">*</span></label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="请输入问题标题" className="bg-gray-50/80" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">所属项目 <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value, project_id: undefined }))}
                        placeholder="输入或选择项目" className="flex-1 bg-gray-50/80" />
                      <Select value={form.project_id} onValueChange={v => {
                        const proj = projects.find(p => p.id === v);
                        setForm(f => ({ ...f, project_id: v, project_name: proj?.project_name || "" }));
                      }}>
                        <SelectTrigger className="w-48 bg-gray-50/80"><SelectValue placeholder="选择已有项目" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">报修部门</label>
                    <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择部门" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 人员与时间 Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-purple-500" /></span>
                  人员与时间
                </h3>

                {/* 报修人信息行 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">报修</span>
                  <div className="flex-1 h-px bg-purple-100" />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">报修人 <span className="text-red-400">*</span></label>
                    <Select value={form.reporter_id} onValueChange={v => {
                      const u = users.find(u => u.id === v);
                      setForm(f => ({ ...f, reporter_id: v, reporter_name: u?.name || "", reporter_phone: u?.phone || "", department: u?.department || f.department }));
                    }}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="搜索选择" /></SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.name).map(u => <SelectItem key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">报修人电话 <span className="text-gray-400 font-normal">自动带出</span></label>
                    <Input value={form.reporter_phone} readOnly className="bg-gray-100/80 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">问题上报时间 <span className="text-gray-400 font-normal">系统自动</span></label>
                    <Input type="datetime-local" value={new Date().toISOString().slice(0, 16)} disabled className="bg-gray-100/80 text-gray-500" />
                  </div>
                </div>

                {/* 处理人信息行 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">处理</span>
                  <div className="flex-1 h-px bg-blue-100" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">指定处理人 <span className="text-red-400">*</span></label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-gray-50/80 px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] data-[state=open]:border-ring">
                          <span className={form.handler_name ? "text-foreground" : "text-muted-foreground"}>
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
                                  {u.department && <span className="ml-2 text-xs text-muted-foreground">{u.department}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">处理人电话 <span className="text-gray-400 font-normal">自动带出</span></label>
                    <Input value={form.handler_phone} readOnly className="bg-gray-100/80 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">期望处理时间</label>
                    <Input type="datetime-local" value={form.expected_handle_time} onChange={e => setForm(f => ({ ...f, expected_handle_time: e.target.value }))} className="bg-gray-50/80" />
                  </div>
                </div>

                {/* 告知对象 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">告知对象 <span className="text-gray-400 font-normal">可多选，对应人待办事项中可查看</span></label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {form.notify_users.map(nu => (
                      <span key={nu.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100">
                        {nu.name}
                        <button type="button" className="text-blue-400 hover:text-red-500 ml-0.5" onClick={() => setForm(f => ({ ...f, notify_users: f.notify_users.filter(n => n.id !== nu.id) }))}>×</button>
                      </span>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-input bg-gray-50/80 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground">
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
                                  {u.department && <span className="ml-2 text-xs text-muted-foreground">{u.department}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* 分类信息 Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center"><FolderTree className="w-3.5 h-3.5 text-amber-500" /></span>
                  分类信息
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">问题类别（大类）<span className="text-red-400">*</span></label>
                    <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v, sub_category_id: undefined }))}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择大类" /></SelectTrigger>
                      <SelectContent>
                        {topCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">问题子类</label>
                    {subCategories.length > 0 ? (
                      <Select value={form.sub_category_id} onValueChange={v => setForm(f => ({ ...f, sub_category_id: v }))}>
                        <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择子类" /></SelectTrigger>
                        <SelectContent>
                          {subCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="请先选择大类" className="bg-gray-100/80" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">对应产品模块 <span className="text-red-400">*</span></label>
                    <Select value={form.product_module_id} onValueChange={v => setForm(f => ({ ...f, product_module_id: v }))}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择产品模块" /></SelectTrigger>
                      <SelectContent>
                        {productModules.map(m => <SelectItem key={m.id} value={m.id}>{m.module_name}{m.product_name ? ` (${m.product_name})` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">是否重大问题</label>
                    <div className="flex gap-6 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={form.is_major} onChange={() => setForm(f => ({ ...f, is_major: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={!form.is_major} onChange={() => setForm(f => ({ ...f, is_major: false }))} /> 否
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">紧急程度 <span className="text-red-400">*</span></label>
                    <Select value={form.urgency_id} onValueChange={v => setForm(f => ({ ...f, urgency_id: v }))}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择" /></SelectTrigger>
                      <SelectContent>
                        {urgencyList.filter(u => u.is_enabled).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">保修情况</label>
                    <Select value={form.warranty_status_id} onValueChange={v => setForm(f => ({ ...f, warranty_status_id: v }))}>
                      <SelectTrigger className="w-full bg-gray-50/80"><SelectValue placeholder="选择" /></SelectTrigger>
                      <SelectContent>
                        {warrantyList.filter(w => w.is_enabled).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* ===== 第二步：问题详情（卡片分组） ===== */
            <div className="space-y-4 mt-2">
              {/* 详细描述 Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-blue-500" /></span>
                  问题现象详细描述 <span className="text-red-400 text-xs">*</span>
                </h3>
                <div className="min-h-[350px]">
                  <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))}
                    placeholder="什么时候开始、做了什么操作、出现什么报错、是否多人受影响" />
                </div>
              </div>

              {/* 辅助举证 Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center"><Upload className="w-3.5 h-3.5 text-orange-500" /></span>
                  辅助举证
                </h3>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">问题截图/照片/视频上传 <span className="text-gray-400 font-normal">提升处理效率</span></label>
                  <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-500">点击上传文件</p>
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
                        <div key={idx} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs border border-gray-100">
                          {f.type.startsWith("image") ? <ImageIcon className="w-3 h-3 text-blue-400" /> : <Video className="w-3 h-3 text-purple-400" />}
                          <span className="max-w-[120px] truncate">{f.name}</span>
                          <X className="w-3 h-3 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setFormFiles(prev => prev.filter((_, i) => i !== idx))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">是否初次报修</label>
                    <div className="flex gap-4 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={form.is_first_report} onChange={() => setForm(f => ({ ...f, is_first_report: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={!form.is_first_report} onChange={() => setForm(f => ({ ...f, is_first_report: false }))} /> 否
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">历史是否同类问题</label>
                    <div className="flex gap-4 items-center h-9">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={form.has_similar_history} onChange={() => setForm(f => ({ ...f, has_similar_history: true }))} /> 是
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" checked={!form.has_similar_history} onChange={() => setForm(f => ({ ...f, has_similar_history: false }))} /> 否
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">备注补充说明</label>
                  <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="其他需要补充的信息" rows={2} className="bg-gray-50/80" />
                </div>
              </div>
            </div>
          )}

          </div>{/* end scroll area */}

          <DialogFooter className="shrink-0 px-6 py-3 border-t bg-gray-50/50">
            {createStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>取消</Button>
                <Button onClick={() => setCreateStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white px-6">下一步</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateStep(1)}>上一步</Button>
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); setCreateStep(1); }}>取消</Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-6">提交</Button>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {si.is_major && <AlertTriangle className="w-4 h-4 text-red-500" />}
              {si.title}
              <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>
            </DialogTitle>
            <DialogDescription>问题详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">上报时间:</span> {si.created_at ? new Date(si.created_at).toLocaleString("zh-CN") : "-"}</div>
              <div><span className="text-gray-500">所属项目:</span> {si.project_name || "-"}</div>
              <div><span className="text-gray-500">部门:</span> {si.department}</div>
              <div><span className="text-gray-500">报修人:</span> {si.reporter_name} {si.reporter_phone}</div>
              <div><span className="text-gray-500">处理人:</span> {si.handler_name || "未分配"} {si.handler_phone || ""}</div>
              <div><span className="text-gray-500">类别:</span> {getCategoryName(si.category_id)}</div>
              <div><span className="text-gray-500">紧急程度:</span> {getUrgencyName(si.urgency_id)}</div>
              {si.warranty_status_id && <div><span className="text-gray-500">保修情况:</span> {getWarrantyName(si.warranty_status_id)}</div>}
              {si.expected_handle_time && <div><span className="text-gray-500">期望处理时间:</span> {new Date(si.expected_handle_time).toLocaleString("zh-CN")}</div>}
            </div>
            {si.description && (
              <div>
                <span className="text-gray-500 block mb-1">问题描述:</span>
                <div className="bg-gray-50 rounded p-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: si.description }} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-gray-500">
              <div>初次报修: {si.is_first_report ? "是" : "否"}</div>
              <div>同类问题: {si.has_similar_history ? "是" : "否"}</div>
              {si.remarks && <div className="col-span-2">备注: {si.remarks}</div>}
            </div>
            {/* 处理流水 */}
            {issueRecords.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-2">处理流水:</span>
                <div className="space-y-2">
                  {issueRecords.map(r => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium">{r.operator_name}</span>
                        <span className="text-gray-400 ml-1">
                          {r.action_type === "submit" ? "提交" : r.action_type === "accept" ? "受理" : r.action_type === "transfer" ? `转交给 ${r.to_user_name || ""}` : r.action_type === "process" ? "处理中" : r.action_type === "complete" ? "完结" : r.action_type === "reject" ? "驳回" : r.action_type === "close" ? "关闭" : r.action_type === "reopen" ? "重新打开" : r.action_type === "withdraw" ? "撤回" : r.action_type}
                        </span>
                        {r.comment && <span className="text-gray-500 ml-1">- {r.comment}</span>}
                        <span className="text-gray-300 ml-2">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 操作按钮 */}
            {si.status !== "completed" && si.status !== "closed" && (
              <div className="flex gap-2 pt-2 border-t">
                {si.status === "pending" && (
                  <Button size="sm" onClick={() => { setSelectedIssue(si); setActionType("accept"); setShowActionDialog(true); setShowDetailDialog(false); }}>受理</Button>
                )}
                {si.status === "accepted" && (
                  <Button size="sm" onClick={() => { setSelectedIssue(si); setActionType("process"); setShowActionDialog(true); setShowDetailDialog(false); }}>开始处理</Button>
                )}
                {si.status === "processing" && (
                  <>
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => { setSelectedIssue(si); setActionType("complete"); setShowActionDialog(true); setShowDetailDialog(false); }}>完结</Button>
                    <Button size="sm" variant="outline" className="text-orange-600" onClick={() => { setSelectedIssue(si); setActionType("transfer"); setShowActionDialog(true); setShowDetailDialog(false); }}>转交</Button>
                  </>
                )}
                {(si.status === "pending" || si.status === "accepted") && (
                  <Button size="sm" variant="outline" className="text-orange-600" onClick={() => { setSelectedIssue(si); setActionType("transfer"); setShowActionDialog(true); setShowDetailDialog(false); }}>转交</Button>
                )}
                {si.status === "processing" && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setSelectedIssue(si); setActionType("reject"); setShowActionDialog(true); setShowDetailDialog(false); }}>驳回</Button>
                )}
                {si.status === "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => { setSelectedIssue(si); setActionType("reopen"); setShowActionDialog(true); setShowDetailDialog(false); }}>重新打开</Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  /* ─── 渲染：操作弹窗 ─── */
  const renderActionDialog = () => (
    <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actionType === "accept" ? "受理" : actionType === "process" ? "开始处理" : actionType === "complete" ? "完结" : actionType === "reject" ? "驳回" : actionType === "close" ? "关闭" : actionType === "transfer" ? "转交" : actionType === "reopen" ? "重新打开" : "操作"}
          </DialogTitle>
          <DialogDescription>{selectedIssue?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {(actionType === "transfer" || actionType === "assign") && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">转交给 <span className="text-red-500">*</span></label>
              <Select value={actionToUser} onValueChange={setActionToUser}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择处理人" /></SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.name && u.id !== currentUser.id).map(u => <SelectItem key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">处理意见</label>
            <Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} placeholder="请输入处理意见" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowActionDialog(false)}>取消</Button>
          <Button onClick={handleAction}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /* ─── 渲染：各 Tab 内容 ─── */

  // 我的上报
  const renderMyReports = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-400" />
          共 <span className="font-medium text-gray-700">{myReports.length}</span> 条上报
        </span>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" />发起问题
        </Button>
      </div>
      {myReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
            <FileText className="w-8 h-8 text-blue-300" />
          </div>
          <p className="text-sm mb-1">暂无上报记录</p>
          <p className="text-xs text-gray-300 mb-4">点击下方按钮发起第一个问题</p>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { resetForm(); setShowCreateDialog(true); }}>发起问题</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myReports.map(i => renderIssueCard(i))}
        </div>
      )}
    </div>
  );

  // 问题管理
  const renderIssues = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-lg border border-gray-200/80 p-2.5 shadow-sm">
        <div className="flex items-center gap-0.5 bg-gray-100/80 rounded-lg p-0.5">
          {[
            { key: "all", label: "全部" },
            { key: "pending", label: "待受理" },
            { key: "accepted", label: "已受理" },
            { key: "processing", label: "处理中" },
            { key: "completed", label: "已完结" },
            { key: "rejected", label: "已驳回" },
            { key: "closed", label: "已关闭" },
          ].map(s => (
            <Button key={s.key} size="sm" variant={issueStatusFilter === s.key ? "default" : "ghost"}
              className={`h-7 text-xs rounded-md ${issueStatusFilter === s.key ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              onClick={() => setIssueStatusFilter(s.key)}>
              {s.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-8 text-sm bg-gray-50/80 border-gray-200 focus:bg-white" placeholder="搜索标题/报修人/部门" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} />
        </div>
        <Button size="sm" className="ml-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" />发起问题
        </Button>
      </div>
      {filteredIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm">暂无匹配的问题</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredIssues.map(i => renderIssueCard(i, true))}
        </div>
      )}
    </div>
  );

  // 需我处理
  const renderMyHandle = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 flex items-center gap-1.5">
          <Inbox className="w-4 h-4 text-indigo-400" />
          待我处理 <span className="font-medium text-gray-700">{myHandleIssues.length}</span> 条
        </span>
      </div>
      {myHandleIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-8 h-8 text-green-300" />
          </div>
          <p className="text-sm mb-1">暂无需要处理的问题</p>
          <p className="text-xs text-gray-300">所有问题已处理完毕</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myHandleIssues.map(i => renderIssueCard(i, true))}
        </div>
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
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
          {subTabs.map(st => (
            <Button key={st.key} size="sm" variant={todoSubTab === st.key ? "default" : "ghost"}
              className="h-7 text-xs" onClick={() => setTodoSubTab(st.key)}>
              {st.label} ({st.count})
            </Button>
          ))}
        </div>
        {todoSubTab === "pending" && (
          myHandleIssues.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
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
            <div className="text-center py-12 text-gray-400"><p>暂无已办记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoDone.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-lg border p-3 flex items-center gap-3"
                  onClick={() => { setSelectedIssue(r.issue as Issue); setShowDetailDialog(true); }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(r.issue as Issue).title}</p>
                    <p className="text-xs text-gray-400">{r.operator_name} - {r.action_type} - {new Date(r.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>
          )
        )}
        {todoSubTab === "transfer" && (
          todoTransfer.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>暂无转交记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoTransfer.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-lg border p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(r.issue as Issue).title}</p>
                    <p className="text-xs text-gray-400">转交给 {r.to_user_name} - {new Date(r.created_at).toLocaleString("zh-CN")}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {todoSubTab === "withdraw" && (
          todoWithdraw.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p>暂无撤回记录</p></div>
          ) : (
            <div className="space-y-2">
              {todoWithdraw.map(r => r.issue && (
                <div key={r.id} className="bg-white rounded-lg border p-3">
                  <p className="text-sm font-medium">{(r.issue as Issue).title}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString("zh-CN")}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  };

  // 知会抄送
  const renderNotify = () => (
    <div className="space-y-3">
      <span className="text-sm text-gray-500 flex items-center gap-1.5">
        <Bell className="w-4 h-4 text-amber-400" />
        共 <span className="font-medium text-gray-700">{notifications.length}</span> 条知会
        {notifications.filter(n => !n.is_read).length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500 text-white">
            {notifications.filter(n => !n.is_read).length} 条未读
          </span>
        )}
      </span>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
            <Bell className="w-8 h-8 text-amber-300" />
          </div>
          <p className="text-sm mb-1">暂无知会抄送</p>
          <p className="text-xs text-gray-300">有人抄送你时会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const issue = issues.find(i => i.id === n.issue_id);
            if (!issue) return null;
            return (
              <div key={n.id} className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-all duration-200 ${
                !n.is_read ? "border-blue-200 bg-blue-50/20" : "border-gray-200/80"
              }`}>
                <div className={`h-0.5 ${!n.is_read ? "bg-blue-400" : "bg-gray-200"}`} />
                <div className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    !n.is_read ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-400"
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => { setSelectedIssue(issue); setShowDetailDialog(true); }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      <p className="text-sm font-medium truncate cursor-pointer hover:text-blue-600 transition-colors">{issue.title}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {issue.reporter_name} 上报于 {new Date(n.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
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

  // 数据统计
  const renderStats = () => (
    <div className="space-y-4">
      {/* 概览卡片 */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "总工单", value: statsData.total, gradient: "from-blue-500 to-blue-600", icon: <BarChart2 className="w-5 h-5" /> },
          { label: "待受理", value: statsData.pending, gradient: "from-amber-400 to-amber-500", icon: <Clock className="w-5 h-5" /> },
          { label: "处理中", value: statsData.processing, gradient: "from-indigo-500 to-indigo-600", icon: <FileText className="w-5 h-5" /> },
          { label: "已完结", value: statsData.completed, gradient: "from-emerald-500 to-emerald-600", icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: "重大问题", value: statsData.major, gradient: "from-red-500 to-red-600", icon: <AlertTriangle className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-xl p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/80">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">{s.icon}</div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      {/* 状态分布 */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
        <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />状态分布
        </h4>
        <div className="space-y-3">
          {Object.entries(STATUS_MAP).map(([key, info]) => {
            const count = issues.filter(i => i.status === key).length;
            const pct = statsData.total > 0 ? (count / statsData.total * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-gray-500 text-xs">{info.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className={`${info.color} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <span className="w-8 text-right text-gray-600 text-xs font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* 类别统计 */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-sm">
        <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-amber-400" />类别统计</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {categories.filter(c => !c.parent_id).map(cat => {
            const count = issues.filter(i => {
              const catIds = categories.filter(cc => cc.parent_id === cat.id).map(cc => cc.id);
              return i.category_id === cat.id || catIds.includes(i.category_id);
            }).length;
            return (
              <div key={cat.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <span>{cat.name}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            );
          })}
        </div>
      </div>
      {/* 重大问题列表 */}
      {issues.filter(i => i.is_major).length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-sm mb-3 text-red-600">重大问题</h4>
          <div className="space-y-2">
            {issues.filter(i => i.is_major).map(i => (
              <div key={i.id} className="flex items-center gap-2 text-sm border-l-2 border-red-400 pl-3 py-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="flex-1 truncate">{i.title}</span>
                <Badge className={`${(STATUS_MAP[i.status] || STATUS_MAP.pending).color} text-xs`}>
                  {(STATUS_MAP[i.status] || STATUS_MAP.pending).label}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── 主渲染 ─── */
  // 各Tab的未读/待办计数
  const tabCounts = useMemo(() => ({
    my_reports: myReports.length,
    issues: issues.length,
    my_handle: myHandleIssues.length,
    todo: myHandleIssues.filter(i => i.status === "pending" || i.status === "accepted").length,
    notify: notifications.filter(n => !n.is_read).length,
    stats: 0,
  }), [myReports, issues, myHandleIssues, notifications]);

  // Metro tile defs — 单行 6 列
  const metroTiles = useMemo(() => {
    const items = [
      { key: "my_handle", label: "需我处理", icon: <Inbox className="w-4 h-4" />, color: "#f09609" },
      { key: "my_reports", label: "我的上报", icon: <FileText className="w-4 h-4" />, color: "#2672ec" },
      { key: "issues", label: "问题管理", icon: <ClipboardList className="w-4 h-4" />, color: "#60a917" },
      { key: "todo", label: "待办中心", icon: <CheckCircle className="w-4 h-4" />, color: "#7c3aed" },
      { key: "notify", label: "知会抄送", icon: <Bell className="w-4 h-4" />, color: "#00aba9" },
      { key: "stats", label: "数据统计", icon: <BarChart3 className="w-4 h-4" />, color: "#e51400" },
    ];
    return items.map(t => {
      const count = tabCounts[t.key as keyof typeof tabCounts] || 0;
      const isActive = activeTab === t.key;
      return { ...t, count, isActive };
    });
  }, [tabCounts, activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 页面标题 + Metro 磁贴 */}
      <div className="shrink-0 bg-gray-50">
        <div className="px-6 pt-4 pb-1 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              问题上报
            </h2>
            <p className="text-sm text-muted-foreground mt-1">上报问题、跟踪处理、统计分析</p>
          </div>
          <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                <QrCode className="w-4 h-4" />
                扫码提报
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-500" />
                  扫码提报入口
                </DialogTitle>
                <DialogDescription>
                  将以下链接或二维码分享给外部客户，客户无需登录即可提交工单。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white border rounded-lg p-3">
                  <QRCodeSVG value={submissionUrl} size={200} level="M" marginSize={4} />
                </div>
                <div className="flex items-center gap-2 w-full">
                  <Input value={submissionUrl} readOnly className="h-8 text-xs font-mono bg-gray-50 flex-1" />
                  <Button size="sm" variant="outline" className="h-8 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(submissionUrl).then(() => {
                        setQrCopied(true); setTimeout(() => setQrCopied(false), 2000);
                      });
                    }}>
                    {qrCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="ml-1 text-xs">{qrCopied ? "已复制" : "复制"}</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Metro 磁贴导航 — 单行紧凑 */}
        <div className="px-3 pb-2 grid grid-cols-6 gap-1.5">
          {metroTiles.map(tile => (
            <button
              key={tile.key}
              onClick={() => setActiveTab(tile.key)}
              className={`
                relative flex items-center justify-center gap-1.5 rounded-lg text-white text-center py-1.5
                transition-all duration-150 select-none cursor-pointer overflow-hidden
                ${tile.isActive ? "ring-2 ring-white/60 ring-offset-1 ring-offset-gray-200 scale-[0.95]" : "hover:scale-[1.03]"}
              `}
              style={{ backgroundColor: tile.color }}
            >
              {/* icon */}
              <span className="opacity-90 shrink-0">{tile.icon}</span>
              {/* label + count */}
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="font-medium text-[10px] truncate">{tile.label}</span>
                <span className="font-bold text-sm leading-none">
                  {tile.count > 0 ? (tile.count > 99 ? "99+" : tile.count) : tile.key === "stats" ? "" : "—"}
                </span>
              </div>
              {/* unread dot */}
              {tile.key === "notify" && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === "my_reports" && renderMyReports()}
            {activeTab === "issues" && renderIssues()}
            {activeTab === "my_handle" && renderMyHandle()}
            {activeTab === "todo" && renderTodo()}
            {activeTab === "notify" && renderNotify()}
            {activeTab === "stats" && renderStats()}
          </>
        )}
      </div>

      {/* 弹窗 */}
      {renderCreateDialog()}
      {renderDetailDialog()}
      {renderActionDialog()}
    </div>
  );
}
