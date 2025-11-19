import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const notifications = [
    {
      id: "1",
      type: "appointment",
      title: "Appointment Reminder",
      message:
        "You have an appointment with Dr. Sarah Johnson tomorrow at 2:00 PM",
      time: new Date(Date.now() - 1000 * 60 * 30),
      isRead: false,
      icon: Calendar,
      color: "text-chart-1",
    },
    {
      id: "2",
      type: "prescription",
      title: "Prescription Ready",
      message: "Your prescription is ready for pickup at MediPharm Pharmacy",
      time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isRead: false,
      icon: Pill,
      color: "text-chart-2",
    },
    {
      id: "3",
      type: "lab_result",
      title: "Lab Results Available",
      message:
        "Your blood test results are now available. Please review in your medical records.",
      time: new Date(Date.now() - 1000 * 60 * 60 * 5),
      isRead: true,
      icon: FlaskConical,
      color: "text-chart-3",
    },
    {
      id: "4",
      type: "low_stock",
      title: "Low Stock Alert",
      message:
        "Medication stock is running low. Please refill your prescription soon.",
      time: new Date(Date.now() - 1000 * 60 * 60 * 24),
      isRead: true,
      icon: AlertCircle,
      color: "text-destructive",
    },
    {
      id: "5",
      type: "appointment",
      title: "Appointment Confirmed",
      message:
        "Your appointment with Dr. Michael Chen has been confirmed for Jan 25 at 10:30 AM",
      time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      isRead: true,
      icon: CheckCircle2,
      color: "text-green-600",
    },
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
            data-testid="button-mark-all-read"
          >
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
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
                  <notification.icon
                    className={`w-5 h-5 ${notification.color}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.time, {
                        addSuffix: true,
                      })}
                    </span>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
