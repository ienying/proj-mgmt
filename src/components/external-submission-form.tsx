"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/rich-text-editor"), { ssr: false });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Video, ImageIcon, CheckCircle2, Send, FileText } from "lucide-react";

interface EvidenceFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export default function ExternalSubmissionForm() {
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/issues/evidence", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          setEvidenceFiles((prev) => [...prev, json.data]);
        } else {
          const err = await res.json();
          setError(`上传 ${file.name} 失败: ${err.error || "未知错误"}`);
        }
      } catch {
        setError(`上传 ${file.name} 失败: 网络错误`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = async (file: EvidenceFile) => {
    try {
      await fetch(`/api/issues/evidence?path=${encodeURIComponent(file.url)}`, {
        method: "DELETE",
      });
    } catch {
      // ignore delete errors
    }
    setEvidenceFiles((prev) => prev.filter((f) => f.url !== file.url));
  };

  const handleSubmit = async () => {
    if (!projectName && !customerName) {
      setError("请填写客户名称或所属项目");
      return;
    }
    if (!contactPerson) {
      setError("请填写客户姓名");
      return;
    }
    if (!contactInfo) {
      setError("请填写联系方式");
      return;
    }
    if (!description) {
      setError("请填写详细问题描述");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/issues/external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          customer_name: customerName,
          contact_person: contactPerson,
          contact_title: contactTitle,
          contact_info: contactInfo,
          description,
          evidence_files: evidenceFiles,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSubmissionId(json.data?.id || "");
        setSubmitted(true);
      } else {
        const err = await res.json();
        setError(err.error || "提交失败，请稍后重试");
      }
    } catch {
      setError("提交失败，请检查网络连接");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-none border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-black mb-2">提交成功</h1>
          <p className="text-sm text-black mb-1">您的工单已成功提交，我们将尽快处理。</p>
          {submissionId && (
            <p className="text-xs text-black mb-6">
              工单编号: <span className="font-mono text-black font-medium">{submissionId}</span>
            </p>
          )}
          <Button
            onClick={() => {
              setSubmitted(false);
              setSubmissionId("");
              setProjectName("");
              setCustomerName("");
              setContactPerson("");
              setContactTitle("");
              setContactInfo("");
              setDescription("");
              setEvidenceFiles([]);
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-none"
          >
            继续提交
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题栏 */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-black tracking-wide">
            工单提报 / TICKET SUBMISSION
          </h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 表单区 */}
        <div className="bg-white rounded-none border border-gray-200">

          {/* 基本信息 */}
          <section className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-blue-500 rounded-full" />
              <h3 className="text-sm font-bold text-black">基本信息</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  <span className="text-red-500 mr-0.5">*</span>所属项目
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="请输入项目名称"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  客户名称
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="请输入客户名称"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  <span className="text-red-500 mr-0.5">*</span>客户姓名
                </label>
                <Input
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  职务
                </label>
                <Input
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="如：技术负责人"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  <span className="text-red-500 mr-0.5">*</span>联系方式
                </label>
                <Input
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="手机号/邮箱"
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 问题描述 */}
          <section className="px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-orange-500 rounded-full" />
              <h3 className="text-sm font-bold text-black">问题描述</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-black mb-1.5 block">
                <span className="text-red-500 mr-0.5">*</span>详细问题描述
              </label>
              <div className="min-h-[300px] border border-gray-200 rounded-none">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="请详细描述您遇到的问题：什么时候开始、做了什么操作、出现什么现象等"
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 辅助举证 */}
          <section className="px-6 pt-4 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-green-500 rounded-full" />
              <h3 className="text-sm font-bold text-black">辅助举证</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-black mb-1.5 block">
                问题截图/照片/视频上传 <span className="text-black font-normal">（可选）</span>
              </label>
              <div
                className="border border-dashed border-gray-300 rounded-none p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mx-auto mb-1 text-black" />
                <p className="text-xs text-black">
                  {uploading ? "上传中..." : "点击上传图片或视频"}
                </p>
                <p className="text-[10px] text-black mt-0.5">
                  支持 jpg/png/gif/webp/mp4/webm/mov/avi，单文件最大 500MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>

              {evidenceFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {evidenceFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-gray-50 rounded-none px-2.5 py-1.5 text-xs border border-gray-200 group"
                    >
                      {f.type === "video" ? (
                        <Video className="w-3 h-3 text-purple-400" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-blue-400" />
                      )}
                      <span className="max-w-[120px] truncate text-black">{f.name}</span>
                      <span className="text-black">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        className="text-black hover:text-red-500 ml-0.5"
                        onClick={() => removeFile(f)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-none p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="px-6 pb-5 pt-2 border-t border-gray-100 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-none px-8"
            >
              {submitting ? (
                <>提交中...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  提交工单
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-black mt-6">
          元素科技 · 工单提报系统
        </p>
      </div>
    </div>
  );
}
