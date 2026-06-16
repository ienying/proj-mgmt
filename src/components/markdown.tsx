"use client";

import React, { memo, useMemo, Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

/* ---- 类型 ---- */
type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "boldItalic"; text: string }
  | { type: "code"; text: string };

type Block =
  | { type: "h1" | "h2" | "h3" | "h4"; tokens: InlineToken[] }
  | { type: "p"; tokens: InlineToken[] }
  | { type: "code"; lang: string; text: string }
  | { type: "ul" | "ol"; items: InlineToken[][] }
  | { type: "table"; headers: InlineToken[][]; rows: InlineToken[][][] }
  | { type: "hr" }
  | { type: "blockquote"; tokens: InlineToken[] }
  | { type: "chart"; text: string };

/* ---- 行内解析 ---- */
function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let rest = text;
  while (rest.length > 0) {
    let m = rest.match(/^\*\*\*(.+?)\*\*\*/);
    if (m) { tokens.push({ type: "boldItalic", text: m[1] }); rest = rest.slice(m[0].length); continue; }
    m = rest.match(/^\*\*(.+?)\*\*/);
    if (m) { tokens.push({ type: "bold", text: m[1] }); rest = rest.slice(m[0].length); continue; }
    m = rest.match(/^\*(.+?)\*/);
    if (m) { tokens.push({ type: "italic", text: m[1] }); rest = rest.slice(m[0].length); continue; }
    m = rest.match(/^`([^`]+)`/);
    if (m) { tokens.push({ type: "code", text: m[1] }); rest = rest.slice(m[0].length); continue; }
    m = rest.match(/^[^`*]+/);
    if (m) { tokens.push({ type: "text", text: m[0] }); rest = rest.slice(m[0].length); continue; }
    tokens.push({ type: "text", text: rest[0] }); rest = rest.slice(1);
  }
  return tokens;
}

/* ---- 块级解析 ---- */
function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // 代码块 / 图表
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (lang === "mermaid") {
        blocks.push({ type: "chart", text: codeLines.join("\n") });
      } else {
        blocks.push({ type: "code", lang, text: codeLines.join("\n") });
      }
      i++;
      continue;
    }

    // 表格
    if (line.startsWith("|") && line.endsWith("|")) {
      const headers = line.replace(/^\||\|$/g, "").split("|").map((c) => parseInline(c.trim()));
      i++;
      if (i < lines.length && /^[\|\s\-:]+$/.test(lines[i])) i++;
      const rows: InlineToken[][][] = [];
      while (i < lines.length && lines[i].startsWith("|") && lines[i].endsWith("|")) {
        rows.push(lines[i].replace(/^\||\|$/g, "").split("|").map((c) => parseInline(c.trim())));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // 水平线
    if (/^-{3,}$/.test(line.trim())) { blocks.push({ type: "hr" }); i++; continue; }

    // 标题
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const n = hMatch[1].length;
      if (n === 1) blocks.push({ type: "h1", tokens: parseInline(hMatch[2]) });
      else if (n === 2) blocks.push({ type: "h2", tokens: parseInline(hMatch[2]) });
      else if (n === 3) blocks.push({ type: "h3", tokens: parseInline(hMatch[2]) });
      else blocks.push({ type: "h4", tokens: parseInline(hMatch[2]) });
      i++;
      continue;
    }

    // 无序列表
    if (/^[\-\*]\s+.+/.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^[\-\*]\s+.+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[\-\*]\s+/, "")));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+.+/.test(line)) {
      const items: InlineToken[][] = [];
      while (i < lines.length && /^\d+\.\s+.+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s+/, "")));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // 引用块
    if (line.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) { q.push(lines[i].replace(/^> /, "")); i++; }
      blocks.push({ type: "blockquote", tokens: parseInline(q.join("\n")) });
      continue;
    }

    // 段落
    const pLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !lines[i].startsWith("|") && !/^(#{1,4}\s|[>\-\*]\s|\d+\.\s|-{3,}$)/.test(lines[i])) {
      pLines.push(lines[i]); i++;
    }
    if (pLines.length > 0) {
      const text = pLines.join("\n");
      // 检测裸 mermaid（AI 有时省略 ```mermaid 包裹）
      if (/^(pie|graph\s|flowchart\s|gantt\s|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gitgraph)\b/i.test(text.trim())) {
        blocks.push({ type: "chart", text });
      } else {
        blocks.push({ type: "p", tokens: parseInline(text) });
      }
    }
  }
  return blocks;
}

