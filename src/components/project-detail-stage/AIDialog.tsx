"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AIPromptDialog } from "@/components/ai-prompt-dialog";

interface AIDialogProps {
  open: boolean;
  onClose: () => void;
  projectSchema: string;
  projectName: string;
}

export function AIDialog({ open, onClose, projectSchema, projectName }: AIDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: string; tableCount: number; totalRows: number } | null>(null);
  const [error, setError] = useState("");
  const [followUpQ, setFollowUpQ] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setResult(null); setError(""); setConversation([]); }, [open]);

  const runAnalysis = useCallback(async (systemMsg?: string, userPrompt?: string) => {
    setLoading(true); setResult(null); setError(""); setConversation([]);
    try {
      const res = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, projectName, ...(systemMsg ? { systemMessage: systemMsg } : {}), ...(userPrompt ? { userPrompt } : {}) }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.code === "NO_KEY" ? "NO_KEY" : json.error || "分析失败");
        return;
      }
      if (json.data) {
        setResult({ analysis: json.data.analysis || "", tableCount: json.data.tableCount || 0, totalRows: json.data.totalRows || 0 });
        if (json.data.conversationHistory) setConversation(json.data.conversationHistory);
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [projectSchema, projectName]);

  const handleFollowUp = useCallback(async () => {
    if (!followUpQ.trim() || !conversation.length) return;
    setFollowUpLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSchema, projectName, conversationHistory: conversation, userPrompt: followUpQ.trim() }),
      });
      const json = await res.json();
      if (json.data) {
        setResult((prev) => prev ? { ...prev, analysis: prev.analysis + "\n\n---\n\n" + (json.data.analysis || "") } : { analysis: json.data.analysis || "", tableCount: json.data.tableCount || 0, totalRows: json.data.totalRows || 0 });
        if (json.data.conversationHistory) setConversation(json.data.conversationHistory);
      }
      setFollowUpQ("");
    } catch {}
    setFollowUpLoading(false);
  }, [followUpQ, conversation, projectSchema, projectName]);

  return (
    <>
      <AIPromptDialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}
        onSubmit={(r) => { setPromptDialogOpen(false); runAnalysis(r.systemMessage, r.userPrompt); }}
        projectSchema={projectSchema} promptType="global"
      />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" /> AI 数据分析
            </DialogTitle>
          </DialogHeader>
          <div ref={bodyRef} className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {loading && (
              <div className="flex flex-col items-center py-12">
                <Sparkles className="w-12 h-12 text-teal-400 animate-pulse mb-4" />
                <p className="text-sm text-gray-500">AI 正在分析数据...</p>
              </div>
            )}
            {error && !loading && (
              <div className="py-8 text-center">
                {error === "NO_KEY" ? (
                  <div className="space-y-3">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-gray-500 text-sm">AI 功能尚未配置</p>
                    <p className="text-gray-400 text-xs">请联系管理员在 系统设置 → 大模型配置 中设置 DeepSeek API Key</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-red-500 text-sm">分析失败</p>
                    <p className="text-red-400 text-xs">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => runAnalysis()}>重试</Button>
                  </div>
                )}
              </div>
            )}
            {result && !loading && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  已分析 <strong>{result.tableCount}</strong> 张表，共 <strong>{result.totalRows}</strong> 条数据
                </div>
                <div className="prose prose-sm max-w-none text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.analysis.replace(/\n/g, "<br>") }} />
                {conversation.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <input value={followUpQ} onChange={(e) => setFollowUpQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                      placeholder="追问 AI..." className="flex-1 h-9 px-3 text-sm border rounded-lg outline-none focus:border-teal-500"
                      disabled={followUpLoading} />
                    <Button size="sm" onClick={handleFollowUp} disabled={followUpLoading || !followUpQ.trim()}
                      className="h-9 gap-1">
                      {followUpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      发送
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setPromptDialogOpen(true)}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> 自定义提示词
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => runAnalysis()}>重新分析</Button>
              <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
