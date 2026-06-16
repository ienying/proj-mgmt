"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Eye, EyeOff, CheckCircle, XCircle, Loader2, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AIConfigPanel() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("deepseek-chat");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [maskedKey, setMaskedKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "fail">("idle");
  const [testModels, setTestModels] = useState<string[]>([]);
  const [testError, setTestError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/config");
      const json = await res.json();
      if (json.data?.configured) {
        setConfigured(true);
        setMaskedKey(json.data.maskedKey || "");
        setModel(json.data.model || "deepseek-chat");
        setBaseUrl(json.data.baseUrl || "https://api.deepseek.com");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleTest = async () => {
    const key = configured ? "" : apiKey;
    if (!configured && !key) {
      toast.error("请输入 API Key");
      return;
    }
    setTestStatus("testing");
    setTestModels([]);
    setTestError("");
    try {
      const res = await fetch("/api/ai/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key || undefined, base_url: baseUrl }),
      });
      const json = await res.json();
      if (json.data?.ok) {
        setTestStatus("success");
        setTestModels(json.data.models || []);
      } else {
        setTestStatus("fail");
        setTestError(json.data?.error || "连接失败");
      }
    } catch {
      setTestStatus("fail");
      setTestError("网络请求失败");
    }
  };

  const handleSave = async () => {
    if (!apiKey && !configured) {
      toast.error("请输入 API Key");
      return;
    }
    if (!configured && !apiKey.startsWith("sk-")) {
      toast.error("API Key 格式不正确，应以 sk- 开头");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey || undefined,
          model,
          base_url: baseUrl,
        }),
      });
      const json = await res.json();
      if (json.data?.success) {
        toast.success("配置已保存");
        setApiKey("");
        setShowKey(false);
        loadConfig();
      } else {
        toast.error(json.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const voiceAvailable = model === "deepseek-chat";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-indigo-600" />
        大模型配置
      </h3>

      {/* API Key 配置 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">DeepSeek API Key</Label>
          <p className="text-xs text-gray-400 mb-2">全平台共用一套密钥，配置后立即生效</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configured ? maskedKey : "sk-xxxxxxxx"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="outline" onClick={handleTest} disabled={testStatus === "testing"} className="gap-1.5 shrink-0">
              {testStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              测试连接
            </Button>
          </div>
        </div>

        {/* 连接状态 */}
        {testStatus === "testing" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            检测中...
          </div>
        )}
        {testStatus === "success" && (
          <div className="flex items-start gap-2 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-700">✓ 连接成功</p>
              {testModels.length > 0 && (
                <p className="text-green-600 text-xs mt-0.5">可用模型：{testModels.join(", ")}</p>
              )}
            </div>
          </div>
        )}
        {testStatus === "fail" && (
          <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">✗ 连接失败</p>
              <p className="text-red-600 text-xs mt-0.5">{testError}</p>
            </div>
          </div>
        )}
      </div>

      {/* 模型选择 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">模型选择</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepseek-chat">deepseek-chat — 通用对话，适合数据分析与文字整理</SelectItem>
              <SelectItem value="deepseek-reasoner">deepseek-reasoner — 深度推理，适合复杂报表分析</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 语音服务状态 */}
        <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${voiceAvailable ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
          {voiceAvailable ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700">✓ 语音服务已就绪</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-700">⚠ 当前 Key 未开通语音服务，录音转文字功能将不可用</span>
            </>
          )}
        </div>
      </div>

      {/* 保存 */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存配置"}
        </Button>
        <Button variant="outline" onClick={() => { setApiKey(""); setShowKey(false); setTestStatus("idle"); }}>
          重置
        </Button>
      </div>
    </div>
  );
}
