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

// Convert base64 data URI to Blob
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

    // Attach paste handler directly to editor DOM for Word image support
    var el = ed.getEditableContainer();
    if (!el) return;

    el.addEventListener("paste", function (e: ClipboardEvent) {
      var clipboard = e.clipboardData;
      if (!clipboard) return;

      var html = clipboard.getData("text/html");
      var plainText = clipboard.getData("text/plain");
      var items = Array.from(clipboard.items);

      // Collect image/* files from clipboard
      var imageFiles: File[] = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image/") === 0) {
          var f = items[i].getAsFile();
          if (f) imageFiles.push(f);
        }
      }

      // Extract base64 images from HTML
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

      // Check for file:// images (Word local references)
      var hasFileImages = html ? /<img[^>]+src="file:\/\//i.test(html) : false;

      var hasImages = imageFiles.length > 0 || base64Files.length > 0 || hasFileImages;
      if (!hasImages) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      // Build clean content without images
      var cleanedHtml = html ? stripImagesFromHtml(html) : "";
      cleanedHtml = cleanedHtml.replace(/<img[^>]+src="data:image\/[^"]+"[^>]*\/?>/gi, "");
      var textContent = cleanedHtml || plainText;

      // Combine all files to upload
      var uploads: File[] = [];
      for (var u = 0; u < imageFiles.length; u++) uploads.push(imageFiles[u]);
      for (var u2 = 0; u2 < base64Files.length; u2++) uploads.push(base64Files[u2]);

      setTimeout(function () {
        // Insert text first
        if (textContent) {
          try { ed.dangerouslyInsertHtml(textContent); } catch (e) {}
        }

        if (uploads.length === 0) return;

        // Upload and insert images one by one
        var ui = 0;
        function uploadNext() {
          if (ui >= uploads.length) return;
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
            uploadNext();
          });
        }
        uploadNext();
      }, 100);
    }, true); // capture phase
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
