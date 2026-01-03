import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowRight, Heart, Moon, Shield, Sun } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/theme-provider";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  nic: string;
  dateOfBirth: string;
  gender: string;
  contactInfo: string;
  address: string;
  bloodType: string;
  allergies: string;
};

export default function PatientRegisterPage() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    nic: "",
    dateOfBirth: "",
    gender: "",
    contactInfo: "",
    address: "",
    bloodType: "",
    allergies: "",
  });

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        form.firstName.trim().length > 0 &&
        form.lastName.trim().length > 0 &&
        /\S+@\S+\.\S+/.test(form.email.trim())
      );
    }
    if (step === 2) {
      return form.nic.trim().length > 0;
    }
    return form.bloodType.trim().length > 0;
  }, [form, step]);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5,
      })),
    []
  );

  const submit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/patient-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          nic: form.nic.trim(),
          dateOfBirth: form.dateOfBirth
            ? new Date(form.dateOfBirth).toISOString()
            : undefined,
          gender: form.gender || undefined,
          contactInfo: form.contactInfo.trim() || undefined,
          address: form.address.trim() || undefined,
          bloodType: form.bloodType || undefined,
          allergies: form.allergies.trim() || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        setError(data.message || "Unable to submit registration.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-20 dark:opacity-10"
        >
          <source
            src="https://cdn.pixabay.com/video/2020/03/30/34645-405263287_large.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-950" />
      </div>

      <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-br from-[#14B8A6] to-[#0EA5C9] rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-[#1494B5] to-[#0d7c94] rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-[#1494B5] dark:bg-cyan-400 rounded-full opacity-30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] text-[#1494B5]/20 dark:text-cyan-400/20 hidden lg:block"
      >
        <Heart className="w-20 h-20" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 25, 0], rotate: [0, -8, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-32 right-[15%] text-[#14B8A6]/20 dark:text-teal-400/20 hidden lg:block"
      >
        <Shield className="w-24 h-24" />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200 dark:border-gray-700"
        type="button"
      >
        <AnimatePresence mode="wait">
          {theme === "dark" ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="w-5 h-5 text-amber-500" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="w-5 h-5 text-slate-700" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="min-h-screen flex items-center justify-center px-4 relative z-10 py-12">
        <div className="w-full max-w-6xl flex items-center justify-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex flex-col space-y-8 flex-1"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] rounded-2xl blur-xl opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] p-4 rounded-2xl">
                    <Activity
                      className="w-10 h-10 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <h1 className="text-5xl font-bold text-gray-800 dark:text-white">
                  Patient Portal
                </h1>
              </div>

              <p className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5C9] to-[#1494B5]">
                Register and wait for approval
              </p>

              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed text-justify">
                Patients only. Submit your details, then wait until an
                administrator assigns RFID and approves your account. Youll
                receive an email with your username and a temporary password.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Step
                  </div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {step}/3
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Status
                  </div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    Pending
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Security
                  </div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    RFID
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 w-full max-w-xl"
          >
            <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <CardHeader className="space-y-3 pb-6">
                <CardTitle className="text-3xl font-bold text-gray-800 dark:text-white">
                  Patient Registration
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Step {step} of 3. Submit and wait for admin approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success ? (
                  <div className="space-y-4">
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                      <AlertDescription className="text-green-900 dark:text-green-100">
                        Registration submitted successfully. Please wait for
                        admin approval. You will receive an email with your
                        username and password after approval.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-3">
                      <Button onClick={() => setLocation("/")} type="button">
                        Back to Home
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/login")}
                        type="button"
                      >
                        Go to Login
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {step === 1 && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={form.firstName}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                firstName: e.target.value,
                              }))
                            }
                            placeholder="Enter your first name"
                            className="h-12"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={form.lastName}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                lastName: e.target.value,
                              }))
                            }
                            placeholder="Enter your last name"
                            className="h-12"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, email: e.target.value }))
                            }
                            placeholder="Enter your email"
                            className="h-12"
                          />
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nic">NIC</Label>
                          <Input
                            id="nic"
                            value={form.nic}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, nic: e.target.value }))
                            }
                            placeholder="National Identity Card number"
                            className="h-12"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                dateOfBirth: e.target.value,
                              }))
                            }
                            className="h-12"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Gender</Label>
                          <Select
                            value={form.gender}
                            onValueChange={(v) =>
                              setForm((p) => ({ ...p, gender: v }))
                            }
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="contactInfo">Contact Number</Label>
                          <Input
                            id="contactInfo"
                            value={form.contactInfo}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                contactInfo: e.target.value,
                              }))
                            }
                            placeholder="Phone number"
                            className="h-12"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Blood Type</Label>
                          <Select
                            value={form.bloodType}
                            onValueChange={(v) =>
                              setForm((p) => ({ ...p, bloodType: v }))
                            }
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select blood type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            value={form.address}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                address: e.target.value,
                              }))
                            }
                            placeholder="Enter your address"
                            className="min-h-[110px]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="allergies">Allergies</Label>
                          <Textarea
                            id="allergies"
                            value={form.allergies}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                allergies: e.target.value,
                              }))
                            }
                            placeholder="List any allergies (or type 'None')"
                            className="min-h-[110px]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/")}
                        type="button"
                        disabled={submitting}
                      >
                        Cancel
                      </Button>

                      <div className="flex gap-2">
                        {step > 1 && (
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => setStep((s) => (s === 2 ? 1 : 2))}
                            disabled={submitting}
                          >
                            Back
                          </Button>
                        )}

                        {step < 3 ? (
                          <Button
                            type="button"
                            onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                            disabled={!canGoNext || submitting}
                            className="gap-2"
                          >
                            Next <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={submit}
                            disabled={submitting}
                          >
                            {submitting ? "Submitting..." : "Submit"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="font-medium text-[#1494B5] hover:underline"
                type="button"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
