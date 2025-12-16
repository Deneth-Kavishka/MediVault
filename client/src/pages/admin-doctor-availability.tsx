import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Calendar,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DoctorAvailability {
  id: string;
  doctorId: string;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationLatitude: string | null;
  locationLongitude: string | null;
  availableDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  bookedCount: number;
  hospitalType: string;
  consultationFee: string;
  isActive: boolean;
  status: string;
  reactivationRequested: boolean;
  reactivationRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DoctorInfo {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  user?: {
    firstName?: string;
    lastName?: string;
    username: string;
  };
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminDoctorAvailability() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    availability: DoctorAvailability | null;
  }>({ open: false, availability: null });

  // Fetch all availability
  const {
    data: availability,
    isLoading,
    error,
    refetch,
  } = useQuery<DoctorAvailability[]>({
    queryKey: ["admin-doctor-availability"],
    queryFn: async () => {
      const response = await fetch("/api/doctor-availability", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch availability: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Fetched availability:", data.length, "records");
      return data;
    },
    staleTime: 5000, // Keep data fresh for 5 seconds to prevent immediate refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus during active editing
  });

  // Toggle availability active/inactive status
  const toggleAvailability = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/doctor-availability/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update availability status");
      }
      return response.json();
    },
    onMutate: async ({ id, isActive }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["admin-doctor-availability"],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "admin-doctor-availability",
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ["admin-doctor-availability"],
        (old: DoctorAvailability[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === id
              ? {
                  ...item,
                  isActive,
                  status: isActive ? "active" : "inactive",
                  reactivationRequested: false,
                }
              : item
          );
        }
      );

      return { previousData };
    },
    onSuccess: async (data, variables) => {
      // Update the cache with the server response immediately
      queryClient.setQueryData(
        ["admin-doctor-availability"],
        (old: DoctorAvailability[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === variables.id ? { ...item, ...data } : item
          );
        }
      );

      // Then invalidate to refetch in the background
      await queryClient.invalidateQueries({
        queryKey: ["admin-doctor-availability"],
      });

      toast({
        title: "Success",
        description: `Availability ${
          variables.isActive ? "activated" : "deactivated"
        } successfully`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["admin-doctor-availability"],
          context.previousData
        );
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update availability status",
        variant: "destructive",
      });
    },
  });

  // Fetch doctors data
  const { data: doctors } = useQuery<DoctorInfo[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/doctors", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      return response.json();
    },
  });

  // Fetch availability stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["availability-stats", detailsDialog.availability?.id],
    queryFn: async () => {
      if (!detailsDialog.availability) return null;
      const response = await fetch(
        `/api/doctor-availability/${detailsDialog.availability.id}/stats`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!detailsDialog.availability,
  });

  // Create a map of doctorId to doctor info
  const doctorMap = new Map(doctors?.map((d) => [d.id, d]));

  const getStatusBadge = (avail: DoctorAvailability) => {
    const isPast = new Date(avail.availableDate) < new Date();
    const status = isPast
      ? "finished"
      : avail.status || (avail.isActive ? "active" : "inactive");

    switch (status) {
      case "finished":
        return (
          <Badge variant="secondary" className="bg-gray-500 text-white">
            Finished
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Active
          </Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter availability
  const filteredAvailability = availability?.filter((avail) => {
    const doctor = doctorMap.get(avail.doctorId);
    const doctorName = doctor?.user
      ? `${doctor.user.firstName || ""} ${doctor.user.lastName || ""}`.trim()
      : doctor?.userId || "";

    const matchesSearch =
      doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor?.specialization
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      avail.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avail.locationCity.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity =
      !cityFilter ||
      avail.locationCity.toLowerCase().includes(cityFilter.toLowerCase());

    return matchesSearch && matchesCity;
  });

  // Group by doctor
  const groupedByDoctor = filteredAvailability?.reduce((acc, avail) => {
    if (!acc[avail.doctorId]) {
      acc[avail.doctorId] = [];
    }
    acc[avail.doctorId].push(avail);
    return acc;
  }, {} as Record<string, DoctorAvailability[]>);

  // Get unique cities for stats
  const uniqueCities = new Set(availability?.map((a) => a.locationCity));
  const totalDoctorsWithAvailability = groupedByDoctor
    ? Object.keys(groupedByDoctor).length
    : 0;

  if (error) {
    console.error("Error fetching availability:", error);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <MapPin className="h-8 w-8 text-primary" />
          Doctor Availability
        </h1>
        <p className="text-muted-foreground">
          View and manage doctor availability schedules and locations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Availability
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
              Active Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDoctorsWithAvailability}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCities.size}</div>
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

      {/* Availability Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Availability Schedules</CardTitle>
          <CardDescription>
            View all doctor availability across different locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by doctor, specialization, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by city..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-[200px]"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAvailability && filteredAvailability.length > 0 ? (
                  filteredAvailability.map((avail) => {
                    const doctor = doctorMap.get(avail.doctorId);
                    const doctorName = doctor?.user
                      ? `${doctor.user.firstName || ""} ${
                          doctor.user.lastName || ""
                        }`.trim() || doctor.user.username
                      : "Unknown";

                    return (
                      <TableRow key={avail.id}>
                        <TableCell className="font-medium">
                          {doctorName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doctor?.specialization || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {avail.locationName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {avail.locationAddress}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{avail.locationCity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(avail.availableDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {avail.startTime} - {avail.endTime}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{avail.maxPatients}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(avail)}</TableCell>
                        <TableCell>
                          {avail.reactivationRequested && (
                            <Badge
                              variant="outline"
                              className="border-orange-500 text-orange-500"
                            >
                              Pending Request
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDetailsDialog({
                                  open: true,
                                  availability: avail,
                                })
                              }
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={avail.isActive}
                              onCheckedChange={(checked) =>
                                toggleAvailability.mutate({
                                  id: avail.id,
                                  isActive: checked,
                                })
                              }
                              disabled={
                                toggleAvailability.isPending ||
                                avail.status === "finished"
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground"
                    >
                      No availability schedules found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onOpenChange={(open) => setDetailsDialog({ open, availability: null })}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Availability Details</DialogTitle>
            <DialogDescription>
              View appointment statistics and details for this availability
              schedule
            </DialogDescription>
          </DialogHeader>

          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : statsData ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Booked
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsData.totalBooked}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {statsData.completed}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Cancelled
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {statsData.cancelled}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pending
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {statsData.pending}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Appointments List */}
                {statsData.appointments && statsData.appointments.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Appointments</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsData.appointments.map((appointment: any) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {appointment.patientName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {appointment.patientId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(
                                  appointment.appointmentDate
                                ).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  appointment.status === "completed"
                                    ? "default"
                                    : appointment.status === "cancelled"
                                    ? "destructive"
                                    : appointment.status === "confirmed"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  appointment.status === "completed"
                                    ? "bg-green-500 hover:bg-green-600"
                                    : appointment.status === "confirmed"
                                    ? "bg-blue-500 hover:bg-blue-600"
                                    : ""
                                }
                              >
                                {appointment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {appointment.cancellationReason ||
                                  appointment.patientNotes ||
                                  "—"}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No appointments yet
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
