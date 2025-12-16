import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Search,
  Calendar,
  Clock,
  Users,
  Navigation,
  Star,
  Phone,
  Mail,
  Map,
  List,
  ChevronDown,
  Send,
} from "lucide-react";
// Use free OpenStreetMap version instead of Google Maps
import DoctorMapView from "@/components/doctor-map-view-free";

interface Doctor {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  experience: number;
  qualifications: string;
  consultationFee: string;
  availableForEmergency: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

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
}

interface DoctorWithAvailability extends Doctor {
  availability: DoctorAvailability[];
}

export default function FindDoctors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<string>("all");
  const [viewAllLocationsDialog, setViewAllLocationsDialog] = useState<{
    open: boolean;
    doctor: DoctorWithAvailability | null;
    availability: DoctorAvailability[];
  }>({ open: false, doctor: null, availability: [] });
  const [contactDialog, setContactDialog] = useState<{
    open: boolean;
    doctor: DoctorWithAvailability | null;
  }>({ open: false, doctor: null });
  const [contactMessage, setContactMessage] = useState("");
  const [bookAppointmentDialog, setBookAppointmentDialog] = useState<{
    open: boolean;
    availability: DoctorAvailability | null;
    doctor: Doctor | null;
  }>({ open: false, availability: null, doctor: null });
  const [appointmentReason, setAppointmentReason] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const openViewAllLocations = (
    doctor: DoctorWithAvailability,
    availability: DoctorAvailability[]
  ) => {
    setViewAllLocationsDialog({ open: true, doctor, availability });
  };

  const openContactDialog = (doctor: DoctorWithAvailability) => {
    const template = `Dear Dr. ${doctor.user.firstName} ${doctor.user.lastName},\n\nI hope this message finds you well. I am interested in scheduling a consultation with you.\n\n[Please add your specific inquiry or appointment request here]\n\nThank you for your time and consideration.\n\nBest regards`;
    setContactMessage(template);
    setContactDialog({ open: true, doctor });
  };

  const sendContactEmail = () => {
    if (!contactDialog.doctor) return;

    const mailtoLink = `mailto:${
      contactDialog.doctor.user.email
    }?subject=Consultation Inquiry&body=${encodeURIComponent(contactMessage)}`;
    window.location.href = mailtoLink;

    toast({
      title: "Email Client Opened",
      description: `Opening your email client to contact Dr. ${contactDialog.doctor.user.firstName} ${contactDialog.doctor.user.lastName}`,
    });

    setContactDialog({ open: false, doctor: null });
  };

  const openBookAppointmentDialog = (
    availability: DoctorAvailability,
    doctor: Doctor
  ) => {
    setAppointmentReason("");
    setAppointmentNotes("");
    setBookAppointmentDialog({ open: true, availability, doctor });
  };

  const bookAppointmentMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      availabilityId: string;
      doctorId: string;
      appointmentDate: Date;
      reason: string;
      notes: string;
    }) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to book appointment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your appointment has been booked successfully.",
      });
      setBookAppointmentDialog({
        open: false,
        availability: null,
        doctor: null,
      });
      setAppointmentReason("");
      setAppointmentNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = async () => {
    if (!bookAppointmentDialog.availability || !bookAppointmentDialog.doctor)
      return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to book an appointment.",
        variant: "destructive",
      });
      return;
    }

    if (!appointmentReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for the appointment.",
        variant: "destructive",
      });
      return;
    }

    // Check if fully booked
    if (
      bookAppointmentDialog.availability.bookedCount >=
      bookAppointmentDialog.availability.maxPatients
    ) {
      toast({
        title: "Fully Booked",
        description: "This slot is fully booked. Please choose another date.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch patient profile to get patientId
      const patientResponse = await fetch("/api/patients/me", {
        credentials: "include",
      });

      if (!patientResponse.ok) {
        throw new Error(
          "Failed to fetch patient profile. Please ensure your profile is complete."
        );
      }

      const patient = await patientResponse.json();

      bookAppointmentMutation.mutate({
        patientId: patient.id,
        availabilityId: bookAppointmentDialog.availability.id,
        doctorId: bookAppointmentDialog.doctor.id,
        appointmentDate: new Date(
          bookAppointmentDialog.availability.availableDate
        ),
        reason: appointmentReason,
        notes: appointmentNotes,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process appointment booking",
        variant: "destructive",
      });
    }
  };

  // Fetch all doctors
  const { data: doctors, isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const response = await fetch("/api/doctors", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      return response.json();
    },
  });

  // Fetch all availability
  const { data: availability, isLoading: loadingAvailability } = useQuery<
    DoctorAvailability[]
  >({
    queryKey: ["/api/doctor-availability"],
    queryFn: async () => {
      const response = await fetch("/api/doctor-availability", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
  });

  // Combine doctors with their availability
  const doctorsWithAvailability: DoctorWithAvailability[] =
    doctors?.map((doctor) => ({
      ...doctor,
      availability:
        availability?.filter((a) => a.doctorId === doctor.id && a.isActive) ||
        [],
    })) || [];

  // Get unique cities and specializations
  const cities = Array.from(
    new Set(availability?.map((a) => a.locationCity) || [])
  ).sort();
  const specializations = Array.from(
    new Set(doctors?.map((d) => d.specialization) || [])
  ).sort();

  // Filter doctors
  const filteredDoctors = doctorsWithAvailability.filter((doctor) => {
    // Has availability
    if (doctor.availability.length === 0) return false;

    // Search filter (name or specialization)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName =
        `${doctor.user.firstName} ${doctor.user.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(query) ||
        doctor.specialization.toLowerCase().includes(query) ||
        doctor.availability.some((a) =>
          a.locationName.toLowerCase().includes(query)
        );
      if (!matchesSearch) return false;
    }

    // City filter
    if (selectedCity !== "all") {
      const hasCity = doctor.availability.some(
        (a) => a.locationCity === selectedCity
      );
      if (!hasCity) return false;
    }

    // Specialization filter
    if (selectedSpecialization !== "all") {
      if (doctor.specialization !== selectedSpecialization) return false;
    }

    // Only show doctors with future availability
    const hasFutureAvailability = doctor.availability.some(
      (a) =>
        new Date(a.availableDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    );
    if (!hasFutureAvailability) return false;

    return true;
  });

  // Get directions using Google Maps
  const getDirections = (
    latitude: string | null,
    longitude: string | null,
    address: string
  ) => {
    if (latitude && longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        "_blank"
      );
    } else {
      // Fallback to address-based search
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`,
        "_blank"
      );
    }
  };

  // View on map
  const viewOnMap = (
    latitude: string | null,
    longitude: string | null,
    address: string
  ) => {
    if (latitude && longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`,
        "_blank"
      );
    }
  };

  const isLoading = loadingDoctors || loadingAvailability;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Search className="h-8 w-8 text-primary" />
          Find Doctors
        </h1>
        <p className="text-muted-foreground">
          Search for available doctors by location, specialization, and schedule
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find doctors based on your preferences and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Doctor name, specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger id="city">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Select
                value={selectedSpecialization}
                onValueChange={setSelectedSpecialization}
              >
                <SelectTrigger id="specialization">
                  <SelectValue placeholder="All Specializations" />
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredDoctors.length} Doctor
            {filteredDoctors.length !== 1 ? "s" : ""} Found
          </h2>
          <Badge variant="secondary">{filteredDoctors.length} results</Badge>
        </div>

        {filteredDoctors.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <Search className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Doctors Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredDoctors.map((doctor) => (
                  <Card key={doctor.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            Dr. {doctor.user.firstName} {doctor.user.lastName}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {doctor.specialization}
                          </CardDescription>
                        </div>
                        {doctor.availableForEmergency && (
                          <Badge variant="destructive" className="bg-red-500">
                            Emergency
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Doctor Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">
                            {doctor.experience} years experience
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {doctor.user.email}
                          </span>
                        </div>
                        {doctor.user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {doctor.user.phone}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Availability */}
                      <div className="space-y-2">
                        {(() => {
                          const futureAvailability = doctor.availability
                            .filter(
                              (a) =>
                                selectedCity === "all" ||
                                a.locationCity === selectedCity
                            )
                            .filter(
                              (a) =>
                                new Date(a.availableDate) >=
                                new Date(new Date().setHours(0, 0, 0, 0))
                            )
                            .sort(
                              (a, b) =>
                                new Date(a.availableDate).getTime() -
                                new Date(b.availableDate).getTime()
                            );

                          if (futureAvailability.length === 0) {
                            return (
                              <div className="text-center py-6 space-y-3">
                                <div className="text-muted-foreground">
                                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">
                                    No availability scheduled
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openContactDialog(doctor)}
                                  className="w-full"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Contact Doctor
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <>
                              <h4 className="text-sm font-semibold">
                                Available At:
                              </h4>
                              <div className="space-y-2">
                                {futureAvailability.slice(0, 1).map((avail) => (
                                  <div
                                    key={avail.id}
                                    className="p-3 bg-muted rounded-lg space-y-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-primary" />
                                          {avail.locationName}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {avail.locationAddress},{" "}
                                          {avail.locationCity}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          {new Date(
                                            avail.availableDate
                                          ).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {avail.startTime} - {avail.endTime}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span
                                          className={
                                            avail.bookedCount >=
                                            avail.maxPatients
                                              ? "text-red-500 font-semibold"
                                              : "text-green-600 font-semibold"
                                          }
                                        >
                                          {avail.maxPatients -
                                            avail.bookedCount}{" "}
                                          available
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      {avail.hospitalType === "private" ? (
                                        <>
                                          <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 px-2 font-bold">
                                            🏨 Private
                                          </Badge>
                                          <span className="font-bold text-sm text-green-600">
                                            LKR{" "}
                                            {parseFloat(
                                              avail.consultationFee
                                            ).toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </span>
                                        </>
                                      ) : (
                                        <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs py-1 px-2 font-bold">
                                          🏥 Gov - FREE
                                        </Badge>
                                      )}
                                    </div>
                                    {avail.locationLatitude &&
                                      avail.locationLongitude && (
                                        <div className="w-full h-32 rounded-md overflow-hidden border">
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
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() =>
                                          viewOnMap(
                                            avail.locationLatitude,
                                            avail.locationLongitude,
                                            avail.locationAddress
                                          )
                                        }
                                      >
                                        <MapPin className="h-3 w-3 mr-1" />
                                        Full Map
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() =>
                                          getDirections(
                                            avail.locationLatitude,
                                            avail.locationLongitude,
                                            avail.locationAddress
                                          )
                                        }
                                      >
                                        <Navigation className="h-3 w-3 mr-1" />
                                        Directions
                                      </Button>
                                    </div>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="w-full mt-2"
                                      onClick={() =>
                                        openBookAppointmentDialog(avail, doctor)
                                      }
                                      disabled={
                                        avail.bookedCount >= avail.maxPatients
                                      }
                                    >
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {avail.bookedCount >= avail.maxPatients
                                        ? "Fully Booked"
                                        : "Book Appointment"}
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2 mt-2">
                                {futureAvailability.length > 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openViewAllLocations(
                                        doctor,
                                        futureAvailability
                                      )
                                    }
                                    className="flex-1"
                                  >
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Show {futureAvailability.length} Location
                                    {futureAvailability.length !== 1 ? "s" : ""}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openContactDialog(doctor)}
                                  className="flex-1"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <DoctorMapView
                doctors={filteredDoctors}
                availability={availability || []}
                selectedCity={selectedCity}
                selectedSpecialization={selectedSpecialization}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Contact Doctor Dialog */}
      <Dialog
        open={contactDialog.open}
        onOpenChange={(open) =>
          setContactDialog({ open, doctor: contactDialog.doctor })
        }
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contact Doctor</DialogTitle>
            <DialogDescription>
              {contactDialog.doctor && (
                <>
                  Send a message to Dr. {contactDialog.doctor.user.firstName}{" "}
                  {contactDialog.doctor.user.lastName}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Email: {contactDialog.doctor.user.email}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                💡 A pre-filled template is provided. Feel free to customize it
                before sending.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContactDialog({ open: false, doctor: null })}
            >
              Cancel
            </Button>
            <Button onClick={sendContactEmail}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View All Locations Dialog */}
      <Dialog
        open={viewAllLocationsDialog.open}
        onOpenChange={(open) =>
          setViewAllLocationsDialog({
            open,
            doctor: viewAllLocationsDialog.doctor,
            availability: viewAllLocationsDialog.availability,
          })
        }
      >
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>All Available Locations</DialogTitle>
            <DialogDescription>
              {viewAllLocationsDialog.doctor && (
                <>
                  Viewing all locations for Dr.{" "}
                  {viewAllLocationsDialog.doctor.user.firstName}{" "}
                  {viewAllLocationsDialog.doctor.user.lastName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {viewAllLocationsDialog.availability.map((avail, index) => (
              <div
                key={avail.id}
                className="p-4 bg-muted rounded-lg space-y-3 border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-base flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        #{index + 1}
                      </Badge>
                      <MapPin className="h-4 w-4 text-primary" />
                      {avail.locationName}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {avail.locationAddress}, {avail.locationCity}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(avail.availableDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {avail.startTime} - {avail.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={
                        avail.bookedCount >= avail.maxPatients
                          ? "text-red-500 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      {avail.maxPatients - avail.bookedCount} available
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {avail.hospitalType === "private" ? (
                    <>
                      <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 px-2 font-bold">
                        🏨 Private
                      </Badge>
                      <span className="font-bold text-sm text-green-600">
                        LKR{" "}
                        {parseFloat(avail.consultationFee).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </span>
                    </>
                  ) : (
                    <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs py-1 px-2 font-bold">
                      🏥 Gov - FREE
                    </Badge>
                  )}
                </div>

                {avail.locationLatitude && avail.locationLongitude && (
                  <div className="w-full h-40 rounded-md overflow-hidden border">
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      viewOnMap(
                        avail.locationLatitude,
                        avail.locationLongitude,
                        avail.locationAddress
                      )
                    }
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    View on Map
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      getDirections(
                        avail.locationLatitude,
                        avail.locationLongitude,
                        avail.locationAddress
                      )
                    }
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Get Directions
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    if (viewAllLocationsDialog.doctor) {
                      openBookAppointmentDialog(
                        avail,
                        viewAllLocationsDialog.doctor
                      );
                      setViewAllLocationsDialog({
                        open: false,
                        doctor: null,
                        availability: [],
                      });
                    }
                  }}
                  disabled={avail.bookedCount >= avail.maxPatients}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {avail.bookedCount >= avail.maxPatients
                    ? "Fully Booked"
                    : "Book Appointment"}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                setViewAllLocationsDialog({
                  open: false,
                  doctor: null,
                  availability: [],
                })
              }
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Appointment Dialog */}
      <Dialog
        open={bookAppointmentDialog.open}
        onOpenChange={(open) =>
          setBookAppointmentDialog({
            open,
            availability: bookAppointmentDialog.availability,
            doctor: bookAppointmentDialog.doctor,
          })
        }
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Book Appointment
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Review appointment details and provide reason for visit
            </DialogDescription>
          </DialogHeader>

          {bookAppointmentDialog.doctor &&
            bookAppointmentDialog.availability && (
              <div className="bg-muted p-4 rounded-lg space-y-3 my-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Doctor</p>
                    <p className="font-semibold text-sm">
                      Dr. {bookAppointmentDialog.doctor.user.firstName}{" "}
                      {bookAppointmentDialog.doctor.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bookAppointmentDialog.doctor.specialization}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Location
                    </p>
                    <p className="font-semibold text-sm">
                      {bookAppointmentDialog.availability.locationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bookAppointmentDialog.availability.locationCity}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(
                        bookAppointmentDialog.availability.availableDate
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Time</p>
                    <p className="font-semibold text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {bookAppointmentDialog.availability.startTime} -{" "}
                      {bookAppointmentDialog.availability.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  {bookAppointmentDialog.availability.hospitalType ===
                  "private" ? (
                    <>
                      <Badge className="bg-blue-600 text-white">
                        🏨 Private
                      </Badge>
                      <span className="font-bold text-base text-green-600">
                        LKR{" "}
                        {parseFloat(
                          bookAppointmentDialog.availability.consultationFee
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </>
                  ) : (
                    <Badge className="bg-green-600 text-white text-sm py-1 px-3">
                      🏥 Government - FREE
                    </Badge>
                  )}
                </div>
              </div>
            )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason for Visit <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={appointmentReason}
                onChange={(e) => setAppointmentReason(e.target.value)}
                placeholder="E.g., Regular checkup, Follow-up consultation, Specific health concern..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                placeholder="Any additional information you'd like to share with the doctor..."
                className="min-h-[80px]"
              />
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-semibold mb-1">📋 Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Please arrive 10-15 minutes before your appointment</li>
                <li>Bring any relevant medical records or test results</li>
                <li>
                  If you need to cancel, please do so at least 24 hours in
                  advance
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBookAppointmentDialog({
                  open: false,
                  availability: null,
                  doctor: null,
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={bookAppointmentMutation.isPending}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {bookAppointmentMutation.isPending
                ? "Booking..."
                : "Confirm Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
