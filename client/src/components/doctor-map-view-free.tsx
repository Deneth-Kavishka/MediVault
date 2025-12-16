import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  Star,
  Navigation,
  Search,
} from "lucide-react";
import { format } from "date-fns";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
  bookedCount: number;
  hospitalType: string;
  consultationFee: string;
  isActive: boolean;
}

interface DoctorMapViewProps {
  doctors: Doctor[];
  availability: DoctorAvailability[];
  selectedCity?: string;
  selectedSpecialization?: string;
}

// Function to create custom doctor profile marker
const createDoctorIcon = (doctor: Doctor, count: number) => {
  const initials = `${doctor.user.firstName[0]}${doctor.user.lastName[0]}`;
  const doctorName = `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;

  return L.divIcon({
    className: "custom-doctor-marker",
    html: `
      <div class="doctor-marker-container">
        <div class="doctor-avatar">
          <div class="avatar-circle">${initials}</div>
          ${count > 1 ? `<div class="doctor-count">${count}</div>` : ""}
        </div>
        <div class="doctor-name">${doctorName}</div>
      </div>
    `,
    iconSize: [120, 60],
    iconAnchor: [60, 60],
    tooltipAnchor: [0, -45],
  });
};

// Component to handle map bounds
function MapBoundsHandler({ markers }: { markers: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [markers, map]);

  return null;
}

export default function DoctorMapViewFree({
  doctors,
  availability,
  selectedCity,
  selectedSpecialization,
}: DoctorMapViewProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<{
    doctor: Doctor;
    availability: DoctorAvailability[];
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group availability by location
  const locationMarkers = new Map<
    string,
    { doctor: Doctor; availabilities: DoctorAvailability[] }[]
  >();

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

      const doctor = doctors.find((d) => d.id === avail.doctorId);
      if (!doctor) return;

      // Filter by specialization
      if (
        selectedSpecialization &&
        selectedSpecialization !== "all" &&
        doctor.specialization !== selectedSpecialization
      ) {
        return;
      }

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
    }
  });

  // Convert to array for markers
  const markers = Array.from(locationMarkers.entries()).map(
    ([locationKey, doctorsAtLocation]) => {
      const [lat, lng] = locationKey.split(",").map(parseFloat);
      return {
        position: [lat, lng] as [number, number],
        doctorsAtLocation,
      };
    }
  );

  // Search location using Nominatim (FREE)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const getDirections = (lat: string, lng: string) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  // Default center (Colombo, Sri Lanka)
  const defaultCenter: [number, number] = [6.9271, 79.8612];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map */}
      <div className="lg:col-span-2 space-y-2">
        {/* Location Search */}
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search location (e.g., Colombo, Kandy)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchLocation()}
              />
              <Button onClick={searchLocation} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.place_id}
                    className="text-xs p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => {
                      setSearchResults([]);
                      setSearchQuery(result.display_name);
                    }}
                  >
                    {result.display_name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardContent className="p-0">
            <MapContainer
              center={markers.length > 0 ? markers[0].position : defaultCenter}
              zoom={13}
              style={{ width: "100%", height: "600px" }}
              className="rounded-lg z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {markers.map((marker, idx) => (
                <Marker
                  key={idx}
                  position={marker.position}
                  icon={createDoctorIcon(
                    marker.doctorsAtLocation[0].doctor,
                    marker.doctorsAtLocation.length
                  )}
                  eventHandlers={{
                    click: () => {
                      if (marker.doctorsAtLocation.length === 1) {
                        setSelectedDoctor({
                          doctor: marker.doctorsAtLocation[0].doctor,
                          availability:
                            marker.doctorsAtLocation[0].availabilities,
                        });
                      } else {
                        setSelectedDoctor({
                          doctor: marker.doctorsAtLocation[0].doctor,
                          availability: marker.doctorsAtLocation.flatMap(
                            (item) => item.availabilities
                          ),
                        });
                      }
                    },
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    opacity={0.95}
                    className="doctor-tooltip"
                  >
                    <div className="p-2">
                      <h3 className="font-bold text-base mb-1 text-primary">
                        📍{" "}
                        {
                          marker.doctorsAtLocation[0].availabilities[0]
                            .locationName
                        }
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        {
                          marker.doctorsAtLocation[0].availabilities[0]
                            .locationAddress
                        }
                      </p>
                      <div className="mb-2 pb-2 border-b">
                        <strong className="text-sm text-green-600">
                          ✓ {marker.doctorsAtLocation.length} Doctor
                          {marker.doctorsAtLocation.length > 1 ? "s" : ""}{" "}
                          Available
                        </strong>
                      </div>
                      {marker.doctorsAtLocation.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 border-t pt-3 mt-2 hover:bg-blue-50 p-2 rounded transition-colors"
                        >
                          {/* Profile Picture */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {item.doctor.user.firstName[0]}
                              {item.doctor.user.lastName[0]}
                            </div>
                          </div>

                          {/* Doctor Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900">
                              Dr. {item.doctor.user.firstName}{" "}
                              {item.doctor.user.lastName}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                              {item.doctor.specialization}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {item.doctor.experience} years exp
                            </div>
                            <div className="text-xs text-green-600 font-medium mt-1">
                              📅 {item.availabilities.length} upcoming slot
                              {item.availabilities.length > 1 ? "s" : ""}
                            </div>
                            {item.doctor.availableForEmergency && (
                              <div className="text-xs text-red-600 font-semibold mt-1">
                                🚨 Emergency Available
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 pt-2 border-t text-center">
                        <p className="text-xs text-gray-500 italic">
                          Click profile for full details →
                        </p>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}

              <MapBoundsHandler markers={markers.map((m) => m.position)} />
            </MapContainer>
          </CardContent>
        </Card>
      </div>

      {/* Selected Doctor Details */}
      <div className="lg:col-span-1">
        {selectedDoctor ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Profile Header with Picture */}
              <div className="flex items-start gap-4">
                {/* Large Profile Picture */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-blue-100">
                    {selectedDoctor.doctor.user.firstName[0]}
                    {selectedDoctor.doctor.user.lastName[0]}
                  </div>
                </div>

                {/* Doctor Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">
                    Dr. {selectedDoctor.doctor.user.firstName}{" "}
                    {selectedDoctor.doctor.user.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {selectedDoctor.doctor.specialization}
                  </p>
                  {selectedDoctor.doctor.availableForEmergency && (
                    <Badge variant="destructive" className="bg-red-500 mt-2">
                      🚨 Emergency Available
                    </Badge>
                  )}
                </div>
              </div>

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
                        <div className="flex items-center gap-2 text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span
                            className={
                              avail.bookedCount >= avail.maxPatients
                                ? "text-red-500 font-semibold"
                                : "text-green-600 font-semibold"
                            }
                          >
                            {avail.maxPatients - avail.bookedCount} available
                          </span>
                          <span className="text-muted-foreground">
                            / {avail.maxPatients}
                          </span>
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
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Doctor Selected</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Click on any red marker on the map to view doctor profile,
                availability, and contact information
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-full">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                Interactive Map Available
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                ✨ Powered by OpenStreetMap (100% Free)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
