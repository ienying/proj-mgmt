"use client";

import { useMemo, useState, useEffect, useRef } from "react";

interface ProductGridProps {
  modules?: Array<string | { code?: string; module_code?: string; module_name?: string; name?: string; quantity?: number }>;
  moduleDict?: { code: string; name: string }[];
  project?: Record<string, unknown>;
  onFullscreen?: () => void;
  projectTypes?: { code: string; name: string }[];
  projectStages?: { code: string; name: string }[];
  customerTypeDict?: { code: string; name: string }[];
}

function s(v: unknown): string {
  if (typeof v === "string") return v;
  return "";
}
function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? 1 : p; }
  return 1;
}
function lookupName(code: string, dict?: { code: string; name: string }[]): string {
  return (dict || []).find((d) => d.code === code)?.name || code;
}
function parseModule(m: string | Record<string, unknown>, dict?: { code: string; name: string }[], qtyMap?: Record<string, string>): { name: string; qty: number } {
  if (typeof m === "string") {
    const qty = qtyMap?.[m] ? n(qtyMap[m]) : 1;
    return { name: lookupName(m, dict), qty };
  }
  const rawCode = s(m.module_code || m.code || "");
  const rawName = s(m.module_name || m.name || "");
  const qty = qtyMap?.[rawCode] ? n(qtyMap[rawCode]) : n(m.quantity || 1);
  return { name: rawName || lookupName(rawCode, dict), qty };
}
function fmtCurrency(v: unknown): string {
  const num = n(v);
  if (num === 0 && String(v) !== "0") return "—";
  return "¥" + num.toLocaleString("zh-CN");
}
function fmtDate(v: unknown): string {
  const str = s(v);
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── 折叠分区 ───
function InfoSection({ title, count, defaultOpen, children }: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "10px 20px", background: "var(--s-surface2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, userSelect: "none", fontFamily: "var(--font-mono, monospace)", fontSize: 9, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--s-text-muted)", borderBottom: open ? "1px solid var(--s-border)" : "none" }}>
        {title}{count !== undefined ? `（${count}条）` : ""}
        <span style={{ marginLeft: "auto", transition: "transform 0.2s", fontSize: 10, transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
      </div>
      {open && children}
    </div>
  );
}

function FieldBlock({ label, value, span2, highlight, html }: { label: string; value: string; span2?: boolean; highlight?: boolean; html?: boolean }) {
  return (
    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)", display: "flex", flexDirection: "column", gap: 3, borderRight: span2 ? undefined : "1px solid var(--s-border-light)", gridColumn: span2 ? "span 2" : undefined, background: highlight ? "rgba(232,89,12,.03)" : undefined }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>{label}</div>
      {html ? (
        <div className="prose prose-sm max-w-none text-[13px]" style={{ color: "var(--s-text-secondary)", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: value }} />
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--s-text)", wordBreak: "break-all" }}>{value}</div>
      )}
    </div>
  );
}

// ═══ Fullscreen Modal Overlay ═══
function FullscreenModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 180, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--s-bg)", border: "1px solid var(--s-border)", width: "96vw", maxWidth: 1400, height: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--s-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--s-surface)" }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "1px solid var(--s-border)", background: "var(--s-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--s-text-muted)", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>{children}</div>
      </div>
    </div>
  );
}

