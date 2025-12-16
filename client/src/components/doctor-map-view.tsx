import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  Star,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";

interface Doctor {
  id: string;
  userId: string;
  specialization: string;
  experience: number;
  consultationFee: string;
  availableForEmergency: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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
  availableDate: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  isActive: boolean;
}

interface DoctorMapViewProps {
  doctors: Doctor[];
  availability: DoctorAvailability[];
  selectedCity?: string;
  selectedSpecialization?: string;
}

export default function DoctorMapView({
  doctors,
  availability,
  selectedCity,
  selectedSpecialization,
}: DoctorMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<{
    doctor: Doctor;
    availability: DoctorAvailability[];
  } | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 6.9271, lng: 79.8612 }, // Colombo, Sri Lanka
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    });

    googleMapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Group availability by doctor
    const doctorAvailabilityMap = new Map<string, DoctorAvailability[]>();
    availability.forEach((avail) => {
      if (avail.isActive && avail.locationLatitude && avail.locationLongitude) {
        // Filter by future dates
        if (
          new Date(avail.availableDate) <
          new Date(new Date().setHours(0, 0, 0, 0))
        ) {
          return;
        }

        // Filter by city
        if (
          selectedCity &&
          selectedCity !== "all" &&
          avail.locationCity !== selectedCity
        ) {
          return;
        }

        if (!doctorAvailabilityMap.has(avail.doctorId)) {
          doctorAvailabilityMap.set(avail.doctorId, []);
        }
        doctorAvailabilityMap.get(avail.doctorId)!.push(avail);
      }
    });

    // Create markers for each unique location
    const locationMarkers = new Map<
      string,
      { doctor: Doctor; availabilities: DoctorAvailability[] }[]
    >();

    doctorAvailabilityMap.forEach((availabilities, doctorId) => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) return;

      // Filter by specialization
      if (
        selectedSpecialization &&
        selectedSpecialization !== "all" &&
        doctor.specialization !== selectedSpecialization
      ) {
        return;
      }

      availabilities.forEach((avail) => {
        const locationKey = `${avail.locationLatitude},${avail.locationLongitude}`;
        if (!locationMarkers.has(locationKey)) {
          locationMarkers.set(locationKey, []);
        }
        const existing = locationMarkers
          .get(locationKey)!
          .find((item) => item.doctor.id === doctor.id);
        if (existing) {
          existing.availabilities.push(avail);
        } else {
          locationMarkers
            .get(locationKey)!
            .push({ doctor, availabilities: [avail] });
        }
      });
    });

    // Create markers
    const bounds = new google.maps.LatLngBounds();
    let hasMarkers = false;

    locationMarkers.forEach((doctorsAtLocation, locationKey) => {
      const [lat, lng] = locationKey.split(",").map(parseFloat);
      const position = { lat, lng };

      // Create marker
      const marker = new google.maps.Marker({
        position,
        map,
        title: doctorsAtLocation[0].availabilities[0].locationName,
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          scaledSize: new google.maps.Size(40, 40),
        },
        animation: google.maps.Animation.DROP,
      });

      // Create info window content
      const contentString = `
        <div style="max-width: 300px; padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
            ${doctorsAtLocation[0].availabilities[0].locationName}
          </h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
            ${doctorsAtLocation[0].availabilities[0].locationAddress}
          </p>
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 14px;">${
              doctorsAtLocation.length
            } Doctor${
        doctorsAtLocation.length > 1 ? "s" : ""
      } Available</strong>
          </div>
          ${doctorsAtLocation
            .map(
              (item) => `
            <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">
                Dr. ${item.doctor.user.firstName} ${item.doctor.user.lastName}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                ${item.doctor.specialization}
              </div>
              <div style="font-size: 12px; color: #666;">
                ${item.availabilities.length} upcoming date${
                item.availabilities.length > 1 ? "s" : ""
              }
              </div>
            </div>
          `
            )
            .join("")}
          <div style="margin-top: 8px; font-size: 11px; color: #999;">
            Click marker to see full details
          </div>
        </div>
      `;

      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(contentString);
        infoWindowRef.current?.open(map, marker);

        // Set selected doctor for sidebar
        if (doctorsAtLocation.length === 1) {
          setSelectedDoctor({
            doctor: doctorsAtLocation[0].doctor,
            availability: doctorsAtLocation[0].availabilities,
          });
        } else {
          setSelectedDoctor({
            doctor: doctorsAtLocation[0].doctor,
            availability: doctorsAtLocation.flatMap(
              (item) => item.availabilities
            ),
          });
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      hasMarkers = true;
    });

    // Fit bounds if we have markers
    if (hasMarkers) {
      map.fitBounds(bounds);
      // Prevent too much zoom
      const listener = google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom()! > 15) map.setZoom(15);
        google.maps.event.removeListener(listener);
      });
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [doctors, availability, selectedCity, selectedSpecialization]);

  const getDirections = (lat: string, lng: string) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-0">
            <div
              ref={mapRef}
              style={{ width: "100%", height: "600px" }}
              className="rounded-lg"
            />
          </CardContent>
        </Card>
      </div>

      {/* Selected Doctor Details */}
      <div className="lg:col-span-1">
        {selectedDoctor ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold mb-1">
                  Dr. {selectedDoctor.doctor.user.firstName}{" "}
                  {selectedDoctor.doctor.user.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDoctor.doctor.specialization}
                </p>
              </div>

              {selectedDoctor.doctor.availableForEmergency && (
                <Badge variant="destructive" className="bg-red-500">
                  Emergency Available
                </Badge>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">
                    {selectedDoctor.doctor.experience} years experience
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {selectedDoctor.doctor.user.email}
                  </span>
                </div>
                {selectedDoctor.doctor.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {selectedDoctor.doctor.user.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">
                    Rs.{" "}
                    {parseFloat(selectedDoctor.doctor.consultationFee).toFixed(
                      2
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / consultation
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Available Dates
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedDoctor.availability
                    .sort(
                      (a, b) =>
                        new Date(a.availableDate).getTime() -
                        new Date(b.availableDate).getTime()
                    )
                    .map((avail) => (
                      <div
                        key={avail.id}
                        className="p-3 bg-muted rounded-lg space-y-1"
                      >
                        <div className="font-medium text-sm">
                          {format(
                            new Date(avail.availableDate),
                            "EEEE, MMM d, yyyy"
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {avail.startTime} - {avail.endTime}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {avail.locationName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Max {avail.maxPatients} patients
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() =>
                            getDirections(
                              avail.locationLatitude!,
                              avail.locationLongitude!
                            )
                          }
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          Get Directions
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Click on a map marker to view doctor details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
