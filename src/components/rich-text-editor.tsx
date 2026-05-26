"use client";

import React, { useEffect, useRef } from "react";
import { createEditor, createToolbar } from "@wangeditor/editor";
import type { IDomEditor, IEditorConfig, IToolbarConfig } from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<IDomEditor | null>(null);
  const isInternalChange = useRef(false);
  const isDestroyed = useRef(false);

  useEffect(() => {
    if (!editorRef.current || !toolbarRef.current) return;
    isDestroyed.current = false;

    const toolbarConfig: Partial<IToolbarConfig> = {
      excludeKeys: [
        "group-video", "insertLink", "editLink", "unLink", "viewLink",
        "codeBlock", "blockquote",
      ],
    };

    const editorConfig: Partial<IEditorConfig> = {
      placeholder: placeholder || "请输入内容...",
    };

    // Create editor instance manually
    const editor = createEditor({
      selector: editorRef.current,
      html: value || "<p></p>",
      config: {
        ...editorConfig,
        onChange(ed: IDomEditor) {
          if (isDestroyed.current) return;
          isInternalChange.current = true;
          onChange(ed.getHtml());
          setTimeout(() => { isInternalChange.current = false; }, 0);
        },
      },
    });

    // Create toolbar
    createToolbar({
      editor,
      selector: toolbarRef.current,
      config: toolbarConfig,
    });

    editorInstance.current = editor;

    return () => {
      isDestroyed.current = true;
      editorInstance.current = null;
      try { editor.destroy(); } catch { /* ignore */ }
    };
    // Only run on mount/unmount, not when value/onChange change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value only when not focused and not internal change
  const lastValue = useRef(value);
  useEffect(() => {
    lastValue.current = value;
    if (!editorInstance.current || isDestroyed.current || isInternalChange.current) return;
    if (editorInstance.current.isFocused()) return;
    const currentHtml = editorInstance.current.getHtml();
    if (value !== currentHtml) {
      try {
        editorInstance.current.setHtml(value || "<p></p>");
      } catch { /* editor not ready */ }
    }
  }, [value]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200">
      <div
        ref={toolbarRef}
        style={{ borderBottom: "1px solid #e5e7eb" }}
      />
      <div
        ref={editorRef}
        style={{ minHeight: 180 }}
      />
    </div>
  );
}
