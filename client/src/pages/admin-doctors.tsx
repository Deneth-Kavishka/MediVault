import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/dialog";
import {
  Search,
  Stethoscope,
  Download,
  Calendar,
  Phone,
  Mail,
  Award,
  Clock,
  Users,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Doctor {
  id: string;
  userId: string;
  licenseNumber: string;
  specialization: string;
  experienceYears?: number;
  qualifications?: string;
  consultationFee?: number;
  availability?: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username: string;
  };
}

interface Appointment {
  id: string;
  status: string;
  appointmentDate: string;
  patient?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export default function AdminDoctors() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] =
    useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch doctors
  const {
    data: doctors,
    isLoading,
    error: doctorsError,
  } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  // Fetch appointments for stats
  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  console.log("AdminDoctors render:", { doctors, isLoading, doctorsError });

  // Show error if doctors failed to load
  if (doctorsError) {
    console.error("Doctors error:", doctorsError);
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Doctors</CardTitle>
            <CardDescription>
              Failed to fetch doctor data. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              {doctorsError instanceof Error
                ? doctorsError.message
                : JSON.stringify(doctorsError)}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter doctors
  const filteredDoctors = doctors?.filter((doctor) => {
    try {
      const fullName = `${doctor.user?.firstName || ""} ${
        doctor.user?.lastName || ""
      }`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        doctor.licenseNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        doctor.specialization
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        doctor.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialization =
        specializationFilter === "all" ||
        doctor.specialization === specializationFilter;
      const matchesAvailability =
        availabilityFilter === "all" ||
        doctor.availability === availabilityFilter;

      return matchesSearch && matchesSpecialization && matchesAvailability;
    } catch (error) {
      console.error("Filter error for doctor:", doctor, error);
      return false;
    }
  });

  // Get unique specializations
  const specializations = Array.from(
    new Set(doctors?.map((d) => d.specialization).filter(Boolean) || [])
  );

  const handleViewDetails = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setDetailsDialogOpen(true);
  };

  const getDoctorAppointments = (doctorId: string) => {
    return appointments?.filter((apt) => apt.status !== "cancelled") || [];
  };

  const handleExport = () => {
    if (!filteredDoctors || filteredDoctors.length === 0) {
      toast({
        title: "No Data",
        description: "No doctors to export",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = [
      "Name",
      "Email",
      "License Number",
      "Specialization",
      "Experience (Years)",
      "Qualifications",
      "Consultation Fee",
      "Availability",
    ];
    const rows = filteredDoctors.map((d) => [
      `${d.user?.firstName || ""} ${d.user?.lastName || ""}`,
      d.user?.email || "",
      d.licenseNumber,
      d.specialization,
      d.experienceYears?.toString() || "0",
      d.qualifications || "",
      d.consultationFee?.toString() || "0",
      d.availability || "Not specified",
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
    a.download = `doctors-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${filteredDoctors.length} doctors`,
    });
  };

  if (isLoading) {
    console.log("AdminDoctors: Loading state");
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

  console.log("AdminDoctors: Rendering main content", {
    doctorsCount: doctors?.length,
    filteredCount: filteredDoctors?.length,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Stethoscope className="h-8 w-8 text-primary" />
          Doctor Management
        </h1>
        <p className="text-muted-foreground">
          Manage medical staff, schedules, and performance metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Specializations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{specializations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctors?.filter((d) => d.availability === "available").length ||
                0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments?.filter((a) => a.status !== "cancelled").length ||
                0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Doctors</CardTitle>
              <CardDescription>
                View and manage doctor profiles and schedules
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
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, license, specialization, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={specializationFilter}
              onValueChange={setSpecializationFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                {specializations.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={availabilityFilter}
              onValueChange={setAvailabilityFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>License No.</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Consultation Fee</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors && filteredDoctors.length > 0 ? (
                  filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">
                            Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {doctor.user?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doctor.licenseNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {doctor.specialization}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doctor.experienceYears ? (
                          <span>{doctor.experienceYears} years</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doctor.consultationFee ? (
                          <span className="font-medium">
                            ${Number(doctor.consultationFee).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doctor.availability === "available" ? (
                          <Badge className="bg-green-500">Available</Badge>
                        ) : doctor.availability === "busy" ? (
                          <Badge variant="destructive">Busy</Badge>
                        ) : doctor.availability === "on-leave" ? (
                          <Badge variant="secondary">On Leave</Badge>
                        ) : (
                          <Badge variant="outline">Not specified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(doctor)}
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No doctors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
            <DialogDescription>
              Complete doctor profile and performance metrics
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Profile</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="text-lg font-semibold">
                      Dr. {selectedDoctor.user?.firstName}{" "}
                      {selectedDoctor.user?.lastName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p>{selectedDoctor.user?.email || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      License Number
                    </label>
                    <Badge variant="outline" className="text-base">
                      {selectedDoctor.licenseNumber}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Specialization
                    </label>
                    <Badge variant="secondary" className="text-base">
                      {selectedDoctor.specialization}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Experience
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedDoctor.experienceYears || 0} years
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Consultation Fee
                    </label>
                    <p className="text-lg font-semibold">
                      ${Number(selectedDoctor.consultationFee || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Qualifications
                    </label>
                    <p className="text-sm">
                      {selectedDoctor.qualifications || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Availability Status
                    </label>
                    {selectedDoctor.availability === "available" ? (
                      <Badge className="bg-green-500">Available</Badge>
                    ) : selectedDoctor.availability === "busy" ? (
                      <Badge variant="destructive">Busy</Badge>
                    ) : selectedDoctor.availability === "on-leave" ? (
                      <Badge variant="secondary">On Leave</Badge>
                    ) : (
                      <Badge variant="outline">Not specified</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Joined Date
                    </label>
                    <p>
                      {new Date(selectedDoctor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Schedule</CardTitle>
                    <CardDescription>
                      Doctor's availability throughout the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((day) => (
                        <div
                          key={day}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <span className="font-medium">{day}</span>
                          <span className="text-sm text-muted-foreground">
                            9:00 AM - 5:00 PM
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Note: Schedule management feature coming soon
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Total Appointments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {getDoctorAppointments(selectedDoctor.id).length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Total Patients
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {
                          new Set(
                            getDoctorAppointments(selectedDoctor.id).map(
                              (a) => a.patient
                            )
                          ).size
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Performance Metrics
                    </CardTitle>
                    <CardDescription>
                      Key performance indicators for this doctor
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Patient Satisfaction
                        </span>
                        <Badge>4.8/5.0</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Average Consultation Time
                        </span>
                        <Badge variant="secondary">25 mins</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Completed Appointments
                        </span>
                        <Badge variant="outline">
                          {
                            getDoctorAppointments(selectedDoctor.id).filter(
                              (a) => a.status === "completed"
                            ).length
                          }
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
