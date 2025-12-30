import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
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
import FindDoctors from "@/pages/find-doctors";
import AdminDoctors from "@/pages/admin-doctors";
import AdminAppointments from "@/pages/admin-appointments";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import ContactPage from "@/pages/contact";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();

  console.log("Router render:", { isLoading, isAuthenticated, location, user });

  // Handle redirects based on authentication - MUST BE BEFORE ANY EARLY RETURN
  useEffect(() => {
    if (isLoading) return; // Don't redirect while loading

    console.log("Redirect effect:", { isAuthenticated, location });

    // Authenticated user on public pages -> redirect to dashboard
    if (isAuthenticated && (location === "/" || location === "/login")) {
      console.log("Redirecting authenticated user to dashboard");
      setLocation("/dashboard");
      return;
    }

    // Unauthenticated user on protected pages -> redirect to login
    const protectedRoutes = [
      "/dashboard",
      "/appointments",
      "/prescriptions",
      "/medical-records",
      "/messages",
      "/notifications",
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
      <Route path="/contact" component={ContactPage} />

      {/* Protected routes */}
      <Route path="/dashboard" component={Dashboard} />
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
      <Route path="/scanner" component={Dashboard} />
      <Route path="/test-results" component={Dashboard} />
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
            <ThemeToggle />
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
