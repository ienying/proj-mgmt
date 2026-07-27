"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Editor, Toolbar } from "@wangeditor/editor-for-react";
import type { IDomEditor, IEditorConfig } from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";

interface RichTextEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onEditorCreated?: (editor: IDomEditor) => void;
  onFileUploaded?: (filePath: string) => void;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
var TOOLBAR_CONFIG: any = {
  // Explicit toolbar keys to guarantee both inline code and code block buttons
  keys: [
    "headerSelect",
    "|",
    "bold",
    "underline",
    "italic",
    "through",
    "code", // 行内代码 - inline code
    "sub",
    "sup",
    "clearStyle",
    "|",
    "color",
    "bgColor",
    "|",
    "fontSize",
    "fontFamily",
    "|",
    "indent",
    "delIndent",
    "justifyLeft",
    "justifyRight",
    "justifyCenter",
    "justifyJustify",
    "|",
    "lineHeight",
    "|",
    "bulletedList",
    "numberedList",
    "todo",
    "|",
    "emotion",
    "uploadImage",
    "insertTable",
    "codeBlock", // 代码块 - code block / snippet
    "divider",
    "|",
    "undo",
    "redo",
    "|",
    "fullScreen",
  ],
};

function normalizeHtml(html: string): string {
  var trimmed = html
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
  return trimmed.length === 0 ? "" : html;
}

function uploadImageFile(file: File): Promise<string | null> {
  return new Promise(function (resolve) {
    var formData = new FormData();
    formData.append("files", file);
    formData.append("category_type", "tech_doc");
    fetch("/api/knowledge/upload", { method: "POST", body: formData })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json.data) {
          var d = Array.isArray(json.data) ? json.data[0] : json.data;
          resolve("/api/knowledge/download?file_path=" + encodeURIComponent(d.file_path) + "&preview=true");
        } else {
          resolve(null);
        }
      })
      .catch(function () { resolve(null); });
  });
}

function stripImagesFromHtml(html: string): string {
  return html.replace(/<img[^>]*\/?>/gi, "");
}

function stripMdImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\(https?:\/\/[^)]+\)/gi, "");
}

function proxyDownloadImage(externalUrl: string): Promise<string | null> {
  return new Promise(function (resolve) {
    fetch("/api/knowledge/proxy-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: externalUrl }),
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json.data && json.data.file_path) {
          resolve("/api/knowledge/download?file_path=" + encodeURIComponent(json.data.file_path) + "&preview=true");
        } else {
          resolve(null);
        }
      })
      .catch(function () { resolve(null); });
  });
}

function dataUriToBlob(dataUri: string): Blob | null {
  try {
    var parts = dataUri.split(",");
    if (parts.length !== 2) return null;
    var mimeInfo = parts[0].split(":")[1];
    if (!mimeInfo) return null;
    var mime = mimeInfo.split(";")[0];
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (e) {
    return null;
  }
}

// Extract all unique http(s) image URLs from text (HTML <img> + Markdown ![]())
function extractExternalImageUrls(html: string, plainText: string): string[] {
  var urls: string[] = [];
  var seen: Record<string, boolean> = {};

  function add(url: string) {
    if (!seen[url]) { seen[url] = true; urls.push(url); }
  }

  // HTML <img src="http...">
  if (html) {
    var re = /<img[^>]+src="(https?:\/\/[^"]+)"[^>]*\/?>/gi;
    var m;
    while ((m = re.exec(html)) !== null) add(m[1]);
  }

  // Markdown ![]() in both plain text and HTML
  var mdRe = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;
  if (plainText) {
    var m2;
    while ((m2 = mdRe.exec(plainText)) !== null) add(m2[1]);
  }
  if (html) {
    mdRe.lastIndex = 0;
    var m3;
    while ((m3 = mdRe.exec(html)) !== null) add(m3[1]);
  }

  return urls;
}