// ═══ 文档附件列表 ═══
function DocList({ docs }: { docs: Array<Record<string, unknown>> }) {
  if (!docs || docs.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {docs.map((doc, i) => {
        const name = String(doc.name || `文档 ${i + 1}`);
        const type = String(doc.type || "file");
        const url = String(doc.url || "");
        const data = String(doc.data || "");

        if (type === "link" && url) {
          return (
            <a key={i} href={url} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: "#2563eb", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all" }}>
              🔗 {name}
            </a>
          );
        }
        if (type === "file" && data) {
          return (
            <a key={i} href={data} download={name}
              style={{ fontSize: 11, color: "#16a34a", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all" }}>
              📄 {name}
            </a>
          );
        }
        return (
          <span key={i} style={{ fontSize: 11, color: "var(--s-text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            📄 {name}
          </span>
        );
      })}
    </div>
  );
}

// JSONB 字段可能是 JSON 字符串，需要解析
function parseJsonField(val: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
  if (typeof val === "string" && val.trim()) {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

export function ProductGrid({ modules, moduleDict, project, onFullscreen, projectTypes, projectStages, customerTypeDict }: ProductGridProps) {
  const [activeTab, setActiveTab] = useState<"procurement" | "info" | "integration" | "custom">("procurement");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [productDetails, setProductDetails] = useState<Record<string, { vendor?: string; scope?: string; model_spec?: string; product_name?: string }>>({});
  const [deploymentModes, setDeploymentModes] = useState<{ code: string; name: string }[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/dicts?type=deployment_modes").then(r => r.json()).then(d => setDeploymentModes(d.data || [])).catch(() => {});
    fetch("/api/dicts?type=project_statuses").then(r => r.json()).then(d => setProjectStatuses(d.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (fullscreenOpen) {
      fetch("/api/dicts?type=product_module_types")
        .then(r => r.json())
        .then(d => {
          const map: Record<string, { vendor?: string; scope?: string; model_spec?: string; product_name?: string }> = {};
          (d.data || []).forEach((m: Record<string, unknown>) => {
            const name = (m.module_name || m.name || "") as string;
            if (name) map[name] = { vendor: m.vendor as string, scope: m.scope as string, model_spec: m.model_spec as string, product_name: m.product_name as string };
          });
          setProductDetails(map);
        }).catch(() => {});
    }
  }, [fullscreenOpen]);

  const p = project || {};

  const { items, totalQty, totalModules } = useMemo(() => {
    let rawQty = p.module_quantities;
    if (typeof rawQty === "string") { try { rawQty = JSON.parse(rawQty); } catch { rawQty = {}; } }
    const qtyMap = (rawQty as Record<string, string>) || {};
    const parsed = (modules || []).map((m) => parseModule(m, moduleDict, qtyMap)).filter((m) => m.name);
    const merged = new Map<string, number>();
    for (const m of parsed) merged.set(m.name, (merged.get(m.name) || 0) + m.qty);
    const it = Array.from(merged.entries()).map(([name, qty]) => ({ name, qty }));
    return { items: it, totalQty: it.reduce((s, i) => s + i.qty, 0), totalModules: it.length };
  }, [modules, moduleDict, p.module_quantities]);
  const ci = (p.customer_info as Record<string, unknown>) || {};
  const cl = (p.customer_location as Record<string, unknown>) || {};
  const channels = (p.channel_info as Array<Record<string, unknown>>) || [];
  const units = (p.construction_units_info as Array<Record<string, unknown>>) || [];
  const integrations = parseJsonField(p.integration_list);
  const customs = parseJsonField(p.custom_dev_info);

  // Dict lookups (after p is declared)
  const typeName = (projectTypes || []).find(t => t.code === p.project_type)?.name || s(p.project_type) || "—";
  const stageName = (projectStages || []).find(s => s.code === p.project_stage)?.name || s(p.project_stage) || "—";
  const statusName = projectStatuses.find(s => s.code === (p.project_status || p.status))?.name || s(p.project_status || p.status) || "—";
  const deployName = deploymentModes.find(m => m.code === p.deployment_mode)?.name || s(p.deployment_mode) || "—";
  const customerTypeDisplay = (() => {
    const ct = p.customer_type;
    let codes: string[] = [];
    if (Array.isArray(ct)) codes = ct.map(String);
    else if (typeof ct === "string") {
      try { const parsed = JSON.parse(ct); if (Array.isArray(parsed)) codes = parsed.map(String); } catch { codes = [ct]; }
    }
    return codes.map(c => (customerTypeDict || []).find(d => d.code === c)?.name || c).join(" · ") || "—";
  })();

  const handleFullscreen = () => setFullscreenOpen(true);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<string[]>([]);
  const vendorFilterRef = useRef<string[]>([]);
  useEffect(() => { vendorFilterRef.current = vendorFilter; }, [vendorFilter]);
  const vendorOptions = useMemo(() => [...new Set(items.map(it => productDetails[it.name]?.vendor).filter(Boolean) as string[])].sort(), [items, productDetails]);
  useEffect(() => { if (fullscreenOpen) filterProcurementTable(); }, [vendorFilter]);
  const [vendorSearch, setVendorSearch] = useState("");

  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string[]>([]);
  const scopeFilterRef = useRef<string[]>([]);
  useEffect(() => { scopeFilterRef.current = scopeFilter; }, [scopeFilter]);
  const scopeOptions = useMemo(() => [...new Set(items.map(it => productDetails[it.name]?.scope).filter(Boolean) as string[])].sort(), [items, productDetails]);
  useEffect(() => { if (fullscreenOpen) filterProcurementTable(); }, [scopeFilter]);
  const [scopeSearch, setScopeSearch] = useState("");

  const filterProcurementTable = () => {
    setTimeout(() => {
      const filters: string[] = [];
      document.querySelectorAll(".fs-filter").forEach(el => {
        const tag = el.tagName.toLowerCase();
        filters.push(((tag === "select" ? (el as HTMLSelectElement).value : (el as HTMLInputElement).value) || "").toLowerCase());
      });
      // pad filters array and insert vendor/scope from refs
      while (filters.length < 6) filters.push("");
      // multi-select vendor/scope: check if cell value is in selected list
      const selectedVendors = vendorFilterRef.current;
      const selectedScopes = scopeFilterRef.current;
      const rows = document.querySelectorAll("#fs-procurement-table tbody tr");
      let visible = 0; const total = rows.length;
      rows.forEach((tr) => {
        const cells = tr.querySelectorAll("td");
        const colMap = [1, 2, 3, 4, 6];
        let match = true;
        for (let fi = 0; fi < filters.length && fi < colMap.length; fi++) {
          if (filters[fi] && cells[colMap[fi]]) {
            if (!(cells[colMap[fi]].textContent || "").toLowerCase().includes(filters[fi])) {
              match = false; break;
            }
          }
        }
        // multi-select vendor filter
        if (match && selectedVendors.length > 0 && cells[4]) {
          const cellVal = (cells[4].textContent || "").trim();
          if (!selectedVendors.some(v => cellVal.includes(v))) match = false;
        }
        // multi-select scope filter
        if (match && selectedScopes.length > 0 && cells[6]) {
          const cellVal = (cells[6].textContent || "").trim();
          if (!selectedScopes.some(v => cellVal.includes(v))) match = false;
        }
        (tr as HTMLElement).style.display = match ? "" : "none";
        if (match) { visible++; (cells[0] as HTMLElement).textContent = String(visible); }
      });
      const countEl = document.getElementById("fs-result-count");
      if (countEl) countEl.innerHTML = `显示 <strong>${visible}</strong> / ${total} 条`;
      const noRes = document.getElementById("fs-no-result");
      if (noRes) noRes.style.display = visible === 0 ? "" : "none";
      const table = document.getElementById("fs-procurement-table");
      if (table) table.style.display = visible === 0 ? "none" : "";
    }, 50);
  };

  return (
    <div className="px-16 py-6" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="text-[10px] uppercase tracking-[2px] mb-4 flex items-center gap-2 font-semibold" style={{ color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>
        合同产品清单 · {totalModules} 项 · 共 {totalQty} 套
        <span className="flex-1 h-px" style={{ backgroundColor: "#16a34a", opacity: 0.3 }} />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setActiveTab("procurement")} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", borderBottom: activeTab === "procurement" ? "2px solid #16a34a" : "2px solid transparent", background: "transparent", color: activeTab === "procurement" ? "#16a34a" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", letterSpacing: "0.5px" }}>
          📦 合同清单 <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>{totalModules}</span>
        </button>
        <button onClick={() => setActiveTab("info")} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", borderBottom: activeTab === "info" ? "2px solid #16a34a" : "2px solid transparent", background: "transparent", color: activeTab === "info" ? "#16a34a" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", letterSpacing: "0.5px" }}>
          📋 项目基本信息
        </button>
        <button onClick={() => setActiveTab("integration")} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", borderBottom: activeTab === "integration" ? "2px solid #16a34a" : "2px solid transparent", background: "transparent", color: activeTab === "integration" ? "#16a34a" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", letterSpacing: "0.5px" }}>
          🔗 对接信息 <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>{integrations.length}</span>
        </button>
        <button onClick={() => setActiveTab("custom")} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", borderBottom: activeTab === "custom" ? "2px solid #16a34a" : "2px solid transparent", background: "transparent", color: activeTab === "custom" ? "#16a34a" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", letterSpacing: "0.5px" }}>
          🔧 定制化信息 <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>{customs.length}</span>
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={handleFullscreen} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #16a34a", background: "var(--s-surface)", color: "#16a34a", fontFamily: "var(--s-font-mono)", letterSpacing: "0.5px" }}>
          ⛶ 全屏查看
        </button>
      </div>

      {/* Tab content */}
      <div style={{ padding: "16px 0 0" }}>
        {activeTab === "procurement" ? (
          items.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--s-text-muted)" }}>暂无采购产品数据</p>
          ) : (
            <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid var(--s-border)", padding: 10, background: "var(--s-surface)" }}>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3.5 py-2.5 border text-xs cursor-default"
                    style={{ borderColor: "var(--s-border)", color: "var(--s-text-secondary)", background: "var(--s-surface)", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--s-bg)"; el.style.borderColor = "var(--s-orange)"; el.style.color = "var(--s-text)"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--s-surface)"; el.style.borderColor = "var(--s-border)"; el.style.color = "var(--s-text-secondary)"; }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--s-orange)", opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                    <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 10, fontWeight: 500, color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : activeTab === "info" ? (
          /* 项目基本信息 — 只展示基本分区，无滚动条 */
          <div style={{ border: "1px solid var(--s-border)", background: "var(--s-surface)" }}>
            <InfoSection title="基本信息" defaultOpen>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <FieldBlock label="项目名称" value={s(p.project_name)} />
                <FieldBlock label="项目编号" value={s(p.project_code)} />
                <FieldBlock label="项目类型" value={typeName} />
                <FieldBlock label="项目阶段" value={stageName} />
                <FieldBlock label="项目状态" value={statusName} />
                <FieldBlock label="部门" value={s(p.department)} />
                <FieldBlock label="销售负责人" value={s(p.role_sales)} />
                <FieldBlock label="售前负责人" value={s(p.role_presales)} />
                <FieldBlock label="市场产品负责人" value={s(p.role_market_product)} />
                <FieldBlock label="项目经理" value={s(p.role_project_manager)} />
                <FieldBlock label="客户类型" value={customerTypeDisplay} />
                <FieldBlock label="部署模式" value={deployName} />
              </div>
            </InfoSection>
          </div>
        ) : activeTab === "integration" ? (
          /* 对接信息 */
          <div style={{ border: "1px solid var(--s-border)", background: "var(--s-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(s(p.project_schema))}&table=integration_info&name=对接信息`, "_blank")}
                style={{ fontSize: 11, color: "#16a34a", cursor: "pointer", border: "1px solid #16a34a", padding: "4px 12px", background: "transparent", fontFamily: "var(--s-font-mono)" }}>
                ✏️ 编辑对接信息
              </button>
            </div>
            {integrations.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--s-text-muted)", fontSize: 13 }}>暂无对接信息</div>
            ) : (
            <InfoSection title={`对接信息（${integrations.length}）`} defaultOpen>
              {integrations.map((it, i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i < integrations.length - 1 ? "1px solid var(--s-border-light)" : "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--s-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "var(--s-orange)", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {s(it.product_module) || s(it.vendor_name) || `对接 #${i + 1}`}
                    {it.in_contract === "是" ? (
                      <span style={{ fontSize: 9, background: "rgba(34,197,94,.12)", color: "#16a34a", padding: "2px 6px", borderRadius: 3, fontWeight: 500 }}>合同内</span>
                    ) : it.in_contract === "否" ? (
                      <span style={{ fontSize: 9, background: "rgba(239,68,68,.12)", color: "#dc2626", padding: "2px 6px", borderRadius: 3, fontWeight: 500 }}>合同外</span>
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                    <FieldBlock label="对接厂商" value={s(it.vendor_name)} />
                    <FieldBlock label="产品目录" value={s(it.product_module)} />
                    <FieldBlock label="对接类型" value={s(it.integration_type)} />
                    <FieldBlock label="是否在合同内" value={s(it.in_contract) + (s(it.contract_note) ? ` (${s(it.contract_note)})` : "")} />
                    <FieldBlock label="简述" value={s(it.brief_description)} span2 html />
                    <FieldBlock label="我方需求对接人" value={s(it.our_req_contact) + (s(it.our_req_contact_phone) ? ` / ${s(it.our_req_contact_phone)}` : "")} />
                    <FieldBlock label="我方产品负责人" value={s(it.our_product_contact) + (s(it.our_product_contact_phone) ? ` / ${s(it.our_product_contact_phone)}` : "")} />
                    <FieldBlock label="我方开发负责人" value={s(it.our_dev_contact) + (s(it.our_dev_contact_phone) ? ` / ${s(it.our_dev_contact_phone)}` : "")} />
                    <FieldBlock label="我方负责内容" value={s(it.our_responsibility)} html />
                    <FieldBlock label="对方需求对接人" value={s(it.their_req_contact) + (s(it.their_req_contact_phone) ? ` / ${s(it.their_req_contact_phone)}` : "")} />
                    <FieldBlock label="对方产品负责人" value={s(it.their_product_contact) + (s(it.their_product_contact_phone) ? ` / ${s(it.their_product_contact_phone)}` : "")} />
                    <FieldBlock label="对方开发负责人" value={s(it.their_dev_contact) + (s(it.their_dev_contact_phone) ? ` / ${s(it.their_dev_contact_phone)}` : "")} />
                    <FieldBlock label="对方负责内容" value={s(it.their_responsibility)} html />
                    {s(it.remark) && <FieldBlock label="备注" value={s(it.remark)} span2 />}
                    {(it.integration_docs as Array<Record<string, unknown>>)?.length > 0 && (
                      <div style={{ gridColumn: "span 2", padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", marginBottom: 4 }}>附件</div>
                        <DocList docs={it.integration_docs as Array<Record<string, unknown>>} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </InfoSection>
            )}
          </div>
        ) : (
          /* 定制化信息 */
          <div style={{ border: "1px solid var(--s-border)", background: "var(--s-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => window.open(`/project-data-view?schema=${encodeURIComponent(s(p.project_schema))}&table=custom_dev_info&name=定制化信息`, "_blank")}
                style={{ fontSize: 11, color: "#16a34a", cursor: "pointer", border: "1px solid #16a34a", padding: "4px 12px", background: "transparent", fontFamily: "var(--s-font-mono)" }}>
                ✏️ 编辑定制化信息
              </button>
            </div>
            {customs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--s-text-muted)", fontSize: 13 }}>暂无定制化信息</div>
            ) : (
            <InfoSection title={`定制化信息（${customs.length}）`} defaultOpen>
              {customs.map((cd, i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i < customs.length - 1 ? "1px solid var(--s-border-light)" : "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--s-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "var(--s-amber)", color: "#fff", width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {s(cd.product_module) || `定制 #${i + 1}`}
                    {cd.in_contract === "是" ? (
                      <span style={{ fontSize: 9, background: "rgba(34,197,94,.12)", color: "#16a34a", padding: "2px 6px", borderRadius: 3, fontWeight: 500 }}>合同内</span>
                    ) : cd.in_contract === "否" ? (
                      <span style={{ fontSize: 9, background: "rgba(239,68,68,.12)", color: "#dc2626", padding: "2px 6px", borderRadius: 3, fontWeight: 500 }}>合同外</span>
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                    <FieldBlock label="产品目录" value={s(cd.product_module)} />
                    <FieldBlock label="是否在合同内" value={s(cd.in_contract) + (s(cd.contract_note) ? ` (${s(cd.contract_note)})` : "")} />
                    <FieldBlock label="定制内容" value={s(cd.custom_content)} span2 html />
                    <FieldBlock label="客户需求提出人" value={s(cd.customer_req_contact) + (s(cd.customer_req_contact_phone) ? ` / ${s(cd.customer_req_contact_phone)}` : "")} />
                    <FieldBlock label="客户方职位" value={s(cd.customer_req_contact_position) + (s(cd.customer_req_contact_note) ? ` (${s(cd.customer_req_contact_note)})` : "")} />
                    <FieldBlock label="内部需求对接人" value={s(cd.internal_req_contact) + (s(cd.internal_req_contact_phone) ? ` / ${s(cd.internal_req_contact_phone)}` : "")} />
                    <FieldBlock label="内部产品负责人" value={s(cd.internal_product_contact) + (s(cd.internal_product_contact_phone) ? ` / ${s(cd.internal_product_contact_phone)}` : "")} />
                    {s(cd.remark) && <FieldBlock label="备注" value={s(cd.remark)} span2 />}
                    {(cd.req_docs as Array<Record<string, unknown>>)?.length > 0 && (
                      <div style={{ gridColumn: "span 2", padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)", display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", marginBottom: 4 }}>需求文档</div>
                        <DocList docs={cd.req_docs as Array<Record<string, unknown>>} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </InfoSection>
            )}
          </div>
        )}
      </div>

      {/* ═══ 全屏弹窗 ═══ */}
      {fullscreenOpen && (
        <FullscreenModal
          title={activeTab === "procurement" ? `📦 合同产品清单 · ${totalModules} 项 · 共 ${totalQty} 套` : activeTab === "integration" ? `🔗 对接信息 · ${integrations.length} 条` : activeTab === "custom" ? `🔧 定制化信息 · ${customs.length} 条` : "📋 项目基本信息"}
          onClose={() => setFullscreenOpen(false)}
        >
          {activeTab === "procurement" ? (
            /* 采购清单 — 7列表格 + 全部列筛选 */
            <>
              <div style={{ display: "flex", gap: 8, padding: "10px 16px", background: "var(--s-surface)", borderBottom: "1px solid var(--s-border)", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", whiteSpace: "nowrap" }}>筛选:</span>
                <input className="fs-filter" data-col="0" placeholder="产品名称..." onInput={filterProcurementTable} style={{ padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", minWidth: 130, flex: 1, maxWidth: 180 }} />
                <input className="fs-filter" data-col="1" placeholder="模块名称..." onInput={filterProcurementTable} style={{ padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", minWidth: 130, flex: 1, maxWidth: 180 }} />
                <input className="fs-filter" data-col="2" placeholder="规格型号..." onInput={filterProcurementTable} style={{ padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", minWidth: 120, flex: 1, maxWidth: 160 }} />
                {/* 厂家自定义下拉 */}
                <div style={{ position: "relative", minWidth: 110, flex: 1, maxWidth: 150 }}>
                  <button
                    type="button"
                    onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                    style={{ width: "100%", padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", color: vendorFilter ? "var(--s-text)" : "var(--s-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 0 }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                      {vendorFilter.length > 0 ? vendorFilter.join("、") : <span style={{ color: "var(--s-text-muted)" }}>厂家...</span>}
                    </span>
                    <span style={{ fontSize: 8, color: "var(--s-text-muted)", flexShrink: 0, marginLeft: 4 }}>▼</span>
                  </button>
                  {vendorDropdownOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setVendorDropdownOpen(false); setVendorSearch(""); }} />
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "var(--s-surface)", border: "1px solid var(--s-border)", borderRadius: 0, minWidth: 180 }}>
                        <input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="搜索厂家..." style={{ width: "100%", padding: "5px 8px", border: "none", borderBottom: "1px solid var(--s-border)", outline: "none", fontSize: 11, fontFamily: "inherit", background: "transparent", color: "var(--s-text)" }} autoFocus />
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                          {vendorOptions.filter(v => !vendorSearch || v.toLowerCase().includes(vendorSearch.toLowerCase())).map(v => {
                            const checked = vendorFilter.includes(v);
                            return (
                              <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 11, color: "var(--s-text-secondary)", cursor: "pointer", borderBottom: "1px solid var(--s-border-light)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s-bg)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                                <input type="checkbox" checked={checked} onChange={() => setVendorFilter(prev => checked ? prev.filter(x => x !== v) : [...prev, v])} style={{ margin: 0 }} />
                                {v}
                              </label>
                            );
                          })}
                        </div>
                        {vendorFilter.length > 0 && (
                          <div onClick={() => { setVendorFilter([]); setVendorDropdownOpen(false); setVendorSearch(""); }} style={{ padding: "5px 10px", fontSize: 10, color: "var(--s-red)", cursor: "pointer", textAlign: "center", borderTop: "1px solid var(--s-border-light)" }}>清除已选</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {/* 范围自定义下拉 */}
                <div style={{ position: "relative", minWidth: 110, flex: 1, maxWidth: 150 }}>
                  <button type="button" onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
                    style={{ width: "100%", padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", color: scopeFilter.length > 0 ? "var(--s-text)" : "var(--s-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 0 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                      {scopeFilter.length > 0 ? scopeFilter.join("、") : <span style={{ color: "var(--s-text-muted)" }}>范围...</span>}
                    </span><span style={{ fontSize: 8, color: "var(--s-text-muted)", flexShrink: 0, marginLeft: 4 }}>▼</span>
                  </button>
                  {scopeDropdownOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => { setScopeDropdownOpen(false); setScopeSearch(""); }} />
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "var(--s-surface)", border: "1px solid var(--s-border)", borderRadius: 0, minWidth: 180 }}>
                        <input value={scopeSearch} onChange={e => setScopeSearch(e.target.value)} placeholder="搜索范围..." style={{ width: "100%", padding: "5px 8px", border: "none", borderBottom: "1px solid var(--s-border)", outline: "none", fontSize: 11, fontFamily: "inherit", background: "transparent", color: "var(--s-text)" }} autoFocus />
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                        {scopeOptions.filter(v => !scopeSearch || v.toLowerCase().includes(scopeSearch.toLowerCase())).map(v => {
                          const checked = scopeFilter.includes(v);
                          return (
                            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", fontSize: 11, color: "var(--s-text-secondary)", cursor: "pointer", borderBottom: "1px solid var(--s-border-light)" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s-bg)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                              <input type="checkbox" checked={checked} onChange={() => setScopeFilter(prev => checked ? prev.filter(x => x !== v) : [...prev, v])} style={{ margin: 0 }} />
                              {v}
                            </label>
                          );
                        })}
                        </div>
                        {scopeFilter.length > 0 && (
                          <div onClick={() => { setScopeFilter([]); setScopeDropdownOpen(false); setScopeSearch(""); }} style={{ padding: "5px 10px", fontSize: 10, color: "var(--s-red)", cursor: "pointer", textAlign: "center", borderTop: "1px solid var(--s-border-light)" }}>清除已选</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => { document.querySelectorAll(".fs-filter").forEach(el => ((el as HTMLInputElement).value = "")); setVendorFilter([]); setScopeFilter([]); filterProcurementTable(); }} style={{ padding: "5px 14px", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1px solid var(--s-border)", background: "var(--s-surface)", color: "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>清除筛选</button>
                <span id="fs-result-count" style={{ fontSize: 10, color: "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", marginLeft: "auto", whiteSpace: "nowrap" }}>显示 <strong>{totalModules}</strong> / {totalModules} 条</span>
              </div>
              <table id="fs-procurement-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["序号","产品名称","模块名称","规格型号","厂家","数量","范围"].map(h => (
                    <th key={h} style={{ background: "var(--s-surface2)", padding: "10px 14px", textAlign: h === "序号" || h === "数量" ? "center" : "left", fontWeight: 600, color: "var(--s-text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", borderBottom: "2px solid var(--s-border)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const details = productDetails[item.name] || {};
                  return (
                  <tr key={i} style={{ background: "var(--s-surface)" }}>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)", textAlign: "center", fontFamily: "var(--s-font-mono)" }}>{i + 1}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", fontWeight: 600, color: "var(--s-text)" }}>{item.name}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-blue)" }}>{details.product_name || item.name}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)", fontFamily: "var(--s-font-mono)", fontSize: 11 }}>{details.model_spec || "—"}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-muted)" }}>{details.vendor || "—"}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)", textAlign: "center", fontFamily: "var(--s-font-mono)", fontWeight: 500 }}>{item.qty}</td>
                    <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)", fontSize: 11 }}>{details.scope || "—"}</td>
                  </tr>
                )})}
              </tbody>
            </table>
            <div id="fs-no-result" style={{ display: "none", textAlign: "center", padding: 40, color: "var(--s-text-muted)", fontSize: 13 }}>没有匹配的记录</div>
            </>
          ) : activeTab === "info" ? (
            /* 项目信息完整版 */
            <div style={{ overflowY: "auto" }}>
              <InfoSection title="基本信息" defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <FieldBlock label="项目名称" value={s(p.project_name)} />
                  <FieldBlock label="项目编号" value={s(p.project_code)} />
                  <FieldBlock label="项目类型" value={typeName} />
                  <FieldBlock label="项目阶段" value={stageName} />
                  <FieldBlock label="项目状态" value={statusName} />
                  <FieldBlock label="部门" value={s(p.department)} />
                  <FieldBlock label="销售负责人" value={s(p.role_sales)} />
                  <FieldBlock label="售前负责人" value={s(p.role_presales)} />
                  <FieldBlock label="市场产品负责人" value={s(p.role_market_product)} />
                  <FieldBlock label="项目经理" value={s(p.role_project_manager)} />
                  <FieldBlock label="客户类型" value={customerTypeDisplay} />
                  <FieldBlock label="部署模式" value={deployName} />
                  <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>项目描述</div>
                    <div className="prose prose-sm max-w-none text-[13px]" style={{ color: "var(--s-text-secondary)", lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: s(p.description) }} />
                  </div>
                </div>
              </InfoSection>
              <InfoSection title="时间信息" defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <FieldBlock label="进场时间" value={fmtDate(p.entry_date)} />
                  <FieldBlock label="初验时间" value={fmtDate(p.initial_acceptance_date)} />
                  <FieldBlock label="终验时间" value={fmtDate(p.final_acceptance_date)} />
                  <FieldBlock label="要求时间" value={fmtDate(p.required_date)} highlight />
                </div>
              </InfoSection>
              <InfoSection title="客户信息" defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <FieldBlock label="客户名称" value={s(ci.company_name)} />
                  <FieldBlock label="最终客户" value={s(p.final_customer)} highlight />
                  <FieldBlock label="实施单位" value={s(p.implementation_unit)} />
                  <FieldBlock label="联系人" value={s(ci.contact_person) + (s(ci.contact_phone) ? " / " + s(ci.contact_phone) : "")} />
                  <FieldBlock label="省/市/区" value={[s(cl.province), s(cl.city), s(cl.district)].filter(Boolean).join(" / ")} />
                  <FieldBlock label="镇/村" value={[s(cl.town), s(cl.village)].filter(Boolean).join(" / ")} />
                  <FieldBlock label="经度/纬度" value={[s(p.longitude), s(p.latitude)].filter(Boolean).join(" / ")} />
                </div>
              </InfoSection>
              {channels.length > 0 && (
                <InfoSection title={`渠道信息（${channels.length}）`}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr>{["公司名称","联系人","联系电话","备注"].map(h => <th key={h} style={{ background: "var(--s-bg)", padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "var(--s-text-muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", borderBottom: "1px solid var(--s-border)" }}>{h}</th>)}</tr></thead>
                    <tbody>{channels.map((ch, i) => <tr key={i}>{["company_name","contact_person","contact_phone","remark"].map(k => <td key={k} style={{ padding: "6px 10px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)" }}>{s(ch[k])}</td>)}</tr>)}</tbody>
                  </table>
                </InfoSection>
              )}
              {units.length > 0 && (
                <InfoSection title={`实施单位（${units.length}）`}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr>{["单位名称","负责人","电话","负责内容"].map(h => <th key={h} style={{ background: "var(--s-bg)", padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "var(--s-text-muted)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--s-font-mono)", borderBottom: "1px solid var(--s-border)" }}>{h}</th>)}</tr></thead>
                    <tbody>{units.map((u, i) => <tr key={i}>{["company_name","contact_person","contact_phone","construction_content"].map(k => <td key={k} style={{ padding: "6px 10px", borderBottom: "1px solid var(--s-border-light)", color: "var(--s-text-secondary)" }}>{s(u[k])}</td>)}</tr>)}</tbody>
                  </table>
                </InfoSection>
              )}
              {integrations.length > 0 && (
                <InfoSection title={`对接信息（${integrations.length}）`}>
                  {integrations.map((it, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--s-text)", marginBottom: 6 }}>对接 #{i+1}：{s(it.product_module)} — {s(it.vendor_name)}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                        {["integration_type","brief_description","in_contract","our_req_contact","their_req_contact"].map(k => (
                          <div key={k} style={{ display: "flex", gap: 4, fontSize: 11 }}>
                            <span style={{ color: "var(--s-text-muted)", fontSize: 9, textTransform: "uppercase", fontFamily: "var(--s-font-mono)", whiteSpace: "nowrap", minWidth: 55 }}>{k}</span>
                            <span style={{ color: "var(--s-text-secondary)" }}>{s(it[k]) || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </InfoSection>
              )}
              {customs.length > 0 && (
                <InfoSection title={`定制开发（${customs.length}）`}>
                  {customs.map((cd, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--s-text)", marginBottom: 6 }}>定制 #{i+1}：{s(cd.product_module)}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                        {["custom_content","in_contract","customer_req_contact","internal_req_contact"].map(k => (
                          <div key={k} style={{ display: "flex", gap: 4, fontSize: 11 }}>
                            <span style={{ color: "var(--s-text-muted)", fontSize: 9, textTransform: "uppercase", fontFamily: "var(--s-font-mono)", whiteSpace: "nowrap", minWidth: 55 }}>{k}</span>
                            <span style={{ color: "var(--s-text-secondary)" }}>{s(cd[k]) || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </InfoSection>
              )}
              {(!!p.procurement_amount || !!p.software_amount || !!p.hardware_amount) && (
                <InfoSection title="采购金额">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 12 }}>
                    <FieldBlock label="合同总金额" value={fmtCurrency(p.procurement_amount)} />
                    <FieldBlock label="合同软件金额" value={fmtCurrency(p.software_amount)} />
                    <FieldBlock label="合同硬件金额" value={fmtCurrency(p.hardware_amount)} />
                  </div>
                </InfoSection>
              )}
            </div>
          ) : activeTab === "integration" ? (
            /* 对接信息完整版 */
            <div style={{ overflowY: "auto", padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--s-text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: "var(--s-orange)", borderRadius: 2 }} />
                对接信息 · {integrations.length} 条
              </div>
              {integrations.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--s-text-muted)", fontSize: 15 }}>暂无对接信息</div>
              ) : (
                integrations.map((it, i) => (
                <div key={i} style={{ marginBottom: 24, padding: 20, border: "1px solid var(--s-border)", background: "var(--s-surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--s-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "var(--s-orange)", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {s(it.product_module) || s(it.vendor_name) || `对接 #${i + 1}`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                    <FieldBlock label="对接厂商" value={s(it.vendor_name)} />
                    <FieldBlock label="产品目录" value={s(it.product_module)} />
                    <FieldBlock label="对接类型" value={s(it.integration_type)} />
                    <FieldBlock label="是否在合同内" value={s(it.in_contract) + (s(it.contract_note) ? ` (${s(it.contract_note)})` : "")} />
                    <FieldBlock label="简述" value={s(it.brief_description)} span2 html />
                    <FieldBlock label="我方需求对接人" value={s(it.our_req_contact) + (s(it.our_req_contact_phone) ? ` / ${s(it.our_req_contact_phone)}` : "")} />
                    <FieldBlock label="我方产品负责人" value={s(it.our_product_contact) + (s(it.our_product_contact_phone) ? ` / ${s(it.our_product_contact_phone)}` : "")} />
                    <FieldBlock label="我方开发负责人" value={s(it.our_dev_contact) + (s(it.our_dev_contact_phone) ? ` / ${s(it.our_dev_contact_phone)}` : "")} />
                    <FieldBlock label="我方负责内容" value={s(it.our_responsibility)} html />
                    <FieldBlock label="对方需求对接人" value={s(it.their_req_contact) + (s(it.their_req_contact_phone) ? ` / ${s(it.their_req_contact_phone)}` : "")} />
                    <FieldBlock label="对方产品负责人" value={s(it.their_product_contact) + (s(it.their_product_contact_phone) ? ` / ${s(it.their_product_contact_phone)}` : "")} />
                    <FieldBlock label="对方开发负责人" value={s(it.their_dev_contact) + (s(it.their_dev_contact_phone) ? ` / ${s(it.their_dev_contact_phone)}` : "")} />
                    <FieldBlock label="对方负责内容" value={s(it.their_responsibility)} html />
                    {s(it.remark) && <FieldBlock label="备注" value={s(it.remark)} span2 />}
                    {(it.integration_docs as Array<Record<string, unknown>>)?.length > 0 && (
                      <div style={{ gridColumn: "span 2", marginTop: 4 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", marginBottom: 6 }}>附件</div>
                        <DocList docs={it.integration_docs as Array<Record<string, unknown>>} />
                      </div>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          ) : (
            /* 定制化信息完整版 */
            <div style={{ overflowY: "auto", padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--s-text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 16, background: "var(--s-amber)", borderRadius: 2 }} />
                定制化信息 · {customs.length} 条
              </div>
              {customs.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--s-text-muted)", fontSize: 15 }}>暂无定制化信息</div>
              ) : (
                customs.map((cd, i) => (
                <div key={i} style={{ marginBottom: 24, padding: 20, border: "1px solid var(--s-border)", background: "var(--s-surface)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--s-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ background: "var(--s-amber)", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    {s(cd.product_module) || `定制 #${i + 1}`}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                    <FieldBlock label="产品目录" value={s(cd.product_module)} />
                    <FieldBlock label="是否在合同内" value={s(cd.in_contract) + (s(cd.contract_note) ? ` (${s(cd.contract_note)})` : "")} />
                    <FieldBlock label="定制内容" value={s(cd.custom_content)} span2 html />
                    <FieldBlock label="客户需求提出人" value={s(cd.customer_req_contact) + (s(cd.customer_req_contact_phone) ? ` / ${s(cd.customer_req_contact_phone)}` : "")} />
                    <FieldBlock label="客户方职位" value={s(cd.customer_req_contact_position) + (s(cd.customer_req_contact_note) ? ` (${s(cd.customer_req_contact_note)})` : "")} />
                    <FieldBlock label="内部需求对接人" value={s(cd.internal_req_contact) + (s(cd.internal_req_contact_phone) ? ` / ${s(cd.internal_req_contact_phone)}` : "")} />
                    <FieldBlock label="内部产品负责人" value={s(cd.internal_product_contact) + (s(cd.internal_product_contact_phone) ? ` / ${s(cd.internal_product_contact_phone)}` : "")} />
                    {s(cd.remark) && <FieldBlock label="备注" value={s(cd.remark)} span2 />}
                    {(cd.req_docs as Array<Record<string, unknown>>)?.length > 0 && (
                      <div style={{ gridColumn: "span 2", marginTop: 4 }}>
                        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)", marginBottom: 6 }}>需求文档</div>
                        <DocList docs={cd.req_docs as Array<Record<string, unknown>>} />
                      </div>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          )}
        </FullscreenModal>
      )}
    </div>
  );
}
