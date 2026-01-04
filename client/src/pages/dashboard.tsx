// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  FileText,
  Users,
  Activity,
  Pill,
  FlaskConical,
  TrendingUp,
  Receipt,
  Bell,
  Database,
  Server,
  UserPlus,
  Clock,
  Download,
  HardDrive,
  Smartphone,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DashboardCustomization,
  useDashboardPreferences,
} from "@/components/dashboard-customization";
import PrescriptionDetailsDialog from "@/components/prescription-details-dialog";
import LabAvailabilitySection from "@/components/lab-availability-section";
import { AdminAddUserDialog } from "@/components/admin/add-user-dialog";

const formatSriLankaDateTime = (
  value: any,
  options?: { withSeconds?: boolean }
) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const withSeconds = options?.withSeconds ?? true;

  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  }).format(date);
};

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, authMessage } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Account Access",
        description:
          authMessage?.trim() || "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [authMessage, isAuthenticated, isLoading, toast]);

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
  const [, navigate] = useLocation();

  // Fetch real data
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/appointments"],
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading } =
    useQuery<any[]>({
      queryKey: ["/api/prescriptions"],
    });

  const { data: labTests = [], isLoading: labTestsLoading } = useQuery<any[]>({
    queryKey: ["/api/lab-tests/patient"],
  });

  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/medical-records"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery<any[]>({
      queryKey: ["/api/notifications"],
    });

  // Calculate statistics
  const upcomingAppointments = appointments.filter(
    (apt: any) =>
      apt.status === "scheduled" && new Date(apt.appointmentDate) >= new Date()
  );

  const activePrescriptions = prescriptions.filter(
    (rx: any) => rx.status === "active" || rx.status === "pending"
  );

  const pendingLabTests = labTests.filter(
    (test: any) => test.status === "pending" || test.status === "approved"
  );

  const unreadNotifications = notifications.filter(
    (notif: any) => !notif.isRead
  );

  const statsCards = [
    {
      title: "Upcoming Appointments",
      value: upcomingAppointments.length.toString(),
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      clickAction: () => navigate("/appointments"),
    },
    {
      title: "Active Prescriptions",
      value: activePrescriptions.length.toString(),
      icon: Pill,
      color: "text-green-600",
      bgColor: "bg-green-50",
      clickAction: () => navigate("/prescriptions"),
    },
    {
      title: "Pending Lab Tests",
      value: pendingLabTests.length.toString(),
      icon: FlaskConical,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      clickAction: () => navigate("/lab-results"),
    },
    {
      title: "Unread Notifications",
      value: unreadNotifications.length.toString(),
      icon: Bell,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      clickAction: () => navigate("/notifications"),
    },
  ];

  const isLoading =
    appointmentsLoading || prescriptionsLoading || labTestsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card
            key={stat.title}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={stat.clickAction}
          >
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
              <p className="text-xs text-muted-foreground mt-1">
                Click to view details
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Health Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground mb-1">
                Total Appointments
              </p>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground mb-1">
                Medical Records
              </p>
              <p className="text-2xl font-bold">{medicalRecords.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/50">
              <p className="text-sm text-muted-foreground mb-1">Lab Tests</p>
              <p className="text-2xl font-bold">{labTests.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/find-doctors")}
            className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            Find Doctors
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/appointments")}
            className="shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Calendar className="w-4 h-4 mr-2" />
            My Appointments
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/prescriptions")}
            className="shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Pill className="w-4 h-4 mr-2" />
            Prescriptions
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/lab-results")}
            className="shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            Lab Results
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/medical-records")}
            className="shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <FileText className="w-4 h-4 mr-2" />
            Medical Records
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Appointments
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/appointments")}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No upcoming appointments
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/find-doctors")}
                >
                  Book an Appointment
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                          <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {apt.doctorName || "Doctor"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {apt.reason || "Consultation"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground text-sm">
                          {new Date(apt.appointmentDate).toLocaleDateString()}
                        </p>
                        <Badge
                          variant={
                            apt.status === "scheduled" ? "default" : "secondary"
                          }
                          className="mt-1"
                        >
                          {apt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Lab Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Recent Lab Tests
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/lab-results")}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {labTests.length === 0 ? (
              <div className="text-center py-8">
                <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No lab tests found</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {labTests.slice(0, 5).map((test: any) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {test.testName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {test.testType} • Dr. {test.doctorName}
                        </p>
                        {test.urgency === "high" && (
                          <Badge variant="destructive" className="mt-1">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            test.status === "completed"
                              ? "default"
                              : test.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {test.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(test.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Active Prescriptions
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/prescriptions")}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePrescriptions.length === 0 ? (
            <div className="text-center py-8">
              <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active prescriptions</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePrescriptions.slice(0, 6).map((rx: any) => (
                <div
                  key={rx.id}
                  className="p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    // Open prescription details - implement later
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {rx.medicineName || rx.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {rx.doctorName}
                      </p>
                    </div>
                    <Badge
                      variant={
                        rx.status === "issued"
                          ? "default"
                          : rx.status === "dispensed"
                          ? "outline"
                          : rx.status === "expired"
                          ? "destructive"
                          : "secondary"
                      }
                      className={
                        rx.status === "dispensed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          : ""
                      }
                    >
                      {rx.status}
                    </Badge>
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-1 mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Scanned:{" "}
                        {rx.lastScannedAt
                          ? new Date(rx.lastScannedAt).toLocaleString()
                          : "Not scanned"}
                      </span>
                    </div>
                    {rx.dispensedAt && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          Dispensed: {new Date(rx.dispensedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DoctorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/appointments"],
    refetchInterval: 15000,
  });

  // Fetch doctor id (needed for availability)
  const { data: doctors = [] } = useQuery<any[]>({
    queryKey: ["/api/doctors"],
    enabled: !!user,
  });

  const currentDoctor = useMemo(() => {
    if (!user?.id) return null;
    return doctors.find((d: any) => d.userId === user.id) || null;
  }, [doctors, user?.id]);

  const { data: availability = [], isLoading: availabilityLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/doctor-availability/doctor", currentDoctor?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/doctor-availability/doctor/${currentDoctor?.id}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
    enabled: !!currentDoctor?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const todayKey = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const derived = useMemo(() => {
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const safeAvailability = Array.isArray(availability) ? availability : [];

    const getAptDayKey = (apt: any) => {
      try {
        const d = apt?.appointmentDate ? new Date(apt.appointmentDate) : null;
        if (!d || Number.isNaN(d.getTime())) return null;
        return format(d, "yyyy-MM-dd");
      } catch {
        return null;
      }
    };

    const todaysAppointments = safeAppointments
      .filter((apt: any) => {
        const dayKey = getAptDayKey(apt);
        return dayKey === todayKey;
      })
      .filter(
        (apt: any) => apt?.status !== "cancelled" && apt?.status !== "completed"
      )
      .sort((a: any, b: any) => {
        const aTime = (a?.appointmentTime || "").toString();
        const bTime = (b?.appointmentTime || "").toString();
        return aTime.localeCompare(bTime);
      });

    const pending = safeAppointments.filter(
      (a: any) => a?.status === "pending"
    ).length;
    const confirmed = safeAppointments.filter(
      (a: any) => a?.status === "confirmed"
    ).length;
    const completed = safeAppointments.filter(
      (a: any) => a?.status === "completed"
    ).length;
    const cancelled = safeAppointments.filter(
      (a: any) => a?.status === "cancelled"
    ).length;
    const cancellationRequested = safeAppointments.filter(
      (a: any) => a?.status === "cancellation_requested"
    ).length;

    const upcomingAppointments = safeAppointments
      .filter((apt: any) => {
        const d = apt?.appointmentDate ? new Date(apt.appointmentDate) : null;
        if (!d || Number.isNaN(d.getTime())) return false;
        return d.getTime() >= new Date().setHours(0, 0, 0, 0);
      })
      .filter(
        (apt: any) => apt?.status !== "cancelled" && apt?.status !== "completed"
      );

    // Last 14 days chart by scheduled appointment date
    const days: { key: string; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        key: format(d, "yyyy-MM-dd"),
        label: format(d, "MM/dd"),
      });
    }
    const countsByDay = new Map<string, number>();
    for (const apt of safeAppointments) {
      const key = getAptDayKey(apt);
      if (!key) continue;
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }
    const appointmentsTrend = days.map((d) => ({
      day: d.label,
      appointments: countsByDay.get(d.key) || 0,
    }));

    const statusBreakdown = [
      { status: "Pending", value: pending },
      { status: "Confirmed", value: confirmed },
      { status: "Cancellation Req.", value: cancellationRequested },
      { status: "Cancelled", value: cancelled },
      { status: "Completed", value: completed },
    ];

    const upcomingAvailability = safeAvailability.filter((a: any) => {
      const status = a?.status || (a?.isActive ? "active" : "inactive");
      if (status === "deleted") return false;
      if (!a?.availableDate) return false;
      const d = new Date(a.availableDate);
      if (Number.isNaN(d.getTime())) return false;
      return d.getTime() >= new Date().setHours(0, 0, 0, 0);
    });

    const totalSlots = upcomingAvailability.reduce(
      (sum: number, a: any) => sum + (Number(a?.maxPatients) || 0),
      0
    );
    const bookedSlots = upcomingAvailability.reduce(
      (sum: number, a: any) => sum + (Number(a?.bookedCount) || 0),
      0
    );
    const utilizationPct =
      totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

    return {
      todaysAppointments,
      pending,
      confirmed,
      completed,
      cancelled,
      cancellationRequested,
      upcomingAppointmentsCount: upcomingAppointments.length,
      appointmentsTrend,
      statusBreakdown,
      upcomingAvailabilityCount: upcomingAvailability.length,
      utilizationPct,
    };
  }, [appointments, availability, todayKey]);

  const overviewCards = [
    {
      title: "Today's Appointments",
      value: derived.todaysAppointments.length,
      icon: Calendar,
      color: "text-blue-600",
      onClick: () => navigate("/appointments"),
    },
    {
      title: "Pending Approvals",
      value: derived.pending,
      icon: Clock,
      color: "text-amber-600",
      onClick: () => navigate("/appointments"),
    },
    {
      title: "Cancellation Requests",
      value: derived.cancellationRequested,
      icon: XCircle,
      color: "text-orange-600",
      onClick: () => navigate("/appointments"),
    },
    {
      title: "Upcoming Schedules",
      value: derived.upcomingAvailabilityCount,
      icon: Users,
      color: "text-green-600",
      onClick: () => navigate("/doctor/availability"),
    },
  ];

  const isLoading = appointmentsLoading || availabilityLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Doctor Dashboard
          </h2>
          <p className="text-muted-foreground">
            Overview and analytics of your appointments and schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/appointments")}>
            View Appointments
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/doctor/availability")}
          >
            Manage Availability
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((stat) => (
              <Card
                key={stat.title}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={stat.onClick}
              >
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Click to view details
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <CardDescription>
                {derived.todaysAppointments.length} appointment(s) today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {derived.todaysAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No appointments scheduled for today
                </div>
              ) : (
                <div className="space-y-3">
                  {derived.todaysAppointments.slice(0, 8).map((apt: any) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {apt.patientName || "Patient"}
                          </span>
                          <Badge variant="outline">{apt.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.appointmentTime
                            ? `Time: ${apt.appointmentTime}`
                            : ""}
                          {apt.reason ? ` • ${apt.reason}` : ""}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/appointments")}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(appointments) ? appointments.length : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {derived.upcomingAppointmentsCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{derived.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Utilization (Upcoming)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {derived.utilizationPct}%
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(derived.utilizationPct, 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Appointments Trend (14 days)
                </CardTitle>
                <CardDescription>
                  Count of scheduled appointments by day
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={derived.appointmentsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="appointments"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Status Breakdown
                </CardTitle>
                <CardDescription>
                  Current appointment status counts
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={derived.statusBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PharmacistDashboard() {
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch pharmacist stats
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/prescriptions/pharmacist/stats"],
  });

  // Fetch recent prescriptions scanned by pharmacist
  const { data: recentPrescriptions, isLoading: prescriptionsLoading } =
    useQuery<any>({
      queryKey: ["/api/prescriptions/pharmacist/recent"],
      refetchInterval: 5000, // Refresh every 5 seconds
    });

  // Debug log
  console.log("📋 Recent prescriptions data:", recentPrescriptions);

  const statsCards = [
    {
      title: "Scanned Today",
      value: stats?.scannedToday || 0,
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "Pending",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      title: "Dispensed Today",
      value: stats?.dispensedToday || 0,
      icon: Pill,
      color: "text-green-600",
    },
    {
      title: "Not Dispensed Today",
      value: stats?.notDispensedToday || 0,
      icon: XCircle,
      color: "text-red-600",
    },
    {
      title: "Total Completed",
      value: stats?.totalCompleted || 0,
      icon: CheckCircle,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Pharmacy Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage prescriptions and dispense medications
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {statsLoading
          ? Array.from({ length: statsCards.length }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statsCards.map((stat) => (
              <Card
                key={stat.title}
                className="hover:shadow-lg transition-all duration-200 border-l-4"
                style={{ borderLeftColor: stat.color.replace("text-", "#") }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.title === "Scanned Today" && "Today's scans"}
                    {stat.title === "Pending" && "Awaiting dispensing"}
                    {stat.title === "Dispensed Today" &&
                      "Successfully dispensed"}
                    {stat.title === "Not Dispensed Today" &&
                      "Completed as not dispensed"}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Activity / Analytics Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Today's Activity
            </CardTitle>
            <CardDescription>Overview of your daily work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Prescriptions Scanned</p>
                    <p className="text-xs text-muted-foreground">
                      This session
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{stats?.scannedToday || 0}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Dispensed Today</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {stats?.dispensedToday || 0}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Not Dispensed Today</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {stats?.notDispensedToday || 0}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">Pending</p>
                    <p className="text-xs text-muted-foreground">
                      Awaiting action
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Overview
            </CardTitle>
            <CardDescription>Your pharmacy statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm font-bold text-green-600">
                    {stats?.totalCompleted > 0
                      ? Math.round(
                          ((stats.processedToday || 0) / stats.totalCompleted) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        stats?.totalCompleted > 0
                          ? Math.min(
                              Math.round(
                                ((stats.processedToday || 0) /
                                  stats.totalCompleted) *
                                  100
                              ),
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Progress</span>
                  <span className="text-sm font-bold text-blue-600">
                    {stats?.scannedToday > 0
                      ? Math.round(
                          ((stats.processedToday || 0) / stats.scannedToday) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        stats?.scannedToday > 0
                          ? Math.min(
                              Math.round(
                                ((stats.processedToday || 0) /
                                  stats.scannedToday) *
                                  100
                              ),
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Completed
                  </span>
                  <span className="text-lg font-bold">
                    {stats?.totalCompleted || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanned Prescriptions List with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Scanned Prescriptions
              </CardTitle>
              <CardDescription className="mt-1">
                {recentPrescriptions?.length || 0} prescription(s) scanned by
                you
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Input
                placeholder="Search by patient name, doctor, or QR code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground self-center mr-2">
                Status:
              </span>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                size="sm"
                className="rounded-full"
              >
                All
              </Button>
              <Button
                variant={statusFilter === "issued" ? "default" : "outline"}
                onClick={() => setStatusFilter("issued")}
                size="sm"
                className="rounded-full"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "dispensed" ? "default" : "outline"}
                onClick={() => setStatusFilter("dispensed")}
                size="sm"
                className="rounded-full"
              >
                Dispensed
              </Button>
              <Button
                variant={statusFilter === "expired" ? "default" : "outline"}
                onClick={() => setStatusFilter("expired")}
                size="sm"
                className="rounded-full"
              >
                Expired
              </Button>
              <Button
                variant={
                  statusFilter === "not_dispensed" ? "default" : "outline"
                }
                onClick={() => setStatusFilter("not_dispensed")}
                size="sm"
                className="rounded-full"
              >
                Not Dispensed
              </Button>
            </div>

            {/* Date Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground self-center mr-2">
                Scan Time:
              </span>
              <Button
                variant={dateFilter === "all" ? "default" : "outline"}
                onClick={() => setDateFilter("all")}
                size="sm"
                className="rounded-full"
              >
                All Time
              </Button>
              <Button
                variant={dateFilter === "today" ? "default" : "outline"}
                onClick={() => setDateFilter("today")}
                size="sm"
                className="rounded-full"
              >
                Today
              </Button>
              <Button
                variant={dateFilter === "week" ? "default" : "outline"}
                onClick={() => setDateFilter("week")}
                size="sm"
                className="rounded-full"
              >
                This Week
              </Button>
              <Button
                variant={dateFilter === "month" ? "default" : "outline"}
                onClick={() => setDateFilter("month")}
                size="sm"
                className="rounded-full"
              >
                This Month
              </Button>
            </div>
          </div>

          {/* Prescriptions List */}
          {prescriptionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : recentPrescriptions && recentPrescriptions.length > 0 ? (
            (() => {
              // Helper function to check date range
              const isInDateRange = (date: string | null) => {
                if (!date || dateFilter === "all") return true;

                const scanDate = new Date(date);
                const now = new Date();

                if (dateFilter === "today") {
                  return scanDate.toDateString() === now.toDateString();
                }

                if (dateFilter === "week") {
                  const weekAgo = new Date(now);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return scanDate >= weekAgo;
                }

                if (dateFilter === "month") {
                  const monthAgo = new Date(now);
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return scanDate >= monthAgo;
                }

                return true;
              };

              // Filter prescriptions
              const filtered = recentPrescriptions.filter(
                (prescription: any) => {
                  // Status filter
                  if (statusFilter !== "all") {
                    if (statusFilter === "issued") {
                      if (
                        prescription.status !== "issued" &&
                        prescription.status !== "active"
                      ) {
                        return false;
                      }
                    } else if (prescription.status !== statusFilter) {
                      return false;
                    }
                  }

                  // Date filter based on lastScannedAt
                  if (!isInDateRange(prescription.lastScannedAt)) {
                    return false;
                  }

                  // Search filter
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    return (
                      prescription.patientName?.toLowerCase().includes(query) ||
                      prescription.doctorName?.toLowerCase().includes(query) ||
                      prescription.qrCode?.toLowerCase().includes(query)
                    );
                  }
                  return true;
                }
              );

              return filtered.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filtered.map((prescription: any) => (
                      <div
                        key={prescription.id}
                        className="group border-2 rounded-xl p-5 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer bg-card"
                        onClick={() => {
                          setSelectedPrescription(prescription);
                          setShowPrescriptionDetails(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-lg">
                                  {prescription.patientName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  by Dr. {prescription.doctorName}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={
                              prescription.status === "dispensed"
                                ? "default"
                                : prescription.status === "expired"
                                ? "destructive"
                                : prescription.status === "not_dispensed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs px-3 py-1"
                          >
                            {prescription.status === "not_dispensed"
                              ? "NOT DISPENSED"
                              : String(prescription.status || "").toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <div>
                              <p className="text-xs">Issued</p>
                              <p className="font-medium text-foreground">
                                {new Date(
                                  prescription.issuedDate
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <div>
                              <p className="text-xs">Last Scanned</p>
                              <p className="font-medium text-foreground">
                                {prescription.lastScannedAt
                                  ? new Date(
                                      prescription.lastScannedAt
                                    ).toLocaleString()
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Pill className="h-4 w-4" />
                            <div>
                              <p className="text-xs">Medications</p>
                              <p className="font-medium text-foreground">
                                {prescription.medications?.length || 0} item(s)
                              </p>
                            </div>
                          </div>
                          {prescription.dispensedAt && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CheckCircle className="h-4 w-4" />
                              <div>
                                <p className="text-xs">
                                  {prescription.status === "not_dispensed"
                                    ? "Not Dispensed"
                                    : prescription.status === "expired"
                                    ? "Expired"
                                    : "Dispensed"}
                                </p>
                                <p className="font-medium text-foreground">
                                  {new Date(
                                    prescription.dispensedAt
                                  ).toLocaleString()}
                                </p>
                                {((prescription as any).dispensedByName ||
                                  (prescription as any).dispensedBy) && (
                                  <p className="text-xs text-muted-foreground">
                                    By:{" "}
                                    {(prescription as any).dispensedByName ||
                                      "Pharmacist"}
                                    {(prescription as any)
                                      .dispensedByLicenseNumber
                                      ? ` (License No: ${
                                          (prescription as any)
                                            .dispensedByLicenseNumber
                                        })`
                                      : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No prescriptions match your filters</p>
                  <p className="text-sm">
                    Try adjusting your search or filters
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No prescriptions scanned yet</p>
              <p className="text-sm">Scan a QR code to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Details Dialog */}
      {selectedPrescription && (
        <PrescriptionDetailsDialog
          open={showPrescriptionDetails}
          onClose={() => {
            setShowPrescriptionDetails(false);
            setSelectedPrescription(null);
          }}
          prescription={selectedPrescription}
        />
      )}
    </div>
  );
}

function LabTechnicianDashboard() {
  const { data: labTests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/lab-tests/technician"],
  });

  const todayKey = new Date().toDateString();

  const pendingCount = (labTests || []).filter(
    (t: any) => t.status === "pending" || t.status === "approved"
  ).length;
  const inProgressCount = (labTests || []).filter(
    (t: any) => t.status === "in_progress"
  ).length;
  const completedCount = (labTests || []).filter(
    (t: any) => t.status === "completed"
  ).length;
  const completedTodayCount = (labTests || []).filter((t: any) => {
    if (t.status !== "completed" || !t.completionDate) return false;
    return new Date(t.completionDate).toDateString() === todayKey;
  }).length;
  const abnormalCount = (labTests || []).filter(
    (t: any) => t.status === "completed" && t.isAbnormal
  ).length;

  const completionRate = useMemo(() => {
    const denom = pendingCount + inProgressCount + completedCount;
    if (!denom) return 0;
    return Math.round((completedCount / denom) * 100);
  }, [completedCount, inProgressCount, pendingCount]);

  const abnormalRate = useMemo(() => {
    if (!completedCount) return 0;
    return Math.round((abnormalCount / completedCount) * 100);
  }, [abnormalCount, completedCount]);

  const last7Days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const days: {
      key: string;
      label: string;
      completed: number;
      abnormal: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
      });
      days.push({ key, label, completed: 0, abnormal: 0 });
    }

    const index = new Map(days.map((d) => [d.key, d] as const));
    (labTests || []).forEach((t: any) => {
      if (t.status !== "completed" || !t.completionDate) return;
      const dt = new Date(t.completionDate);
      if (isNaN(dt.getTime())) return;
      const key = dt.toISOString().slice(0, 10);
      const bucket = index.get(key);
      if (!bucket) return;
      bucket.completed += 1;
      if (t.isAbnormal) bucket.abnormal += 1;
    });

    return days;
  }, [labTests]);

  const statsCards = [
    {
      title: "Pending Tests",
      value: pendingCount.toString(),
      icon: FlaskConical,
      color: "text-chart-1",
    },
    {
      title: "In Progress",
      value: inProgressCount.toString(),
      icon: Activity,
      color: "text-chart-2",
    },
    {
      title: "Completed Today",
      value: completedTodayCount.toString(),
      icon: FileText,
      color: "text-chart-3",
    },
    {
      title: "Abnormal Results",
      value: abnormalCount.toString(),
      icon: Bell,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lab Technician</h2>
          <p className="text-muted-foreground">
            Overview of your workload, progress, and results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <a href="/lab-technician-tests">Test Requests</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/test-results">Test Results</a>
          </Button>
        </div>
      </div>

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

      <LabAvailabilitySection />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
            <CardDescription>Today and overall performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Completion rate
              </span>
              <Badge variant="secondary">{completionRate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Abnormal rate
              </span>
              <Badge variant={abnormalRate >= 25 ? "destructive" : "secondary"}>
                {abnormalRate}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Completed (total)
              </span>
              <Badge variant="outline">{completedCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Queue size</span>
              <Badge variant="outline">{pendingCount + inProgressCount}</Badge>
            </div>
            {isLoading && (
              <div className="text-xs text-muted-foreground">
                Loading metrics…
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Completed Tests (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Daily completions and abnormal count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any, name: any) => [value, name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="hsl(var(--chart-2))"
                />
                <Bar
                  dataKey="abnormal"
                  name="Abnormal"
                  fill="hsl(var(--chart-1))"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [usagePeriod, setUsagePeriod] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  const [activityDate, setActivityDate] = useState("");
  const [activityAction, setActivityAction] = useState("all");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const {
    data: activityTimeline,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery({
    queryKey: [
      `/api/admin/activity-timeline?${new URLSearchParams({
        limit: "500",
        ...(activityAction && activityAction !== "all"
          ? { action: activityAction }
          : {}),
        ...(activityDate ? { from: `${activityDate}T00:00:00.000Z` } : {}),
        ...(activityDate ? { to: `${activityDate}T23:59:59.999Z` } : {}),
      }).toString()}`,
    ],
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: pendingAppointments } = useQuery({
    queryKey: ["/api/admin/pending-appointments"],
  });

  const {
    data: recentVisits,
    refetch: refetchRecentVisits,
    isFetching: isFetchingRecentVisits,
  } = useQuery({
    queryKey: ["/api/admin/recent-visits"],
  });

  const [recentVisitsRole, setRecentVisitsRole] = useState<string>("all");
  const [recentVisitsSearch, setRecentVisitsSearch] = useState<string>("");

  const availableRecentVisitRoles = useMemo(() => {
    if (!Array.isArray(recentVisits)) return ["unregistered"]; // fallback

    const roles = new Set<string>();
    for (const visit of recentVisits) {
      const role = visit?.user?.role ? String(visit.user.role) : "unregistered";
      roles.add(role);
    }

    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [recentVisits]);

  const filteredRecentVisits = useMemo(() => {
    if (!Array.isArray(recentVisits)) return [];

    const q = recentVisitsSearch.trim().toLowerCase();

    return recentVisits.filter((visit: any) => {
      const role = visit?.user?.role ? String(visit.user.role) : "unregistered";
      if (recentVisitsRole !== "all" && role !== recentVisitsRole) return false;

      if (!q) return true;

      const u = visit?.user;
      const name = u
        ? [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          u.email ||
          ""
        : "unregistered";
      const email = u?.email ? String(u.email) : "";
      const pathname = visit?.pathname ? String(visit.pathname) : "";

      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        pathname.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [recentVisits, recentVisitsRole, recentVisitsSearch]);

  const { data: userGrowthChart } = useQuery({
    queryKey: ["/api/admin/user-growth-chart"],
  });

  const {
    data: systemUsageChart,
    isLoading: systemUsageLoading,
    error: systemUsageError,
  } = useQuery({
    queryKey: [`/api/admin/system-usage-chart?period=${usagePeriod}`],
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const { isWidgetVisible } = useDashboardPreferences();

  console.log("🔧 AdminDashboard Debug:", {
    isLoading,
    stats,
    activityTimeline: activityTimeline?.length,
    systemHealth,
    pendingAppointments: pendingAppointments?.length,
    userGrowthChart: userGrowthChart?.length,
    systemUsageChart: systemUsageChart?.length,
  });

  if (isLoading) {
    console.log("⏳ Admin dashboard loading...");
    return <DashboardSkeleton />;
  }

  console.log("✅ Admin dashboard loaded, rendering content");

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
    setLocation("/settings?tab=backup");
  };

  const handleMonthlyReport = () => {
    try {
      const reportMonthLabel = format(new Date(), "MMMM yyyy");
      const filename = `MediVault-Monthly-Report-${format(
        new Date(),
        "yyyy-MM"
      )}.pdf`;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 15;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246);
      doc.text("MediVault", pageWidth / 2, yPosition, { align: "center" });

      yPosition += 8;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Monthly Full Report - ${reportMonthLabel}`,
        pageWidth / 2,
        yPosition,
        {
          align: "center",
        }
      );

      yPosition += 6;
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

      // Overview
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("System Overview", 15, yPosition);
      yPosition += 8;

      const overviewRows = [
        ["Total Users", String(stats?.totalUsers ?? 0)],
        ["Active Patients", String(stats?.activePatients ?? 0)],
        ["Total Appointments", String(stats?.totalAppointments ?? 0)],
        ["Pending Appointments", String(stats?.pendingAppointments ?? 0)],
        ["Completed Appointments", String(stats?.completedAppointments ?? 0)],
        ["Confirmed Appointments", String(stats?.confirmedAppointments ?? 0)],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Metric", "Value"]],
        body: overviewRows,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;

      // System Health
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(14);
      doc.text("System Health", 15, yPosition);
      yPosition += 8;

      const healthRows = [
        [
          "Database",
          systemHealth?.database ? String(systemHealth.database) : "N/A",
        ],
        ["Uptime", systemHealth?.uptime ? String(systemHealth.uptime) : "N/A"],
        [
          "Memory",
          systemHealth?.memory?.used != null &&
          systemHealth?.memory?.total != null
            ? `${systemHealth.memory.used} / ${systemHealth.memory.total} MB`
            : "N/A",
        ],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [["Check", "Status"]],
        body: healthRows,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 10 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;

      // Pending Appointments
      const pendingList = Array.isArray(pendingAppointments)
        ? pendingAppointments.slice(0, 15)
        : [];

      if (pendingList.length > 0) {
        if (yPosition > pageHeight - 70) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.text("Pending Appointments (Top 15)", 15, yPosition);
        yPosition += 8;

        const pendingRows = pendingList.map((apt: any) => [
          String(apt?.id || ""),
          apt?.appointmentDate
            ? format(new Date(apt.appointmentDate), "MM/dd/yyyy HH:mm")
            : "N/A",
          String(apt?.status || "pending"),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["Appointment ID", "Appointment Date", "Status"]],
          body: pendingRows,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 12;
      }

      // Activity Timeline
      const activityList = Array.isArray(activityTimeline)
        ? activityTimeline.slice(0, 25)
        : [];
      if (activityList.length > 0) {
        if (yPosition > pageHeight - 70) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.text("Activity Timeline (Top 25)", 15, yPosition);
        yPosition += 8;

        const activityRows = activityList.map((log: any) => {
          const ts = log?.timestamp ?? log?.createdAt ?? null;
          return [
            ts ? formatSriLankaDateTime(ts, { withSeconds: false }) : "N/A",
            String(log?.action || ""),
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [["Timestamp", "Action"]],
          body: activityRows,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 12;
      }

      // Recent Users
      const recentUsers = Array.isArray(stats?.recentUsers)
        ? stats.recentUsers.slice(0, 15)
        : [];
      if (recentUsers.length > 0) {
        if (yPosition > pageHeight - 70) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(14);
        doc.text("Recent Users (Last 24h)", 15, yPosition);
        yPosition += 8;

        const recentRows = recentUsers.map((u: any) => [
          String(u?.firstName || ""),
          String(u?.lastName || ""),
          String(u?.email || ""),
          String(u?.role || ""),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [["First Name", "Last Name", "Email", "Role"]],
          body: recentRows,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 15, right: 15 },
          styles: { fontSize: 8 },
        });
      }

      // Footer
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages} | MediVault Monthly Report (${reportMonthLabel})`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      doc.save(filename);

      toast({
        title: "Report Downloaded",
        description: `Monthly report saved as ${filename}`,
      });
    } catch (error) {
      console.error("Monthly report PDF error:", error);
      toast({
        title: "Report Failed",
        description: "Failed to generate monthly PDF report",
        variant: "destructive",
      });
    }
  };

  const downloadActivityTimelinePdf = async (mode: "all" | "filtered") => {
    try {
      const params: Record<string, string> = { limit: "500" };
      if (mode === "filtered") {
        if (activityAction && activityAction !== "all") {
          params.action = activityAction;
        }
        if (activityDate) {
          params.from = `${activityDate}T00:00:00.000Z`;
          params.to = `${activityDate}T23:59:59.999Z`;
        }
      }

      const qs = new URLSearchParams(params).toString();
      const resp = await fetch(`/api/admin/activity-timeline?${qs}`, {
        credentials: "include",
      });
      if (!resp.ok) {
        throw new Error(`Failed (${resp.status})`);
      }
      const logs = await resp.json();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 15;

      doc.setFontSize(16);
      doc.text("Activity Timeline Report", pageWidth / 2, y, {
        align: "center",
      });
      y += 8;

      doc.setFontSize(10);
      const subtitleParts: string[] = [];
      subtitleParts.push(
        mode === "all" ? "All (latest 500)" : "Filtered (latest 500)"
      );
      if (mode === "filtered") {
        if (activityDate) subtitleParts.push(`Date: ${activityDate}`);
        if (activityAction && activityAction !== "all") {
          subtitleParts.push(`Action: ${activityAction}`);
        }
      }
      doc.text(subtitleParts.join(" | "), pageWidth / 2, y, {
        align: "center",
      });
      y += 10;

      const rows = Array.isArray(logs)
        ? logs.map((log: any) => {
            const ts = log?.timestamp ?? log?.createdAt ?? null;
            const action = String(log?.action || "");
            const entityType = log?.entityType ? String(log.entityType) : "";
            const userId = log?.userId ? String(log.userId) : "";
            const details = log?.details ? String(log.details) : "";
            const ip = log?.ipAddress ? String(log.ipAddress) : "";
            return [
              ts ? format(new Date(ts), "yyyy-MM-dd HH:mm") : "N/A",
              action,
              entityType,
              userId,
              details,
              ip,
            ];
          })
        : [];

      autoTable(doc, {
        startY: y,
        head: [["Timestamp", "Action", "Entity", "User", "Details", "IP"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 22 },
          2: { cellWidth: 18 },
          3: { cellWidth: 24 },
          4: { cellWidth: 70 },
          5: { cellWidth: 22 },
        },
      });

      const filename =
        mode === "all"
          ? `MediVault-Activity-Timeline-All-${format(
              new Date(),
              "yyyy-MM-dd"
            )}.pdf`
          : `MediVault-Activity-Timeline-Filtered-${format(
              new Date(),
              "yyyy-MM-dd"
            )}.pdf`;

      doc.save(filename);
      toast({
        title: "Downloaded",
        description: `Saved as ${filename}`,
      });
    } catch (e) {
      console.error("Activity timeline PDF error:", e);
      toast({
        title: "Download Failed",
        description: "Failed to generate activity timeline PDF",
        variant: "destructive",
      });
    }
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
            <Button
              variant="outline"
              onClick={() => setShowAddUserDialog(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/appointments-admin")}
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

        {/* System Traffic Chart */}
        {isWidgetVisible("systemUsageChart") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Traffic
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={usagePeriod === "daily" ? "default" : "outline"}
                  onClick={() => setUsagePeriod("daily")}
                >
                  Daily
                </Button>
                <Button
                  size="sm"
                  variant={usagePeriod === "weekly" ? "default" : "outline"}
                  onClick={() => setUsagePeriod("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  size="sm"
                  variant={usagePeriod === "monthly" ? "default" : "outline"}
                  onClick={() => setUsagePeriod("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  size="sm"
                  variant={usagePeriod === "yearly" ? "default" : "outline"}
                  onClick={() => setUsagePeriod("yearly")}
                >
                  Yearly
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {systemUsageLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading usage data…
                </div>
              ) : systemUsageError ? (
                <div className="text-center py-12 text-muted-foreground">
                  Failed to load usage data
                </div>
              ) : systemUsageChart && systemUsageChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={systemUsageChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (
                          usagePeriod === "daily" ||
                          usagePeriod === "weekly"
                        ) {
                          const dt = new Date(`${value}T00:00:00Z`);
                          return dt.toLocaleDateString(undefined, {
                            month: "short",
                            day: "2-digit",
                          });
                        }
                        if (usagePeriod === "monthly") {
                          const [y, m] = String(value).split("-");
                          const dt = new Date(Number(y), Number(m) - 1, 1);
                          return dt.toLocaleDateString(undefined, {
                            month: "short",
                            year: "2-digit",
                          });
                        }
                        return String(value);
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) => [value, "Traffic"]}
                      labelFormatter={(label) => {
                        if (usagePeriod === "weekly")
                          return `Week of: ${label}`;
                        if (usagePeriod === "daily") return `Date: ${label}`;
                        if (usagePeriod === "monthly") return `Month: ${label}`;
                        return `Year: ${label}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="traffic"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No usage data available
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
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
                <CardDescription>Filter by date and action</CardDescription>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Input
                  type="date"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="h-8 w-[140px]"
                />

                <Select
                  value={activityAction}
                  onValueChange={setActivityAction}
                >
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="page_view">Page views</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                    <SelectItem value="logout">Logouts</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadActivityTimelinePdf("filtered")}
                >
                  Download Filtered PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadActivityTimelinePdf("all")}
                >
                  Download Full PDF
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActivityDate("");
                    setActivityAction("all");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {activityLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 pb-3 border-b last:border-0"
                      >
                        <Skeleton className="h-4 w-4 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityError ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Failed to load activity
                  </div>
                ) : activityTimeline && activityTimeline.length > 0 ? (
                  <div className="space-y-3">
                    {activityTimeline.map((log: any, index: number) =>
                      (() => {
                        const ts = log?.timestamp ?? log?.createdAt ?? null;
                        const actionRaw = String(log?.action || "");
                        const entityType = log?.entityType
                          ? String(log.entityType)
                          : "";
                        const details = log?.details ? String(log.details) : "";

                        let title = actionRaw
                          .replace(/_/g, " ")
                          .trim()
                          .replace(/\b\w/g, (c) => c.toUpperCase());

                        if (actionRaw === "page_view") {
                          const m = details.match(/pathname=([^\s]+)/);
                          if (m?.[1]) title = `Page View: ${m[1]}`;
                          else title = "Page View";
                        }

                        const subtitleParts = [
                          entityType ? entityType : null,
                          ts ? formatSriLankaDateTime(ts) : null,
                        ].filter(Boolean);

                        return (
                          <div
                            key={index}
                            className="flex items-start gap-3 pb-3 border-b last:border-0"
                          >
                            <Activity className="w-4 h-4 mt-1 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {subtitleParts.join(" • ")}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    )}
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
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() =>
                          setLocation(
                            `/appointments-admin?appointmentId=${encodeURIComponent(
                              apt.id
                            )}`
                          )
                        }
                        className="w-full text-left pb-3 border-b last:border-0 rounded-md hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">
                            Appointment #{apt.id.slice(0, 8)}
                          </p>
                          <Badge variant="outline">{apt.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(apt?.patient?.user?.firstName || "").trim()}{" "}
                          {(apt?.patient?.user?.lastName || "").trim()}
                          {"  "}
                          <span className="mx-1">•</span>
                          {(apt?.doctor?.user?.firstName || "").trim()}{" "}
                          {(apt?.doctor?.user?.lastName || "").trim()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(apt.appointmentDate).toLocaleString()}
                        </p>
                      </button>
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
      {isWidgetVisible("recentUsers") && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Recent Visits</CardTitle>
              <CardDescription>All visits in the last 24 hours</CardDescription>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchRecentVisits()}
              disabled={isFetchingRecentVisits}
            >
              <RefreshCw
                className={
                  isFetchingRecentVisits
                    ? "w-4 h-4 mr-2 animate-spin"
                    : "w-4 h-4 mr-2"
                }
              />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="w-full sm:w-[200px]">
                  <Select
                    value={recentVisitsRole}
                    onValueChange={(v) => setRecentVisitsRole(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {availableRecentVisitRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  className="w-full sm:w-[260px]"
                  placeholder="Search name, email, page..."
                  value={recentVisitsSearch}
                  onChange={(e) => setRecentVisitsSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[320px]">
              {filteredRecentVisits.length > 0 ? (
                <div className="space-y-4">
                  {filteredRecentVisits.map((visit: any) => {
                    const ts = visit?.timestamp ?? null;
                    const visitedAt = formatSriLankaDateTime(ts);

                    const u = visit?.user;
                    const name = u
                      ? [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                        u.username ||
                        u.email ||
                        "User"
                      : "Unregistered User";
                    const email = u?.email ? String(u.email) : "";
                    const role = u?.role ? String(u.role) : "unregistered";

                    return (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{name}</p>
                          {email ? (
                            <p className="text-sm text-muted-foreground">
                              {email}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Visited: {visitedAt}
                          </p>
                        </div>
                        <Badge variant="outline">{role}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No recent visits
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AdminAddUserDialog
        open={showAddUserDialog}
        onOpenChange={setShowAddUserDialog}
      />
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
