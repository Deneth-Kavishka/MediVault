import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  Shield,
  Users,
  Pill,
  FlaskConical,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import hospitalLobby from "@assets/generated_images/Hospital_lobby_hero_background_5209d5e1.png";
import medicalTeam from "@assets/generated_images/Medical_team_hero_image_7221c5c5.png";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  const features = [
    {
      icon: Calendar,
      title: "Smart Appointments",
      description:
        "Book and manage appointments with doctors across specialties",
    },
    {
      icon: Shield,
      title: "Secure Records",
      description:
        "Encrypted medical records accessible only to authorized personnel",
    },
    {
      icon: Pill,
      title: "Digital Prescriptions",
      description: "QR-coded prescriptions for secure pharmacy verification",
    },
    {
      icon: FlaskConical,
      title: "Lab Integration",
      description:
        "Seamless lab test ordering and instant result notifications",
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description:
        "Direct communication between patients and healthcare providers",
    },
    {
      icon: Receipt,
      title: "Billing Management",
      description: "Transparent billing with multiple payment options",
    },
  ];

  const roles = [
    { name: "Patients", count: "10,000+", icon: Users, color: "text-chart-1" },
    { name: "Doctors", count: "500+", icon: Activity, color: "text-chart-2" },
    { name: "Pharmacies", count: "50+", icon: Pill, color: "text-chart-3" },
    {
      name: "Lab Centers",
      count: "30+",
      icon: FlaskConical,
      color: "text-chart-4",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MediVault</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="default"
              onClick={() => (window.location.href = "/login")}
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={hospitalLobby}
            alt="Modern hospital interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/70" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Your Health,
                <br />
                <span className="text-primary">Digitally Connected</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                MediVault brings together patients, doctors, pharmacists, and
                lab technicians in one comprehensive healthcare management
                platform. Secure, efficient, and patient-centered.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => (window.location.href = "/login")}
                  data-testid="button-get-started"
                  className="text-base px-8"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8"
                  data-testid="button-learn-more"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <img
                src={medicalTeam}
                alt="Medical team"
                className="rounded-lg shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {roles.map((role, index) => (
              <motion.div
                key={role.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <role.icon className={`w-6 h-6 ${role.color}`} />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {role.count}
                </div>
                <div className="text-sm text-muted-foreground">{role.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need for Modern Healthcare
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform designed to streamline healthcare workflows
              and improve patient outcomes
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover-elevate transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Healthcare Management?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join thousands of healthcare professionals and patients using
              MediVault
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => (window.location.href = "/login")}
              data-testid="button-cta-start"
              className="text-base px-8"
            >
              Start Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">MediVault</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MediVault. Comprehensive Healthcare
            Management System.
          </p>
        </div>
      </footer>
    </div>
  );
}
