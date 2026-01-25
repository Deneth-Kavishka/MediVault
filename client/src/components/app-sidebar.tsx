import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  FileText,
  Users,
  Activity,
  Pill,
  FlaskConical,
  Receipt,
  Settings,
  Home,
  MessageSquare,
  Bell,
  LayoutDashboard,
  Shield,
  FileBarChart,
  UsersRound,
  MapPin,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ForwardRefExoticComponent<
    Omit<import("lucide-react").LucideProps, "ref"> &
      React.RefAttributes<SVGSVGElement>
  >;
  badge?: number;
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch notifications with polling for real-time updates
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    // Hosted DB adds latency; reduce polling.
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    enabled: !!user,
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const getMenuItems = (): MenuItem[] => {
    const role = user?.role;

    const commonItems: MenuItem[] = [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Messages", url: "/messages", icon: MessageSquare },
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
        badge: unreadCount > 0 ? unreadCount : undefined,
      },
    ];

    const roleItems: Record<string, MenuItem[]> = {
      patient: [
        { title: "Find Doctors", url: "/find-doctors", icon: Search },
        { title: "Appointments", url: "/appointments", icon: Calendar },
        { title: "Medical Records", url: "/medical-records", icon: FileText },
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "Lab Tests", url: "/lab-results", icon: FlaskConical },
      ],
      doctor: [
        { title: "My Availability", url: "/doctor/availability", icon: MapPin },
        { title: "Appointments", url: "/appointments", icon: Calendar },
        { title: "Patient Records", url: "/doctor/patients", icon: Users },
        {
          title: "My Medical Records",
          url: "/doctor/medical-records",
          icon: FileText,
        },
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical },
      ],
      pharmacist: [
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "QR Scanner", url: "/scanner", icon: Activity },
      ],
      lab_technician: [
        {
          title: "Test Requests",
          url: "/lab-technician-tests",
          icon: FlaskConical,
        },
        { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical },
        { title: "Test Results", url: "/test-results", icon: FileText },
      ],
      admin: [
        { title: "User Management", url: "/admin/users", icon: UsersRound },
        {
          title: "Doctor Availability",
          url: "/admin/doctor-availability",
          icon: MapPin,
        },
        {
          title: "Password Resets",
          url: "/admin/password-reset-requests",
          icon: Shield,
        },
        { title: "Patients", url: "/patients", icon: Users },
        { title: "Doctors", url: "/doctors", icon: Users },
        { title: "Appointments", url: "/appointments-admin", icon: Calendar },
        { title: "Reports & Analytics", url: "/reports", icon: FileBarChart },
        { title: "System Settings", url: "/settings", icon: Settings },
      ],
    };

    return [...commonItems, ...(role ? roleItems[role] || [] : [])];
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              MediVault
            </h2>
            <p className="text-[10px] font-medium text-primary/80">V1.0</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-center text-[10px] text-muted-foreground/70">
          <p>© {new Date().getFullYear()} MediVault Healthcare</p>
          <p className="mt-0.5">All rights reserved</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
