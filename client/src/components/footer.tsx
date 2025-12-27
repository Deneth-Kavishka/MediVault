import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Clock,
} from "lucide-react";
import { Link } from "wouter";

interface SystemSettings {
  systemName: string;
  systemEmail: string;
  systemPhone: string;
  systemAddress: string;
  systemWebsite?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string;
}

export default function Footer() {
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Organization Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {settings?.systemName || "MediVault Healthcare"}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {settings?.systemAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{settings.systemAddress}</span>
                </div>
              )}
              {settings?.systemPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`tel:${settings.systemPhone}`}
                    className="hover:text-primary"
                  >
                    {settings.systemPhone}
                  </a>
                </div>
              )}
              {settings?.systemEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`mailto:${settings.systemEmail}`}
                    className="hover:text-primary"
                  >
                    {settings.systemEmail}
                  </a>
                </div>
              )}
              {settings?.systemWebsite && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={settings.systemWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    Website
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Working Hours
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {settings?.workingDays && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-foreground">
                      {settings.workingDays.split(",").join(", ")}
                    </div>
                    {settings.workingHoursStart && settings.workingHoursEnd && (
                      <div className="mt-1">
                        {settings.workingHoursStart} -{" "}
                        {settings.workingHoursEnd}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs">
                  <strong>Emergency Services:</strong> Available 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/find-doctors" className="hover:text-primary">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link href="/appointments" className="hover:text-primary">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary">
                  Patient Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Connect With Us
            </h3>
            <div className="flex gap-3">
              {settings?.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings?.twitterUrl && (
                <a
                  href={settings.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {settings?.linkedinUrl && (
                <a
                  href={settings.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {settings?.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Your health, our priority. Quality care for everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              © {currentYear} {settings?.systemName || "MediVault Healthcare"}.
              All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="hover:text-primary">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
