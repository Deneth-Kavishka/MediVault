import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  FileText,
  Users,
  Activity,
  Pill,
  FlaskConical,
  Receipt,
  Bell,
  TrendingUp,
  Database,
  Server,
  AlertTriangle,
  UserPlus,
  Clock,
  Download,
  HardDrive,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DashboardCustomization,
  useDashboardPreferences,
} from "@/components/dashboard-customization";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {user?.firstName || "User"}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your healthcare today
        </p>
      </div>

      {/* Role-specific dashboard content */}
      {user?.role === "patient" && <PatientDashboard />}
      {user?.role === "doctor" && <DoctorDashboard />}
      {user?.role === "pharmacist" && <PharmacistDashboard />}
      {user?.role === "lab_technician" && <LabTechnicianDashboard />}
      {user?.role === "admin" && <AdminDashboard />}
    </div>
  );
}

function PatientDashboard() {
  const statsCards = [
    {
      title: "Upcoming Appointments",
      value: "3",
      icon: Calendar,
      color: "text-chart-1",
    },
    {
      title: "Active Prescriptions",
      value: "2",
      icon: Pill,
      color: "text-chart-2",
    },
    {
      title: "Pending Lab Results",
      value: "1",
      icon: FlaskConical,
      color: "text-chart-3",
    },
    {
      title: "Outstanding Bills",
      value: "$250",
      icon: Receipt,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button data-testid="button-book-appointment">
            <Calendar className="w-4 h-4 mr-2" />
            Book Appointment
          </Button>
          <Button variant="outline" data-testid="button-view-prescriptions">
            <Pill className="w-4 h-4 mr-2" />
            View Prescriptions
          </Button>
          <Button variant="outline" data-testid="button-medical-history">
            <FileText className="w-4 h-4 mr-2" />
            Medical History
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover-elevate"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Dr. Sarah Johnson
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cardiology Consultation
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    Tomorrow, 2:00 PM
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    Confirmed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DoctorDashboard() {
  const statsCards = [
    {
      title: "Today's Appointments",
      value: "12",
      icon: Calendar,
      color: "text-chart-1",
    },
    {
      title: "Pending Consultations",
      value: "5",
      icon: Users,
      color: "text-chart-2",
    },
    {
      title: "Prescriptions Issued",
      value: "8",
      icon: Pill,
      color: "text-chart-3",
    },
    {
      title: "Lab Tests Ordered",
      value: "6",
      icon: FlaskConical,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No appointments scheduled for today
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PharmacistDashboard() {
  const statsCards = [
    {
      title: "Pending Prescriptions",
      value: "15",
      icon: Pill,
      color: "text-chart-1",
    },
    {
      title: "Low Stock Items",
      value: "8",
      icon: Activity,
      color: "text-destructive",
    },
    {
      title: "Dispensed Today",
      value: "42",
      icon: Receipt,
      color: "text-chart-2",
    },
    {
      title: "Restock Requests",
      value: "3",
      icon: Bell,
      color: "text-chart-3",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button data-testid="button-scan-qr">
            <Activity className="w-4 h-4 mr-2" />
            Scan QR Code
          </Button>
          <Button variant="outline" data-testid="button-inventory">
            <Pill className="w-4 h-4 mr-2" />
            Inventory
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LabTechnicianDashboard() {
  const statsCards = [
    {
      title: "Pending Tests",
      value: "18",
      icon: FlaskConical,
      color: "text-chart-1",
    },
    { title: "In Progress", value: "7", icon: Activity, color: "text-chart-2" },
    {
      title: "Completed Today",
      value: "25",
      icon: FileText,
      color: "text-chart-3",
    },
    {
      title: "Abnormal Results",
      value: "2",
      icon: Bell,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: activityTimeline } = useQuery({
    queryKey: ["/api/admin/activity-timeline"],
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: pendingAppointments } = useQuery({
    queryKey: ["/api/admin/pending-appointments"],
  });

  const { data: revenueChart } = useQuery({
    queryKey: ["/api/admin/revenue-chart"],
  });

  const { data: userGrowthChart } = useQuery({
    queryKey: ["/api/admin/user-growth-chart"],
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const { isWidgetVisible } = useDashboardPreferences();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const statsCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers?.toLocaleString() || "0",
      icon: Users,
      color: "text-chart-1",
      description: `${stats?.totalDoctors || 0} doctors, ${
        stats?.totalPharmacists || 0
      } pharmacists, ${stats?.totalLabTechs || 0} lab techs`,
    },
    {
      title: "Active Patients",
      value: stats?.activePatients?.toLocaleString() || "0",
      icon: Users,
      color: "text-chart-2",
      description: "Registered patients in system",
    },
    {
      title: "Total Appointments",
      value: stats?.totalAppointments?.toLocaleString() || "0",
      icon: Calendar,
      color: "text-chart-3",
      description: `${stats?.pendingAppointments || 0} pending, ${
        stats?.completedAppointments || 0
      } completed`,
    },
    {
      title: "Recent Users",
      value: stats?.recentUsers?.length?.toString() || "0",
      icon: Bell,
      color: "text-chart-4",
      description: "New users in last 24 hours",
    },
  ];

  const handleBackup = () => {
    toast({
      title: "Backup Started",
      description: "System backup has been initiated.",
    });
  };

  const handleMonthlyReport = () => {
    toast({
      title: "Generating Report",
      description: "Monthly report is being generated...",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Customization Button */}
      <div className="flex items-center justify-end">
        <DashboardCustomization />
      </div>

      {/* Stats Grid */}
      {isWidgetVisible("stats") && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                {stat.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {stat.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions Section */}
      {isWidgetVisible("quickActions") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => setShowAddUserDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/appointments")}
            >
              <Clock className="w-4 h-4 mr-2" />
              View Today's Appointments
            </Button>
            <Button variant="outline" onClick={handleMonthlyReport}>
              <Download className="w-4 h-4 mr-2" />
              Generate Monthly Report
            </Button>
            <Button variant="outline" onClick={handleBackup}>
              <HardDrive className="w-4 h-4 mr-2" />
              System Backup
            </Button>
            <Button variant="outline" onClick={() => setShowAlertsDialog(true)}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              View Critical Alerts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* System Health Monitor */}
      {isWidgetVisible("systemHealth") && systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" />
              System Health Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Database
                  className={`w-8 h-8 ${
                    systemHealth.database === "healthy"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                />
                <div>
                  <p className="text-sm text-muted-foreground">Database</p>
                  <p className="font-medium capitalize">
                    {systemHealth.database}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-medium">{systemHealth.uptime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="font-medium">
                    {systemHealth.memory.used} / {systemHealth.memory.total} MB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        {isWidgetVisible("revenueChart") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChart && revenueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
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
                      formatter={(value: any) => [`$${value}`, "Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
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
        )}

        {/* User Growth Chart */}
        {isWidgetVisible("userGrowthChart") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Growth (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowthChart && userGrowthChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
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
                    <Bar dataKey="users" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No user growth data available
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Row: Activity Timeline, Pending Appointments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Timeline */}
        {isWidgetVisible("activityTimeline") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {activityTimeline && activityTimeline.length > 0 ? (
                  <div className="space-y-3">
                    {activityTimeline.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 pb-3 border-b last:border-0"
                      >
                        <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Pending Appointments */}
        {isWidgetVisible("pendingAppointments") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {pendingAppointments && pendingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {pendingAppointments.slice(0, 5).map((apt: any) => (
                      <div key={apt.id} className="pb-3 border-b last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            Appointment #{apt.id.slice(0, 8)}
                          </p>
                          <Badge variant="outline">{apt.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(apt.appointmentDate).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending appointments
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Users Table */}
      {isWidgetVisible("recentUsers") &&
        stats?.recentUsers &&
        stats.recentUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              To add a new user, please navigate to User Management.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              setShowAddUserDialog(false);
              setLocation("/admin/users");
            }}
          >
            Go to User Management
          </Button>
        </DialogContent>
      </Dialog>

      {/* Critical Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Critical Alerts</DialogTitle>
            <DialogDescription>
              System alerts and warnings that require attention
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {pendingAppointments && pendingAppointments.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Pending Appointments
                  </h3>
                  <p className="ml-6 text-sm text-muted-foreground">
                    {pendingAppointments.length} appointments awaiting approval
                  </p>
                </div>
              )}
              {systemHealth?.database !== "healthy" && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                    <Database className="w-4 h-4" />
                    Database Warning
                  </h3>
                  <p className="ml-6 text-sm">
                    Database connection is experiencing issues
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
