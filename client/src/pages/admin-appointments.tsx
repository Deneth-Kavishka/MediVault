import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Search,
  Calendar as CalendarIcon,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  MoreVertical,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime?: string;
  status: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  patient?: {
    rfid: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
  doctor?: {
    licenseNumber: string;
    specialization: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function AdminAppointments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Appointment>;
    }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Filter appointments
  const filteredAppointments = appointments?.filter((appointment) => {
    const patientName = `${appointment.patient?.user?.firstName || ""} ${
      appointment.patient?.user?.lastName || ""
    }`.toLowerCase();
    const doctorName = `${appointment.doctor?.user?.firstName || ""} ${
      appointment.doctor?.user?.lastName || ""
    }`.toLowerCase();

    const matchesSearch =
      patientName.includes(searchQuery.toLowerCase()) ||
      doctorName.includes(searchQuery.toLowerCase()) ||
      appointment.patient?.rfid
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      appointment.doctor?.licenseNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || appointment.status === statusFilter;

    const matchesDate = dateFilter
      ? new Date(appointment.appointmentDate).toDateString() ===
        dateFilter.toDateString()
      : true;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats
  const totalAppointments = appointments?.length || 0;
  const pendingAppointments =
    appointments?.filter((a) => a.status === "pending").length || 0;
  const confirmedAppointments =
    appointments?.filter((a) => a.status === "confirmed").length || 0;
  const completedAppointments =
    appointments?.filter((a) => a.status === "completed").length || 0;

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleApprove = async (appointment: Appointment) => {
    await updateAppointmentMutation.mutateAsync({
      id: appointment.id,
      data: { status: "confirmed" },
    });
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    await updateAppointmentMutation.mutateAsync({
      id: selectedAppointment.id,
      data: { status: "cancelled" },
    });
    setCancelDialogOpen(false);
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !newDate) {
      toast({
        title: "Error",
        description: "Please select a new date",
        variant: "destructive",
      });
      return;
    }

    await updateAppointmentMutation.mutateAsync({
      id: selectedAppointment.id,
      data: {
        appointmentDate: newDate.toISOString(),
        appointmentTime: newTime || selectedAppointment.appointmentTime,
      },
    });
    setRescheduleDialogOpen(false);
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
    setNewDate(undefined);
    setNewTime("");
  };

  const handleExport = () => {
    if (!filteredAppointments || filteredAppointments.length === 0) {
      toast({
        title: "No Data",
        description: "No appointments to export",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      "Date",
      "Time",
      "Patient Name",
      "Patient RFID",
      "Doctor Name",
      "Specialization",
      "Status",
      "Reason",
    ];
    const rows = filteredAppointments.map((a) => [
      new Date(a.appointmentDate).toLocaleDateString(),
      a.appointmentTime || "",
      `${a.patient?.user?.firstName || ""} ${a.patient?.user?.lastName || ""}`,
      a.patient?.rfid || "",
      `Dr. ${a.doctor?.user?.firstName || ""} ${
        a.doctor?.user?.lastName || ""
      }`,
      a.doctor?.specialization || "",
      a.status,
      a.reason || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${filteredAppointments.length} appointments`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
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
          <CalendarIcon className="h-8 w-8 text-primary" />
          Appointment Management
        </h1>
        <p className="text-muted-foreground">
          Manage all appointments, schedules, and bookings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingAppointments}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {confirmedAppointments}
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
            <div className="text-2xl font-bold text-blue-600">
              {completedAppointments}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>
                View and manage patient appointments with doctors
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, doctor, RFID, or license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setDateFilter(undefined)}
                disabled={!dateFilter}
              >
                <Filter className="h-4 w-4 mr-2" />
                {dateFilter
                  ? dateFilter.toLocaleDateString()
                  : "Filter by Date"}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments && filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(
                              appointment.appointmentDate
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.appointmentTime || "Not set"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {appointment.patient?.user?.firstName}{" "}
                            {appointment.patient?.user?.lastName}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {appointment.patient?.rfid}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            Dr. {appointment.doctor?.user?.firstName}{" "}
                            {appointment.doctor?.user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.doctor?.licenseNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {appointment.doctor?.specialization}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {appointment.status === "pending" ? (
                          <Badge variant="outline" className="bg-yellow-50">
                            Pending
                          </Badge>
                        ) : appointment.status === "confirmed" ? (
                          <Badge className="bg-green-500">Confirmed</Badge>
                        ) : appointment.status === "completed" ? (
                          <Badge variant="secondary">Completed</Badge>
                        ) : appointment.status === "cancelled" ? (
                          <Badge variant="destructive">Cancelled</Badge>
                        ) : (
                          <Badge variant="outline">{appointment.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {appointment.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(appointment)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {appointment.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => handleApprove(appointment)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {appointment.status !== "cancelled" &&
                              appointment.status !== "completed" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setRescheduleDialogOpen(true);
                                    }}
                                  >
                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                    Reschedule
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAppointment(appointment);
                                      setCancelDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No appointments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete appointment information
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Patient
                  </label>
                  <div>
                    <p className="font-semibold">
                      {selectedAppointment.patient?.user?.firstName}{" "}
                      {selectedAppointment.patient?.user?.lastName}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {selectedAppointment.patient?.rfid}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Doctor
                  </label>
                  <div>
                    <p className="font-semibold">
                      Dr. {selectedAppointment.doctor?.user?.firstName}{" "}
                      {selectedAppointment.doctor?.user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.doctor?.specialization}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Date
                  </label>
                  <p className="font-medium">
                    {new Date(
                      selectedAppointment.appointmentDate
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Time
                  </label>
                  <p className="font-medium">
                    {selectedAppointment.appointmentTime || "Not set"}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  {selectedAppointment.status === "pending" ? (
                    <Badge variant="outline" className="bg-yellow-50">
                      Pending
                    </Badge>
                  ) : selectedAppointment.status === "confirmed" ? (
                    <Badge className="bg-green-500">Confirmed</Badge>
                  ) : selectedAppointment.status === "completed" ? (
                    <Badge variant="secondary">Completed</Badge>
                  ) : selectedAppointment.status === "cancelled" ? (
                    <Badge variant="destructive">Cancelled</Badge>
                  ) : (
                    <Badge variant="outline">
                      {selectedAppointment.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">
                    {new Date(selectedAppointment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Reason for Visit
                </label>
                <p className="text-sm p-3 bg-muted rounded-md">
                  {selectedAppointment.reason || "Not specified"}
                </p>
              </div>
              {selectedAppointment.notes && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Notes
                  </label>
                  <p className="text-sm p-3 bg-muted rounded-md">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The appointment will be marked as
              cancelled and both the patient and doctor will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for the appointment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <Label>New Time</Label>
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReschedule}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