/* ---- 行内渲染 ---- */
function RenderInline({ tokens }: { tokens: InlineToken[] }) {
  return <>
    {tokens.map((t, i) => {
      switch (t.type) {
        case "bold": return <strong key={i} className="font-semibold text-gray-900">{t.text}</strong>;
        case "italic": return <em key={i} className="italic text-gray-600">{t.text}</em>;
        case "boldItalic": return <strong key={i} className="font-semibold italic text-gray-900">{t.text}</strong>;
        case "code": return <code key={i} className="bg-gray-100 text-rose-600 px-1 py-0.5 rounded text-[0.85em] font-mono">{t.text}</code>;
        default: return <Fragment key={i}>{t.text}</Fragment>;
      }
    })}
  </>;
}

/* ---- Mermaid 图表渲染 ---- */
const MermaidChart = memo(function MermaidChart({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        const id = "mermaid-" + Math.random().toString(36).slice(2, 10);
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return <pre className="bg-gray-100 rounded-lg p-4 my-3 text-xs text-gray-500 overflow-x-auto font-mono">{chart}</pre>;
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {!svg && <div className="animate-pulse bg-gray-100 rounded h-40 w-full" />}
    </div>
  );
});

/* ---- 块级渲染 ---- */
function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "h1": return <h1 className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-1.5 border-b border-gray-200"><RenderInline tokens={block.tokens} /></h1>;
    case "h2": return <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2"><RenderInline tokens={block.tokens} /></h2>;
    case "h3": return <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1.5"><RenderInline tokens={block.tokens} /></h3>;
    case "h4": return <h4 className="text-sm font-semibold text-gray-700 mt-3 mb-1"><RenderInline tokens={block.tokens} /></h4>;
    case "p": return <p className="text-sm text-gray-700 leading-relaxed my-2"><RenderInline tokens={block.tokens} /></p>;
    case "code":
      return <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-[13px] leading-relaxed font-mono"><code>{block.text}</code></pre>;
    case "chart":
      return <MermaidChart chart={block.text} />;
    case "ul":
      return <ul className="list-disc pl-6 my-2 space-y-1">{block.items.map((item, i) => <li key={i} className="text-sm text-gray-700 leading-relaxed"><RenderInline tokens={item} /></li>)}</ul>;
    case "ol":
      return <ol className="list-decimal pl-6 my-2 space-y-1">{block.items.map((item, i) => <li key={i} className="text-sm text-gray-700 leading-relaxed"><RenderInline tokens={item} /></li>)}</ol>;
    case "table":
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">{block.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200"><RenderInline tokens={h} /></th>)}</tr></thead>
            <tbody>{block.rows.map((row, ri) => <tr key={ri} className="even:bg-gray-50/50">{row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-600 border-t border-gray-100"><RenderInline tokens={cell} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "hr": return <hr className="my-4 border-gray-200" />;
    case "blockquote": return <blockquote className="border-l-4 border-teal-400 bg-teal-50/50 rounded-r-lg pl-4 pr-3 py-2 my-3 text-sm text-gray-600 italic"><RenderInline tokens={block.tokens} /></blockquote>;
  }
}

export const Markdown = memo(function Markdown({ children, className = "" }: { children: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(children), [children]);
  return <div className={className}>{blocks.map((block, i) => <RenderBlock key={i} block={block} />)}</div>;
});
