import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lightbulb } from "lucide-react";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DaySchedule = { enabled: boolean; start: string; end: string };
type WeeklySchedule = Record<DayKey, DaySchedule>;

const dayKeys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const dayLabel: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

interface LabFacilitySettings {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  latitude?: string | null;
  longitude?: string | null;
  phone?: string;
  email?: string;
  isActive: boolean;
  isVerified: boolean;
  isPublished: boolean;
  isAvailable: boolean;
  availabilitySchedule?: string | null;
}

export default function LabAvailabilitySection() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isCreateFacilityDialogOpen, setIsCreateFacilityDialogOpen] =
    useState(false);
  const [isEditFacilityDialogOpen, setIsEditFacilityDialogOpen] =
    useState(false);

  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [facilityCity, setFacilityCity] = useState("");
  const [facilityPhone, setFacilityPhone] = useState("");
  const [facilityEmail, setFacilityEmail] = useState("");
  const [facilityDescription, setFacilityDescription] = useState("");
  const [facilityLatitude, setFacilityLatitude] = useState("");
  const [facilityLongitude, setFacilityLongitude] = useState("");

  const [editFacilityName, setEditFacilityName] = useState("");
  const [editFacilityAddress, setEditFacilityAddress] = useState("");
  const [editFacilityCity, setEditFacilityCity] = useState("");
  const [editFacilityPhone, setEditFacilityPhone] = useState("");
  const [editFacilityEmail, setEditFacilityEmail] = useState("");
  const [editFacilityDescription, setEditFacilityDescription] = useState("");
  const [editFacilityLatitude, setEditFacilityLatitude] = useState("");
  const [editFacilityLongitude, setEditFacilityLongitude] = useState("");

  const defaultSchedule: WeeklySchedule = {
    mon: { enabled: true, start: "09:00", end: "17:00" },
    tue: { enabled: true, start: "09:00", end: "17:00" },
    wed: { enabled: true, start: "09:00", end: "17:00" },
    thu: { enabled: true, start: "09:00", end: "17:00" },
    fri: { enabled: true, start: "09:00", end: "17:00" },
    sat: { enabled: false, start: "09:00", end: "13:00" },
    sun: { enabled: false, start: "09:00", end: "13:00" },
  };

  const [scheduleDraft, setScheduleDraft] =
    useState<WeeklySchedule>(defaultSchedule);

  const {
    data: facility,
    isLoading: loadingFacility,
    error: facilityError,
  } = useQuery<LabFacilitySettings>({
    queryKey: ["/api/lab-facilities/me"],
    enabled: isAuthenticated && !!user && user.role === "lab_technician",
  });

  useEffect(() => {
    if (!facility) return;

    if (facility.availabilitySchedule) {
      try {
        const parsed = JSON.parse(facility.availabilitySchedule);
        setScheduleDraft({ ...defaultSchedule, ...parsed });
      } catch {
        setScheduleDraft(defaultSchedule);
      }
    } else {
      setScheduleDraft(defaultSchedule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility?.id]);

  const updateFacilitySettingsMutation = useMutation({
    mutationFn: async (data: {
      isPublished?: boolean;
      isAvailable?: boolean;
      availabilitySchedule?: WeeklySchedule | null;
      name?: string;
      description?: string | null;
      address?: string;
      city?: string;
      phone?: string | null;
      email?: string | null;
      latitude?: string | null;
      longitude?: string | null;
    }) => {
      const response = await fetch(`/api/lab-facilities/me/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update lab settings");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description: "Lab settings updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-facilities/me"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/lab-facilities/available"],
      });
      setIsScheduleDialogOpen(false);
      setIsEditFacilityDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createFacilityMutation = useMutation({
    mutationFn: async () => {
      if (!facilityLatitude.trim() || !facilityLongitude.trim()) {
        throw new Error("Latitude and longitude are required");
      }
      const response = await fetch(`/api/lab-facilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: facilityName.trim(),
          address: facilityAddress.trim(),
          city: facilityCity.trim(),
          phone: facilityPhone.trim() || undefined,
          email: facilityEmail.trim() || undefined,
          description: facilityDescription.trim() || undefined,
          latitude: facilityLatitude.trim(),
          longitude: facilityLongitude.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || "Failed to create lab facility");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Created",
        description: "Your lab facility has been created.",
      });
      setIsCreateFacilityDialogOpen(false);
      setFacilityName("");
      setFacilityAddress("");
      setFacilityCity("");
      setFacilityPhone("");
      setFacilityEmail("");
      setFacilityDescription("");
      setFacilityLatitude("");
      setFacilityLongitude("");
      queryClient.invalidateQueries({ queryKey: ["/api/lab-facilities/me"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/lab-facilities/available"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditFacilityDialog = () => {
    if (!facility) return;
    setEditFacilityName(facility.name || "");
    setEditFacilityAddress(facility.address || "");
    setEditFacilityCity(facility.city || "");
    setEditFacilityPhone(facility.phone || "");
    setEditFacilityEmail(facility.email || "");
    setEditFacilityDescription(facility.description || "");
    setEditFacilityLatitude(facility.latitude || "");
    setEditFacilityLongitude(facility.longitude || "");
    setIsEditFacilityDialogOpen(true);
  };

  const saveFacilityDetails = () => {
    if (!facility) return;

    const name = editFacilityName.trim();
    const address = editFacilityAddress.trim();
    const city = editFacilityCity.trim();
    const phone = editFacilityPhone.trim();
    const email = editFacilityEmail.trim();
    const description = editFacilityDescription.trim();
    const latitude = editFacilityLatitude.trim();
    const longitude = editFacilityLongitude.trim();

    if (!name || !address || !city) {
      toast({
        title: "Error",
        description: "Name, address, and city are required.",
        variant: "destructive",
      });
      return;
    }

    if (!latitude || !longitude) {
      toast({
        title: "Error",
        description: "Latitude and longitude are required.",
        variant: "destructive",
      });
      return;
    }

    updateFacilitySettingsMutation.mutate({
      name,
      address,
      city,
      phone: phone || null,
      email: email || null,
      description: description || null,
      latitude: latitude || null,
      longitude: longitude || null,
    });
  };

  if (
    isLoading ||
    !isAuthenticated ||
    !user ||
    user.role !== "lab_technician"
  ) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lab Availability</CardTitle>
          <p className="text-sm text-muted-foreground">
            Publish your lab and set weekly active times
          </p>
        </CardHeader>
        <CardContent>
          {loadingFacility ? (
            <p className="text-sm text-muted-foreground">
              Loading lab settings...
            </p>
          ) : facilityError || !facility ? (
            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No lab facility found for your account.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateFacilityDialogOpen(true)}
                >
                  Create Lab Facility
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">{facility.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {facility.address}, {facility.city}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={facility.isPublished ? "default" : "secondary"}
                  >
                    {facility.isPublished ? "Published" : "Unpublished"}
                  </Badge>
                  <Badge
                    variant={facility.isAvailable ? "outline" : "secondary"}
                  >
                    {facility.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">Publish Lab</div>
                    <div className="text-sm text-muted-foreground">
                      Visible to patients for selection
                    </div>
                  </div>
                  <Switch
                    checked={facility.isPublished}
                    onCheckedChange={(checked) =>
                      updateFacilitySettingsMutation.mutate({
                        isPublished: checked,
                      })
                    }
                    disabled={updateFacilitySettingsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">Availability</div>
                    <div className="text-sm text-muted-foreground">
                      Temporarily open/close your lab
                    </div>
                  </div>
                  <Switch
                    checked={facility.isAvailable}
                    onCheckedChange={(checked) =>
                      updateFacilitySettingsMutation.mutate({
                        isAvailable: checked,
                      })
                    }
                    disabled={updateFacilitySettingsMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={openEditFacilityDialog}>
                  Edit Lab Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsScheduleDialogOpen(true)}
                >
                  Set Weekly Schedule
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lab Facility Dialog */}
      <Dialog
        open={isEditFacilityDialogOpen}
        onOpenChange={setIsEditFacilityDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lab Details</DialogTitle>
            <DialogDescription>
              Update your lab location and details shown to patients.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Lab Name</Label>
              <Input
                value={editFacilityName}
                onChange={(e) => setEditFacilityName(e.target.value)}
                placeholder="Lab name"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={editFacilityAddress}
                onChange={(e) => setEditFacilityAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={editFacilityCity}
                onChange={(e) => setEditFacilityCity(e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editFacilityPhone}
                onChange={(e) => setEditFacilityPhone(e.target.value)}
                placeholder="Phone (optional)"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Email</Label>
              <Input
                value={editFacilityEmail}
                onChange={(e) => setEditFacilityEmail(e.target.value)}
                placeholder="Email (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Latitude <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editFacilityLatitude}
                onChange={(e) => setEditFacilityLatitude(e.target.value)}
                placeholder="e.g., 6.9271"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Longitude <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editFacilityLongitude}
                onChange={(e) => setEditFacilityLongitude(e.target.value)}
                placeholder="e.g., 79.8612"
              />
            </div>

            <div className="sm:col-span-2 rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <div className="flex gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5" />
                <p>
                  <span className="font-semibold">
                    How to find coordinates:
                  </span>{" "}
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Open Google Maps
                  </a>
                  , right-click your location, and click the coordinates to copy
                  them.
                </p>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={editFacilityDescription}
                onChange={(e) => setEditFacilityDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditFacilityDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={saveFacilityDetails}
              disabled={updateFacilitySettingsMutation.isPending}
            >
              {updateFacilitySettingsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lab Facility Dialog */}
      <Dialog
        open={isCreateFacilityDialogOpen}
        onOpenChange={setIsCreateFacilityDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Lab Facility</DialogTitle>
            <DialogDescription>
              Add your lab details so patients can select your lab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facilityName">
                  Lab Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="facilityName"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="e.g. MediVault Diagnostics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityCity">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="facilityCity"
                  value={facilityCity}
                  onChange={(e) => setFacilityCity(e.target.value)}
                  placeholder="e.g. Colombo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityAddress">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="facilityAddress"
                value={facilityAddress}
                onChange={(e) => setFacilityAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facilityPhone">Phone (Optional)</Label>
                <Input
                  id="facilityPhone"
                  value={facilityPhone}
                  onChange={(e) => setFacilityPhone(e.target.value)}
                  placeholder="e.g. +94..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityEmail">Email (Optional)</Label>
                <Input
                  id="facilityEmail"
                  type="email"
                  value={facilityEmail}
                  onChange={(e) => setFacilityEmail(e.target.value)}
                  placeholder="lab@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityDescription">
                Description (Optional)
              </Label>
              <Textarea
                id="facilityDescription"
                value={facilityDescription}
                onChange={(e) => setFacilityDescription(e.target.value)}
                rows={3}
                placeholder="Short description of your lab"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facilityLatitude">
                  Latitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="facilityLatitude"
                  value={facilityLatitude}
                  onChange={(e) => setFacilityLatitude(e.target.value)}
                  placeholder="e.g., 6.9271"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facilityLongitude">
                  Longitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="facilityLongitude"
                  value={facilityLongitude}
                  onChange={(e) => setFacilityLongitude(e.target.value)}
                  placeholder="e.g., 79.8612"
                />
              </div>

              <div className="sm:col-span-2 rounded-md bg-blue-100 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 mt-0.5" />
                  <p>
                    <span className="font-semibold">
                      How to find coordinates:
                    </span>{" "}
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Open Google Maps
                    </a>
                    , right-click your location, and click the coordinates to
                    copy them.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCreateFacilityDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (
                    !facilityName.trim() ||
                    !facilityAddress.trim() ||
                    !facilityCity.trim() ||
                    !facilityLatitude.trim() ||
                    !facilityLongitude.trim()
                  ) {
                    toast({
                      title: "Missing fields",
                      description:
                        "Please fill Lab Name, Address, City, Latitude, and Longitude.",
                      variant: "destructive",
                    });
                    return;
                  }
                  createFacilityMutation.mutate();
                }}
                disabled={createFacilityMutation.isPending}
              >
                {createFacilityMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weekly Schedule Dialog */}
      <Dialog
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Weekly Availability</DialogTitle>
            <DialogDescription>
              Set which days and times your lab is open.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {dayKeys.map((day) => (
              <div
                key={day}
                className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-4 sm:items-center"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={scheduleDraft[day].enabled}
                    onCheckedChange={(checked) =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          enabled: Boolean(checked),
                        },
                      }))
                    }
                  />
                  <span className="text-sm font-medium">{dayLabel[day]}</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={scheduleDraft[day].start}
                    onChange={(e) =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          start: e.target.value,
                        },
                      }))
                    }
                    disabled={!scheduleDraft[day].enabled}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={scheduleDraft[day].end}
                    onChange={(e) =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          end: e.target.value,
                        },
                      }))
                    }
                    disabled={!scheduleDraft[day].enabled}
                  />
                </div>

                <div className="flex sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        [day]: {
                          ...prev[day],
                          enabled: false,
                        },
                      }))
                    }
                  >
                    Disable
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsScheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                updateFacilitySettingsMutation.mutate({
                  availabilitySchedule: scheduleDraft,
                })
              }
              disabled={updateFacilitySettingsMutation.isPending}
            >
              {updateFacilitySettingsMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
