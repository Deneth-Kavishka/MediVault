import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const { toast } = useToast();

  // Fetch audit logs
  const {
    data: auditLogs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-timeline"],
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch charts data
  const {
    data: revenueChart,
    isLoading: revenueLoading,
    refetch: refetchRevenue,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/revenue-chart"],
  });

  const {
    data: userGrowthChart,
    isLoading: userGrowthLoading,
    refetch: refetchUserGrowth,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/user-growth-chart"],
  });

  const handleRefreshAll = async () => {
    toast({
      title: "Refreshing Data",
      description: "Fetching latest reports data...",
    });
    await Promise.all([
      refetchLogs(),
      refetchStats(),
      refetchRevenue(),
      refetchUserGrowth(),
    ]);
    toast({
      title: "Data Refreshed",
      description: "All reports data updated successfully",
    });
  };

  const handleExportCSV = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      "Timestamp",
      "Action",
      "Entity Type",
      "User ID",
      "Details",
      "IP Address",
    ];
    const rows = auditLogs.map((log: any) => [
      new Date(log.createdAt).toLocaleString(),
      log.action,
      log.entityType || "system",
      log.userId || "N/A",
      log.details || "",
      log.ipAddress || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) =>
        row.map((cell: any) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medivault-audit-logs-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Audit logs exported to CSV",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Generating PDF",
      description: "Report is being generated as PDF...",
    });
    // PDF export will be implemented with a library
  };

  // Filter audit logs
  const filteredLogs =
    auditLogs?.filter((log: any) => {
      const logDate = log.createdAt;
      if (!logDate) return false;
      if (dateFrom && new Date(logDate) < new Date(dateFrom)) return false;
      if (dateTo && new Date(logDate) > new Date(dateTo)) return false;
      if (
        filterAction !== "all" &&
        !log.action.toLowerCase().includes(filterAction.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  // Chart colors
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  // User distribution by role
  const userRoleData = [
    { name: "Patients", value: stats?.activePatients || 0 },
    { name: "Doctors", value: stats?.totalDoctors || 0 },
    { name: "Pharmacists", value: stats?.totalPharmacists || 0 },
    { name: "Lab Techs", value: stats?.totalLabTechs || 0 },
  ];

  // Appointment status data
  const appointmentStatusData = [
    { name: "Pending", value: stats?.pendingAppointments || 0 },
    { name: "Completed", value: stats?.completedAppointments || 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            View system audit logs and generate custom reports
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action Type</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">System Overview</SelectItem>
                  <SelectItem value="audit">Audit Logs</SelectItem>
                  <SelectItem value="revenue">Revenue Report</SelectItem>
                  <SelectItem value="users">User Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Activity className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="charts">
            <TrendingUp className="w-4 h-4 mr-2" />
            Charts & Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.totalUsers || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Patients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.activePatients || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Appointments
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.totalAppointments || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.pendingAppointments || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userRoleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userRoleData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={appointmentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {appointmentStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredLogs.length} records found
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log: any, index: number) => (
                        <TableRow key={log.id || index}>
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.action}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.entityType || "system"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.userId?.slice(0, 8) || "System"}
                          </TableCell>
                          <TableCell className="max-w-md truncate text-sm">
                            {log.details || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.action.toLowerCase().includes("delete") ||
                                log.action.toLowerCase().includes("error")
                                  ? "destructive"
                                  : log.action
                                      .toLowerCase()
                                      .includes("create") ||
                                    log.action.toLowerCase().includes("login")
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {log.action.toLowerCase().includes("error")
                                ? "Error"
                                : "Success"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Revenue Trends (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading chart data...
                </div>
              ) : revenueChart && revenueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any) => [
                        `$${value.toFixed(2)}`,
                        "Revenue",
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      name="Daily Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Growth (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowthLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading chart data...
                </div>
              ) : userGrowthChart && userGrowthChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={userGrowthChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const [year, month] = value.split("-");
                        return `${month}/${year.slice(2)}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any) => [value, "New Users"]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="users"
                      fill="hsl(var(--chart-2))"
                      name="New Users"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No user growth data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
