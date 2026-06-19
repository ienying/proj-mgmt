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

var TOOLBAR_CONFIG: Partial<IToolbarConfig> = {
  excludeKeys: [
    "group-video", "insertLink", "editLink", "unLink", "viewLink",
    "codeBlock", "blockquote",
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

var uploadedPaths = new Set<string>();

export default function RichTextEditor(props: RichTextEditorProps) {
  var value = props.value;
  var onChange = props.onChange;
  var placeholder = props.placeholder;
  var onEditorCreated = props.onEditorCreated;
  var onFileUploaded = props.onFileUploaded;

  var _editorState = useState<IDomEditor | null>(null);
  var editor = _editorState[0];
  var setEditor = _editorState[1];

  var handleCreated = useCallback(function (ed: IDomEditor) {
    setEditor(ed);
    if (onEditorCreated) onEditorCreated(ed);

    var el = ed.getEditableContainer();
    if (!el) return;

    el.addEventListener("paste", function (e: ClipboardEvent) {
      var clipboard = e.clipboardData;
      if (!clipboard) return;

      var html = clipboard.getData("text/html");
      var plainText = clipboard.getData("text/plain");

      // 1. Collect ALL possible image files from clipboard items
      var imageFiles: File[] = [];
      var seen = new Set<string>();

      function addFile(f: File) {
        var key = f.name + "|" + f.size + "|" + f.type;
        if (seen.has(key)) return;
        seen.add(key);
        if (f.type.indexOf("image/") === 0) {
          imageFiles.push(f);
        }
      }

      var items = Array.from(clipboard.items);
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          var f = items[i].getAsFile();
          if (f) addFile(f);
        }
      }

      // 2. DataTransfer.files (Word sometimes puts images here)
      if (clipboard.files && clipboard.files.length > 0) {
        for (var fi = 0; fi < clipboard.files.length; fi++) {
          addFile(clipboard.files[fi]);
        }
      }

      // 3. Extract base64 images from HTML
      var base64Files: File[] = [];
      if (html) {
        var re = /<img[^>]+src="(data:image\/[^"]+)"[^>]*\/?>/gi;
        var m;
        var bn = 0;
        while ((m = re.exec(html)) !== null) {
          var blob = dataUriToBlob(m[1]);
          if (blob) {
            var ext = (blob.type.split("/")[1] || "png");
            base64Files.push(new File([blob], "paste-" + bn + "." + ext, { type: blob.type }));
            bn++;
          }
        }
      }

      // 4. Extract external http(s) image URLs (e.g. from 语雀/飞书 docs)
      var externalUrls: string[] = [];
      if (html) {
        var extRe = /<img[^>]+src="(https?:\/\/[^"]+)"[^>]*\/?>/gi;
        var em;
        while ((em = extRe.exec(html)) !== null) {
          externalUrls.push(em[1]);
        }
      }

      // 5. Check for file:// images (Word local references)
      var hasFileImages = html ? /<img[^>]+src="file:\/\//i.test(html) : false;

      var hasImages = imageFiles.length > 0 || base64Files.length > 0 || externalUrls.length > 0 || hasFileImages;
      if (!hasImages) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      // Build clean content without images
      var cleanedHtml = html ? stripImagesFromHtml(html) : "";
      cleanedHtml = cleanedHtml.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*\/?>/gi, "");
      var textContent = cleanedHtml || plainText;

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
          // File uploads first
          if (ui < uploads.length) {
            var file = uploads[ui];
            ui++;
            uploadImageFile(file).then(function (url) {
              if (url) {
                var qs = url.split("?")[1] || "";
                var params = new URLSearchParams(qs);
                var fp = params.get("file_path");
                if (fp && !uploadedPaths.has(fp)) {
                  uploadedPaths.add(fp);
                  if (onFileUploaded) onFileUploaded(fp);
                }
                try {
                  ed.dangerouslyInsertHtml(
                    '<p><img src="' + url + '" alt="' + file.name + '" style="max-width:100%"/></p>'
                  );
                } catch (e) {}
              }
              insertNext();
            });
            return;
          }

          // External URL proxy downloads
          if (proxyUrls.length > 0) {
            var extUrl = proxyUrls.shift();
            if (extUrl) {
              proxyDownloadImage(extUrl).then(function (localUrl) {
                var finalUrl = localUrl || extUrl;
                try {
                  ed.dangerouslyInsertHtml(
                    '<p><img src="' + finalUrl + '" style="max-width:100%"/></p>'
                  );
                } catch (e) {}
                insertNext();
              });
            }
          }
        }
        insertNext();
      }, 100);
    }, true);
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

  var handleContainerClick = function () {
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
        onChange={function (ed) { onChange(normalizeHtml(ed.getHtml())); }}
        onCreated={handleCreated}
        defaultConfig={editorConfig}
        style={{ minHeight: 180 }}
      />
    </div>
  );
}
