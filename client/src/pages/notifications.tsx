import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Pill,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Notifications() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  // Fetch notifications from backend
  const { data: notifications = [], isLoading: loadingNotifications } =
    useQuery<any[]>({
      queryKey: ["/api/notifications"],
      enabled: isAuthenticated,
    });

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all as read",
        variant: "destructive",
      });
    },
  });

  // Helper function to get icon and color based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return { icon: Calendar, color: "text-chart-1" };
      case "prescription":
        return { icon: Pill, color: "text-chart-2" };
      case "lab_result":
        return { icon: FlaskConical, color: "text-chart-3" };
      case "low_stock":
        return { icon: AlertCircle, color: "text-destructive" };
      case "system":
        return { icon: Bell, color: "text-chart-4" };
      default:
        return { icon: CheckCircle2, color: "text-green-600" };
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (loadingNotifications) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            data-testid="button-mark-all-read"
          >
            {markAllAsRead.isPending ? "Marking..." : "Mark All as Read"}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any notifications yet
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification: any) => {
            const { icon: Icon, color } = getNotificationIcon(
              notification.type
            );
            return (
              <Card
                key={notification.id}
                className={`hover-elevate transition-all duration-200 ${
                  !notification.isRead ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        !notification.isRead ? "bg-primary/10" : "bg-muted/50"
                      } flex-shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                            onClick={() => markAsRead.mutate(notification.id)}
                            disabled={markAsRead.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            {markAsRead.isPending
                              ? "Marking..."
                              : "Mark as read"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
