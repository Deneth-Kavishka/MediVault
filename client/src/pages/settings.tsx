import { useState, useRef, useEffect } from "react";
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
  HardDrive,
  Download,
  Upload,
  Save,
  Shield,
  Bell,
  Database,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SystemSettings {
  // General/Organization
  systemName: string;
  systemEmail: string;
  systemPhone: string;
  systemAddress: string;
  systemWebsite?: string;
  systemLogo?: string;
  systemDescription?: string;
  licenseNumber?: string;
  establishedYear?: number;
  emergencyContact?: string;
  faxNumber?: string;
  timezone?: string;
  currency?: string;
  language?: string;

  // Appointment Settings
  appointmentDuration: number;
  appointmentSlotInterval: number;
  maxAppointmentsPerDay: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays?: string;

  // Notification Settings
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enableAppointmentReminders: boolean;
  reminderHoursBefore: number;

  // Backup Settings
  autoBackupEnabled: boolean;
  backupFrequency: string;

  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableTwoFactorAuth: boolean;
  dataRetentionDays: number;
  passwordExpiryDays?: number;

  // Social Media
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current settings
  const {
    data: settings,
    isLoading,
    refetch,
  } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  // Form state - initialize with defaults
  const [formData, setFormData] = useState<SystemSettings>({
    systemName: "MediVault Healthcare System",
    systemEmail: "admin@medivault.com",
    systemPhone: "+1-234-567-8900",
    systemAddress: "123 Healthcare Ave, Medical City",
    systemWebsite: "",
    systemDescription: "",
    licenseNumber: "",
    emergencyContact: "",
    faxNumber: "",
    timezone: "UTC",
    currency: "USD",
    language: "en",
    appointmentDuration: 30,
    appointmentSlotInterval: 15,
    maxAppointmentsPerDay: 20,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    enableAppointmentReminders: true,
    reminderHoursBefore: 24,
    autoBackupEnabled: true,
    backupFrequency: "daily",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableTwoFactorAuth: false,
    dataRetentionDays: 365,
    passwordExpiryDays: 90,
    facebookUrl: "",
    facebookUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    instagramUrl: "",
  });

  // Update formData when settings are loaded from server
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".sql")) {
      toast({
        title: "Invalid File",
        description: "Please select a valid SQL backup file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/restore", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Restore failed");

      toast({
        title: "Restore Complete",
        description: "Database has been restored from backup",
      });
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: "Failed to restore database from backup",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-1">
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
            <Building2 className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="w-4 h-4 mr-2" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="w-4 h-4 mr-2" />
            Backup & Data
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Configure your healthcare facility's essential information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="systemName">Organization Name *</Label>
                  <Input
                    id="systemName"
                    value={formData.systemName}
                    onChange={(e) => updateField("systemName", e.target.value)}
                    placeholder="MediVault Healthcare System"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemEmail">Contact Email *</Label>
                  <Input
                    id="systemEmail"
                    type="email"
                    value={formData.systemEmail}
                    onChange={(e) => updateField("systemEmail", e.target.value)}
                    placeholder="admin@medivault.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemPhone">Contact Phone *</Label>
                  <Input
                    id="systemPhone"
                    value={formData.systemPhone}
                    onChange={(e) => updateField("systemPhone", e.target.value)}
                    placeholder="+1-234-567-8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact || ""}
                    onChange={(e) =>
                      updateField("emergencyContact", e.target.value)
                    }
                    placeholder="+1-234-567-0911"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemAddress">Facility Address *</Label>
                <Textarea
                  id="systemAddress"
                  value={formData.systemAddress}
                  onChange={(e) => updateField("systemAddress", e.target.value)}
                  rows={2}
                  placeholder="123 Healthcare Ave, Medical City, State, ZIP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemDescription">
                  Organization Description
                </Label>
                <Textarea
                  id="systemDescription"
                  value={formData.systemDescription || ""}
                  onChange={(e) =>
                    updateField("systemDescription", e.target.value)
                  }
                  rows={3}
                  placeholder="Brief description of your healthcare facility, services, and specialties..."
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed on your landing page and public-facing
                  materials
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media & Online Presence</CardTitle>
              <CardDescription>
                Connect your social media profiles for public visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facebookUrl">Facebook URL</Label>
                  <Input
                    id="facebookUrl"
                    type="url"
                    value={formData.facebookUrl || ""}
                    onChange={(e) => updateField("facebookUrl", e.target.value)}
                    placeholder="https://facebook.com/medivault"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter/X URL</Label>
                  <Input
                    id="twitterUrl"
                    type="url"
                    value={formData.twitterUrl || ""}
                    onChange={(e) => updateField("twitterUrl", e.target.value)}
                    placeholder="https://twitter.com/medivault"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl || ""}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/company/medivault"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramUrl">Instagram URL</Label>
                  <Input
                    id="instagramUrl"
                    type="url"
                    value={formData.instagramUrl || ""}
                    onChange={(e) =>
                      updateField("instagramUrl", e.target.value)
                    }
                    placeholder="https://instagram.com/medivault"
                  />
                </div>
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
                  <Select
                    value={formData.appointmentDuration.toString()}
                    onValueChange={(value) =>
                      updateField("appointmentDuration", parseInt(value))
                    }
                  >
                    <SelectTrigger id="appointmentDuration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointmentSlotInterval">
                    Time Slot Interval (minutes)
                  </Label>
                  <Select
                    value={formData.appointmentSlotInterval.toString()}
                    onValueChange={(value) =>
                      updateField("appointmentSlotInterval", parseInt(value))
                    }
                  >
                    <SelectTrigger id="appointmentSlotInterval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAppointmentsPerDay">
                    Maximum Appointments Per Doctor Per Day
                  </Label>
                  <Input
                    id="maxAppointmentsPerDay"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxAppointmentsPerDay}
                    onChange={(e) =>
                      updateField(
                        "maxAppointmentsPerDay",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Default Working Hours</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">Start Time</Label>
                    <Input
                      id="workingHoursStart"
                      type="time"
                      value={formData.workingHoursStart}
                      onChange={(e) =>
                        updateField("workingHoursStart", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">End Time</Label>
                    <Input
                      id="workingHoursEnd"
                      type="time"
                      value={formData.workingHoursEnd}
                      onChange={(e) =>
                        updateField("workingHoursEnd", e.target.value)
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard operating hours for the facility
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how the system sends notifications to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for appointments and updates
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
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications to patients
                  </p>
                </div>
                <Switch
                  checked={formData.enableSmsNotifications}
                  onCheckedChange={(checked) =>
                    updateField("enableSmsNotifications", checked)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Appointment Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send automatic appointment reminders to patients
                  </p>
                </div>
                <Switch
                  checked={formData.enableAppointmentReminders}
                  onCheckedChange={(checked) =>
                    updateField("enableAppointmentReminders", checked)
                  }
                />
              </div>
              {formData.enableAppointmentReminders && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="reminderHoursBefore">
                      Send Reminder (hours before appointment)
                    </Label>
                    <Select
                      value={formData.reminderHoursBefore.toString()}
                      onValueChange={(value) =>
                        updateField("reminderHoursBefore", parseInt(value))
                      }
                    >
                      <SelectTrigger id="reminderHoursBefore">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour before</SelectItem>
                        <SelectItem value="2">2 hours before</SelectItem>
                        <SelectItem value="4">4 hours before</SelectItem>
                        <SelectItem value="12">12 hours before</SelectItem>
                        <SelectItem value="24">24 hours before</SelectItem>
                        <SelectItem value="48">48 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Manage authentication and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">
                    Maximum Login Attempts
                  </Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="3"
                    max="10"
                    value={formData.maxLoginAttempts}
                    onChange={(e) =>
                      updateField("maxLoginAttempts", parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Account locks after this many failed login attempts
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataRetentionDays">
                    Data Retention (days)
                  </Label>
                  <Input
                    id="dataRetentionDays"
                    type="number"
                    min="30"
                    max="3650"
                    value={formData.dataRetentionDays}
                    onChange={(e) =>
                      updateField("dataRetentionDays", parseInt(e.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to keep audit logs and deleted records
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Two-Factor Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for admin users (Coming Soon)
                  </p>
                </div>
                <Switch
                  checked={formData.enableTwoFactorAuth}
                  onCheckedChange={(checked) =>
                    updateField("enableTwoFactorAuth", checked)
                  }
                  disabled
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Security Best Practices</AlertTitle>
                <AlertDescription>
                  Regularly review audit logs, use strong passwords, and enable
                  two-factor authentication when available to protect patient
                  data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Data */}
        <TabsContent value="backup" className="space-y-6">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Data Protection</AlertTitle>
            <AlertDescription>
              Regular backups ensure your medical data is safe. Store backups
              securely in a separate location for disaster recovery.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Automatic Backup Configuration</CardTitle>
              <CardDescription>
                Configure automated database backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create database backups on schedule
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
                        <SelectItem value="every-6-hours">
                          Every 6 hours
                        </SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Recommended: Daily backups for medical systems
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm">
                      <strong>Next Backup:</strong> Scheduled for{" "}
                      {new Date(Date.now() + 86400000).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Backup & Restore</CardTitle>
              <CardDescription>
                Create manual backups or restore from previous backups
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={handleBackup}
                    disabled={backupMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {backupMutation.isPending
                      ? "Creating Backup..."
                      : "Download Backup"}
                  </Button>
                  <Button
                    onClick={handleRestore}
                    variant="outline"
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Restore from Backup
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Download:</strong> Creates a .sql file with complete
                  database backup
                  <br />
                  <strong>Restore:</strong> Upload a .sql backup file to restore
                  data
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Recent Backup Activity</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded-md text-sm">
                    <span>Last Manual Backup</span>
                    <Badge variant="outline">
                      {new Date().toLocaleDateString()} at{" "}
                      {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md text-sm">
                    <span>Last Auto Backup</span>
                    <Badge variant="outline">
                      {new Date(Date.now() - 86400000).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md text-sm">
                    <span>Backup Status</span>
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
