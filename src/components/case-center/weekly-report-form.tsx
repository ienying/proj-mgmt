"use client";

import { useState, useEffect } from "react";
import { X, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface WeeklyReport {
  id: string;
  customer_id: string;
  report_week: string;
  content: {
    daily_work?: Record<string, string[]>;
    inspection?: { time: string; scope: string; issues: string; reported: string };
    promotions?: Array<{ theme: string; module: string; images: string; description: string }>;
    business_insights?: Array<{ dept: string; person: string; role: string; description: string; match: string; feedback: string }>;
    market_leads?: Array<{ source: string; content: string; suggestion: string }>;
    unresolved_issues?: Array<{ description: string; reason: string; plan: string }>;
    next_plan?: string;
    support_needed?: string;
    commitment?: boolean;
  };
  created_by: string;
  created_at: string;
}

interface WeeklyReportFormProps {
  customerId: string;
  customerName: string;
  currentUser: { id: string; name: string };
  onClose: () => void;
}

export function WeeklyReportForm({ customerId, customerName, currentUser, onClose }: WeeklyReportFormProps) {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 表单字段
  const [reportWeek, setReportWeek] = useState(getCurrentWeekLabel());
  const [commitment, setCommitment] = useState(false);
  const [dailyWork, setDailyWork] = useState<Record<string, string[]>>({});
  const [inspectionTime, setInspectionTime] = useState("");
  const [inspectionScope, setInspectionScope] = useState("");
  const [inspectionIssues, setInspectionIssues] = useState("");
  const [inspectionReported, setInspectionReported] = useState("否");
  const [promotionTheme, setPromotionTheme] = useState("");
  const [promotionModule, setPromotionModule] = useState("");
  const [promotionDesc, setPromotionDesc] = useState("");
  const [businessDept, setBusinessDept] = useState("");
  const [businessPerson, setBusinessPerson] = useState("");
  const [businessRole, setBusinessRole] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [businessMatch, setBusinessMatch] = useState("");
  const [businessFeedback, setBusinessFeedback] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadContent, setLeadContent] = useState("");
  const [leadSuggestion, setLeadSuggestion] = useState("");
  const [unresolvedDesc, setUnresolvedDesc] = useState("");
  const [unresolvedReason, setUnresolvedReason] = useState("");
  const [unresolvedPlan, setUnresolvedPlan] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");

  function getCurrentWeekLabel() {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return `${fmt(monday)} ~ ${fmt(sunday)}`;
  }

  useEffect(() => {
    fetch(`/api/case-center/weekly-reports?customer_id=${customerId}`)
      .then((res) => res.json())
      .then(({ data }) => setReports(data || []))
      .catch(() => toast.error("加载周报失败"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const resetForm = () => {
    setReportWeek(getCurrentWeekLabel());
    setCommitment(false);
    setDailyWork({});
    setInspectionTime("");
    setInspectionScope("");
    setInspectionIssues("");
    setInspectionReported("否");
    setPromotionTheme("");
    setPromotionModule("");
    setPromotionDesc("");
    setBusinessDept("");
    setBusinessPerson("");
    setBusinessRole("");
    setBusinessDesc("");
    setBusinessMatch("");
    setBusinessFeedback("");
    setLeadSource("");
    setLeadContent("");
    setLeadSuggestion("");
    setUnresolvedDesc("");
    setUnresolvedReason("");
    setUnresolvedPlan("");
    setNextPlan("");
    setSupportNeeded("");
  };

  const handleSubmit = async () => {
    if (!commitment) {
      toast.error("请确认诚信声明");
      return;
    }

    const content = {
      commitment,
      daily_work: dailyWork,
      inspection: { time: inspectionTime, scope: inspectionScope, issues: inspectionIssues, reported: inspectionReported },
      promotions: promotionTheme ? [{ theme: promotionTheme, module: promotionModule, images: "", description: promotionDesc }] : [],
      business_insights: businessDept ? [{ dept: businessDept, person: businessPerson, role: businessRole, description: businessDesc, match: businessMatch, feedback: businessFeedback }] : [],
      market_leads: leadSource ? [{ source: leadSource, content: leadContent, suggestion: leadSuggestion }] : [],
      unresolved_issues: unresolvedDesc ? [{ description: unresolvedDesc, reason: unresolvedReason, plan: unresolvedPlan }] : [],
      next_plan: nextPlan,
      support_needed: supportNeeded,
    };

    try {
      const res = await fetch("/api/case-center/weekly-reports", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editId
            ? { id: editId, content }
            : {
                customer_id: customerId,
                report_week: reportWeek,
                content,
                created_by: currentUser.name,
              }
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.duplicate) {
          if (confirm("该学校本周已有您的周报记录，是否覆盖？")) {
            const overwriteRes = await fetch("/api/case-center/weekly-reports", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: err.existing_id, content }),
            });
            if (overwriteRes.ok) {
              toast.success("周报已覆盖更新");
              onClose();
              return;
            }
          }
        }
        throw new Error(err.error || "提交失败");
      }

      toast.success("周报提交成功");
      onClose();
    } catch (error) {
      toast.error("提交失败: " + (error instanceof Error ? error.message : "未知错误"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该周报？")) return;
    const res = await fetch(`/api/case-center/weekly-reports?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("删除成功");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            周报管理 — {customerName}
          </DialogTitle>
        </DialogHeader>

        {/* 已有周报列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">已有周报</h4>
            <Button size="sm" onClick={() => { resetForm(); setEditId(null); setShowForm(true); }}>
              新增周报
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无周报记录</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">周报 {r.report_week}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.created_by} · {new Date(r.created_at).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                      // 编辑模式：填充表单
                      const c = r.content as WeeklyReport["content"];
                      setReportWeek(r.report_week);
                      setCommitment(c.commitment || false);
                      setDailyWork(c.daily_work || {});
                      setInspectionTime(c.inspection?.time || "");
                      setInspectionScope(c.inspection?.scope || "");
                      setInspectionIssues(c.inspection?.issues || "");
                      setInspectionReported(c.inspection?.reported || "否");
                      setPromotionTheme(c.promotions?.[0]?.theme || "");
                      setPromotionModule(c.promotions?.[0]?.module || "");
                      setPromotionDesc(c.promotions?.[0]?.description || "");
                      setBusinessDept(c.business_insights?.[0]?.dept || "");
                      setBusinessPerson(c.business_insights?.[0]?.person || "");
                      setBusinessRole(c.business_insights?.[0]?.role || "");
                      setBusinessDesc(c.business_insights?.[0]?.description || "");
                      setBusinessMatch(c.business_insights?.[0]?.match || "");
                      setBusinessFeedback(c.business_insights?.[0]?.feedback || "");
                      setLeadSource(c.market_leads?.[0]?.source || "");
                      setLeadContent(c.market_leads?.[0]?.content || "");
                      setLeadSuggestion(c.market_leads?.[0]?.suggestion || "");
                      setUnresolvedDesc(c.unresolved_issues?.[0]?.description || "");
                      setUnresolvedReason(c.unresolved_issues?.[0]?.reason || "");
                      setUnresolvedPlan(c.unresolved_issues?.[0]?.plan || "");
                      setNextPlan(c.next_plan || "");
                      setSupportNeeded(c.support_needed || "");
                      setEditId(r.id);
                      setShowForm(true);
                    }}>
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 填写表单 */}
          {showForm && (
            <div className="mt-4 space-y-4 border rounded-lg p-4 bg-muted/10">
              <h4 className="font-medium text-sm">{editId ? "编辑周报" : "新建周报"}</h4>

              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">周报周期</Label>
                  <Input className="w-64" value={reportWeek} onChange={(e) => setReportWeek(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={commitment} onChange={(e) => setCommitment(e.target.checked)} />
                  <Label className="text-xs">本人承诺本周报所有记录真实、准确</Label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">每日核心工作（按日分组，每行一条）</Label>
                {["周一", "周二", "周三", "周四", "周五"].map((day) => (
                  <div key={day} className="flex items-start gap-2">
                    <span className="text-xs w-10 pt-1.5 text-muted-foreground">{day}</span>
                    <Textarea
                      className="flex-1 min-h-[40px] text-xs"
                      value={(dailyWork[day] || []).join("\n")}
                      onChange={(e) => setDailyWork((prev) => ({ ...prev, [day]: e.target.value.split("\n").filter(Boolean) }))}
                      placeholder="工作内容..."
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">巡检时间</Label>
                  <Input className="h-8 text-xs" value={inspectionTime} onChange={(e) => setInspectionTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">巡检范围</Label>
                  <Input className="h-8 text-xs" value={inspectionScope} onChange={(e) => setInspectionScope(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">隐患情况</Label>
                  <Input className="h-8 text-xs" value={inspectionIssues} onChange={(e) => setInspectionIssues(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">是否上报处理</Label>
                  <Select value={inspectionReported} onValueChange={setInspectionReported}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="是">是</SelectItem>
                      <SelectItem value="否">否</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">应用落地宣传</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" placeholder="宣传主题" value={promotionTheme} onChange={(e) => setPromotionTheme(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="产品模块" value={promotionModule} onChange={(e) => setPromotionModule(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="说明" value={promotionDesc} onChange={(e) => setPromotionDesc(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">了解客户业务</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" placeholder="科室" value={businessDept} onChange={(e) => setBusinessDept(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="科室人员" value={businessPerson} onChange={(e) => setBusinessPerson(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="职务" value={businessRole} onChange={(e) => setBusinessRole(e.target.value)} />
                </div>
                <Input className="h-8 text-xs" placeholder="核心业务描述" value={businessDesc} onChange={(e) => setBusinessDesc(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-8 text-xs" placeholder="产品适配分析" value={businessMatch} onChange={(e) => setBusinessMatch(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="宣传效果反馈" value={businessFeedback} onChange={(e) => setBusinessFeedback(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">市场贡献（线索）</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" placeholder="线索来源" value={leadSource} onChange={(e) => setLeadSource(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="线索内容" value={leadContent} onChange={(e) => setLeadContent(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="对接建议" value={leadSuggestion} onChange={(e) => setLeadSuggestion(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">未解决问题</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" placeholder="问题描述" value={unresolvedDesc} onChange={(e) => setUnresolvedDesc(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="暂未解决原因" value={unresolvedReason} onChange={(e) => setUnresolvedReason(e.target.value)} />
                  <Input className="h-8 text-xs" placeholder="处理思路" value={unresolvedPlan} onChange={(e) => setUnresolvedPlan(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">下周计划</Label>
                <Textarea className="text-xs min-h-[60px]" value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} placeholder="计划内容..." />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">需要总部支持</Label>
                <Textarea className="text-xs min-h-[40px]" value={supportNeeded} onChange={(e) => setSupportNeeded(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>取消</Button>
                <Button size="sm" onClick={handleSubmit}>{editId ? "更新" : "提交"}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