var uploadedPaths = new Set<string>();

// Error boundary to catch Slate.js DOM resolution errors from wangeditor
class EditorErrorBoundary extends React.Component<{ children: React.ReactNode; onError?: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('RichTextEditor crashed:', error.message);
  }
  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onError) this.props.onError();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border border-red-200 rounded-lg bg-red-50 text-sm">
          <p className="text-red-600 font-medium mb-1">编辑器加载异常</p>
          <p className="text-red-400 text-xs mb-2">请刷新页面后重试</p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1 text-xs bg-white border border-red-200 rounded hover:bg-red-100 text-red-600"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RichTextEditorInner(props: RichTextEditorProps) {
  var value = props.value;
  var onChange = props.onChange;
  var placeholder = props.placeholder;
  var onEditorCreated = props.onEditorCreated;
  var onFileUploaded = props.onFileUploaded;

  var _editorState = useState<IDomEditor | null>(null);
  var editor = _editorState[0];
  var setEditor = _editorState[1];
  // Track paste handler so we can clean it up on editor destroy
  var pasteCleanupRef = useRef<(() => void) | null>(null);

  var handleCreated = useCallback(function (ed: IDomEditor) {
    setEditor(ed);
    if (onEditorCreated) onEditorCreated(ed);

    // Clean up previous paste listener if any (e.g. StrictMode double-mount)
    if (pasteCleanupRef.current) {
      pasteCleanupRef.current();
      pasteCleanupRef.current = null;
    }

    var el = ed.getEditableContainer();
    if (!el) return;

    function handlePaste(e: Event) {
      const clipboardEvent = e as ClipboardEvent;
      var clipboard = clipboardEvent.clipboardData;
      if (!clipboard) return;

      var html = clipboard.getData("text/html");
      var plainText = clipboard.getData("text/plain");

      // 1. Collect image files from clipboard items
      var imageFiles: File[] = [];
      var seen = new Set<string>();
      function addFile(f: File) {
        var key = f.name + "|" + f.size + "|" + f.type;
        if (seen.has(key)) return;
        seen.add(key);
        if (f.type.indexOf("image/") === 0) imageFiles.push(f);
      }
      var items = Array.from(clipboard.items);
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind === "file") { var f = items[i].getAsFile(); if (f) addFile(f); }
      }
      if (clipboard.files && clipboard.files.length > 0) {
        for (var fi = 0; fi < clipboard.files.length; fi++) addFile(clipboard.files[fi]);
      }

      // 2. Extract base64 images from HTML
      var base64Files: File[] = [];
      if (html) {
        var b64re = /<img[^>]+src="(data:image\/[^"]+)"[^>]*\/?>/gi;
        var bm; var bn = 0;
        while ((bm = b64re.exec(html)) !== null) {
          var blob = dataUriToBlob(bm[1]);
          if (blob) {
            var ext = (blob.type.split("/")[1] || "png");
            base64Files.push(new File([blob], "paste-" + bn + "." + ext, { type: blob.type }));
            bn++;
          }
        }
      }

      // 3. Extract external image URLs (HTML <img> + Markdown ![]())
      var externalUrls = extractExternalImageUrls(html || "", plainText || "");

      // 4. Check for file:// images
      var hasFileImages = html ? /<img[^>]+src="file:\/\//i.test(html) : false;

      var hasImages = imageFiles.length > 0 || base64Files.length > 0 || externalUrls.length > 0 || hasFileImages;
      if (!hasImages) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      // Build clean text content
      var cleanedHtml = html ? stripImagesFromHtml(html) : "";
      cleanedHtml = cleanedHtml.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*\/?>/gi, "");
      cleanedHtml = stripMdImages(cleanedHtml);
      var textContent = cleanedHtml || stripMdImages(plainText || "");

      // Collect file uploads
      var uploads: File[] = [];
      for (var u = 0; u < imageFiles.length; u++) uploads.push(imageFiles[u]);
      for (var u2 = 0; u2 < base64Files.length; u2++) uploads.push(base64Files[u2]);

      setTimeout(function () {
        if (textContent) {
          try { ed.dangerouslyInsertHtml(textContent); } catch (e) {}
        }

        var proxyUrls = externalUrls.slice();
        var ui = 0;

        function insertNext() {
          if (ui < uploads.length) {
            var file = uploads[ui]; ui++;
            uploadImageFile(file).then(function (url) {
              if (url) {
                var qs = url.split("?")[1] || "";
                var params = new URLSearchParams(qs);
                var fp = params.get("file_path");
                if (fp && !uploadedPaths.has(fp)) {
                  uploadedPaths.add(fp);
                  if (onFileUploaded) onFileUploaded(fp);
                }
                try { ed.dangerouslyInsertHtml('<p><img src="' + url + '" alt="' + file.name + '" style="max-width:100%"/></p>'); } catch (e) {}
              }
              insertNext();
            });
            return;
          }
          if (proxyUrls.length > 0) {
            var extUrl = proxyUrls.shift();
            if (extUrl) {
              proxyDownloadImage(extUrl).then(function (localUrl) {
                var finalUrl = localUrl || extUrl;
                try { ed.dangerouslyInsertHtml('<p><img src="' + finalUrl + '" style="max-width:100%"/></p>'); } catch (e) {}
                insertNext();
              });
            }
          }
        }
        insertNext();
      }, 100);
    } // end handlePaste

    el.addEventListener("paste", handlePaste, true);
    pasteCleanupRef.current = function () {
      el.removeEventListener("paste", handlePaste, true);
    };
  }, [onEditorCreated, onFileUploaded]);

  var editorConfig: Partial<IEditorConfig> = {
    placeholder: placeholder || "请输入内容...",
    MENU_CONF: {
      uploadImage: {
        customUpload: function (file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          uploadImageFile(file).then(function (url) {
            if (url) {
              insertFn(url, file.name, url);
              var qs = url.split("?")[1] || "";
              var params = new URLSearchParams(qs);
              var fp = params.get("file_path");
              if (fp && !uploadedPaths.has(fp)) {
                uploadedPaths.add(fp);
                if (onFileUploaded) onFileUploaded(fp);
              }
            }
          });
        },
      } as any,
    },
  };

  var handleContainerClick = function () { if (editor) editor.focus(); };

  // Cleanup paste listener on unmount
  useEffect(function () {
    return function () {
      if (pasteCleanupRef.current) {
        pasteCleanupRef.current();
        pasteCleanupRef.current = null;
      }
    };
  }, []);

  return (
    <EditorErrorBoundary>
      <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 flex flex-col max-h-[calc(100vh-250px)] ${props.className || ""}`} onClick={handleContainerClick}>
        <style>{`.w-e-text-container h1{font-size:2em!important;font-weight:700!important;margin:0.67em 0!important;line-height:1.3!important}.w-e-text-container h2{font-size:1.5em!important;font-weight:700!important;margin:0.83em 0!important;line-height:1.4!important;border-bottom:1px solid #e5e7eb;padding-bottom:0.3em}.w-e-text-container h3{font-size:1.25em!important;font-weight:600!important;margin:1em 0!important;line-height:1.5!important}.w-e-text-container h4{font-size:1.1em!important;font-weight:600!important;margin:0.8em 0!important}`}</style>
        <Toolbar editor={editor} defaultConfig={TOOLBAR_CONFIG} style={{ borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10, background: "#fff" }} />
        <Editor value={value} onChange={function (ed) { onChange(normalizeHtml(ed.getHtml())); }} onCreated={handleCreated} defaultConfig={editorConfig} style={{ minHeight: 180, overflowY: "auto", flex: 1 }} />
      </div>
    </EditorErrorBoundary>
  );
}

export default function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorInner {...props} />;
}
