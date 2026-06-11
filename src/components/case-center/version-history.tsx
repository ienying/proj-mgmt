"use client";

import { useState, useEffect } from "react";
import { X, History, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface VersionData {
  id: string;
  customer_id: string;
  version_number: number;
  change_summary: string;
  changed_fields: string[];
  operator: string;
  created_at: string;
  snapshot: Record<string, unknown>;
}

interface VersionHistoryProps {
  customerId: string;
  onClose: () => void;
  embedded?: boolean;
}

export function VersionHistory({ customerId, onClose, embedded }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<VersionData | null>(null);

  useEffect(() => {
    fetch(`/api/case-center/versions?customer_id=${customerId}`)
      .then((res) => res.json())
      .then(({ data }) => setVersions(data || []))
      .catch(() => toast.error("加载版本历史失败"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("zh-CN");
  };

  const listContent = (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无版本记录</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {versions.map((v, i) => (
              <button
                key={v.id}
                className="w-full text-left flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedVersion(v)}
              >
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                    v{v.version_number}
                  </div>
                  {i < versions.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{v.change_summary || "版本更新"}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Array.isArray(v.changed_fields) && v.changed_fields.map((f) => (
                      <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{v.operator || "系统"}</span>
                    <span>{formatDate(v.created_at)}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-2" />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );

  const versionDetailDialog = selectedVersion && (
    <Dialog open onOpenChange={() => setSelectedVersion(null)}>
      <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            v{selectedVersion.version_number} · {selectedVersion.change_summary}
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-3">
          {selectedVersion.operator} · {formatDate(selectedVersion.created_at)}
        </div>
        {selectedVersion.changed_fields && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {(selectedVersion.changed_fields as string[]).map((f: string) => (
              <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
            ))}
          </div>
        )}
        <div className="border rounded-lg p-4 bg-muted/10">
          <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
            {JSON.stringify(selectedVersion.snapshot, null, 2)}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (embedded) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          版本历史
        </h3>
        {listContent}
        {versionDetailDialog}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            版本历史
          </DialogTitle>
        </DialogHeader>
        {listContent}
        {versionDetailDialog}
      </DialogContent>
    </Dialog>
  );
}
