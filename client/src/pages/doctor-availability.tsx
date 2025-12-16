import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DoctorAvailability {
  id: string;
  doctorId: string;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationLatitude: string | null;
  locationLongitude: string | null;
  placeId: string | null;
  availableDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  bookedCount: number;
  hospitalType: string;
  consultationFee: string;
  isActive: boolean;
  status?: string;
  reactivationRequested?: boolean;
  reactivationRequestedAt?: string;
  createdAt: string;
}

export default function DoctorAvailability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] =
    useState<DoctorAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [formData, setFormData] = useState({
    locationName: "",
    locationAddress: "",
    locationCity: "",
    locationLatitude: "",
    locationLongitude: "",
    placeId: "",
    availableDate: new Date(),
    startTime: "09:00",
    endTime: "17:00",
    maxPatients: 20,
    hospitalType: "government",
    consultationFee: "0",
  });

  // Fetch doctor's own data
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/doctors", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      const doctors = await response.json();
      return doctors.find((d: any) => d.userId === user?.id);
    },
    enabled: !!user,
  });

  // Fetch doctor's availability
  const { data: availability, isLoading: availabilityLoading } = useQuery<
    DoctorAvailability[]
  >({
    queryKey: ["doctor-availability", doctor?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/doctor-availability/doctor/${doctor?.id}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
    enabled: !!doctor?.id,
    refetchInterval: 10000,
    staleTime: 0,
  });

  // Add availability mutation
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const dateToSend =
        data.availableDate instanceof Date
          ? data.availableDate.toISOString()
          : new Date(data.availableDate).toISOString();

      return await api.post("/api/doctor-availability", {
        ...data,
        doctorId: doctor?.id,
        availableDate: dateToSend,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availability"] });
      toast({
        title: "Success",
        description: "Availability added successfully",
      });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add availability",
        variant: "destructive",
      });
    },
  });

  // Update availability mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const dateToSend =
        data.availableDate instanceof Date
          ? data.availableDate.toISOString()
          : new Date(data.availableDate).toISOString();

      return await api.patch(`/api/doctor-availability/${id}`, {
        ...data,
        availableDate: dateToSend,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availability"] });
      toast({
        title: "Success",
        description: "Availability updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedAvailability(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update availability",
        variant: "destructive",
      });
    },
  });

  // Delete availability mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/doctor-availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availability"] });
      toast({
        title: "Success",
        description: "Availability deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedAvailability(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete availability",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      locationName: "",
      locationAddress: "",
      locationCity: "",
      locationLatitude: "",
      locationLongitude: "",
      placeId: "",
      availableDate: new Date(),
      startTime: "09:00",
      endTime: "17:00",
      maxPatients: 20,
      hospitalType: "government",
      consultationFee: "0",
    });
    setSelectedDate(undefined);
  };

  const handleAddSubmit = () => {
    if (
      !formData.locationName ||
      !formData.locationAddress ||
      !formData.locationCity
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all location fields",
        variant: "destructive",
      });
      return;
    }
    if (!formData.locationLatitude || !formData.locationLongitude) {
      toast({
        title: "Validation Error",
        description: "Please enter latitude and longitude coordinates",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select an available date",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate({
      ...formData,
      availableDate: selectedDate,
    });
  };

  const handleEditClick = (avail: DoctorAvailability) => {
    setSelectedAvailability(avail);
    setFormData({
      locationName: avail.locationName,
      locationAddress: avail.locationAddress,
      locationCity: avail.locationCity,
      locationLatitude: avail.locationLatitude || "",
      locationLongitude: avail.locationLongitude || "",
      placeId: avail.placeId || "",
      availableDate: new Date(avail.availableDate),
      startTime: avail.startTime,
      endTime: avail.endTime,
      maxPatients: avail.maxPatients,
      hospitalType: avail.hospitalType || "government",
      consultationFee: avail.consultationFee || "0",
    });
    setSelectedDate(new Date(avail.availableDate));
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedAvailability) return;
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select an available date",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      id: selectedAvailability.id,
      data: {
        ...formData,
        availableDate: selectedDate,
      },
    });
  };

  const handleDeleteClick = (avail: DoctorAvailability) => {
    setSelectedAvailability(avail);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedAvailability) return;
    deleteMutation.mutate(selectedAvailability.id);
  };

  // Sort availability by date
  const sortedAvailability = availability?.sort(
    (a, b) =>
      new Date(a.availableDate).getTime() - new Date(b.availableDate).getTime()
  );

  if (doctorLoading || availabilityLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">
                  Doctor Profile Not Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please complete your doctor profile to manage availability
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            My Availability
          </h1>
          <p className="text-muted-foreground">
            Set specific dates and locations where you'll be available
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Availability
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availability?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(availability?.map((a) => a.locationName)).size || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availability?.reduce((sum, a) => sum + a.maxPatients, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Availability Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedAvailability && sortedAvailability.length > 0 ? (
          sortedAvailability.map((avail) => (
            <Card key={avail.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {avail.locationName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {avail.locationAddress}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge
                      variant={avail.isActive ? "default" : "secondary"}
                      className={avail.isActive ? "bg-green-500" : ""}
                    >
                      {avail.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(
                      new Date(avail.availableDate),
                      "EEEE, MMMM d, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {avail.startTime} - {avail.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong
                      className={
                        avail.bookedCount >= avail.maxPatients
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {avail.maxPatients - avail.bookedCount} available
                    </strong>{" "}
                    / {avail.maxPatients} slots
                    {avail.bookedCount > 0 && (
                      <span className="text-muted-foreground ml-1">
                        ({avail.bookedCount} booked)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{avail.locationCity}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {avail.hospitalType === "private" ? (
                    <>
                      <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-sm py-1 px-3 font-semibold">
                        🏨 Private Hospital
                      </Badge>
                      <span className="font-bold text-lg text-green-600">
                        LKR{" "}
                        {parseFloat(avail.consultationFee).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </>
                  ) : (
                    <Badge className="bg-green-600 text-white hover:bg-green-700 text-sm py-1 px-3 font-semibold">
                      🏥 Government Hospital - FREE
                    </Badge>
                  )}
                </div>

                {avail.locationLatitude && avail.locationLongitude && (
                  <div className="w-full h-48 rounded-md overflow-hidden border mt-2">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps?q=${avail.locationLatitude},${avail.locationLongitude}&output=embed`}
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(avail)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(avail)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Availability Set</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your first availability schedule to let patients find
                    you
                  </p>
                </div>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Availability
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Availability Schedule</DialogTitle>
            <DialogDescription>
              Enter your practice location details and set your available date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                placeholder="e.g., Apollo Hospital, City Clinic"
                value={formData.locationName}
                onChange={(e) =>
                  setFormData({ ...formData, locationName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-address">Address *</Label>
              <Input
                id="location-address"
                placeholder="e.g., 123 Main Street, Colombo 03"
                value={formData.locationAddress}
                onChange={(e) =>
                  setFormData({ ...formData, locationAddress: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-city">City *</Label>
              <Input
                id="location-city"
                placeholder="e.g., Colombo, Kandy, Galle"
                value={formData.locationCity}
                onChange={(e) =>
                  setFormData({ ...formData, locationCity: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 6.9271"
                  value={formData.locationLatitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationLatitude: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  placeholder="e.g., 79.8612"
                  value={formData.locationLongitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationLongitude: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                💡 <strong>How to find coordinates:</strong> Open{" "}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-700"
                >
                  Google Maps
                </a>
                , right-click your location, and click the coordinates to copy
                them.
              </p>
            </div>

            {formData.locationLatitude && formData.locationLongitude && (
              <div className="space-y-2">
                <Label>Location Preview</Label>
                <div className="w-full h-64 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${formData.locationLatitude},${formData.locationLongitude}&output=embed`}
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Available Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setFormData({ ...formData, availableDate: date });
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-start">Start Time *</Label>
                <Input
                  id="add-start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-end">End Time *</Label>
                <Input
                  id="add-end"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-max">Max Patients *</Label>
              <Input
                id="add-max"
                type="number"
                min="1"
                value={formData.maxPatients}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPatients: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-hospital-type">Hospital Type *</Label>
              <Select
                value={formData.hospitalType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    hospitalType: value,
                    consultationFee:
                      value === "government" ? "0" : formData.consultationFee,
                  })
                }
              >
                <SelectTrigger id="add-hospital-type">
                  <SelectValue placeholder="Select hospital type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">
                    🏥 Government Hospital (Free)
                  </SelectItem>
                  <SelectItem value="private">
                    🏨 Private Hospital / PP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.hospitalType === "private" && (
              <div className="space-y-2">
                <Label htmlFor="add-fee">Consultation Fee (LKR) *</Label>
                <Input
                  id="add-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 2500.00"
                  value={formData.consultationFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consultationFee: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  💡 Enter your consultation fee for private practice
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Availability"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Availability Schedule</DialogTitle>
            <DialogDescription>
              Update your availability details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{formData.locationName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.locationAddress}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    City: {formData.locationCity}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Available Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setFormData({ ...formData, availableDate: date });
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Time *</Label>
                <Input
                  id="edit-start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Time *</Label>
                <Input
                  id="edit-end"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-max">Max Patients *</Label>
              <Input
                id="edit-max"
                type="number"
                min="1"
                value={formData.maxPatients}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPatients: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hospital-type">Hospital Type *</Label>
              <Select
                value={formData.hospitalType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    hospitalType: value,
                    consultationFee:
                      value === "government" ? "0" : formData.consultationFee,
                  })
                }
              >
                <SelectTrigger id="edit-hospital-type">
                  <SelectValue placeholder="Select hospital type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">
                    🏥 Government Hospital (Free)
                  </SelectItem>
                  <SelectItem value="private">
                    🏨 Private Hospital / PP
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.hospitalType === "private" && (
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Consultation Fee (LKR) *</Label>
                <Input
                  id="edit-fee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 2500.00"
                  value={formData.consultationFee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consultationFee: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  💡 Enter your consultation fee for private practice
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Availability"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Availability?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this availability schedule. Patients will no
              longer be able to book appointments for this date and time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
