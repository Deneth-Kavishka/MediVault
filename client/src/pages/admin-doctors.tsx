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
  doctorId: string;
  patientId: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string;
  createdAt: string;
  patient?: {
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface DoctorAvailability {
  id: string;
  doctorId: string;
  availableDate: string;
  startTime: string;
  endTime: string;
  status: string;
  maxPatients?: number;
  bookedPatients?: number;
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

  // Fetch doctor availability
  const { data: availabilities } = useQuery<DoctorAvailability[]>({
    queryKey: ["/api/doctor-availability"],
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
    return (
      appointments?.filter(
        (apt) => apt.doctorId === doctorId && apt.status !== "cancelled"
      ) || []
    );
  };

  const getDoctorAvailability = (doctorId: string) => {
    return availabilities?.filter((avail) => avail.doctorId === doctorId) || [];
  };

  const calculatePerformanceMetrics = (doctorId: string) => {
    const doctorAppointments = getDoctorAppointments(doctorId);

    const total = doctorAppointments.length;
    const completed = doctorAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const pending = doctorAppointments.filter(
      (a) => a.status === "pending"
    ).length;
    const confirmed = doctorAppointments.filter(
      (a) => a.status === "confirmed"
    ).length;

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const uniquePatients = new Set(doctorAppointments.map((a) => a.patientId))
      .size;

    // Calculate appointments in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAppointments = doctorAppointments.filter(
      (a) => new Date(a.createdAt) >= thirtyDaysAgo
    ).length;

    return {
      total,
      completed,
      pending,
      confirmed,
      completionRate,
      uniquePatients,
      recentAppointments,
    };
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
      "Availability",
      "Joined Date",
    ];
    const rows = filteredDoctors.map((d) => [
      `${d.user?.firstName || ""} ${d.user?.lastName || ""}`,
      d.user?.email || "",
      d.licenseNumber,
      d.specialization,
      d.experienceYears?.toString() || "0",
      d.qualifications || "",
      d.availability || "Not specified",
      new Date(d.createdAt).toLocaleDateString(),
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
                  <TableHead>Qualifications</TableHead>
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
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {doctor.experienceYears} years
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doctor.qualifications ? (
                          <span
                            className="text-sm truncate max-w-[200px] block"
                            title={doctor.qualifications}
                          >
                            {doctor.qualifications}
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
                      className="text-center text-muted-foreground py-8"
                    >
                      <Stethoscope className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="font-medium">No doctors found</p>
                      <p className="text-sm">Try adjusting your filters</p>
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
                      Username
                    </label>
                    <p className="font-mono text-sm">
                      {selectedDoctor.user?.username || "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Joined Date
                    </label>
                    <p>
                      {new Date(selectedDoctor.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Availability Schedule
                        </CardTitle>
                        <CardDescription>
                          Doctor's scheduled availability slots
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {getDoctorAvailability(selectedDoctor.id).length} slots
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {getDoctorAvailability(selectedDoctor.id).length > 0 ? (
                      <div className="space-y-3">
                        {getDoctorAvailability(selectedDoctor.id)
                          .sort(
                            (a, b) =>
                              new Date(a.availableDate).getTime() -
                              new Date(b.availableDate).getTime()
                          )
                          .slice(0, 10)
                          .map((avail) => (
                            <div
                              key={avail.id}
                              className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">
                                    {new Date(
                                      avail.availableDate
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {avail.startTime} - {avail.endTime}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {avail.maxPatients && (
                                  <Badge variant="secondary">
                                    {avail.bookedPatients || 0}/
                                    {avail.maxPatients} patients
                                  </Badge>
                                )}
                                {avail.status === "available" && (
                                  <Badge className="bg-green-500">
                                    Available
                                  </Badge>
                                )}
                                {avail.status === "booked" && (
                                  <Badge variant="destructive">
                                    Fully Booked
                                  </Badge>
                                )}
                                {avail.status === "finished" && (
                                  <Badge variant="outline">Finished</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="font-medium">No availability scheduled</p>
                        <p className="text-sm">
                          Doctor hasn't set up any availability slots yet
                        </p>
                      </div>
                    )}
                    {getDoctorAvailability(selectedDoctor.id).length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing 10 most recent slots. Total:{" "}
                        {getDoctorAvailability(selectedDoctor.id).length}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4">
                {(() => {
                  const metrics = calculatePerformanceMetrics(
                    selectedDoctor.id
                  );
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Total Appointments
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {metrics.total}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {metrics.recentAppointments} in last 30 days
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Unique Patients
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {metrics.uniquePatients}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Total served
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Completion Rate
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {metrics.completionRate}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {metrics.completed} completed
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Appointment Breakdown
                          </CardTitle>
                          <CardDescription>
                            Current appointment status distribution
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium">
                                  Completed
                                </span>
                              </div>
                              <Badge className="bg-green-500">
                                {metrics.completed}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium">
                                  Confirmed
                                </span>
                              </div>
                              <Badge className="bg-blue-500">
                                {metrics.confirmed}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-sm font-medium">
                                  Pending
                                </span>
                              </div>
                              <Badge className="bg-yellow-500">
                                {metrics.pending}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Performance Summary
                          </CardTitle>
                          <CardDescription>
                            Overall statistics and insights
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Average Appointments per Month
                              </span>
                              <Badge variant="secondary">
                                {metrics.total > 0
                                  ? Math.round(metrics.recentAppointments / 1)
                                  : 0}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Patient Retention
                              </span>
                              <Badge variant="outline">
                                {metrics.uniquePatients > 0
                                  ? Math.round(
                                      (metrics.total / metrics.uniquePatients) *
                                        100
                                    ) / 100
                                  : 0}
                                x avg visits
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Active Status
                              </span>
                              <Badge
                                className={
                                  metrics.recentAppointments > 0
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }
                              >
                                {metrics.recentAppointments > 0
                                  ? "Active"
                                  : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
