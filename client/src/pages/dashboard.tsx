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
  Smartphone,
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
import { QRScanner } from "@/components/qr-scanner";
import PrescriptionDetailsDialog from "@/components/prescription-details-dialog";
import { RemoteScannerPairing } from "@/components/remote-scanner-pairing";

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
  const [, navigate] = useLocation();

  // Fetch real data
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: prescriptions = [], isLoading: prescriptionsLoading } =
    useQuery({
      queryKey: ["/api/prescriptions"],
    });

  const { data: labTests = [], isLoading: labTestsLoading } = useQuery({
    queryKey: ["/api/lab-tests/patient"],
  });

  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/medical-records"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery({
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
                  className="p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {rx.medicineName || "Prescription"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {rx.doctorName}
                      </p>
                    </div>
                    <Badge
                      variant={rx.status === "active" ? "default" : "secondary"}
                    >
                      {rx.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Prescribed:{" "}
                    {new Date(
                      rx.prescriptionDate || rx.createdAt
                    ).toLocaleDateString()}
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
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showRemoteScanner, setShowRemoteScanner] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [showPrescriptionDetails, setShowPrescriptionDetails] = useState(false);
  const { toast } = useToast();

  // Fetch pharmacist stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/prescriptions/pharmacist/stats"],
  });

  // Fetch recent prescriptions scanned by pharmacist
  const { data: recentPrescriptions, isLoading: prescriptionsLoading } =
    useQuery({
      queryKey: ["/api/prescriptions/pharmacist/recent"],
    });

  const handleQRScan = async (qrCode: string) => {
    try {
      const response = await fetch(`/api/prescriptions/scan/${qrCode}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Prescription not found");
      }

      const prescription = await response.json();

      // Update last scanned timestamp
      await fetch(`/api/prescriptions/${prescription.id}/scan-log`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      setSelectedPrescription(prescription);
      setShowQRScanner(false);
      setShowPrescriptionDetails(true);

      toast({
        title: "Prescription Found",
        description: `Prescription for ${prescription.patientName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid QR code",
        variant: "destructive",
      });
    }
  };

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
      title: "Total Completed",
      value: stats?.totalCompleted || 0,
      icon: Receipt,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
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
                className="hover:shadow-md transition-shadow"
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
                </CardContent>
              </Card>
            ))}
      </div>

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
            onClick={() => setShowQRScanner(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-scan-qr"
          >
            <Activity className="w-4 h-4 mr-2" />
            Scan with Webcam
          </Button>
          <Button
            onClick={() => setShowRemoteScanner(true)}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Use Mobile Camera
          </Button>
        </CardContent>
      </Card>

      {/* Recent Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : recentPrescriptions && recentPrescriptions.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {recentPrescriptions.map((prescription: any) => (
                  <div
                    key={prescription.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPrescription(prescription);
                      setShowPrescriptionDetails(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {prescription.patientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr. {prescription.doctorName}
                        </p>
                      </div>
                      <Badge
                        variant={
                          prescription.status === "dispensed"
                            ? "default"
                            : prescription.status === "expired"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {prescription.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(prescription.issuedDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Pill className="h-3 w-3" />
                        {prescription.medications?.length || 0} medication(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No prescriptions scanned yet</p>
              <p className="text-sm">Scan a QR code to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      {showQRScanner && (
        <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Scan Prescription QR Code</DialogTitle>
              <DialogDescription>
                Position the QR code within the camera frame
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <QRScanner
                onScanSuccess={handleQRScan}
                onClose={() => setShowQRScanner(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Remote Scanner Pairing Dialog */}
      {showRemoteScanner && (
        <Dialog open={showRemoteScanner} onOpenChange={setShowRemoteScanner}>
          <DialogContent className="max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto p-6">
            <RemoteScannerPairing
              onScanSuccess={handleQRScan}
              onClose={() => setShowRemoteScanner(false)}
            />
          </DialogContent>
        </Dialog>
      )}

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
