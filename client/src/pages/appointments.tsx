import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Plus, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const appointmentFormSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  appointmentDate: z.string().min(1, "Please select a date and time"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function Appointments() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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

  // Auto-select table view for admin
  useEffect(() => {
    if (user?.role === "admin") {
      setViewMode("table");
    }
  }, [user?.role]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === "admin"
              ? "Manage all appointments in the system"
              : "Manage your medical appointments"}
          </p>
        </div>

        <div className="flex gap-3">
          {user?.role === "admin" && (
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
            >
              {viewMode === "cards" ? "Table View" : "Card View"}
            </Button>
          )}
          {user?.role === "patient" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-book-appointment">
                  <Plus className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Book New Appointment</DialogTitle>
                </DialogHeader>
                <BookAppointmentForm onSuccess={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === "table" ? (
        <AppointmentsTable />
      ) : (
        <AppointmentsList />
      )}
    </div>
  );
}

function BookAppointmentForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch doctors list
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<any[]>({
    queryKey: ["/api/doctors"],
  });

  // Fetch patient profile to get patientId
  const { data: patientProfile } = useQuery<any>({
    queryKey: ["/api/patients/me"],
    enabled: user?.role === "patient",
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      doctorId: "",
      appointmentDate: "",
      reason: "",
      notes: "",
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      if (!patientProfile?.id) {
        throw new Error("Patient profile not found");
      }
      await apiRequest("POST", "/api/appointments", {
        ...data,
        patientId: patientProfile.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      onSuccess();
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/login"), 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createAppointment.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-doctor">
                    <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Select a doctor"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingDoctors ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : doctors.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No doctors available
                    </SelectItem>
                  ) : (
                    doctors.map((doctor: any) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialty}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appointmentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & Time</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  data-testid="input-appointment-date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Visit</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Regular checkup, Follow-up consultation"
                  {...field}
                  data-testid="input-reason"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information..."
                  {...field}
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={createAppointment.isPending}
            data-testid="button-submit-appointment"
          >
            {createAppointment.isPending ? "Booking..." : "Book Appointment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AppointmentsList() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch appointments from backend
  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
  });

  // Cancel appointment mutation
  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, {
        status: "cancelled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "completed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading appointments...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Appointments</h3>
              <p className="text-sm text-muted-foreground">
                {user?.role === "patient"
                  ? "You haven't booked any appointments yet"
                  : "No appointments scheduled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {appointments.map((appointment) => (
        <Card
          key={appointment.id}
          className="hover-elevate transition-all duration-200"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {appointment.doctorName}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {appointment.specialty}
                </p>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {format(new Date(appointment.appointmentDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                {format(new Date(appointment.appointmentDate), "hh:mm a")}
              </span>
            </div>
            {appointment.reason && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{appointment.reason}</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {appointment.status !== "completed" &&
                appointment.status !== "cancelled" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Reschedule feature will be available soon",
                        });
                      }}
                      data-testid={`button-reschedule-${appointment.id}`}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => cancelAppointment.mutate(appointment.id)}
                      disabled={cancelAppointment.isPending}
                      data-testid={`button-cancel-${appointment.id}`}
                    >
                      {cancelAppointment.isPending ? "..." : "Cancel"}
                    </Button>
                  </>
                )}
              {appointment.status === "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Details",
                      description: `Appointment completed on ${format(
                        new Date(appointment.appointmentDate),
                        "PPP"
                      )}`,
                    });
                  }}
                  data-testid={`button-view-${appointment.id}`}
                >
                  View Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AppointmentsTable() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch appointments from backend
  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
  });

  // Update appointment status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "completed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Filter appointments
  const filteredAppointments =
    filterStatus === "all"
      ? appointments
      : appointments.filter((apt) => apt.status === filterStatus);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Appointments ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No appointments found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        {format(
                          new Date(appointment.appointmentDate),
                          "MMM dd, yyyy 'at' hh:mm a"
                        )}
                      </TableCell>
                      <TableCell>{appointment.patientName}</TableCell>
                      <TableCell>{appointment.doctorName}</TableCell>
                      <TableCell>{appointment.specialty}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {appointment.reason || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={appointment.status}
                          onValueChange={(newStatus) =>
                            updateStatus.mutate({
                              id: appointment.id,
                              status: newStatus,
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
