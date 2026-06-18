"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, Eye, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  file_type?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  content_type: string;
  version: number;
  created_by_name?: string;
  created_at: string;
  attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export default function ShareView({ token }: { token: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Find post by share_token
        const res = await fetch(`/api/knowledge/posts?keyword=&page_size=999`);
        const json = await res.json();
        if (json.data) {
          const found = json.data.find((p: Record<string, unknown>) => p.share_token === token);
          if (found) {
            // Get full post detail
            const detailRes = await fetch(`/api/knowledge/posts/${found.id}`);
            const detailJson = await detailRes.json();
            if (detailJson.data) {
              setPost({
                id: found.id as string,
                title: found.title as string,
                content: found.content as string,
                content_type: (found.content_type as string) || "rich_text",
                version: (found.version as number) || 1,
                created_by_name: found.created_by_name as string,
                created_at: found.created_at as string,
                attachments: (detailJson.data.attachments || []) as Attachment[],
              });
              return;
            }
          }
        }
        setError("内容未找到");
      } catch (e) {
        setError("加载失败: " + String(e));
      }
      setLoading(false);
    })();
  }, [token]);

  const handleDownload = (att: Attachment) => {
    window.open(
      `/api/knowledge/download?file_path=${encodeURIComponent(att.file_path)}&post_id=${post?.id}&attachment_id=${att.id}`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{error || "内容未找到"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {post.created_by_name || "匿名"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(post.created_at)}
            </span>
            <span>v{post.version}</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          {post.content_type === "markdown" ? (
            <Markdown>{post.content || ""}</Markdown>
          ) : (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
          )}
        </div>

        {/* Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">附件</h3>
            <div className="space-y-2">
              {post.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm truncate">{att.file_name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatFileSize(att.file_size)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(att)}
                  >
                    <Download className="w-3 h-3 mr-1" /> 下载
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
