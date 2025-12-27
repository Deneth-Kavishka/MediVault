import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  RefreshCw,
  Stethoscope,
  Pill,
  FlaskConical,
  FileCheck,
  Shield,
  Clock,
  UserCheck,
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
  Area,
  AreaChart,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const { toast } = useToast();

  // Fetch system settings for PDF header
  const { data: settings } = useQuery<{
    systemName: string;
    systemEmail: string;
    systemPhone: string;
    systemAddress: string;
  }>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  // Fetch all necessary data
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
  });

  const {
    data: patients,
    isLoading: patientsLoading,
    refetch: refetchPatients,
  } = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });

  const {
    data: doctors,
    isLoading: doctorsLoading,
    refetch: refetchDoctors,
  } = useQuery<any[]>({
    queryKey: ["/api/doctors"],
  });

  const {
    data: auditLogs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-timeline"],
  });

  const handleRefreshAll = async () => {
    toast({
      title: "Refreshing Data",
      description: "Fetching latest analytics data...",
    });
    await Promise.all([
      refetchAppointments(),
      refetchPatients(),
      refetchDoctors(),
      refetchLogs(),
    ]);
    toast({
      title: "Data Refreshed",
      description: "All analytics data updated successfully",
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
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      // Organization Header
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text(
        settings?.systemName || "MediVault Healthcare System",
        pageWidth / 2,
        yPosition,
        {
          align: "center",
        }
      );

      yPosition += 6;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      if (settings?.systemAddress) {
        doc.text(settings.systemAddress, pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 4;
      }
      if (settings?.systemPhone || settings?.systemEmail) {
        const contactInfo = [settings?.systemPhone, settings?.systemEmail]
          .filter(Boolean)
          .join(" | ");
        doc.text(contactInfo, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 8;
      } else {
        yPosition += 4;
      }

      // Report Title
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text("Analytics Report", pageWidth / 2, yPosition, {
        align: "center",
      });

      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated on ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );

      yPosition += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;

      // Overview Statistics
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("System Overview", 15, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      const overviewData = [
        [
          "Total Patients",
          stats.totalPatients.toString(),
          "Active Patients",
          stats.activePatients.toString(),
        ],
        [
          "Medical Staff",
          stats.totalDoctors.toString(),
          "Total Appointments",
          stats.totalAppointments.toString(),
        ],
        [
          "Completed",
          stats.completedAppointments.toString(),
          "Pending",
          stats.pendingAppointments.toString(),
        ],
        [
          "Confirmed",
          stats.confirmedAppointments.toString(),
          "Completion Rate",
          `${completionRate}%`,
        ],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Metric", "Value", "Metric", "Value"]],
        body: overviewData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Appointment Status Breakdown
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text("Appointment Status Breakdown", 15, yPosition);
      yPosition += 10;

      const statusData = [
        ["Completed", stats.completedAppointments.toString()],
        ["Confirmed", stats.confirmedAppointments.toString()],
        ["Pending", stats.pendingAppointments.toString()],
        ["Cancelled", stats.cancelledAppointments.toString()],
        ["Total", stats.totalAppointments.toString()],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Status", "Count"]],
        body: statusData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Audit Logs Summary
      if (filteredLogs.length > 0) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text("Audit Logs Summary", 15, yPosition);
        yPosition += 5;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Showing ${Math.min(filteredLogs.length, 20)} most recent entries`,
          15,
          yPosition + 5
        );
        yPosition += 10;

        const auditData = filteredLogs
          .slice(0, 20)
          .map((log: any) => [
            format(new Date(log.createdAt), "MM/dd/yy HH:mm"),
            log.action,
            log.entityType || "system",
            log.userId?.slice(0, 8) || "System",
          ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Timestamp", "Action", "Entity", "User ID"]],
          body: auditData,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
        });
      }

      // Footer on last page
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages} | MediVault Medical Management System`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save PDF
      doc.save(
        `MediVault-Analytics-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      );

      toast({
        title: "Export Successful",
        description: "Analytics report exported to PDF",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const stats = {
    totalPatients: patients?.length || 0,
    activePatients: patients?.filter((p: any) => p.isActive).length || 0,
    totalDoctors: doctors?.length || 0,
    totalAppointments: appointments?.length || 0,
    completedAppointments:
      appointments?.filter((a: any) => a.status === "completed").length || 0,
    pendingAppointments:
      appointments?.filter((a: any) => a.status === "pending").length || 0,
    confirmedAppointments:
      appointments?.filter((a: any) => a.status === "confirmed").length || 0,
    cancelledAppointments:
      appointments?.filter((a: any) => a.status === "cancelled").length || 0,
  };

  // Calculate completion rate
  const completionRate =
    stats.totalAppointments > 0
      ? Math.round(
          (stats.completedAppointments / stats.totalAppointments) * 100
        )
      : 0;

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
    "hsl(var(--chart-5))",
  ];

  // Appointment status distribution
  const appointmentStatusData = [
    { name: "Completed", value: stats.completedAppointments, color: "#10b981" },
    { name: "Confirmed", value: stats.confirmedAppointments, color: "#3b82f6" },
    { name: "Pending", value: stats.pendingAppointments, color: "#f59e0b" },
    { name: "Cancelled", value: stats.cancelledAppointments, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  // Calculate appointments trend (last 14 days)
  const appointmentsTrend = (() => {
    if (!appointments) return [];
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const appointmentsByDate = new Map<string, number>();
    const allDates: string[] = [];

    // Generate all dates for last 14 days
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "MMM dd");
      allDates.push(dateStr);
      appointmentsByDate.set(dateStr, 0);
    }

    appointments
      .filter((a: any) => new Date(a.createdAt) >= fourteenDaysAgo)
      .forEach((a: any) => {
        const date = format(new Date(a.createdAt), "MMM dd");
        appointmentsByDate.set(date, (appointmentsByDate.get(date) || 0) + 1);
      });

    return allDates.map((date) => ({
      date,
      appointments: appointmentsByDate.get(date) || 0,
    }));
  })();

  // Doctor workload distribution
  const doctorWorkload = (() => {
    if (!appointments || !doctors) return [];
    const workloadMap = new Map<string, { name: string; count: number }>();

    appointments.forEach((apt: any) => {
      if (apt.doctorId) {
        const existing = workloadMap.get(apt.doctorId);
        if (existing) {
          existing.count++;
        } else {
          const doctor = doctors.find((d: any) => d.id === apt.doctorId);
          const name = doctor?.user
            ? `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`
            : "Unknown";
          workloadMap.set(apt.doctorId, { name, count: 1 });
        }
      }
    });

    return Array.from(workloadMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 doctors
  })();

  const isLoading = appointmentsLoading || patientsLoading || doctorsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive medical system analytics and audit logs
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
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

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="charts">
            <TrendingUp className="w-4 h-4 mr-2" />
            Charts & Trends
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Shield className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Patients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : stats.totalPatients}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activePatients} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Medical Staff
                </CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : stats.totalDoctors}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active doctors
                </p>
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
                  {isLoading ? "..." : stats.totalAppointments}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingAppointments} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : `${completionRate}%`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedAppointments} completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Status Distribution</CardTitle>
                <CardDescription>
                  Current breakdown of all appointments by status
                </CardDescription>
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
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Activity Summary</CardTitle>
                <CardDescription>Real-time system statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">
                        Completed Appointments
                      </span>
                    </div>
                    <Badge className="bg-green-500">
                      {stats.completedAppointments}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">
                        Confirmed Appointments
                      </span>
                    </div>
                    <Badge className="bg-blue-500">
                      {stats.confirmedAppointments}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium">
                        Pending Appointments
                      </span>
                    </div>
                    <Badge className="bg-yellow-500">
                      {stats.pendingAppointments}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium">
                        Cancelled Appointments
                      </span>
                    </div>
                    <Badge className="bg-red-500">
                      {stats.cancelledAppointments}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          {/* Appointment Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Appointment Trends (Last 14 Days)
              </CardTitle>
              <CardDescription>
                Daily appointment creation over the past two weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading chart data...
                </div>
              ) : appointmentsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={appointmentsTrend}>
                    <defs>
                      <linearGradient
                        id="colorAppointments"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorAppointments)"
                      name="Appointments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No appointment data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Doctor Workload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Doctor Workload Distribution
              </CardTitle>
              <CardDescription>
                Top 5 doctors by total appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading chart data...
                </div>
              ) : doctorWorkload.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={doctorWorkload}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-15}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--chart-2))"
                      name="Total Appointments"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No workload data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters for Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
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
                      <SelectItem value="access">Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    System Audit Logs
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {filteredLogs.length} audit records found
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  <Activity className="w-3 h-3 mr-1" />
                  Security Tracking
                </Badge>
              </div>
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
                        <TableCell colSpan={6} className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                          Loading audit logs...
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <Shield className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="font-medium">No audit logs found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log: any, index: number) => (
                        <TableRow key={log.id || index}>
                          <TableCell className="text-sm">
                            {format(
                              new Date(log.createdAt),
                              "MMM dd, yyyy HH:mm:ss"
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.action}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.entityType || "system"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-mono">
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
      </Tabs>
    </div>
  );
}
