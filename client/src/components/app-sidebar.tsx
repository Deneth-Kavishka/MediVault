import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  LogOut,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const getMenuItems = () => {
    const role = user?.role;

    const commonItems = [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Messages", url: "/messages", icon: MessageSquare },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ];

    const roleItems = {
      patient: [
        { title: "Appointments", url: "/appointments", icon: Calendar },
        { title: "Medical Records", url: "/medical-records", icon: FileText },
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "Lab Results", url: "/lab-results", icon: FlaskConical },
        { title: "Bills & Payments", url: "/bills", icon: Receipt },
      ],
      doctor: [
        { title: "Appointments", url: "/appointments", icon: Calendar },
        { title: "Patients", url: "/patients", icon: Users },
        { title: "Medical Records", url: "/medical-records", icon: FileText },
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical },
      ],
      pharmacist: [
        { title: "Prescriptions", url: "/prescriptions", icon: Pill },
        { title: "Inventory", url: "/inventory", icon: Activity },
        { title: "QR Scanner", url: "/scanner", icon: Activity },
      ],
      lab_technician: [
        { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical },
        { title: "Test Results", url: "/test-results", icon: FileText },
      ],
      admin: [
        { title: "Users", url: "/users", icon: Users },
        { title: "Patients", url: "/patients", icon: Users },
        { title: "Doctors", url: "/doctors", icon: Users },
        { title: "Appointments", url: "/appointments", icon: Calendar },
        { title: "Audit Logs", url: "/audit-logs", icon: Activity },
        { title: "System Settings", url: "/settings", icon: Settings },
      ],
    };

    return [
      ...commonItems,
      ...(roleItems[role as keyof typeof roleItems] || []),
    ];
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
            <p className="text-xs text-muted-foreground capitalize">
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
                    <a href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage
              src={user?.profileImageUrl || undefined}
              alt={user?.firstName || "User"}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.firstName?.[0] || "U"}
              {user?.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName || ""} {user?.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
