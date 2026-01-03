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
  MessageCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Accessibility from "@/pages/accessibility";

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
  whatsappUrl?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string;
}

export default function Footer() {
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    className="hover:text-primary transition-colors"
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
                    className="hover:text-primary transition-colors"
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
                    className="hover:text-primary transition-colors"
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
                <p className="text-xs font-medium">
                  <strong>Emergency Services:</strong> Available 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Connect With Us
            </h3>
            <p className="text-sm text-muted-foreground">
              Your health, our priority. Quality care for everyone.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={settings?.facebookUrl || "https://facebook.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Facebook"
                title="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={settings?.twitterUrl || "https://twitter.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted hover:bg-sky-500 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Twitter"
                title="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href={settings?.linkedinUrl || "https://linkedin.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted hover:bg-blue-700 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href={settings?.instagramUrl || "https://instagram.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={settings?.whatsappUrl || "https://wa.me/1234567890"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted hover:bg-green-600 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="WhatsApp"
                title="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>
              © {currentYear} {settings?.systemName || "MediVault Healthcare"}.
              All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <button
                onClick={() => setPrivacyOpen(true)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setTermsOpen(true)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <button
                onClick={() => setAccessibilityOpen(true)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Accessibility
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <Privacy />
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <Terms />
        </DialogContent>
      </Dialog>

      {/* Accessibility Dialog */}
      <Dialog open={accessibilityOpen} onOpenChange={setAccessibilityOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <Accessibility />
        </DialogContent>
      </Dialog>
    </footer>
  );
}
