import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Filter,
  Trash2,
  Check,
  X,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DialogFooter } from "@/components/ui/dialog";
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
              onClick={() =>
                setViewMode(viewMode === "cards" ? "table" : "cards")
              }
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

      {viewMode === "table" ? <AppointmentsTable /> : <AppointmentsList />}
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
                    <SelectValue
                      placeholder={
                        loadingDoctors
                          ? "Loading doctors..."
                          : "Select a doctor"
                      }
                    />
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
                        Dr. {doctor.firstName} {doctor.lastName} -{" "}
                        {doctor.specialty}
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

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [sortBy, setSortBy] = useState<"booking" | "appointment">(
    "appointment"
  );

  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    appointment: any | null;
  }>({ open: false, appointment: null });
  const [appointmentTime, setAppointmentTime] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  const [cancelRequestDialog, setCancelRequestDialog] = useState<{
    open: boolean;
    appointment: any | null;
  }>({ open: false, appointment: null });
  const [cancellationReason, setCancellationReason] = useState("");

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    appointment: any | null;
  }>({ open: false, appointment: null });
  const [rejectionReason, setRejectionReason] = useState("");

  // Patient cancellation dialog
  const [patientCancelDialog, setPatientCancelDialog] = useState<{
    open: boolean;
    appointment: any | null;
  }>({ open: false, appointment: null });
  const [patientCancellationReason, setPatientCancellationReason] =
    useState("");

  // Completion dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [completionTime, setCompletionTime] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [prescriptionNeeded, setPrescriptionNeeded] = useState(false);
  const [prescriptionValidity, setPrescriptionValidity] = useState("90");
  const [medicines, setMedicines] = useState<
    Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>
  >([]);
  const [labTestsNeeded, setLabTestsNeeded] = useState(false);
  const [labTests, setLabTests] = useState<string[]>([]);
  const [labTestInput, setLabTestInput] = useState("");

  // Fetch appointments from backend
  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
  });

  // Filter and search appointments
  const filteredAppointments = appointments.filter((appointment) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        appointment.doctorName?.toLowerCase().includes(query) ||
        appointment.reason?.toLowerCase().includes(query) ||
        appointment.specialty?.toLowerCase().includes(query) ||
        appointment.patientName?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== "all") {
      const now = new Date();
      const appointmentDate = new Date(appointment.appointmentDate);

      switch (selectedCategory) {
        case "upcoming":
          if (
            appointment.status === "cancelled" ||
            appointment.status === "completed" ||
            appointmentDate < now
          )
            return false;
          break;
        case "past":
          if (appointmentDate >= now && appointment.status !== "completed")
            return false;
          break;
        case "cancelled":
          if (appointment.status !== "cancelled") return false;
          break;
        case "completed":
          if (appointment.status !== "completed") return false;
          break;
        case "pending":
          if (appointment.status !== "pending") return false;
          break;
        case "confirmed":
          if (appointment.status !== "confirmed") return false;
          break;
      }
    }

    // Date range filter
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from);
      const appointmentDate = new Date(appointment.appointmentDate);
      if (appointmentDate < fromDate) return false;
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999); // End of day
      const appointmentDate = new Date(appointment.appointmentDate);
      if (appointmentDate > toDate) return false;
    }

    return true;
  });

  // Sort appointments - latest dates first
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === "booking") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Appointment date - latest first
      return (
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime()
      );
    }
  });

  // Group appointments by date for separators
  const groupAppointmentsByDate = (appointments: any[]) => {
    const groups: { [key: string]: any[] } = {};
    appointments.forEach((appointment) => {
      const dateKey = format(
        new Date(
          sortBy === "booking"
            ? appointment.createdAt
            : appointment.appointmentDate
        ),
        "yyyy-MM-dd"
      );
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(appointment);
    });
    return groups;
  };

  const groupedByDate = groupAppointmentsByDate(sortedAppointments);
  const dateKeys = Object.keys(groupedByDate).sort().reverse(); // Latest dates first

  // Calculate category counts
  const categoryCounts = {
    all: appointments.length,
    upcoming: appointments.filter((apt) => {
      const now = new Date();
      const aptDate = new Date(apt.appointmentDate);
      return (
        apt.status !== "cancelled" &&
        apt.status !== "completed" &&
        aptDate >= now
      );
    }).length,
    past: appointments.filter((apt) => {
      const now = new Date();
      const aptDate = new Date(apt.appointmentDate);
      return aptDate < now || apt.status === "completed";
    }).length,
    pending: appointments.filter((apt) => apt.status === "pending").length,
    confirmed: appointments.filter((apt) => apt.status === "confirmed").length,
    completed: appointments.filter((apt) => apt.status === "completed").length,
    cancelled: appointments.filter((apt) => apt.status === "cancelled").length,
  };

  // Cancel appointment mutation
  const cancelAppointment = useMutation({
    mutationFn: async ({
      id,
      reason,
      cancelledBy,
    }: {
      id: string;
      reason?: string;
      cancelledBy?: string;
    }) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy: cancelledBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setPatientCancelDialog({ open: false, appointment: null });
      setPatientCancellationReason("");
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

  // Delete appointment mutation
  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Deleted",
        description: "Appointment permanently deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment",
        variant: "destructive",
      });
    },
  });

  // Approve appointment mutation
  const approveAppointment = useMutation({
    mutationFn: async ({
      id,
      appointmentTime,
      notes,
    }: {
      id: string;
      appointmentTime: string;
      notes?: string;
    }) => {
      await apiRequest("PATCH", `/api/appointments/${id}/approve`, {
        appointmentTime,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setApproveDialog({ open: false, appointment: null });
      setAppointmentTime("");
      setApprovalNotes("");
      toast({
        title: "Approved",
        description: "Appointment has been confirmed with the specified time",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve appointment",
        variant: "destructive",
      });
    },
  });

  // Request cancellation mutation (Doctor)
  const requestCancellation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiRequest(
        "PATCH",
        `/api/appointments/${id}/request-cancellation`,
        {
          reason,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setCancelRequestDialog({ open: false, appointment: null });
      setCancellationReason("");
      toast({
        title: "Request Sent",
        description: "Cancellation request sent to admin for approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request cancellation",
        variant: "destructive",
      });
    },
  });

  // Approve cancellation mutation (Admin)
  const approveCancellation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        "PATCH",
        `/api/appointments/${id}/approve-cancellation`
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Approved",
        description: "Cancellation request has been approved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve cancellation",
        variant: "destructive",
      });
    },
  });

  // Reject cancellation mutation (Admin)
  const rejectCancellation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/appointments/${id}/reject-cancellation`,
        {
          reason,
        }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setRejectDialog({ open: false, appointment: null });
      setRejectionReason("");
      toast({
        title: "Rejected",
        description: "Cancellation request has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject cancellation",
        variant: "destructive",
      });
    },
  });

  const openApproveDialog = (appointment: any) => {
    setApproveDialog({ open: true, appointment });
    // Pre-fill with existing time if available
    if (appointment.appointmentDate) {
      const date = new Date(appointment.appointmentDate);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      setAppointmentTime(
        `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`
      );
    }
  };

  const handleApproveSubmit = () => {
    if (!approveDialog.appointment) return;

    if (!appointmentTime.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify the appointment time",
        variant: "destructive",
      });
      return;
    }

    approveAppointment.mutate({
      id: approveDialog.appointment.id,
      appointmentTime: appointmentTime.trim(),
      notes: approvalNotes.trim() || undefined,
    });
  };

  const openCancelRequestDialog = (appointment: any) => {
    setCancelRequestDialog({ open: true, appointment });
  };

  const openRejectDialog = (appointment: any) => {
    setRejectDialog({ open: true, appointment });
  };

  const handleRejectSubmit = () => {
    if (!rejectDialog.appointment) return;

    if (!rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    rejectCancellation.mutate({
      id: rejectDialog.appointment.id,
      reason: rejectionReason.trim(),
    });
  };

  const handleCancelRequest = () => {
    if (!cancelRequestDialog.appointment) return;

    if (!cancellationReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    requestCancellation.mutate({
      id: cancelRequestDialog.appointment.id,
      reason: cancellationReason.trim(),
    });
  };

  // Medicine management
  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  // Lab test management
  const handleAddLabTest = () => {
    if (labTestInput.trim() && !labTests.includes(labTestInput.trim())) {
      setLabTests([...labTests, labTestInput.trim()]);
      setLabTestInput("");
    }
  };

  const handleRemoveLabTest = (test: string) => {
    setLabTests(labTests.filter((t) => t !== test));
  };

  // Handle complete appointment
  const handleCompleteClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCompletionTime(new Date().toTimeString().slice(0, 5));
    setCompleteDialogOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedAppointment || !completionTime) {
      toast({
        title: "Error",
        description: "Please provide the actual visit time",
        variant: "destructive",
      });
      return;
    }

    if (prescriptionNeeded && medicines.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one medicine to the prescription",
        variant: "destructive",
      });
      return;
    }

    if (prescriptionNeeded) {
      const invalidMedicine = medicines.find(
        (m) => !m.name || !m.dosage || !m.frequency || !m.duration
      );
      if (invalidMedicine) {
        toast({
          title: "Error",
          description:
            "Please fill in all medicine details (name, dosage, frequency, duration)",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const response = await fetch(
        `/api/appointments/${selectedAppointment.id}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualTime: completionTime,
            notes: completionNotes,
            prescriptionNeeded,
            prescriptionValidity: prescriptionNeeded
              ? parseInt(prescriptionValidity)
              : undefined,
            medicines: prescriptionNeeded ? medicines : undefined,
            labTestsNeeded,
            labTests: labTestsNeeded ? labTests : [],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to complete appointment");

      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: prescriptionNeeded
          ? "Appointment completed and prescription created successfully"
          : "Appointment completed successfully",
      });

      // Reset form
      setCompleteDialogOpen(false);
      setSelectedAppointment(null);
      setCompletionTime("");
      setCompletionNotes("");
      setPrescriptionNeeded(false);
      setPrescriptionValidity("90");
      setMedicines([]);
      setLabTestsNeeded(false);
      setLabTests([]);
      setLabTestInput("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive",
      });
    }
  };

  // Handle patient cancellation
  const openPatientCancelDialog = (appointment: any) => {
    setPatientCancelDialog({ open: true, appointment });
  };

  const handlePatientCancel = () => {
    if (!patientCancelDialog.appointment) return;

    if (!patientCancellationReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    cancelAppointment.mutate({
      id: patientCancelDialog.appointment.id,
      reason: patientCancellationReason.trim(),
      cancelledBy: "patient",
    });
  };

  // Check if appointment can be deleted (cancelled and older than 24 hours)
  const canDelete = (appointment: any) => {
    if (appointment.status !== "cancelled" || !appointment.cancelledAt) {
      return false;
    }
    const cancelledTime = new Date(appointment.cancelledAt).getTime();
    const now = new Date().getTime();
    const hoursSinceCancelled = (now - cancelledTime) / (1000 * 60 * 60);
    return hoursSinceCancelled >= 24;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "completed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "cancellation_requested":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "cancellation_requested":
        return "Cancellation Pending";
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Render appointment alerts and details
  const renderAppointmentAlerts = (appointment: any) => (
    <>
      {/* Show cancellation reason if requested by doctor */}
      {appointment.status === "cancellation_requested" &&
        appointment.cancellationReason && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 p-2 border border-orange-200 dark:border-orange-800">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
              Cancellation Requested by Doctor
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {appointment.cancellationReason}
            </p>
          </div>
        )}

      {/* Show completion details */}
      {appointment.status === "completed" && appointment.completedAt && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 border border-green-200 dark:border-green-800">
          <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
            Appointment Completed
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Completed on{" "}
            {format(new Date(appointment.completedAt), "PPP 'at' p")}
          </p>
          {appointment.actualVisitTime && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Patient seen at {appointment.actualVisitTime}
            </p>
          )}
          {appointment.completionNotes && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Notes: {appointment.completionNotes}
            </p>
          )}
        </div>
      )}

      {/* Show cancelled message */}
      {appointment.status === "cancelled" && appointment.cancellationReason && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2 border border-red-200 dark:border-red-800">
          <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">
            Cancelled by{" "}
            {appointment.cancelledBy
              ? appointment.cancelledBy.charAt(0).toUpperCase() +
                appointment.cancelledBy.slice(1)
              : "Doctor"}
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Reason: {appointment.cancellationReason}
          </p>
        </div>
      )}

      {/* Show rejection reason */}
      {appointment.status === "confirmed" &&
        appointment.cancellationRejectedReason &&
        user?.role === "doctor" && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-2 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Cancellation Request Rejected by Admin
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {appointment.cancellationRejectedReason}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 italic">
              You can request cancellation again if needed.
            </p>
          </div>
        )}
    </>
  );

  // Render appointment action buttons
  const renderAppointmentActions = (appointment: any) => (
    <div className="flex gap-2 pt-2">
      {/* Doctor/Admin can approve pending appointments */}
      {appointment.status === "pending" &&
        (user?.role === "doctor" || user?.role === "admin") && (
          <Button
            size="sm"
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => openApproveDialog(appointment)}
            data-testid={`button-approve-${appointment.id}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Approve
          </Button>
        )}
      {/* Doctor/Admin can complete confirmed appointments */}
      {appointment.status === "confirmed" &&
        (user?.role === "doctor" || user?.role === "admin") && (
          <Button
            size="sm"
            variant="default"
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-8 text-xs"
            onClick={() => handleCompleteClick(appointment)}
            data-testid={`button-complete-${appointment.id}`}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Mark Complete
          </Button>
        )}
      {/* Patient actions */}
      {appointment.status !== "completed" &&
        appointment.status !== "cancelled" &&
        appointment.status !== "cancellation_requested" &&
        user?.role === "patient" && (
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-8 text-xs"
            onClick={() => openPatientCancelDialog(appointment)}
            data-testid={`button-cancel-${appointment.id}`}
          >
            Cancel Appointment
          </Button>
        )}
      {/* Doctor can request cancellation */}
      {(appointment.status === "pending" ||
        appointment.status === "confirmed") &&
        user?.role === "doctor" && (
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 h-8 text-xs"
            onClick={() => openCancelRequestDialog(appointment)}
            data-testid={`button-request-cancel-${appointment.id}`}
          >
            Request Cancel
          </Button>
        )}
      {/* Admin can approve/reject cancellation requests */}
      {appointment.status === "cancellation_requested" &&
        user?.role === "admin" && (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (window.confirm("Approve this cancellation request?")) {
                  approveCancellation.mutate(appointment.id);
                }
              }}
              disabled={approveCancellation.isPending}
              data-testid={`button-approve-cancel-${appointment.id}`}
            >
              {approveCancellation.isPending
                ? "Approving..."
                : "Approve Cancellation"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => openRejectDialog(appointment)}
              disabled={rejectCancellation.isPending}
              data-testid={`button-reject-cancel-${appointment.id}`}
            >
              Reject Request
            </Button>
          </>
        )}
    </div>
  );

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

  // Render filter and search UI
  const renderFilters = () => (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by doctor, specialty, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All", count: categoryCounts.all },
          {
            key: "upcoming",
            label: "Upcoming",
            count: categoryCounts.upcoming,
          },
          { key: "pending", label: "Pending", count: categoryCounts.pending },
          {
            key: "confirmed",
            label: "Confirmed",
            count: categoryCounts.confirmed,
          },
          {
            key: "completed",
            label: "Completed",
            count: categoryCounts.completed,
          },
          {
            key: "cancelled",
            label: "Cancelled",
            count: categoryCounts.cancelled,
          },
          { key: "past", label: "Past", count: categoryCounts.past },
        ].map((category) => (
          <Button
            key={category.key}
            variant={selectedCategory === category.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.key)}
            className="gap-2"
          >
            {category.label}
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "More Filters"}
        </Button>
        {(searchQuery ||
          selectedCategory !== "all" ||
          dateFilter.from ||
          dateFilter.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setDateFilter({ from: "", to: "" });
            }}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Collapsible Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="date-from" className="mb-2 block">
                  From Date
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, from: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="mb-2 block">
                  To Date
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, to: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sort-by" className="mb-2 block">
                Sort By
              </Label>
              <Select
                value={sortBy}
                onValueChange={(value: "booking" | "appointment") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger id="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appointment Date</SelectItem>
                  <SelectItem value="booking">Booking Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedAppointments.length} of {appointments.length}{" "}
        appointments
        {sortBy === "booking" && " (sorted by booking date)"}
        {sortBy === "appointment" && " (sorted by appointment date)"}
      </div>
    </div>
  );

  // Group appointments by availability for doctors
  const groupedAppointments =
    user?.role === "doctor"
      ? sortedAppointments.reduce((groups: any, appointment) => {
          const key = appointment.availabilityId || "no-availability";
          if (!groups[key]) {
            groups[key] = {
              availability: appointment.availability,
              appointments: [],
            };
          }
          groups[key].appointments.push(appointment);
          return groups;
        }, {})
      : null;

  return (
    <>
      {/* Filters and Search */}
      {renderFilters()}

      {/* No Results Message */}
      {sortedAppointments.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Filter className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Appointments Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : user?.role === "doctor" && groupedAppointments ? (
        <div className="space-y-6">
          {Object.entries(groupedAppointments).map(
            ([key, group]: [string, any]) => (
              <div key={key} className="space-y-3">
                {/* Availability Header */}
                {group.availability && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            {group.availability.locationName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {group.availability.locationAddress}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(
                                new Date(group.availability.availableDate),
                                "MMM dd, yyyy"
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {group.availability.startTime} -{" "}
                              {group.availability.endTime}
                            </div>
                            <Badge variant="outline">
                              {group.appointments.length}{" "}
                              {group.appointments.length === 1
                                ? "Appointment"
                                : "Appointments"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                {/* Appointments Grid - Group by date */}
                {(() => {
                  const appointmentsByDate = groupAppointmentsByDate(
                    group.appointments
                  );
                  const appointmentDateKeys = Object.keys(appointmentsByDate)
                    .sort()
                    .reverse();

                  return (
                    <div className="space-y-4">
                      {appointmentDateKeys.map((dateKey) => (
                        <div key={dateKey} className="space-y-2">
                          {/* Date Separator for grouped appointments */}
                          <div className="flex items-center gap-3">
                            <div className="h-px bg-border flex-1"></div>
                            <div className="text-xs font-medium text-muted-foreground px-2">
                              {format(
                                new Date(dateKey),
                                sortBy === "booking"
                                  ? "'Booked' MMM dd"
                                  : "MMM dd"
                              )}
                            </div>
                            <div className="h-px bg-border flex-1"></div>
                          </div>

                          {/* Appointments for this date */}
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {appointmentsByDate[dateKey].map(
                              (appointment: any) => (
                                <Card
                                  key={appointment.id}
                                  className="hover-elevate transition-all duration-200"
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">
                                          {appointment.patientName}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                          Patient
                                        </p>
                                      </div>
                                      <Badge
                                        className={getStatusColor(
                                          appointment.status
                                        )}
                                      >
                                        {getStatusLabel(appointment.status)}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-foreground">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>
                                          {format(
                                            new Date(
                                              appointment.appointmentDate
                                            ),
                                            "MMM dd, yyyy"
                                          )}
                                        </span>
                                      </div>
                                      {appointment.createdAt && (
                                        <div className="text-xs text-muted-foreground">
                                          Booked on{" "}
                                          {format(
                                            new Date(appointment.createdAt),
                                            "MMM dd, yyyy 'at' h:mm a"
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                      <Clock className="w-4 h-4 text-muted-foreground" />
                                      <span>
                                        {appointment.status === "cancelled"
                                          ? "--"
                                          : appointment.status ===
                                              "completed" &&
                                            appointment.actualVisitTime
                                          ? `Completed at ${appointment.actualVisitTime}`
                                          : appointment.appointmentTime
                                          ? appointment.appointmentTime
                                          : format(
                                              new Date(
                                                appointment.appointmentDate
                                              ),
                                              "hh:mm a"
                                            )}
                                      </span>
                                    </div>
                                    {appointment.reason && (
                                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span className="line-clamp-2">
                                          {appointment.reason}
                                        </span>
                                      </div>
                                    )}
                                    {renderAppointmentAlerts(appointment)}
                                    {renderAppointmentActions(appointment)}
                                  </CardContent>
                                </Card>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-6 mt-4">
          {dateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-3">
              {/* Date Separator */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-border flex-1"></div>
                <div className="text-sm font-semibold text-foreground px-3 py-1 bg-muted rounded-full">
                  {format(
                    new Date(dateKey),
                    sortBy === "booking"
                      ? "'Booked on' MMMM dd, yyyy"
                      : "MMMM dd, yyyy"
                  )}
                </div>
                <div className="h-px bg-border flex-1"></div>
              </div>

              {/* Appointments Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedByDate[dateKey].map((appointment) => (
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
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(
                              new Date(appointment.appointmentDate),
                              "MMM dd, yyyy"
                            )}
                          </span>
                        </div>
                        {appointment.createdAt && (
                          <div className="text-xs text-muted-foreground">
                            Booked on{" "}
                            {format(
                              new Date(appointment.createdAt),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {appointment.status === "cancelled"
                            ? "--"
                            : appointment.status === "completed" &&
                              appointment.actualVisitTime
                            ? `Completed at ${appointment.actualVisitTime}`
                            : appointment.appointmentTime
                            ? appointment.appointmentTime
                            : format(
                                new Date(appointment.appointmentDate),
                                "hh:mm a"
                              )}
                        </span>
                      </div>
                      {appointment.reason && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">
                            {appointment.reason}
                          </span>
                        </div>
                      )}

                      {/* Show cancellation reason if requested by doctor */}
                      {appointment.status === "cancellation_requested" &&
                        appointment.cancellationReason && (
                          <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 p-2 border border-orange-200 dark:border-orange-800">
                            <p className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                              Cancellation Requested by Doctor
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300">
                              {appointment.cancellationReason}
                            </p>
                          </div>
                        )}

                      {/* Show completion details */}
                      {appointment.status === "completed" &&
                        appointment.completedAt && (
                          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                              Appointment Completed
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Completed on{" "}
                              {format(
                                new Date(appointment.completedAt),
                                "PPP 'at' p"
                              )}
                            </p>
                            {appointment.actualVisitTime && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Patient seen at {appointment.actualVisitTime}
                              </p>
                            )}
                            {appointment.completionNotes && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Notes: {appointment.completionNotes}
                              </p>
                            )}
                          </div>
                        )}

                      {/* Show cancelled message with who cancelled */}
                      {appointment.status === "cancelled" &&
                        appointment.cancellationReason && (
                          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2 border border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">
                              Cancelled by{" "}
                              {appointment.cancelledBy
                                ? appointment.cancelledBy
                                    .charAt(0)
                                    .toUpperCase() +
                                  appointment.cancelledBy.slice(1)
                                : "Doctor"}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300">
                              Reason: {appointment.cancellationReason}
                            </p>
                          </div>
                        )}

                      {/* Show rejection reason if cancellation request was rejected by admin */}
                      {appointment.status === "confirmed" &&
                        appointment.cancellationRejectedReason &&
                        user?.role === "doctor" && (
                          <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-2 border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                              Cancellation Request Rejected by Admin
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              {appointment.cancellationRejectedReason}
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 italic">
                              You can request cancellation again if needed.
                            </p>
                          </div>
                        )}

                      <div className="flex gap-2 pt-2">
                        {/* Doctor/Admin can approve pending appointments */}
                        {appointment.status === "pending" &&
                          (user?.role === "doctor" ||
                            user?.role === "admin") && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => openApproveDialog(appointment)}
                              data-testid={`button-approve-${appointment.id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          )}
                        {/* Doctor/Admin can complete confirmed appointments */}
                        {appointment.status === "confirmed" &&
                          (user?.role === "doctor" ||
                            user?.role === "admin") && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleCompleteClick(appointment)}
                              data-testid={`button-complete-${appointment.id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Mark as Complete
                            </Button>
                          )}
                        {/* Patient actions - Only cancel with reason */}
                        {appointment.status !== "completed" &&
                          appointment.status !== "cancelled" &&
                          appointment.status !== "cancellation_requested" &&
                          user?.role === "patient" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              onClick={() =>
                                openPatientCancelDialog(appointment)
                              }
                              data-testid={`button-cancel-${appointment.id}`}
                            >
                              Cancel Appointment
                            </Button>
                          )}

                        {/* Doctor can request cancellation for pending/confirmed appointments */}
                        {(appointment.status === "pending" ||
                          appointment.status === "confirmed") &&
                          user?.role === "doctor" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() =>
                                openCancelRequestDialog(appointment)
                              }
                              data-testid={`button-request-cancel-${appointment.id}`}
                            >
                              Request Cancellation
                            </Button>
                          )}

                        {/* Admin can approve or reject cancellation requests */}
                        {appointment.status === "cancellation_requested" &&
                          user?.role === "admin" && (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Approve this cancellation request?"
                                    )
                                  ) {
                                    approveCancellation.mutate(appointment.id);
                                  }
                                }}
                                disabled={approveCancellation.isPending}
                                data-testid={`button-approve-cancel-${appointment.id}`}
                              >
                                {approveCancellation.isPending
                                  ? "Approving..."
                                  : "Approve Cancellation"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => openRejectDialog(appointment)}
                                disabled={rejectCancellation.isPending}
                                data-testid={`button-reject-cancel-${appointment.id}`}
                              >
                                Reject Request
                              </Button>
                            </>
                          )}

                        {appointment.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const details = [
                                `Scheduled: ${format(
                                  new Date(appointment.appointmentDate),
                                  "PPP"
                                )} at ${appointment.appointmentTime || "N/A"}`,
                                appointment.actualVisitTime
                                  ? `Actual visit: ${appointment.actualVisitTime}`
                                  : null,
                                appointment.completedAt
                                  ? `Completed: ${format(
                                      new Date(appointment.completedAt),
                                      "PPP 'at' p"
                                    )}`
                                  : null,
                                appointment.completionNotes
                                  ? `Notes: ${appointment.completionNotes}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join("\n");

                              toast({
                                title: "Appointment Details",
                                description: details,
                              });
                            }}
                            data-testid={`button-view-${appointment.id}`}
                          >
                            View Details
                          </Button>
                        )}
                        {/* Doctor/Admin can delete cancelled appointments after 24 hours */}
                        {appointment.status === "cancelled" &&
                          canDelete(appointment) &&
                          (user?.role === "doctor" ||
                            user?.role === "admin") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to permanently delete this cancelled appointment?"
                                  )
                                ) {
                                  deleteAppointment.mutate(appointment.id);
                                }
                              }}
                              disabled={deleteAppointment.isPending}
                              data-testid={`button-delete-${appointment.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {deleteAppointment.isPending
                                ? "Deleting..."
                                : "Delete Permanently"}
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Appointment Dialog */}
      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => {
          setApproveDialog({
            open,
            appointment: open ? approveDialog.appointment : null,
          });
          if (!open) {
            setAppointmentTime("");
            setApprovalNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Approve Appointment</DialogTitle>
          </DialogHeader>

          {approveDialog.appointment && (
            <div className="space-y-4 py-4">
              {/* Appointment Details */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Patient</p>
                    <p className="font-medium">
                      {approveDialog.appointment.patientName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">
                      {format(
                        new Date(approveDialog.appointment.appointmentDate),
                        "MMM dd, yyyy"
                      )}
                    </p>
                  </div>
                </div>

                {approveDialog.appointment.reason && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Reason</p>
                    <p className="text-sm">
                      {approveDialog.appointment.reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Appointment Time Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Appointment Time <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g., 10:00 AM, 2:30 PM"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full"
                />

                {/* Quick Time Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "9:00 AM",
                    "10:00 AM",
                    "11:00 AM",
                    "2:00 PM",
                    "3:00 PM",
                    "4:00 PM",
                  ].map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAppointmentTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Select a suggested time or enter a custom time
                </p>
              </div>

              {/* Special Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Special Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any special instructions or notes for the patient..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setApproveDialog({ open: false, appointment: null })
                  }
                  disabled={approveAppointment.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApproveSubmit}
                  disabled={
                    approveAppointment.isPending || !appointmentTime.trim()
                  }
                >
                  <Check className="w-4 h-4 mr-2" />
                  {approveAppointment.isPending
                    ? "Approving..."
                    : "Confirm Appointment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Request Dialog (Doctor) */}
      <Dialog
        open={cancelRequestDialog.open}
        onOpenChange={(open) => {
          setCancelRequestDialog({
            open,
            appointment: open ? cancelRequestDialog.appointment : null,
          });
          if (!open) {
            setCancellationReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Request Appointment Cancellation
            </DialogTitle>
          </DialogHeader>

          {cancelRequestDialog.appointment && (
            <div className="space-y-4 py-4">
              {/* Appointment Details */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Patient</p>
                    <p className="font-medium">
                      {cancelRequestDialog.appointment.patientName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Date & Time</p>
                    <p className="font-medium">
                      {format(
                        new Date(
                          cancelRequestDialog.appointment.appointmentDate
                        ),
                        "MMM dd, yyyy"
                      )}
                      {cancelRequestDialog.appointment.appointmentTime &&
                        ` at ${cancelRequestDialog.appointment.appointmentTime}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Please explain why you need to cancel this appointment..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This request will be sent to the admin for approval. The
                  patient will be notified.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setCancelRequestDialog({ open: false, appointment: null })
                  }
                  disabled={requestCancellation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelRequest}
                  disabled={
                    requestCancellation.isPending || !cancellationReason.trim()
                  }
                >
                  {requestCancellation.isPending
                    ? "Sending..."
                    : "Send Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Cancellation Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, appointment: null });
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          {rejectDialog.appointment && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Reject Cancellation Request
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide a reason for rejecting this cancellation request
                </p>
              </div>

              {/* Appointment Details */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    Patient: {rejectDialog.appointment.patientName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {format(
                      new Date(rejectDialog.appointment.appointmentDate),
                      "MMM dd, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {rejectDialog.appointment.appointmentTime ||
                      format(
                        new Date(rejectDialog.appointment.appointmentDate),
                        "hh:mm a"
                      )}
                  </span>
                </div>
              </div>

              {/* Doctor's Cancellation Reason */}
              {rejectDialog.appointment.cancellationReason && (
                <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-3 border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Doctor's Cancellation Reason:
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {rejectDialog.appointment.cancellationReason}
                  </p>
                </div>
              )}

              {/* Rejection Reason Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for Rejection *
                </label>
                <Textarea
                  placeholder="Explain why this cancellation request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={rejectCancellation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shown to the doctor. They can request
                  cancellation again if needed.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRejectDialog({ open: false, appointment: null });
                    setRejectionReason("");
                  }}
                  disabled={rejectCancellation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRejectSubmit}
                  disabled={
                    rejectCancellation.isPending || !rejectionReason.trim()
                  }
                >
                  {rejectCancellation.isPending
                    ? "Rejecting..."
                    : "Reject Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Appointment Dialog - Same as in table view */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Appointment</DialogTitle>
            <DialogDescription>
              Record visit details, add prescription with medicines, request lab
              tests, and complete the appointment.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Appointment Info */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  <strong>Patient:</strong> {selectedAppointment.patientName}
                </p>
                <p className="text-sm">
                  <strong>Doctor:</strong> {selectedAppointment.doctorName}
                </p>
                <p className="text-sm">
                  <strong>Scheduled:</strong>{" "}
                  {new Date(
                    selectedAppointment.appointmentDate
                  ).toLocaleDateString()}{" "}
                  at {selectedAppointment.appointmentTime}
                </p>
              </div>

              {/* Actual Visit Time */}
              <div className="space-y-2">
                <Label htmlFor="completionTime">
                  Actual Visit Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="completionTime"
                  type="time"
                  value={completionTime}
                  onChange={(e) => setCompletionTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Record the actual time the patient was seen
                </p>
              </div>

              {/* Completion Notes */}
              <div className="space-y-2">
                <Label htmlFor="completionNotes">Visit Notes & Diagnosis</Label>
                <Textarea
                  id="completionNotes"
                  placeholder="Add notes about symptoms, diagnosis, treatment plan, and recommendations..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Prescription Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prescriptionNeeded"
                    checked={prescriptionNeeded}
                    onCheckedChange={(checked) => {
                      setPrescriptionNeeded(checked as boolean);
                      if (checked && medicines.length === 0) {
                        handleAddMedicine();
                      }
                    }}
                  />
                  <Label
                    htmlFor="prescriptionNeeded"
                    className="cursor-pointer font-medium"
                  >
                    Create Prescription
                  </Label>
                </div>

                {prescriptionNeeded && (
                  <div className="space-y-4 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="prescriptionValidity">
                        Prescription Validity (Days)
                      </Label>
                      <Input
                        id="prescriptionValidity"
                        type="number"
                        min="1"
                        max="365"
                        value={prescriptionValidity}
                        onChange={(e) =>
                          setPrescriptionValidity(e.target.value)
                        }
                        placeholder="90"
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of days the prescription remains valid (default:
                        90 days)
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Medicines</Label>
                        <Button
                          onClick={handleAddMedicine}
                          size="sm"
                          type="button"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Medicine
                        </Button>
                      </div>

                      {medicines.map((medicine, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 space-y-3 bg-muted/30"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Medicine {index + 1}
                            </span>
                            <Button
                              onClick={() => handleRemoveMedicine(index)}
                              size="sm"
                              variant="ghost"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Medicine Name *</Label>
                              <Input
                                placeholder="e.g., Amoxicillin"
                                value={medicine.name}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Dosage *</Label>
                              <Input
                                placeholder="e.g., 500mg"
                                value={medicine.dosage}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "dosage",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Frequency *</Label>
                              <Input
                                placeholder="e.g., 3 times daily"
                                value={medicine.frequency}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "frequency",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Duration *</Label>
                              <Input
                                placeholder="e.g., 7 days"
                                value={medicine.duration}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "duration",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label>Instructions</Label>
                              <Input
                                placeholder="e.g., Take after meals"
                                value={medicine.instructions}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "instructions",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Tests Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="labTestsNeeded"
                    checked={labTestsNeeded}
                    onCheckedChange={(checked) =>
                      setLabTestsNeeded(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="labTestsNeeded"
                    className="cursor-pointer font-medium"
                  >
                    Lab Tests Required
                  </Label>
                </div>

                {labTestsNeeded && (
                  <div className="space-y-3 mt-3">
                    <Alert className="bg-blue-50 dark:bg-blue-950">
                      <AlertDescription>
                        Lab tests will be automatically added to the patient's
                        dashboard for booking.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter lab test name (e.g., Complete Blood Count)"
                        value={labTestInput}
                        onChange={(e) => setLabTestInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddLabTest())
                        }
                      />
                      <Button
                        onClick={handleAddLabTest}
                        type="button"
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>

                    {labTests.length > 0 && (
                      <div className="space-y-2">
                        <Label>Requested Lab Tests:</Label>
                        <div className="space-y-2">
                          {labTests.map((test, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-muted p-2 rounded"
                            >
                              <span className="text-sm">{test}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLabTest(test)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmComplete}>
              Complete Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Cancellation Dialog */}
      <Dialog
        open={patientCancelDialog.open}
        onOpenChange={(open) => {
          setPatientCancelDialog({
            open,
            appointment: open ? patientCancelDialog.appointment : null,
          });
          if (!open) {
            setPatientCancellationReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-destructive">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this appointment. The
              doctor will be notified.
            </DialogDescription>
          </DialogHeader>

          {patientCancelDialog.appointment && (
            <div className="space-y-4">
              {/* Appointment Details */}
              <div className="rounded-lg border bg-muted p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">
                      {patientCancelDialog.appointment.doctorName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {patientCancelDialog.appointment.specialization ||
                        patientCancelDialog.appointment.specialty}
                    </p>
                    <p className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(
                        patientCancelDialog.appointment.appointmentDate
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {patientCancelDialog.appointment.appointmentTime &&
                        ` at ${patientCancelDialog.appointment.appointmentTime}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Please explain why you need to cancel this appointment..."
                  value={patientCancellationReason}
                  onChange={(e) => setPatientCancellationReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Your cancellation reason will be recorded and the doctor will
                  be notified.
                </p>
              </div>

              {/* Warning Message */}
              <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Please note that frequent cancellations may affect your
                  ability to book future appointments.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setPatientCancelDialog({ open: false, appointment: null })
                  }
                  disabled={cancelAppointment.isPending}
                >
                  Keep Appointment
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handlePatientCancel}
                  disabled={
                    cancelAppointment.isPending ||
                    !patientCancellationReason.trim()
                  }
                >
                  {cancelAppointment.isPending
                    ? "Cancelling..."
                    : "Cancel Appointment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AppointmentsTable() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [sortBy, setSortBy] = useState<"booking" | "appointment">(
    "appointment"
  );

  // Completion dialog states
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [completionTime, setCompletionTime] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [prescriptionNeeded, setPrescriptionNeeded] = useState(false);
  const [prescriptionValidity, setPrescriptionValidity] = useState("90");
  const [medicines, setMedicines] = useState<
    Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>
  >([]);
  const [labTestsNeeded, setLabTestsNeeded] = useState(false);
  const [labTests, setLabTests] = useState<string[]>([]);
  const [labTestInput, setLabTestInput] = useState("");

  // Fetch appointments from backend
  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
    staleTime: 0, // Force fresh data
    cacheTime: 0, // Don't cache
  });

  // Debug: Log what we received
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      console.log("=== FRONTEND DEBUG ===");
      console.log("Total appointments:", appointments.length);
      console.log(
        "First appointment:",
        JSON.stringify(appointments[0], null, 2)
      );
      console.log("Patient name:", appointments[0].patientName);
      console.log("Doctor name:", appointments[0].doctorName);
      console.log("Specialization:", appointments[0].specialization);
    }
  }, [appointments]);

  // Medicine management
  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  // Lab test management
  const handleAddLabTest = () => {
    if (labTestInput.trim() && !labTests.includes(labTestInput.trim())) {
      setLabTests([...labTests, labTestInput.trim()]);
      setLabTestInput("");
    }
  };

  const handleRemoveLabTest = (test: string) => {
    setLabTests(labTests.filter((t) => t !== test));
  };

  // Handle complete appointment
  const handleCompleteClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setCompletionTime(new Date().toTimeString().slice(0, 5));
    setCompleteDialogOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedAppointment || !completionTime) {
      toast({
        title: "Error",
        description: "Please provide the actual visit time",
        variant: "destructive",
      });
      return;
    }

    if (prescriptionNeeded && medicines.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one medicine to the prescription",
        variant: "destructive",
      });
      return;
    }

    if (prescriptionNeeded) {
      const invalidMedicine = medicines.find(
        (m) => !m.name || !m.dosage || !m.frequency || !m.duration
      );
      if (invalidMedicine) {
        toast({
          title: "Error",
          description:
            "Please fill in all medicine details (name, dosage, frequency, duration)",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const response = await fetch(
        `/api/appointments/${selectedAppointment.id}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualTime: completionTime,
            notes: completionNotes,
            prescriptionNeeded,
            prescriptionValidity: prescriptionNeeded
              ? parseInt(prescriptionValidity)
              : undefined,
            medicines: prescriptionNeeded ? medicines : undefined,
            labTestsNeeded,
            labTests: labTestsNeeded ? labTests : [],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to complete appointment");

      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: prescriptionNeeded
          ? "Appointment completed and prescription created successfully"
          : "Appointment completed successfully",
      });

      // Reset form
      setCompleteDialogOpen(false);
      setSelectedAppointment(null);
      setCompletionTime("");
      setCompletionNotes("");
      setPrescriptionNeeded(false);
      setPrescriptionValidity("90");
      setMedicines([]);
      setLabTestsNeeded(false);
      setLabTests([]);
      setLabTestInput("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive",
      });
    }
  };

  // Update appointment status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, {
        status,
      });
      return await res.json();
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
        return "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-200 border border-yellow-500/40 font-semibold";
      case "completed":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30";
      case "cancellation_requested":
        return "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30";
      default:
        return "bg-muted text-muted-foreground border";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "cancellation_requested":
        return "Cancellation Pending";
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Filter appointments with advanced filtering
  const filteredAppointments = appointments.filter((apt) => {
    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        apt.patientName?.toLowerCase().includes(searchLower) ||
        apt.doctorName?.toLowerCase().includes(searchLower) ||
        apt.specialization?.toLowerCase().includes(searchLower) ||
        apt.specialty?.toLowerCase().includes(searchLower) ||
        apt.reason?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== "all") {
      const now = new Date();
      const appointmentDate = new Date(apt.appointmentDate);

      switch (selectedCategory) {
        case "upcoming":
          if (
            apt.status === "cancelled" ||
            apt.status === "completed" ||
            appointmentDate < now
          )
            return false;
          break;
        case "past":
          if (appointmentDate >= now && apt.status !== "completed")
            return false;
          break;
        case "cancelled":
          if (apt.status !== "cancelled") return false;
          break;
        case "completed":
          if (apt.status !== "completed") return false;
          break;
        case "pending":
          if (apt.status !== "pending") return false;
          break;
        case "confirmed":
          if (apt.status !== "confirmed") return false;
          break;
      }
    }

    // Status filter (legacy - keep for backward compatibility)
    if (filterStatus !== "all" && apt.status !== filterStatus) {
      return false;
    }

    // Date range filter
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from);
      fromDate.setHours(0, 0, 0, 0);
      const appointmentDate = new Date(apt.appointmentDate);
      appointmentDate.setHours(0, 0, 0, 0);
      if (appointmentDate < fromDate) return false;
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      const appointmentDate = new Date(apt.appointmentDate);
      if (appointmentDate > toDate) return false;
    }

    return true;
  });

  // Sort appointments - latest dates first
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === "booking") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return (
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime()
      );
    }
  });

  // Calculate category counts
  const categoryCounts = {
    all: appointments.length,
    upcoming: appointments.filter((apt) => {
      const now = new Date();
      const aptDate = new Date(apt.appointmentDate);
      return (
        apt.status !== "cancelled" &&
        apt.status !== "completed" &&
        aptDate >= now
      );
    }).length,
    past: appointments.filter((apt) => {
      const now = new Date();
      const aptDate = new Date(apt.appointmentDate);
      return aptDate < now || apt.status === "completed";
    }).length,
    pending: appointments.filter((apt) => apt.status === "pending").length,
    confirmed: appointments.filter((apt) => apt.status === "confirmed").length,
    completed: appointments.filter((apt) => apt.status === "completed").length,
    cancelled: appointments.filter((apt) => apt.status === "cancelled").length,
  };

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
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, doctor, specialty, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All", count: categoryCounts.all },
            {
              key: "upcoming",
              label: "Upcoming",
              count: categoryCounts.upcoming,
            },
            { key: "pending", label: "Pending", count: categoryCounts.pending },
            {
              key: "confirmed",
              label: "Confirmed",
              count: categoryCounts.confirmed,
            },
            {
              key: "completed",
              label: "Completed",
              count: categoryCounts.completed,
            },
            {
              key: "cancelled",
              label: "Cancelled",
              count: categoryCounts.cancelled,
            },
            { key: "past", label: "Past", count: categoryCounts.past },
          ].map((category) => (
            <Button
              key={category.key}
              variant={
                selectedCategory === category.key ? "default" : "outline"
              }
              size="sm"
              onClick={() => setSelectedCategory(category.key)}
              className="gap-2"
            >
              {category.label}
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Quick Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Quick Filters:
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setDateFilter({ from: today, to: today });
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() - today.getDay());
              const weekEnd = new Date(today);
              weekEnd.setDate(today.getDate() + (6 - today.getDay()));
              setDateFilter({
                from: weekStart.toISOString().split("T")[0],
                to: weekEnd.toISOString().split("T")[0],
              });
            }}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              setDateFilter({
                from: monthStart.toISOString().split("T")[0],
                to: monthEnd.toISOString().split("T")[0],
              });
            }}
          >
            This Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Custom Date Range
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide Advanced" : "More Filters"}
          </Button>
          {(searchQuery ||
            selectedCategory !== "all" ||
            dateFilter.from ||
            dateFilter.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setDateFilter({ from: "", to: "" });
              }}
            >
              Clear All
            </Button>
          )}
          {(dateFilter.from || dateFilter.to) && (
            <span className="text-sm text-muted-foreground">
              {dateFilter.from && dateFilter.to
                ? `${format(new Date(dateFilter.from), "MMM dd")} - ${format(
                    new Date(dateFilter.to),
                    "MMM dd, yyyy"
                  )}`
                : dateFilter.from
                ? `From ${format(new Date(dateFilter.from), "MMM dd, yyyy")}`
                : `Until ${format(new Date(dateFilter.to), "MMM dd, yyyy")}`}
            </span>
          )}
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="date-from-table" className="mb-2 block">
                    From Date
                  </Label>
                  <Input
                    id="date-from-table"
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, from: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="date-to-table" className="mb-2 block">
                    To Date
                  </Label>
                  <Input
                    id="date-to-table"
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, to: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="sort-by-table" className="mb-2 block">
                  Sort By
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: "booking" | "appointment") =>
                    setSortBy(value)
                  }
                >
                  <SelectTrigger id="sort-by-table">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appointment">
                      Appointment Date
                    </SelectItem>
                    <SelectItem value="booking">Booking Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {sortedAppointments.length} of {appointments.length}{" "}
          appointments
          {sortBy === "booking" && " (sorted by booking date)"}
          {sortBy === "appointment" && " (sorted by appointment date)"}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Appointments ({sortedAppointments.length})</span>
            {appointments.length > 0 && (
              <span className="text-xs font-normal text-green-500">
                ✓ Data loaded: {appointments[0]?.patientName || "ERROR"}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Appointment Date</TableHead>
                  <TableHead className="w-[140px]">Booked Date</TableHead>
                  <TableHead className="w-[180px]">Patient</TableHead>
                  <TableHead className="w-[180px]">Doctor</TableHead>
                  <TableHead className="w-[150px]">Specialization</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[180px]">Reason</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No appointments found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div>
                          {appointment.appointmentDate
                            ? format(
                                new Date(appointment.appointmentDate),
                                "MM/dd/yyyy"
                              )
                            : "No date"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.status === "cancelled"
                            ? "--"
                            : appointment.status === "completed" &&
                              appointment.actualVisitTime
                            ? `✓ ${appointment.actualVisitTime}`
                            : appointment.appointmentTime ||
                              (appointment.appointmentDate
                                ? format(
                                    new Date(appointment.appointmentDate),
                                    "hh:mm a"
                                  )
                                : "Not set")}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {appointment.createdAt
                          ? format(
                              new Date(appointment.createdAt),
                              "MM/dd/yyyy h:mm a"
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        title={`Raw: ${
                          appointment.patientName ||
                          appointment.patientFirstName ||
                          "N/A"
                        }`}
                      >
                        {appointment.patientName || "Unknown Patient"}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        title={`Raw: ${
                          appointment.doctorName ||
                          appointment.doctorFirstName ||
                          "N/A"
                        }`}
                      >
                        {appointment.doctorName || "Unknown Doctor"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {appointment.specialization ||
                          appointment.specialty ||
                          "General"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px]">
                          <div className="line-clamp-2 text-sm">
                            {appointment.reason || "Regular Checkup"}
                          </div>
                          {appointment.cancellationReason && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                              ⚠ {appointment.cancellationReason}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 min-w-[180px]">
                          {appointment.status === "cancellation_requested" ? (
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1 h-8"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Approve cancellation request?\n\nReason: ${
                                        appointment.cancellationReason ||
                                        "Not specified"
                                      }`
                                    )
                                  ) {
                                    updateStatus.mutate({
                                      id: appointment.id,
                                      status: "cancelled",
                                    });
                                  }
                                }}
                                disabled={updateStatus.isPending}
                              >
                                {updateStatus.isPending ? "..." : "Approve"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8"
                                onClick={() => {
                                  const reason = window.prompt(
                                    "Enter reason for rejecting this cancellation request:"
                                  );
                                  if (reason && reason.trim()) {
                                    updateStatus.mutate({
                                      id: appointment.id,
                                      status: "confirmed",
                                    });
                                  }
                                }}
                                disabled={updateStatus.isPending}
                              >
                                {updateStatus.isPending ? "..." : "Reject"}
                              </Button>
                            </>
                          ) : appointment.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full h-8"
                              onClick={() => {
                                if (
                                  window.confirm("Confirm this appointment?")
                                ) {
                                  updateStatus.mutate({
                                    id: appointment.id,
                                    status: "confirmed",
                                  });
                                }
                              }}
                              disabled={updateStatus.isPending}
                            >
                              {updateStatus.isPending
                                ? "..."
                                : "Confirm Appointment"}
                            </Button>
                          ) : appointment.status === "confirmed" ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8"
                                onClick={() => handleCompleteClick(appointment)}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1 h-8"
                                onClick={() => {
                                  if (
                                    window.confirm("Cancel this appointment?")
                                  ) {
                                    updateStatus.mutate({
                                      id: appointment.id,
                                      status: "cancelled",
                                    });
                                  }
                                }}
                                disabled={updateStatus.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={appointment.status}
                              onValueChange={(newStatus) => {
                                const confirmMsg =
                                  newStatus === "cancelled"
                                    ? "Are you sure you want to cancel this appointment?"
                                    : newStatus === "completed"
                                    ? "Mark this appointment as completed?"
                                    : `Change status to ${newStatus}?`;

                                if (window.confirm(confirmMsg)) {
                                  updateStatus.mutate({
                                    id: appointment.id,
                                    status: newStatus,
                                  });
                                }
                              }}
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Complete Appointment Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Appointment</DialogTitle>
            <DialogDescription>
              Record visit details, add prescription with medicines, request lab
              tests, and complete the appointment.
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Appointment Info */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  <strong>Patient:</strong> {selectedAppointment.patientName}
                </p>
                <p className="text-sm">
                  <strong>Doctor:</strong> {selectedAppointment.doctorName}
                </p>
                <p className="text-sm">
                  <strong>Scheduled:</strong>{" "}
                  {new Date(
                    selectedAppointment.appointmentDate
                  ).toLocaleDateString()}{" "}
                  at {selectedAppointment.appointmentTime}
                </p>
              </div>

              {/* Actual Visit Time */}
              <div className="space-y-2">
                <Label htmlFor="completionTime">
                  Actual Visit Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="completionTime"
                  type="time"
                  value={completionTime}
                  onChange={(e) => setCompletionTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Record the actual time the patient was seen
                </p>
              </div>

              {/* Completion Notes */}
              <div className="space-y-2">
                <Label htmlFor="completionNotes">Visit Notes & Diagnosis</Label>
                <Textarea
                  id="completionNotes"
                  placeholder="Add notes about symptoms, diagnosis, treatment plan, and recommendations..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Prescription Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="prescriptionNeeded"
                    checked={prescriptionNeeded}
                    onCheckedChange={(checked) => {
                      setPrescriptionNeeded(checked as boolean);
                      if (checked && medicines.length === 0) {
                        handleAddMedicine();
                      }
                    }}
                  />
                  <Label
                    htmlFor="prescriptionNeeded"
                    className="cursor-pointer font-medium"
                  >
                    Create Prescription
                  </Label>
                </div>

                {prescriptionNeeded && (
                  <div className="space-y-4 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="prescriptionValidity">
                        Prescription Validity (Days)
                      </Label>
                      <Input
                        id="prescriptionValidity"
                        type="number"
                        min="1"
                        max="365"
                        value={prescriptionValidity}
                        onChange={(e) =>
                          setPrescriptionValidity(e.target.value)
                        }
                        placeholder="90"
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of days the prescription remains valid (default:
                        90 days)
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Medicines</Label>
                        <Button
                          onClick={handleAddMedicine}
                          size="sm"
                          type="button"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Medicine
                        </Button>
                      </div>

                      {medicines.map((medicine, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 space-y-3 bg-muted/30"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Medicine {index + 1}
                            </span>
                            <Button
                              onClick={() => handleRemoveMedicine(index)}
                              size="sm"
                              variant="ghost"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Medicine Name *</Label>
                              <Input
                                placeholder="e.g., Amoxicillin"
                                value={medicine.name}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Dosage *</Label>
                              <Input
                                placeholder="e.g., 500mg"
                                value={medicine.dosage}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "dosage",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Frequency *</Label>
                              <Input
                                placeholder="e.g., 3 times daily"
                                value={medicine.frequency}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "frequency",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Duration *</Label>
                              <Input
                                placeholder="e.g., 7 days"
                                value={medicine.duration}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "duration",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label>Instructions</Label>
                              <Input
                                placeholder="e.g., Take after meals"
                                value={medicine.instructions}
                                onChange={(e) =>
                                  handleMedicineChange(
                                    index,
                                    "instructions",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Tests Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="labTestsNeeded"
                    checked={labTestsNeeded}
                    onCheckedChange={(checked) =>
                      setLabTestsNeeded(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="labTestsNeeded"
                    className="cursor-pointer font-medium"
                  >
                    Lab Tests Required
                  </Label>
                </div>

                {labTestsNeeded && (
                  <div className="space-y-3 mt-3">
                    <Alert className="bg-blue-50 dark:bg-blue-950">
                      <AlertDescription>
                        Lab tests will be automatically added to the patient's
                        dashboard for booking.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter lab test name (e.g., Complete Blood Count)"
                        value={labTestInput}
                        onChange={(e) => setLabTestInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddLabTest())
                        }
                      />
                      <Button
                        onClick={handleAddLabTest}
                        type="button"
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>

                    {labTests.length > 0 && (
                      <div className="space-y-2">
                        <Label>Requested Lab Tests:</Label>
                        <div className="space-y-2">
                          {labTests.map((test, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-muted p-2 rounded"
                            >
                              <span className="text-sm">{test}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLabTest(test)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmComplete}>
              Complete Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
