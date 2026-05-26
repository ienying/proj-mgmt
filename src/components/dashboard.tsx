"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";

interface DashboardData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  totalBudget: number;
  usedBudget: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  progress: number;
  status: string;
  deadline: string;
  teamSize: number;
}

export function Dashboard({
  data,
  projects,
}: {
  data: DashboardData;
  projects: ProjectSummary[];
}) {
  // 模拟图表数据
  const projectStatusData = [
    { name: "进行中", value: data.activeProjects, color: "#3b82f6" },
    { name: "已完成", value: data.completedProjects, color: "#10b981" },
    { name: "已暂停", value: 2, color: "#f59e0b" },
  ];

  const monthlyProgressData = [
    { month: "1月", projects: 4, tasks: 12 },
    { month: "2月", projects: 6, tasks: 18 },
    { month: "3月", projects: 8, tasks: 25 },
    { month: "4月", projects: 10, tasks: 32 },
    { month: "5月", projects: 12, tasks: 40 },
    { month: "6月", projects: 15, tasks: 48 },
  ];

  const budgetData = [
    { name: "范围管理", budget: 120000, used: 80000 },
    { name: "进度管理", budget: 80000, used: 60000 },
    { name: "质量管理", budget: 60000, used: 45000 },
    { name: "成本管理", budget: 150000, used: 120000 },
    { name: "风险管理", budget: 40000, used: 25000 },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="w-8 h-8" />
          项目概览
        </h1>
        <p className="text-muted-foreground mt-1">
          实时监控项目状态和进度
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              项目总数
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.activeProjects} 个进行中
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              待处理任务
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {data.totalTasks} 个任务
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              已完成任务
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              完成率 {Math.round((data.completedTasks / data.totalTasks) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              预算使用
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round((data.usedBudget / data.totalBudget) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ¥{(data.usedBudget / 10000).toFixed(0)}万 / ¥
              {(data.totalBudget / 10000).toFixed(0)}万
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">月度项目进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="projects"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tasks"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">项目状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-4">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.value} 个项目
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">模块预算分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                <Bar dataKey="budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="used" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">项目列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>截止日期</TableHead>
                <TableHead>团队规模</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm">{project.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        project.status === "active"
                          ? "default"
                          : project.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {project.status === "active"
                        ? "进行中"
                        : project.status === "completed"
                        ? "已完成"
                        : "已暂停"}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.deadline}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{project.teamSize} 人</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
