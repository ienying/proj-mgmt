"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square, Play, Download, Upload, X, FileText, FileSpreadsheet, File, Loader2, Sparkles, Check, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface AIInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string, fieldMappings?: Record<string, string>) => void;
  fieldOptions?: Array<{ key: string; label: string }>;
}

type RecordingStatus = "idle" | "recording" | "done" | "transcribing";

export function AIInputDialog({
  open,
  onOpenChange,
  onConfirm,
  fieldOptions = [],
}: AIInputDialogProps) {
  // 录音状态
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt");

  // 文件上传
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; status: "pending" | "processing" | "done" | "error" }>>([]);

  // 共用确认区
  const [recognizedText, setRecognizedText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [smartMatch, setSmartMatch] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Array<{ snippet: string; field: string }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const resetDialog = () => {
    setRecordingStatus("idle");
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl("");
    setUploadedFiles([]);
    setRecognizedText("");
    setTranscribing(false);
    setSmartMatch(false);
    setFieldMappings([]);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // 录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingStatus("done");
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start();
      setRecordingStatus("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setMicPermission("denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecordingStatus("done");
  };

  const downloadRecording = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `recording_${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
  };

  // 转文字
  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setTranscribing(true);
    setRecordingStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      const res = await fetch("/api/ai/speech-to-text", { method: "POST", body: formData });
      const json = await res.json();
      if (json.data?.text) {
        setRecognizedText(json.data.text);
        toast.success("语音转文字完成");
      } else if (json.data?.warning) {
        toast.warning(json.data.warning);
      } else if (json.error) {
        toast.error(json.error);
      }
    } catch {
      toast.error("转文字失败");
    } finally {
      setTranscribing(false);
    }
  };

  // 文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f) => {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name} 超过 50MB 限制`);
        return null;
      }
      return { file: f, status: "pending" as const };
    }).filter(Boolean) as Array<{ file: File; status: "pending" | "processing" | "done" | "error" }>;
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleParseFiles = async () => {
    const pendingFiles = uploadedFiles.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setTranscribing(true);
    let allText = recognizedText;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const item = uploadedFiles[i];
      if (item.status !== "pending") continue;

      setUploadedFiles((prev) => prev.map((f, j) => (j === i ? { ...f, status: "processing" } : f)));

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
        const json = await res.json();
        if (json.data?.text) {
          allText += (allText ? "\n\n" : "") + `--- ${item.file.name} ---\n` + json.data.text;
          setUploadedFiles((prev) => prev.map((f, j) => (j === i ? { ...f, status: "done" } : f)));
        } else {
          setUploadedFiles((prev) => prev.map((f, j) => (j === i ? { ...f, status: "error" } : f)));
        }
      } catch {
        setUploadedFiles((prev) => prev.map((f, j) => (j === i ? { ...f, status: "error" } : f)));
      }
    }

    setRecognizedText(allText);
    setTranscribing(false);
    toast.success("文件解析完成");
  };

  // 智能匹配
  const handleSmartMatchToggle = (checked: boolean) => {
    setSmartMatch(checked);
    if (checked && recognizedText) {
      const lines = recognizedText.split("\n").filter((l) => l.trim().length > 10).slice(0, 5);
      setFieldMappings(
        lines.map((snippet) => ({
          snippet: snippet.slice(0, 80) + (snippet.length > 80 ? "..." : ""),
          field: fieldOptions[0]?.key || "",
        }))
      );
    } else {
      setFieldMappings([]);
    }
  };

  const handleConfirm = () => {
    if (!recognizedText.trim()) return;
    const mappings: Record<string, string> = {};
    if (smartMatch) {
      fieldMappings.forEach((m) => {
        if (m.field) mappings[m.field] = (mappings[m.field] || "") + m.snippet + "\n";
      });
    }
    onConfirm(recognizedText, Object.keys(mappings).length > 0 ? mappings : undefined);
    onOpenChange(false);
    resetDialog();
    toast.success(`已回填${Object.keys(mappings).length > 0 ? " " + Object.keys(mappings).length + " 个" : ""}字段`);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const iconMap: Record<string, React.ReactNode> = {
    pdf: <FileText className="w-4 h-4 text-red-500" />,
    ppt: <FileText className="w-4 h-4 text-orange-500" />,
    pptx: <FileText className="w-4 h-4 text-orange-500" />,
    xls: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
    xlsx: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
    mp3: <File className="w-4 h-4 text-blue-500" />,
    wav: <File className="w-4 h-4 text-blue-500" />,
    webm: <File className="w-4 h-4 text-blue-500" />,
    m4a: <File className="w-4 h-4 text-blue-500" />,
  };

  const getStatusBadge = () => {
    switch (recordingStatus) {
      case "idle": return { text: "未开始", color: "bg-gray-100 text-gray-500" };
      case "recording": return { text: "录音中", color: "bg-red-100 text-red-600" };
      case "done": return { text: "已完成", color: "bg-green-100 text-green-600" };
      case "transcribing": return { text: "识别中", color: "bg-blue-100 text-blue-600" };
    }
  };

  const badge = getStatusBadge();

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetDialog(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            AI 智能录入
          </DialogTitle>
        </DialogHeader>

        {/* 双卡片区 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 左卡片：语音录入 */}
          <div className="border rounded-lg bg-slate-50 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-1.5">🎤 语音录入</h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.text}</span>
            </div>

            {micPermission === "denied" ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                麦克风权限未授权，请在浏览器设置中允许本网站使用麦克风
              </div>
            ) : recordingStatus === "idle" ? (
              <div className="flex flex-col items-center py-6">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <Mic className="w-7 h-7 text-white" />
                </button>
                <p className="text-sm text-gray-600 mt-3">点击开始录音</p>
                <p className="text-[10px] text-gray-400 mt-1">首次使用需授权麦克风权限</p>
              </div>
            ) : recordingStatus === "recording" ? (
              <div className="flex flex-col items-center py-4">
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 animate-pulse ring-4 ring-red-200 flex items-center justify-center"
                >
                  <Square className="w-6 h-6 text-white" />
                </button>
                <p className="text-lg font-mono font-medium text-red-600 mt-3">{formatTime(recordingTime)}</p>
                <button onClick={stopRecording} className="mt-2 text-sm text-red-500 border border-red-200 rounded px-3 py-1 hover:bg-red-50">
                  停止录音
                </button>
              </div>
            ) : (recordingStatus === "done" || recordingStatus === "transcribing") && audioUrl ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>时长 {formatTime(recordingTime)}</span>
                  <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">WEBM</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { const a = new Audio(audioUrl); a.play(); }}>
                    <Play className="w-3.5 h-3.5 mr-1" /> 播放
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadRecording}>
                    <Download className="w-3.5 h-3.5 mr-1" /> 下载
                  </Button>
                  <Button
                    size="sm"
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                    onClick={handleTranscribe}
                    disabled={transcribing}
                  >
                    {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    转文字
                  </Button>
                </div>
                {recordingStatus === "transcribing" && (
                  <p className="text-xs text-blue-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    正在识别语音...
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* 右卡片：文件上传 */}
          <div className="border rounded-lg bg-slate-50 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-1.5">📄 文件上传</h4>
              {uploadedFiles.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">{uploadedFiles.length} 个文件</span>
              )}
            </div>

            <label className="flex-1 border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[120px]">
              <Upload className="w-6 h-6 text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">拖拽文件到此处</p>
              <p className="text-[10px] text-gray-300">或点击选择文件</p>
              <div className="flex gap-1 mt-2">
                {["MP3", "WAV", "M4A", "PDF", "PPT", "Excel"].map((t) => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">{t}</span>
                ))}
              </div>
              <input
                type="file"
                multiple
                accept=".mp3,.wav,.webm,.m4a,.pdf,.ppt,.pptx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                {uploadedFiles.map((item, i) => {
                  const ext = item.file.name.split(".").pop()?.toLowerCase() || "";
                  return (
                    <div key={i} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        {iconMap[ext] || <File className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="truncate">{item.file.name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{(item.file.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.status === "processing" && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                        {item.status === "done" && <Check className="w-3 h-3 text-green-500" />}
                        {item.status === "error" && <X className="w-3 h-3 text-red-500" />}
                        <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {uploadedFiles.some((f) => f.status === "pending") && (
              <Button size="sm" className="mt-2 w-full" onClick={handleParseFiles} disabled={transcribing}>
                {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                开始解析
              </Button>
            )}
          </div>
        </div>

        {/* 公用确认区 */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">AI 识别结果</Label>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">智能匹配字段</Label>
              <Switch checked={smartMatch} onCheckedChange={handleSmartMatchToggle} />
            </div>
          </div>

          <Textarea
            value={recognizedText}
            onChange={(e) => setRecognizedText(e.target.value)}
            placeholder="AI 识别的文字将显示在这里，可以编辑修改..."
            className="min-h-[180px] text-sm"
          />

          {smartMatch && fieldMappings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">字段映射建议（可逐条调整）</p>
              {fieldMappings.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 truncate">
                    {m.snippet}
                  </span>
                  <span className="text-gray-300">→</span>
                  <Select value={m.field} onValueChange={(v) => {
                    setFieldMappings((prev) => prev.map((f, j) => (j === i ? { ...f, field: v } : f)));
                  }}>
                    <SelectTrigger className="w-[140px] h-7 text-xs">
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setFieldMappings((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { onOpenChange(false); resetDialog(); }}>
              放弃
            </Button>
            <Button onClick={handleConfirm} disabled={!recognizedText.trim()} className="bg-teal-500 hover:bg-teal-600 text-white">
              确认回填
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
