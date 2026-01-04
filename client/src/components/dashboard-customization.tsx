import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

interface DashboardPreferences {
  widgets: WidgetConfig[];
  dateRange: string;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "stats", title: "Statistics Cards", visible: true, order: 1 },
  { id: "quickActions", title: "Quick Actions", visible: true, order: 2 },
  {
    id: "systemHealth",
    title: "System Health Monitor",
    visible: true,
    order: 3,
  },
  {
    id: "userGrowthChart",
    title: "User Growth Chart",
    visible: true,
    order: 4,
  },
  {
    id: "systemUsageChart",
    title: "System Traffic Chart",
    visible: true,
    order: 5,
  },
  {
    id: "activityTimeline",
    title: "Activity Timeline",
    visible: true,
    order: 6,
  },
  {
    id: "pendingAppointments",
    title: "Pending Appointments",
    visible: true,
    order: 7,
  },
  { id: "recentUsers", title: "Recent Users", visible: true, order: 8 },
];

function mergeWidgets(defaults: WidgetConfig[], saved?: WidgetConfig[]) {
  if (!saved || saved.length === 0) return defaults;

  const savedById = new Map(saved.map((w) => [w.id, w]));
  return defaults
    .map((d) => {
      const s = savedById.get(d.id);
      return s ? { ...d, visible: s.visible, order: s.order } : d;
    })
    .sort((a, b) => a.order - b.order)
    .map((w, i) => ({ ...w, order: i + 1 }));
}

export function DashboardCustomization() {
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isOpen, setIsOpen] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dashboardPreferences");
    if (saved) {
      try {
        const prefs: DashboardPreferences = JSON.parse(saved);
        setWidgets(mergeWidgets(DEFAULT_WIDGETS, prefs.widgets));
      } catch (error) {
        console.error("Failed to load dashboard preferences:", error);
      }
    }
  }, []);

  // Save preferences
  const savePreferences = () => {
    const prefs: DashboardPreferences = {
      widgets,
      dateRange: "30days",
    };
    localStorage.setItem("dashboardPreferences", JSON.stringify(prefs));
    toast({
      title: "Preferences Saved",
      description: "Your dashboard preferences have been saved",
    });
    setIsOpen(false);
  };

  // Toggle widget visibility
  const toggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  // Move widget up
  const moveUp = (id: string) => {
    const index = widgets.findIndex((w) => w.id === id);
    if (index > 0) {
      const newWidgets = [...widgets];
      [newWidgets[index - 1], newWidgets[index]] = [
        newWidgets[index],
        newWidgets[index - 1],
      ];
      // Update order numbers
      newWidgets.forEach((w, i) => (w.order = i + 1));
      setWidgets(newWidgets);
    }
  };

  // Move widget down
  const moveDown = (id: string) => {
    const index = widgets.findIndex((w) => w.id === id);
    if (index < widgets.length - 1) {
      const newWidgets = [...widgets];
      [newWidgets[index], newWidgets[index + 1]] = [
        newWidgets[index + 1],
        newWidgets[index],
      ];
      // Update order numbers
      newWidgets.forEach((w, i) => (w.order = i + 1));
      setWidgets(newWidgets);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem("dashboardPreferences");
    toast({
      title: "Reset Complete",
      description: "Dashboard has been reset to default settings",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Show/hide widgets and reorder them to your preference
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Widget List */}
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <Card key={widget.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveUp(widget.id)}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveDown(widget.id)}
                        disabled={index === widgets.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        ↓
                      </Button>
                    </div>
                    <div>
                      <p className="font-medium">{widget.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Order: {widget.order}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={widget.visible ? "default" : "secondary"}>
                      {widget.visible ? (
                        <Eye className="w-3 h-3 mr-1" />
                      ) : (
                        <EyeOff className="w-3 h-3 mr-1" />
                      )}
                      {widget.visible ? "Visible" : "Hidden"}
                    </Badge>
                    <Switch
                      checked={widget.visible}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={savePreferences}>Save Preferences</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to get widget preferences
export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>({
    widgets: DEFAULT_WIDGETS,
    dateRange: "30days",
  });

  useEffect(() => {
    const saved = localStorage.getItem("dashboardPreferences");
    if (saved) {
      try {
        const prefs: DashboardPreferences = JSON.parse(saved);
        setPreferences({
          ...prefs,
          widgets: mergeWidgets(DEFAULT_WIDGETS, prefs.widgets),
        });
      } catch (error) {
        console.error("Failed to load dashboard preferences:", error);
      }
    }
  }, []);

  const isWidgetVisible = (id: string) => {
    const widget = preferences.widgets.find((w) => w.id === id);
    return widget?.visible ?? true;
  };

  const getWidgetOrder = (id: string) => {
    const widget = preferences.widgets.find((w) => w.id === id);
    return widget?.order ?? 999;
  };

  return { preferences, isWidgetVisible, getWidgetOrder };
}
