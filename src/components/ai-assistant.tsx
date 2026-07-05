"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Send, Trash2, Plus, Loader2, Check, X, Edit3, ChevronLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface CurrentUser {
  id: string; name: string; department: string; phone: string; role: string;
}

interface Conversation {
  id: string; title: string; created_at: string; updated_at: string;
}

interface AIMessage {
  id: string; role: "user" | "assistant"; content: string; intent?: string;
  structured_data?: any; action_type?: string; action_status?: string;
  execution_result?: any; created_at?: string;
}

interface AIAction {
  type: string; confidence: number; data: any;
  missing_fields?: string[]; clarify_question?: string;
}

interface AIResponse {
  success: boolean; conversation_id: string; message_id?: string; reply: string;
  actions: AIAction[]; warnings: string[]; intent: string;
}

interface AiAssistantProps {
  currentUser: CurrentUser;
}

const QUICK_ACTIONS = [
  { label: "查待办", text: "帮我查一下我的待办任务" },
  { label: "查项目", text: "帮我看看有哪些项目" },
  { label: "提工单", text: "帮我提一个工单：" },
  { label: "建任务", text: "帮我创建一个任务：" },
  { label: "改资料", text: "帮我把手机号改成" },
];

// 判断是否为只读查询操作（不需要确认）
const QUERY_ACTION_PREFIXES = ["query_", "chat"];
const QUERY_INTENTS = ["chat", "query"];
function isReadOnlyAction(type: string | undefined, intent: string | undefined): boolean {
  if (!type && !intent) return true; // 纯聊天
  if (type && QUERY_ACTION_PREFIXES.some((p) => type.startsWith(p))) return true;
  if (intent && QUERY_INTENTS.some((p) => intent.startsWith(p))) return true;
  return false;
}

// 清理 AI 回复中的 JSON 代码块和 markdown 标记，保留可读文本
function cleanAiContent(raw: string): string {
  if (!raw) return "";
  // 去掉 markdown JSON 代码块
  let cleaned = raw.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "");
  // 尝试检测是否是纯 JSON
  const trimmed = cleaned.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.reply) return cleanMarkdown(parsed.reply);
      return "收到，我已理解您的需求。";
    } catch { /* 非JSON，继续处理 */ }
  }
  return cleanMarkdown(cleaned.trim() || raw);
}

// 去掉 markdown 标题符号（# ## ###），替换为【】
function cleanMarkdown(text: string): string {
  return text
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^####\s+/gm, "")
    .trim();
}

function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem("auth_token") || "";
  return "";
}

