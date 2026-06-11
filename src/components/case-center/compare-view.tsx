"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CompareSchool {
  school_id: string;
  school_name: string;
  school_type: string;
  province: string;
  usage_rate: number;
  active_users: number;
  effect: string;
  materials: Array<{ key: string; name: string; size: number }>;
  department_name: string;
  module_name: string;
}

interface CompareViewProps {
  schools: CompareSchool[];
  onClose: () => void;
}

export function CompareView({ schools, onClose }: CompareViewProps) {
  const metrics = [
    { label: "学校类型", key: "school_type" as const },
    { label: "省份", key: "province" as const },
    { label: "所属科室", key: "department_name" as const },
    { label: "模块名称", key: "module_name" as const },
    { label: "使用率", key: "usage_rate" as const, format: (v: number) => `${v}%` },
    { label: "活跃用户", key: "active_users" as const, format: (v: number) => String(v) },
    { label: "落地效果", key: "effect" as const },
    { label: "素材数", key: "materials" as const, format: (v: Array<{ key: string }>) => String(v.length) },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>学校对比 ({schools.length}所)</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-24">指标</th>
                {schools.map((s) => (
                  <th key={s.school_id} className="text-center px-4 py-2 font-medium">
                    <div>{s.school_name}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{s.school_type}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.key} className="border-t">
                  <td className="px-4 py-2 font-medium text-muted-foreground text-xs">{metric.label}</td>
                  {schools.map((s) => {
                    const val = s[metric.key];
                    const display = metric.format
                      ? metric.format(val as never)
                      : String(val ?? "-");
                    return (
                      <td key={s.school_id} className="px-4 py-2 text-center text-xs">
                        {metric.key === "usage_rate" && typeof val === "number" ? (
                          <span className={val >= 80 ? "text-green-600 font-medium" : val >= 50 ? "text-blue-600" : "text-orange-500"}>
                            {display}
                          </span>
                        ) : (
                          display
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-muted-foreground text-center py-2">
          对比结果仅供参考，详细数据请查看各学校画像
        </div>
      </DialogContent>
    </Dialog>
  );
}
