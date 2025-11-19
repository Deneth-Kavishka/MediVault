import { useEffect } from "react";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const statsCards = [
    {
      title: "Total Users",
      value: "1,247",
      icon: Users,
      color: "text-chart-1",
    },
    {
      title: "Active Patients",
      value: "856",
      icon: Users,
      color: "text-chart-2",
    },
    {
      title: "Total Appointments",
      value: "342",
      icon: Calendar,
      color: "text-chart-3",
    },
    {
      title: "System Alerts",
      value: "5",
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