export default function AiAssistant({ currentUser }: AiAssistantProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 确认面板状态
  const [confirmTarget, setConfirmTarget] = useState<{
    messageId: string; actionIndex: number; action: AIAction;
  } | null>(null);
  const [editedData, setEditedData] = useState<any>(null);

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/ai/conversations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // 加载会话消息
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data?.messages || []);
      }
    } catch { setMessages([]); }
  }, []);

  useEffect(() => {
    if (activeConvId) { loadMessages(activeConvId); }
    else { setMessages([]); }
  }, [activeConvId, loadMessages]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, confirmTarget]);

  // 发送消息
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    // 如果当前有等待确认的面板，自动取消（用户选择追问）
    if (confirmTarget) {
      setMessages((prev) => prev.map((m) =>
        m.id === confirmTarget.messageId ? { ...m, action_status: "cancelled" } : m
      ));
      setConfirmTarget(null);
      setEditedData(null);
    }

    const token = getToken();
    // 乐观更新用户消息
    const userMsg: AIMessage = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversation_id: activeConvId,
          message: text,
          context: {},
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "请求失败");
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: `❌ ${json.error || "请求失败，请稍后重试"}` },
        ]);
        setLoading(false);
        return;
      }

      const resp = json as AIResponse;

      // 更新 conversation_id（新会话）
      if (!activeConvId && resp.conversation_id) {
        setActiveConvId(resp.conversation_id);
        loadConversations(); // 刷新列表
      }

      // 构造 AI 消息（使用数据库返回的真实 ID）
      const displayContent = cleanAiContent(resp.reply || "");
      const hasWriteAction = resp.actions?.some((a) => !isReadOnlyAction(a.type, resp.intent));

      const realMsgId = resp.message_id || Date.now().toString();
      const aiMsg: AIMessage = {
        id: realMsgId,
        role: "assistant",
        content: displayContent,
        intent: resp.intent,
        structured_data: resp.actions?.[0]?.data || undefined,
        action_type: resp.actions?.[0]?.type || undefined,
        action_status: hasWriteAction ? "pending_confirm" : "none",
      };
      setMessages((prev) => [...prev, aiMsg]);

      // 如果有等待确认的写入操作，显示确认面板
      const pendingAction = resp.actions?.find((a) => !isReadOnlyAction(a.type, resp.intent));
      if (pendingAction) {
        setConfirmTarget({
          messageId: aiMsg.id,
          actionIndex: resp.actions.indexOf(pendingAction),
          action: pendingAction,
        });
        setEditedData(JSON.parse(JSON.stringify(pendingAction.data || {})));
      }

      if (resp.warnings?.length > 0) {
        resp.warnings.forEach((w) => toast.warning(w));
      }
    } catch (err) {
      toast.error("网络错误，请重试");
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "❌ 网络错误，请检查网络后重试" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 确认执行
  const handleConfirm = async () => {
    if (!confirmTarget || !activeConvId) return;
    const token = getToken();
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant/execute", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversation_id: activeConvId,
          message_id: confirmTarget.messageId,
          action_index: confirmTarget.actionIndex,
          confirmed_data: editedData || confirmTarget.action.data,
        }),
      });
      const json = await res.json();

      // 更新消息状态
      setMessages((prev) => prev.map((m) =>
        m.id === confirmTarget.messageId
          ? { ...m, action_status: json.success ? "executed" : "execution_failed", execution_result: json }
          : m
      ));

      if (json.success) {
        toast.success("操作执行成功！");
        // 添加成功消息
        setMessages((prev) => [...prev, {
          id: Date.now().toString(), role: "assistant",
          content: `✅ 操作已成功执行。${json.data?.id ? `ID: ${json.data.id}` : ""}`,
        }]);
      } else {
        toast.error(json.error || "执行失败");
      }
    } catch {
      toast.error("执行失败，请重试");
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  };

  // 取消确认
  const handleCancel = () => {
    if (!confirmTarget) return;
    setMessages((prev) => prev.map((m) =>
      m.id === confirmTarget.messageId ? { ...m, action_status: "cancelled" } : m
    ));
    setMessages((prev) => [...prev, {
      id: Date.now().toString(), role: "assistant", content: "已取消该操作。",
    }]);
    setConfirmTarget(null);
    setEditedData(null);
  };

  // 新建会话
  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setConfirmTarget(null);
    setEditedData(null);
  };

  // 删除会话
  const handleDeleteConv = async (convId: string) => {
    if (!confirm("确定删除这个对话吗？")) return;
    const token = getToken();
    try {
      await fetch(`/api/ai/conversations/${convId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
        setConfirmTarget(null);
      }
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  // 快捷键发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 点击快捷操作
  const handleQuickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // 渲染确认面板（嵌入对话流，像一条特殊消息）
  const renderConfirmPanel = () => {
    if (!confirmTarget || !editedData) return null;
    const isEditAction = confirmTarget.action.type.startsWith("edit_");
    const entries = Object.entries(editedData).filter(([, v]) => v !== undefined && v !== null && v !== "");

    return (
      <div className="flex gap-3 px-4 justify-start">
        <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0 mt-1">
          <Edit3 className="w-4 h-4 text-white" />
        </div>
        <div className="max-w-[80%] bg-white border border-violet-200 rounded-2xl rounded-bl-md shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/50">
            <span className="text-sm font-semibold text-violet-700">
              {isEditAction ? "请确认修改内容" : "请确认以下信息，确认后我将帮您执行"}
            </span>
          </div>

          {entries.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              {entries.map(([key, value]: [string, any]) => {
                const displayValue = typeof value === "object" ? JSON.stringify(value, null, 1) : String(value ?? "");
                const labelMap: Record<string, string> = {
                  task_name: "任务名称", title: "标题", project_name: "项目名称",
                  description: "描述", handler_name: "处理人", urgency_id: "紧急程度",
                  due_date: "截止日期", assignee_name: "执行人", task_mode: "任务模式",
                  time_type: "时间类型", department: "部门", phone: "手机号",
                  position: "职位", email: "邮箱", name: "姓名", role: "角色",
                };
                const label = labelMap[key] || key;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 w-20 pt-1 shrink-0 text-right">{label}</span>
                    <input
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-gray-50"
                      value={displayValue}
                      onChange={(e) => setEditedData({ ...editedData, [key]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {confirmTarget.action.missing_fields && confirmTarget.action.missing_fields.length > 0 && (
            <div className="mx-4 mb-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
              ⚠️ 还需补充：{confirmTarget.action.missing_fields.join("、")}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-gray-100 flex gap-2 justify-end bg-gray-50/50">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              确认执行
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染消息
  const renderMessage = (msg: AIMessage) => {
    const isUser = msg.role === "user";
    const displayText = isUser ? msg.content : cleanAiContent(msg.content);
    return (
      <div key={msg.id} className={`flex gap-3 px-4 ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0 mt-1">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-violet-500 text-white rounded-br-md"
                : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
            }`}
          >
            {displayText?.length > 800 && !isUser
              ? displayText.slice(0, 800) + "\n\n...(内容较长已截断，可以继续追问详情)"
              : displayText}
          </div>
          {msg.action_status === "executed" && (
            <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />已执行
            </div>
          )}
          {msg.action_status === "execution_failed" && (
            <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" />{(msg.execution_result as any)?.error || "执行失败"}
            </div>
          )}
          {msg.action_status === "cancelled" && (
            <div className="mt-1 text-xs text-gray-400">已取消</div>
          )}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-gray-600">
            {currentUser.name?.charAt(0) || "我"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* 左侧历史会话列表 */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-200 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden`}>
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-3 rounded-lg border border-violet-200 text-violet-600 text-sm font-medium hover:bg-violet-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />新对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">
              暂无对话历史
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                  activeConvId === conv.id
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <span className="flex-1 truncate">{conv.title || "新对话"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧主区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
          </button>
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-sm text-gray-800">AI 助手</span>
          {activeConvId && (
            <span className="text-xs text-gray-400 ml-2">
              {conversations.find((c) => c.id === activeConvId)?.title || "对话中"}
            </span>
          )}
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Sparkles className="w-12 h-12 text-violet-200 mb-4" />
              <h2 className="text-lg font-semibold text-gray-700 mb-2">你好，我是 AI 助手</h2>
              <p className="text-sm text-gray-400 mb-6 max-w-md">
                你可以用大白话告诉我你想做什么：查项目、建任务、提工单、改资料…我都会帮你处理。
                {currentUser.role === "user" && " 需要创建/编辑时我会先请你确认。"}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {renderMessage(msg)}
              {/* 确认面板紧跟在触发它的 AI 消息后面 */}
              {confirmTarget && msg.id === confirmTarget.messageId && renderConfirmPanel()}
            </div>
          ))}

          {/* 加载中 */}
          {loading && (
            <div className="flex items-center gap-2 px-4">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-2 bg-white border rounded-2xl shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 快捷操作 + 输入区 */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          {/* 快捷操作标签 */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleQuickAction(qa.text)}
                className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* 输入框 */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              placeholder="输入你想做的事情，例如：帮我查一下XX中学项目的进度..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
