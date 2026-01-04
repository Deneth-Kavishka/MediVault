import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/hooks/useAuth";
import { ProfileMenu } from "@/components/profile-menu";
import { PatientAiAssistantMenu } from "@/components/patient-ai-assistant-menu";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import PatientRegisterPage from "@/pages/patient-register";
import ChangePasswordPage from "@/pages/change-password";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Prescriptions from "@/pages/prescriptions";
import MedicalRecords from "@/pages/medical-records";
import Notifications from "@/pages/notifications";
import Messages from "@/pages/messages";
import AdminUsers from "@/pages/admin-users";
import AdminDoctorAvailability from "@/pages/admin-doctor-availability";
import AdminPatients from "@/pages/admin-patients";
import DoctorPatients from "@/pages/doctor-patients";
import DoctorMedicalRecords from "@/pages/doctor-medical-records";
import DoctorAvailability from "@/pages/doctor-availability";
import LabTests from "@/pages/lab-tests";
import LabResults from "@/pages/lab-results";
import LabTechnicianTests from "@/pages/lab-technician-tests";
import TestResults from "@/pages/test-results";
import FindDoctors from "@/pages/find-doctors";
import AdminDoctors from "@/pages/admin-doctors";
import AdminAppointments from "@/pages/admin-appointments";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import ContactPage from "@/pages/contact";
import MobileScanner from "@/pages/mobile-scanner";
import QRScannerPage from "@/pages/qr-scanner-page";
import ProfilePage from "@/pages/profile";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Accessibility from "@/pages/accessibility";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { trackTrafficOnce } from "@/lib/traffic";

type MyChangeRequest = {
  id: string;
  field: string;
  status: "pending" | "approved" | "rejected";
};

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const lastRequestStatusRef = useRef<Record<string, string>>({});

  const myRequestsQuery = useQuery<{ requests: MyChangeRequest[] }>({
    queryKey: ["/api/profile/change-requests"],
    queryFn: async () => {
      const res = await fetch("/api/profile/change-requests", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to load requests");
      }
      return res.json();
    },
    enabled: isAuthenticated && !isLoading,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const rows = myRequestsQuery.data?.requests;
    if (!rows) return;

    // First load: initialize snapshot
    if (Object.keys(lastRequestStatusRef.current).length === 0) {
      const snap: Record<string, string> = {};
      for (const r of rows) snap[r.id] = r.status;
      lastRequestStatusRef.current = snap;
      return;
    }

    const prev = lastRequestStatusRef.current;
    const next: Record<string, string> = { ...prev };

    const changed: Array<{ field: string; status: string }> = [];
    for (const r of rows) {
      const old = prev[r.id];
      next[r.id] = r.status;
      if (
        old &&
        old !== r.status &&
        (r.status === "approved" || r.status === "rejected")
      ) {
        changed.push({ field: r.field, status: r.status });
      }
    }

    if (changed.length > 0) {
      const first = changed[0];
      const fieldLabel =
        first.field === "bloodType"
          ? "Blood Group"
          : first.field === "dateOfBirth"
          ? "Date of birth"
          : first.field;

      toast({
        title: `Request ${first.status}`,
        description:
          changed.length === 1
            ? `${fieldLabel} request was ${first.status}.`
            : `${changed.length} requests were updated.`,
      });
    }

    lastRequestStatusRef.current = next;
  }, [myRequestsQuery.data?.requests, toast]);

  console.log("Router render:", { isLoading, isAuthenticated, location, user });

  // Handle redirects based on authentication - MUST BE BEFORE ANY EARLY RETURN
  useEffect(() => {
    if (isLoading) return; // Don't redirect while loading

    console.log("Redirect effect:", { isAuthenticated, location });

    // Force password change on first login
    if (
      isAuthenticated &&
      user?.mustChangePassword &&
      location !== "/change-password"
    ) {
      setLocation("/change-password");
      return;
    }

    // Authenticated user finished password change -> leave change-password page
    if (
      isAuthenticated &&
      !user?.mustChangePassword &&
      location === "/change-password"
    ) {
      setLocation("/dashboard");
      return;
    }

    // Authenticated user on public pages -> redirect to dashboard
    if (
      isAuthenticated &&
      (location === "/" || location === "/login" || location === "/register")
    ) {
      console.log("Redirecting authenticated user to dashboard");
      setLocation("/dashboard");
      return;
    }

    // Unauthenticated user on protected pages -> redirect to login
    const protectedRoutes = [
      "/dashboard",
      "/change-password",
      "/appointments",
      "/prescriptions",
      "/medical-records",
      "/messages",
      "/notifications",
      "/profile",
      "/lab-results",
      "/lab-tests",
      "/lab-technician-tests",
      "/bills",
      "/patients",
      "/doctors",
      "/appointments-admin",
      "/inventory",
      "/scanner",
      "/test-results",
      "/admin/users",
      "/users",
      "/audit-logs",
      "/reports",
      "/settings",
    ];

    if (!isAuthenticated && protectedRoutes.includes(location)) {
      console.log("Redirecting unauthenticated user to login");
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // Show loading screen while checking authentication
  if (isLoading) {
    console.log("Showing loading screen");
    return <LoadingScreen />;
  }

  console.log("Router ready, showing routes");

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={PatientRegisterPage} />
      <Route path="/mobile-scanner" component={MobileScanner} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/accessibility" component={Accessibility} />

      {/* Protected routes */}
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/prescriptions" component={Prescriptions} />
      <Route path="/medical-records" component={MedicalRecords} />
      <Route path="/messages" component={Messages} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/lab-results" component={LabResults} />
      <Route path="/lab-tests" component={LabTests} />
      <Route path="/lab-technician-tests" component={LabTechnicianTests} />
      <Route path="/bills" component={Dashboard} />
      <Route path="/patients" component={AdminPatients} />
      <Route path="/doctor/patients" component={DoctorPatients} />
      <Route path="/doctor/medical-records" component={DoctorMedicalRecords} />
      <Route path="/doctors" component={AdminDoctors} />
      <Route path="/appointments-admin" component={AdminAppointments} />
      <Route path="/inventory" component={Dashboard} />
      <Route path="/scanner" component={QRScannerPage} />
      <Route path="/test-results" component={TestResults} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route
        path="/admin/doctor-availability"
        component={AdminDoctorAvailability}
      />
      <Route path="/doctor/availability" component={DoctorAvailability} />
      <Route path="/find-doctors" component={FindDoctors} />
      <Route path="/users" component={Dashboard} />
      <Route path="/audit-logs" component={Dashboard} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/settings" component={SettingsPage} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    void trackTrafficOnce(location);
  }, [location]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <PatientAiAssistantMenu />
              <ProfileMenu />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthenticatedLayout>
            <Router />
          </AuthenticatedLayout>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
