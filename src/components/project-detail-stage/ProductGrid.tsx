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
function parseModule(m: string | Record<string, unknown>, dict?: { code: string; name: string }[]): { name: string; qty: number } {
  if (typeof m === "string") return { name: lookupName(m, dict), qty: 1 };
  const rawCode = s(m.module_code || m.code || "");
  const rawName = s(m.module_name || m.name || "");
  return { name: rawName || lookupName(rawCode, dict), qty: n(m.quantity || 1) };
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

function FieldBlock({ label, value, span2, highlight }: { label: string; value: string; span2?: boolean; highlight?: boolean }) {
  return (
    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--s-border-light)", display: "flex", flexDirection: "column", gap: 3, borderRight: span2 ? undefined : "1px solid var(--s-border-light)", gridColumn: span2 ? "span 2" : undefined, background: highlight ? "rgba(232,89,12,.03)" : undefined }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--s-text)", wordBreak: "break-all" }}>{value}</div>
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

export function ProductGrid({ modules, moduleDict, project, onFullscreen, projectTypes, projectStages, customerTypeDict }: ProductGridProps) {
  const [activeTab, setActiveTab] = useState<"procurement" | "info">("procurement");
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

  const { items, totalQty, totalModules } = useMemo(() => {
    const parsed = (modules || []).map((m) => parseModule(m, moduleDict)).filter((m) => m.name);
    const merged = new Map<string, number>();
    for (const m of parsed) merged.set(m.name, (merged.get(m.name) || 0) + m.qty);
    const it = Array.from(merged.entries()).map(([name, qty]) => ({ name, qty }));
    return { items: it, totalQty: it.reduce((s, i) => s + i.qty, 0), totalModules: it.length };
  }, [modules, moduleDict]);

  const p = project || {};
  const ci = (p.customer_info as Record<string, unknown>) || {};
  const cl = (p.customer_location as Record<string, unknown>) || {};
  const channels = (p.channel_info as Array<Record<string, unknown>>) || [];
  const units = (p.construction_units_info as Array<Record<string, unknown>>) || [];
  const integrations = (p.integration_list as Array<Record<string, unknown>>) || [];
  const customs = (p.custom_dev_info as Array<Record<string, unknown>>) || [];

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
  const [vendorFilter, setVendorFilter] = useState("");
  const vendorFilterRef = useRef("");
  useEffect(() => { vendorFilterRef.current = vendorFilter; }, [vendorFilter]);
  const vendorOptions = useMemo(() => [...new Set(items.map(it => productDetails[it.name]?.vendor).filter(Boolean) as string[])].sort(), [items, productDetails]);
  useEffect(() => { if (fullscreenOpen) filterProcurementTable(); }, [vendorFilter]); // eslint-disable-line

  const filterProcurementTable = () => {
    setTimeout(() => {
      const filters: string[] = [];
      document.querySelectorAll(".fs-filter").forEach(el => {
        const tag = el.tagName.toLowerCase();
        filters.push(((tag === "select" ? (el as HTMLSelectElement).value : (el as HTMLInputElement).value) || "").toLowerCase());
      });
      // insert vendor filter from ref (avoids stale closure)
      if (filters.length >= 3) filters[3] = vendorFilterRef.current.toLowerCase();
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
      <div className="text-[9px] uppercase tracking-[2px] mb-4 flex items-center gap-2" style={{ color: "var(--s-orange)", fontFamily: "var(--font-mono, monospace)" }}>
        已采购产品清单 · {totalModules} 项 · 共 {totalQty} 套
        <span className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setActiveTab("procurement")} style={{ padding: "8px 20px", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", borderBottom: activeTab === "procurement" ? "2px solid var(--s-orange)" : "2px solid transparent", background: "transparent", color: activeTab === "procurement" ? "var(--s-orange)" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          📦 采购清单 <span style={{ fontSize: 10, opacity: 0.6 }}>{totalModules}</span>
        </button>
        <button onClick={() => setActiveTab("info")} style={{ padding: "8px 20px", fontSize: 11, fontWeight: 500, cursor: "pointer", border: "none", borderBottom: activeTab === "info" ? "2px solid var(--s-orange)" : "2px solid transparent", background: "transparent", color: activeTab === "info" ? "var(--s-orange)" : "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          📋 项目基本信息
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={handleFullscreen} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 14px", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1px solid var(--s-border)", background: "var(--s-surface)", color: "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
        ) : (
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
        )}
      </div>

      {/* ═══ 全屏弹窗 ═══ */}
      {fullscreenOpen && (
        <FullscreenModal
          title={activeTab === "procurement" ? `📦 已采购产品清单 · ${totalModules} 项 · 共 ${totalQty} 套` : "📋 项目基本信息"}
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
                    <span>{vendorFilter || "厂家..."}</span>
                    <span style={{ fontSize: 8, color: "var(--s-text-muted)" }}>▼</span>
                  </button>
                  {vendorDropdownOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setVendorDropdownOpen(false)} />
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "var(--s-surface)", border: "1px solid var(--s-border)", maxHeight: 180, overflowY: "auto", borderRadius: 0 }}>
                        <div onClick={() => { setVendorFilter(""); setVendorDropdownOpen(false); filterProcurementTable(); }} style={{ padding: "5px 10px", fontSize: 11, color: "var(--s-text-muted)", cursor: "pointer", borderBottom: "1px solid var(--s-border-light)" }}>全部厂家</div>
                        {vendorOptions.map(v => (
                          <div key={v} onClick={() => { setVendorFilter(v); setVendorDropdownOpen(false); filterProcurementTable(); }} style={{ padding: "5px 10px", fontSize: 11, color: "var(--s-text-secondary)", cursor: "pointer", borderBottom: "1px solid var(--s-border-light)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s-bg)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                          >{v}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input className="fs-filter" data-col="5" placeholder="范围..." onInput={filterProcurementTable} style={{ padding: "5px 10px", border: "1px solid var(--s-border)", background: "var(--s-surface)", fontSize: 11, fontFamily: "inherit", minWidth: 110, flex: 1, maxWidth: 150 }} />
                <button onClick={() => { document.querySelectorAll(".fs-filter").forEach(el => ((el as HTMLInputElement).value = "")); setVendorFilter(""); filterProcurementTable(); }} style={{ padding: "5px 14px", fontSize: 10, fontWeight: 600, cursor: "pointer", border: "1px solid var(--s-border)", background: "var(--s-surface)", color: "var(--s-text-muted)", fontFamily: "var(--s-font-mono)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>清除筛选</button>
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
          ) : (
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
                  <FieldBlock label="项目描述" value={s(p.description)} span2 />
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
                    <FieldBlock label="采购总金额" value={fmtCurrency(p.procurement_amount)} />
                    <FieldBlock label="软件金额" value={fmtCurrency(p.software_amount)} />
                    <FieldBlock label="硬件金额" value={fmtCurrency(p.hardware_amount)} />
                  </div>
                </InfoSection>
              )}
            </div>
          )}
        </FullscreenModal>
      )}
    </div>
  );
}
