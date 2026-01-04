import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Heart,
  Shield,
  Users,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { theme, setTheme } = useTheme();
  const [particleCount] = useState(20);

  // Typing effect states
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [animatedStats, setAnimatedStats] = useState([0, 0, 0]);

  const brandNameFull = "MediVault";
  const taglineFull = "All Your Care, One Secure Place";
  const descriptionFull =
    "Advanced healthcare management platform connecting patients, doctors, and medical professionals for seamless care.";

  // Typing animation effect
  useEffect(() => {
    let cancelled = false;

    const typeText = (
      full: string,
      setValue: (v: string) => void,
      msPerChar: number
    ) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const tick = () => {
          if (cancelled) return;
          i += 1;
          setValue(full.slice(0, i));
          if (i >= full.length) return resolve();
          window.setTimeout(tick, msPerChar);
        };
        setValue("");
        window.setTimeout(tick, msPerChar);
      });

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (cancelled) return;
        window.setTimeout(() => resolve(), ms);
      });

    (async () => {
      await wait(300);
      await typeText(brandNameFull, setBrandName, 50);
      await wait(150);
      await typeText(taglineFull, setTagline, 30);
      await wait(150);
      await typeText(descriptionFull, setDescription, 15);
      await wait(250);
      setShowStats(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Counting animation for stats
  useEffect(() => {
    if (!showStats) return;

    const targets = [10000, 500, 99.9];
    const durationMs = 2000;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedStats(targets.map((v) => Math.round(v * eased * 10) / 10));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [showStats]);

  // Create particle animations
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Attempting login to /api/login");
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important for session cookies
        body: JSON.stringify({ username, password }),
      });

      console.log("Login response status:", response.status);

      if (!response.ok) {
        const data = await response.json();
        console.log("Login failed:", data);
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Login successful:", data);

      // Invalidate auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Small delay to ensure query refetch completes
      setTimeout(() => {
        if (data?.user?.mustChangePassword) {
          setLocation("/change-password");
        } else {
          setLocation("/dashboard");
        }
      }, 100);
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
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

      {/* Animated Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-br from-[#14B8A6] to-[#0EA5C9] rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-[#1494B5] to-[#0d7c94] rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Floating Particles */}
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

      {/* Floating Medical Icons */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] text-[#1494B5]/20 dark:text-cyan-400/20 hidden lg:block"
      >
        <Heart className="w-20 h-20" />
      </motion.div>
      <motion.div
        animate={{
          y: [0, 25, 0],
          rotate: [0, -8, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-32 right-[15%] text-[#14B8A6]/20 dark:text-teal-400/20 hidden lg:block"
      >
        <Shield className="w-24 h-24" />
      </motion.div>
      <motion.div
        animate={{
          y: [0, -15, 0],
          x: [0, 15, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 right-[8%] text-[#0EA5C9]/20 dark:text-blue-400/20 hidden lg:block"
      >
        <Activity className="w-16 h-16" />
      </motion.div>

      {/* Theme Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200 dark:border-gray-700"
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

      {/* Login Form Container */}
      <div className="min-h-screen flex items-center justify-center px-4 relative z-10 py-12">
        <div className="w-full max-w-6xl flex items-center justify-center gap-12">
          {/* Left Side - Brand Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex flex-col space-y-8 flex-1"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] rounded-2xl blur-xl opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] p-4 rounded-2xl">
                    <Activity
                      className="w-10 h-10 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                </div>
                <h1 className="text-5xl font-bold text-gray-800 dark:text-white min-h-[60px]">
                  {brandName}
                  {brandName.length < brandNameFull.length && (
                    <span className="animate-pulse">|</span>
                  )}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: tagline ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5C9] to-[#1494B5] min-h-[36px] text-justify"
              >
                {tagline}
                {tagline.length > 0 && tagline.length < taglineFull.length && (
                  <span className="text-[#0EA5C9]">|</span>
                )}
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: description ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="text-lg text-gray-600 dark:text-gray-400 max-w-md min-h-[84px] text-justify leading-snug tracking-tight"
              >
                {description}
                {description.length > 0 &&
                  description.length < descriptionFull.length && (
                    <span className="text-gray-400">|</span>
                  )}
              </motion.p>
            </div>

            {/* Feature Pills with animation */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-wrap gap-3"
                >
                  {[
                    {
                      icon: Shield,
                      text: "Secure & Private",
                      color: "from-blue-500 to-cyan-500",
                    },
                    {
                      icon: Heart,
                      text: "Patient-Centered",
                      color: "from-pink-500 to-rose-500",
                    },
                    {
                      icon: Sparkles,
                      text: "AI-Powered",
                      color: "from-purple-500 to-indigo-500",
                    },
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.15, duration: 0.4 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div
                        className={`p-1.5 rounded-full bg-gradient-to-br ${feature.color}`}
                      >
                        <feature.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {feature.text}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats with counting animation */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="grid grid-cols-3 gap-6 pt-8"
                >
                  {[
                    { value: 10000, label: "Patients", suffix: "+" },
                    { value: 500, label: "Doctors", suffix: "+" },
                    { value: 99.9, label: "Uptime", suffix: "%" },
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                      className="text-center"
                    >
                      <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#0EA5C9] to-[#1494B5]">
                        {idx === 0
                          ? `${(animatedStats[idx] / 1000).toFixed(
                              animatedStats[idx] >= 10000 ? 0 : 1
                            )}K${stat.suffix}`
                          : idx === 1
                          ? `${animatedStats[idx]}${stat.suffix}`
                          : `${animatedStats[idx].toFixed(1)}${stat.suffix}`}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Side - Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl shadow-2xl border-0 overflow-hidden">
              {/* Gradient Header Bar */}
              <div className="h-1.5 bg-gradient-to-r from-[#0EA5C9] via-[#1494B5] to-[#14B8A6]" />

              <CardHeader className="space-y-4 pt-8 pb-6 px-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.3,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="flex items-center justify-center lg:hidden"
                >
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] rounded-full blur-xl"
                    />
                    <div className="relative bg-gradient-to-br from-[#0EA5C9] to-[#1494B5] p-4 rounded-full shadow-lg">
                      <Activity
                        className="w-10 h-10 text-white"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                    Sign in to access your healthcare dashboard
                  </CardDescription>
                </motion.div>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-5 px-8">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert
                          variant="destructive"
                          className="border-red-200 dark:border-red-900"
                        >
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Username or Email
                    </Label>
                    <div className="relative group">
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username or email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        className="pl-11 h-12 border-gray-300 dark:border-gray-700 focus:border-[#1494B5] dark:focus:border-[#0EA5C9] focus:ring-[#1494B5] dark:focus:ring-[#0EA5C9] transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-[#1494B5] dark:group-focus-within:text-[#0EA5C9] transition-colors">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-2"
                  >
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Password
                    </Label>
                    <div className="relative group">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-11 pr-11 h-12 border-gray-300 dark:border-gray-700 focus:border-[#1494B5] dark:focus:border-[#0EA5C9] focus:ring-[#1494B5] dark:focus:ring-[#0EA5C9] transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-[#1494B5] dark:group-focus-within:text-[#0EA5C9] transition-colors">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-5 px-8 pb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="w-full"
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-[#0EA5C9] via-[#1494B5] to-[#14B8A6] hover:from-[#0d7c94] hover:via-[#0EA5C9] hover:to-[#1494B5] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group relative overflow-hidden"
                      disabled={loading}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="w-full space-y-3"
                  >
                    <div className="text-center text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                      <ForgotPasswordDialog />
                    </div>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                      Don't you have a patient account?{" "}
                      <button
                        type="button"
                        onClick={() => setLocation("/register")}
                        className="font-medium text-[#1494B5] hover:underline"
                      >
                        Register here
                      </button>
                    </div>
                  </motion.div>
                </CardFooter>
              </form>
            </Card>

            {/* Footer Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center mt-6 space-y-2"
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Secured with end-to-end encryption 🔒
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
