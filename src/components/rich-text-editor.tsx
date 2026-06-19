"use client";

import React, { useState, useCallback } from "react";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import type { IDomEditor, IEditorConfig, IToolbarConfig } from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEditorCreated?: (editor: IDomEditor) => void;
}

const TOOLBAR_CONFIG: Partial<IToolbarConfig> = {
  excludeKeys: [
    "group-video", "insertLink", "editLink", "unLink", "viewLink",
    "codeBlock", "blockquote",
  ],
};

// wangeditor represents an empty document as <p><br></p> — normalize to ""
function normalizeHtml(html: string): string {
  const trimmed = html
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
  return trimmed.length === 0 ? "" : html;
}

export default function RichTextEditor({ value, onChange, placeholder, onEditorCreated }: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  const handleCreated = useCallback((ed: IDomEditor) => {
    setEditor(ed);
    onEditorCreated?.(ed);
  }, [onEditorCreated]);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder || "请输入内容...",
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          try {
            const formData = new FormData();
            formData.append("files", file);
            formData.append("category_type", "tech_doc");
            const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData });
            const json = await res.json();
            if (json.data) {
              const d = Array.isArray(json.data) ? json.data[0] : json.data;
              const url = `/api/knowledge/download?file_path=${encodeURIComponent(d.file_path)}&preview=true`;
              insertFn(url, file.name, url);
            }
          } catch {
            // silently fail, image won't be inserted
          }
        },
      },
    },
  };

  const handleContainerClick = () => {
    if (editor) editor.focus();
  };

  return (
    <div
      className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200"
      onClick={handleContainerClick}
    >
      <Toolbar
        editor={editor}
        defaultConfig={TOOLBAR_CONFIG}
        style={{ borderBottom: "1px solid #e5e7eb" }}
      />
      <Editor
        value={value}
        onChange={(ed) => onChange(normalizeHtml(ed.getHtml()))}
        onCreated={handleCreated}
        defaultConfig={editorConfig}
        style={{ minHeight: 180 }}
      />
    </div>
  );
}
