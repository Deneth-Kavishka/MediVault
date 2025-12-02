import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Mail,
  Calendar,
  DollarSign,
  HardDrive,
  Download,
  Upload,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface SystemSettings {
  systemName: string;
  systemEmail: string;
  systemPhone: string;
  systemAddress: string;
  appointmentDuration: number;
  appointmentSlotInterval: number;
  maxAppointmentsPerDay: number;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: string;
  sessionTimeout: number;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch current settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  // Form state
  const [formData, setFormData] = useState<SystemSettings>({
    systemName: settings?.systemName || "MediVault Healthcare",
    systemEmail: settings?.systemEmail || "admin@medivault.com",
    systemPhone: settings?.systemPhone || "+1-234-567-8900",
    systemAddress:
      settings?.systemAddress || "123 Healthcare Ave, Medical City",
    appointmentDuration: settings?.appointmentDuration || 30,
    appointmentSlotInterval: settings?.appointmentSlotInterval || 15,
    maxAppointmentsPerDay: settings?.maxAppointmentsPerDay || 20,
    enableEmailNotifications: settings?.enableEmailNotifications ?? true,
    enableSmsNotifications: settings?.enableSmsNotifications ?? false,
    autoBackupEnabled: settings?.autoBackupEnabled ?? true,
    backupFrequency: settings?.backupFrequency || "daily",
    sessionTimeout: settings?.sessionTimeout || 30,
  });

  // Update settings when data loads
  useState(() => {
    if (settings) {
      setFormData(settings);
    }
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Backup mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Backup failed");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medivault-backup-${
        new Date().toISOString().split("T")[0]
      }.sql`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Backup Complete",
        description: "Database backup downloaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Backup Failed",
        description: "Failed to create database backup",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleBackup = () => {
    backupMutation.mutate();
  };

  const handleRestore = () => {
    toast({
      title: "Restore Database",
      description: "Database restore functionality coming soon",
    });
  };

  const updateField = (field: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system parameters and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="w-4 h-4 mr-2" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="billing">
            <DollarSign className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="backup">
            <HardDrive className="w-4 h-4 mr-2" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Configure basic system information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="systemName">System Name</Label>
                  <Input
                    id="systemName"
                    value={formData.systemName}
                    onChange={(e) => updateField("systemName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemEmail">System Email</Label>
                  <Input
                    id="systemEmail"
                    type="email"
                    value={formData.systemEmail}
                    onChange={(e) => updateField("systemEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemPhone">Contact Phone</Label>
                  <Input
                    id="systemPhone"
                    value={formData.systemPhone}
                    onChange={(e) => updateField("systemPhone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) =>
                      updateField("sessionTimeout", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemAddress">System Address</Label>
                <Textarea
                  id="systemAddress"
                  value={formData.systemAddress}
                  onChange={(e) => updateField("systemAddress", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  checked={formData.enableEmailNotifications}
                  onCheckedChange={(checked) =>
                    updateField("enableEmailNotifications", checked)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to users
                  </p>
                </div>
                <Switch
                  checked={formData.enableSmsNotifications}
                  onCheckedChange={(checked) =>
                    updateField("enableSmsNotifications", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize email templates for different events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeEmail">Welcome Email Template</Label>
                <Textarea
                  id="welcomeEmail"
                  placeholder="Dear {firstName},&#10;&#10;Welcome to MediVault Healthcare System..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{firstName}"}, {"{lastName}"},{" "}
                  {"{email}"}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="appointmentEmail">
                  Appointment Confirmation Email
                </Label>
                <Textarea
                  id="appointmentEmail"
                  placeholder="Dear {firstName},&#10;&#10;Your appointment is confirmed for {appointmentDate}..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{firstName}"}, {"{appointmentDate}"},{" "}
                  {"{doctorName}"}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="reminderEmail">
                  Appointment Reminder Email
                </Label>
                <Textarea
                  id="reminderEmail"
                  placeholder="Dear {firstName},&#10;&#10;This is a reminder for your appointment tomorrow..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{firstName}"}, {"{appointmentDate}"},{" "}
                  {"{doctorName}"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Settings */}
        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Configuration</CardTitle>
              <CardDescription>
                Configure appointment durations and scheduling rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appointmentDuration">
                    Default Appointment Duration (minutes)
                  </Label>
                  <Input
                    id="appointmentDuration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.appointmentDuration}
                    onChange={(e) =>
                      updateField(
                        "appointmentDuration",
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard duration for appointments
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentSlotInterval">
                    Slot Interval (minutes)
                  </Label>
                  <Input
                    id="appointmentSlotInterval"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.appointmentSlotInterval}
                    onChange={(e) =>
                      updateField(
                        "appointmentSlotInterval",
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Time between appointment slots
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppointmentsPerDay">
                    Maximum Appointments Per Day
                  </Label>
                  <Input
                    id="maxAppointmentsPerDay"
                    type="number"
                    min="1"
                    value={formData.maxAppointmentsPerDay}
                    onChange={(e) =>
                      updateField(
                        "maxAppointmentsPerDay",
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum appointments a doctor can have per day
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Working Hours</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">Start Time</Label>
                    <Input
                      id="workingHoursStart"
                      type="time"
                      defaultValue="09:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">End Time</Label>
                    <Input
                      id="workingHoursEnd"
                      type="time"
                      defaultValue="17:00"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Configuration</CardTitle>
              <CardDescription>
                Configure billing rules and payment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="USD">
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="LKR">
                        LKR - Sri Lankan Rupee
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="paymentMethods">Accepted Payment Methods</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="cash" defaultChecked />
                    <Label htmlFor="cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="card" defaultChecked />
                    <Label htmlFor="card">Credit/Debit Card</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="insurance" defaultChecked />
                    <Label htmlFor="insurance">Insurance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="online" />
                    <Label htmlFor="online">Online Payment</Label>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                <Input
                  id="invoicePrefix"
                  placeholder="INV-"
                  defaultValue="INV-"
                />
                <p className="text-xs text-muted-foreground">
                  Prefix for invoice numbers (e.g., INV-001, INV-002)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Restore */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Manage database backups and restoration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automatic database backups
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoBackupEnabled}
                    onCheckedChange={(checked) =>
                      updateField("autoBackupEnabled", checked)
                    }
                  />
                </div>
                {formData.autoBackupEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Backup Frequency</Label>
                      <Select
                        value={formData.backupFrequency}
                        onValueChange={(value) =>
                          updateField("backupFrequency", value)
                        }
                      >
                        <SelectTrigger id="backupFrequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Manual Backup</Label>
                <div className="flex gap-3">
                  <Button
                    onClick={handleBackup}
                    disabled={backupMutation.isPending}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {backupMutation.isPending
                      ? "Creating Backup..."
                      : "Download Backup"}
                  </Button>
                  <Button onClick={handleRestore} variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Download a copy of the database or restore from a previous
                  backup
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Last Backup</Label>
                <p className="text-sm">
                  Last backup was created on: {new Date().toLocaleDateString()}{" "}
                  at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
