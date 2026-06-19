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
  onFileUploaded?: (filePath: string) => void;
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

async function uploadImageFile(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("category_type", "tech_doc");
    const res = await fetch("/api/knowledge/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (json.data) {
      const d = Array.isArray(json.data) ? json.data[0] : json.data;
      return `/api/knowledge/download?file_path=${encodeURIComponent(d.file_path)}&preview=true`;
    }
  } catch {}
  return null;
}

function stripImagesFromHtml(html: string): string {
  // Remove <img> tags (Word images have broken file:// src)
  return html.replace(/<img[^>]*\/?>/gi, "");
}

const uploadedPaths = new Set<string>();

export default function RichTextEditor({ value, onChange, placeholder, onEditorCreated, onFileUploaded }: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  const handleCreated = useCallback((ed: IDomEditor) => {
    setEditor(ed);
    onEditorCreated?.(ed);

    // Direct DOM paste listener for Word image paste support
    const el = ed.getEditableContainer();
    if (el) {
      const pasteHandler = (e: ClipboardEvent) => {
        const clipboard = e.clipboardData;
        if (!clipboard) return;

        const items = Array.from(clipboard.items);
        const imageFiles: File[] = [];

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }

        if (imageFiles.length === 0) return; // no images, let default handle it

        e.preventDefault();
        e.stopImmediatePropagation();

        const html = clipboard.getData("text/html");
        const plainText = clipboard.getData("text/plain");
        const cleanedHtml = html ? stripImagesFromHtml(html) : "";
        const textContent = cleanedHtml || plainText;

        // Defer all editor manipulation to after event loop
        const imageFilesCopy = [...imageFiles];
        setTimeout(async () => {
          // First, insert the text/HTML content
          if (textContent) {
            try {
              ed.dangerouslyInsertHtml(textContent);
            } catch {
              try { ed.insertText(textContent.replace(/<[^>]+>/g, "")); } catch {}
            }
          }

          // Then upload and insert each image
          for (const file of imageFilesCopy) {
            const url = await uploadImageFile(file);
            if (!url) continue;

            const params = new URLSearchParams(url.split("?")[1] || "");
            const fp = params.get("file_path");
            if (fp && !uploadedPaths.has(fp)) {
              uploadedPaths.add(fp);
              onFileUploaded?.(fp);
            }

            // Build simple img HTML and insert
            const imgHtml = '<p><img src="' + url + '" alt="' + file.name + '" style="max-width:100%"/></p>';
            try {
              ed.dangerouslyInsertHtml(imgHtml);
            } catch {
              // fallback: restore selection and insert text + image tag
              ed.focus();
              try { ed.insertText(" "); } catch {}
            }
          }
        }, 50);
      };
      el.addEventListener("paste", pasteHandler, true);
    }
  }, [onEditorCreated, onFileUploaded]);

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder || "请输入内容...",
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          const url = await uploadImageFile(file);
          if (url) {
            insertFn(url, file.name, url);
            const params = new URLSearchParams(url.split("?")[1] || "");
            const fp = params.get("file_path");
            if (fp && !uploadedPaths.has(fp)) {
              uploadedPaths.add(fp);
              onFileUploaded?.(fp);
            }
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
