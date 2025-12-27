import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Calendar,
  Shield,
  Award,
  Users,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";
import { Separator } from "@/components/ui/separator";

interface SystemSettings {
  systemName: string;
  systemEmail: string;
  systemPhone: string;
  systemAddress: string;
  systemWebsite?: string;
  systemDescription?: string;
  licenseNumber?: string;
  establishedYear?: number;
  emergencyContact?: string;
  faxNumber?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string;
}

export default function ContactPage() {
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About {settings?.systemName || "MediVault Healthcare"}
            </h1>
            {settings?.systemDescription && (
              <p className="text-lg text-muted-foreground">
                {settings.systemDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Contact Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Get in touch with us through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {settings?.systemPhone && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                        <Phone className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">
                            Phone
                          </div>
                          <a
                            href={`tel:${settings.systemPhone}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            {settings.systemPhone}
                          </a>
                        </div>
                      </div>
                    )}

                    {settings?.emergencyContact && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-200 dark:border-red-900">
                        <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1 text-red-600">
                            Emergency
                          </div>
                          <a
                            href={`tel:${settings.emergencyContact}`}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            {settings.emergencyContact}
                          </a>
                          <p className="text-xs text-red-600/70 mt-1">
                            24/7 Available
                          </p>
                        </div>
                      </div>
                    )}

                    {settings?.systemEmail && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                        <Mail className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">
                            Email
                          </div>
                          <a
                            href={`mailto:${settings.systemEmail}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            {settings.systemEmail}
                          </a>
                        </div>
                      </div>
                    )}

                    {settings?.faxNumber && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                        <Phone className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">Fax</div>
                          <span className="text-muted-foreground">
                            {settings.faxNumber}
                          </span>
                        </div>
                      </div>
                    )}

                    {settings?.systemAddress && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 md:col-span-2">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">
                            Address
                          </div>
                          <p className="text-muted-foreground">
                            {settings.systemAddress}
                          </p>
                        </div>
                      </div>
                    )}

                    {settings?.systemWebsite && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                        <Globe className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">
                            Website
                          </div>
                          <a
                            href={settings.systemWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Working Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Working Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {settings?.workingDays &&
                  settings?.workingHoursStart &&
                  settings?.workingHoursEnd ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {settings.workingDays.split(",").join(", ")}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {settings.workingHoursStart} -{" "}
                          {settings.workingHoursEnd}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-600">
                            Emergency Services
                          </span>
                        </div>
                        <span className="text-sm text-red-600 font-medium">
                          24/7 Available
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Please contact us for operating hours information.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => (window.location.href = "/appointments")}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = "/find-doctors")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Find Doctors
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = "/login")}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Patient Portal
                  </Button>
                </CardContent>
              </Card>

              {/* Facility Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Facility Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings?.licenseNumber && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          License Number
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {settings.licenseNumber}
                      </p>
                    </div>
                  )}
                  {settings?.establishedYear && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Established</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        {settings.establishedYear}
                      </p>
                    </div>
                  )}
                  <Separator />
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Committed to providing quality healthcare services with
                      compassion and excellence.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
