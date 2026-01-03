import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Calendar,
  Shield,
  Users,
  Pill,
  FlaskConical,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import hospitalLobby from "@assets/generated_images/Hospital_lobby_hero_background_5209d5e1.png";
import medicalTeam from "@assets/generated_images/Medical_team_hero_image_7221c5c5.png";
import labTechnician from "@assets/generated_images/Lab_technician_at_work_06e385ca.png";
import consultationRoom from "@assets/generated_images/Consultation_room_background_28f77b34.png";
import digitalHealth from "@assets/generated_images/Digital_health_technology_52a22060.png";
import { ThemeToggle } from "@/components/theme-toggle";
import Footer from "@/components/footer";

interface SystemSettings {
  systemName: string;
  systemEmail: string;
  systemPhone: string;
  systemAddress: string;
  systemDescription?: string;
}

export default function Landing() {
  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  // Carousel images
  const carouselImages = [
    { src: medicalTeam, alt: "Medical team collaboration" },
    { src: labTechnician, alt: "Lab technician at work" },
    { src: consultationRoom, alt: "Doctor consultation room" },
    { src: digitalHealth, alt: "Digital health technology" },
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Water ripple effect state
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number; isClick: boolean }>
  >([]);
  const rippleIdRef = useRef(0);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize click audio
  useEffect(() => {
    const clickAudio = new Audio();
    clickAudio.src =
      "https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3";
    clickAudio.volume = 0.2;
    clickAudioRef.current = clickAudio;
  }, []);

  // Play click sound
  const playWaterDropSound = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  };

  const heroLine1Full = "Your Health,";
  const heroLine2Full = "Digitally Connected";
  const heroDescFull =
    "MediVault brings together patients, doctors, pharmacists, and lab technicians in one comprehensive healthcare management platform. Secure, efficient, and patient-centered.";

  const [heroLine1, setHeroLine1] = useState("");
  const [heroLine2, setHeroLine2] = useState("");
  const [heroDesc, setHeroDesc] = useState("");

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
      await typeText(heroLine1Full, setHeroLine1, 35);
      await wait(180);
      await typeText(heroLine2Full, setHeroLine2, 28);
      await wait(220);
      await typeText(heroDescFull, setHeroDesc, 10);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const gradientBg =
    "bg-gradient-to-r from-[hsl(var(--chart-1))] via-[hsl(var(--chart-2))] to-[hsl(var(--chart-3))]";
  const hoverScale =
    "transform-gpu transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]";
  const gradientButton = `${gradientBg} text-primary-foreground border-0 hover:opacity-90 transition-opacity ${hoverScale}`;
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
      title: "Lab Facilities",
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
      icon: FileText,
      title: "Medical Reports",
      description: "Comprehensive health reports and medical documentation",
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

  const parseCount = (value: string) => {
    const match = value.match(/([\d,]+)(\+)?/);
    const num = match ? Number(match[1].replace(/,/g, "")) : 0;
    const suffix = match?.[2] ?? "";
    return { num, suffix };
  };

  const statsRef = useRef<HTMLElement | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [animatedCounts, setAnimatedCounts] = useState<number[]>([0, 0, 0, 0]);

  const [navHidden, setNavHidden] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollYRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Auto-rotate carousel images
  useEffect(() => {
    if (reduceMotion) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [reduceMotion, carouselImages.length]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const update = () => setReduceMotion(mq.matches);
    update();

    // Safari < 14
    // eslint-disable-next-line deprecation/deprecation
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;

    const targets = roles.map((r) => parseCount(r.count).num);
    const durationMs = 1200;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedCounts(targets.map((v) => Math.round(v * eased)));
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [statsVisible]);

  // Water ripple effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const id = rippleIdRef.current++;
      const newRipple = { id, x: e.clientX, y: e.clientY, isClick: false };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    };

    const handleClick = (e: MouseEvent) => {
      const id = rippleIdRef.current++;
      const newRipple = { id, x: e.clientX, y: e.clientY, isClick: true };

      setRipples((prev) => [...prev, newRipple]);
      playWaterDropSound();

      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;

        const currentY = window.scrollY || 0;
        const lastY = lastScrollYRef.current;
        const delta = currentY - lastY;

        setScrollY(currentY);

        // Always show near top
        if (currentY < 12) {
          setNavHidden(false);
        } else if (delta > 10 && currentY > 120) {
          // scrolling down
          setNavHidden(true);
        } else if (delta < -10) {
          // scrolling up
          setNavHidden(false);
        }

        lastScrollYRef.current = currentY;
      });
    };

    // initialize
    lastScrollYRef.current = window.scrollY || 0;
    setScrollY(window.scrollY || 0);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  // Fade and scale effect for scrolling content
  const contentOpacity = reduceMotion
    ? 1
    : Math.min(1, Math.max(0, scrollY / 400));
  const contentScale = reduceMotion ? 1 : 0.98 + contentOpacity * 0.02;

  // Hero image parallax effect
  const heroImageY = reduceMotion ? 0 : Math.min(20, scrollY * 0.03);

  return (
    <div className="relative cursor-none">
      {/* Water Ripple Effects */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {ripples.map((ripple) => (
          <div key={ripple.id}>
            {ripple.isClick ? (
              // Click water drop - reduced size, more subtle
              <>
                {/* Central water drop impact */}
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="absolute rounded-full"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 40,
                    height: 40,
                    marginLeft: -20,
                    marginTop: -20,
                    background:
                      "radial-gradient(circle, rgba(96, 165, 250, 0.7) 0%, rgba(59, 130, 246, 0.4) 30%, rgba(37, 99, 235, 0.15) 60%, transparent 100%)",
                    boxShadow:
                      "0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.3)",
                  }}
                />

                {/* Falling droplet before impact */}
                <motion.div
                  initial={{ scale: 1, y: -20, opacity: 0.9 }}
                  animate={{ scale: 0.3, y: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeIn" }}
                  className="absolute rounded-full"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 10,
                    height: 14,
                    marginLeft: -5,
                    marginTop: -7,
                    background:
                      "linear-gradient(180deg, rgba(147, 197, 253, 0.9) 0%, rgba(59, 130, 246, 0.95) 100%)",
                    borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                    boxShadow: "inset 0 -2px 4px rgba(255, 255, 255, 0.5)",
                  }}
                />

                {/* Main ripple wave 1 */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute rounded-full border-3"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 40,
                    height: 40,
                    marginLeft: -20,
                    marginTop: -20,
                    borderColor: "rgba(96, 165, 250, 0.6)",
                    borderWidth: 3,
                    borderStyle: "solid",
                  }}
                />

                {/* Main ripple wave 2 */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.6 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
                  className="absolute rounded-full border-2"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 40,
                    height: 40,
                    marginLeft: -20,
                    marginTop: -20,
                    borderColor: "rgba(147, 197, 253, 0.5)",
                    borderWidth: 2,
                    borderStyle: "solid",
                  }}
                />

                {/* Main ripple wave 3 */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.4 }}
                  animate={{ scale: 5, opacity: 0 }}
                  transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
                  className="absolute rounded-full border"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 40,
                    height: 40,
                    marginLeft: -20,
                    marginTop: -20,
                    borderColor: "rgba(191, 219, 254, 0.4)",
                    borderWidth: 1.5,
                    borderStyle: "solid",
                  }}
                />

                {/* Splash droplets - reduced count and size */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i * Math.PI * 2) / 8;
                  const distance = 25 + Math.random() * 10;
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, opacity: 0.7, x: 0, y: 0 }}
                      animate={{
                        scale: [1, 1.1, 0],
                        opacity: [0.7, 0.5, 0],
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance - 8,
                      }}
                      transition={{
                        duration: 0.6 + Math.random() * 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="absolute rounded-full"
                      style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 4 + Math.random() * 3,
                        height: 6 + Math.random() * 4,
                        marginLeft: -2,
                        marginTop: -3,
                        background:
                          "linear-gradient(180deg, rgba(147, 197, 253, 0.85) 0%, rgba(59, 130, 246, 0.65) 100%)",
                        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                        boxShadow: "inset 0 -1px 2px rgba(255, 255, 255, 0.4)",
                      }}
                    />
                  );
                })}

                {/* Secondary smaller splashes */}
                {[...Array(6)].map((_, i) => {
                  const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
                  const distance = 12 + Math.random() * 8;
                  return (
                    <motion.div
                      key={`small-${i}`}
                      initial={{ scale: 0.8, opacity: 0.5, x: 0, y: 0 }}
                      animate={{
                        scale: 0,
                        opacity: 0,
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance - 4,
                      }}
                      transition={{
                        duration: 0.5,
                        ease: "easeOut",
                        delay: 0.08,
                      }}
                      className="absolute rounded-full bg-blue-300"
                      style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 2.5,
                        height: 3.5,
                        marginLeft: -1.25,
                        marginTop: -1.75,
                        borderRadius: "50%",
                      }}
                    />
                  );
                })}
              </>
            ) : (
              // Mouse move ripple - subtle trail
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute rounded-full border"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 30,
                    height: 30,
                    marginLeft: -15,
                    marginTop: -15,
                    borderColor: "rgba(59, 130, 246, 0.3)",
                    borderWidth: 1.5,
                  }}
                />
                {/* Small cursor dot */}
                <motion.div
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute rounded-full"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: 8,
                    height: 8,
                    marginLeft: -4,
                    marginTop: -4,
                    background: "rgba(96, 165, 250, 0.5)",
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border transform-gpu transition-transform duration-300 ease-out ${
          navHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-bold text-foreground">MediVault</div>
              <div className="text-xs text-muted-foreground">
                All Your Care, One Secure Place
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="default"
              onClick={() => (window.location.href = "/login")}
              data-testid="button-login"
              className={gradientButton}
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Hero Section */}
      <section className="fixed inset-0 h-screen overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={hospitalLobby}
            alt="Modern hospital interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/55 to-background/35 dark:from-background/95 dark:via-background/85 dark:to-background/70" />
        </div>

        <div className="container relative z-10 mx-auto px-4 h-full flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                {heroLine1 || "\u00A0"}
                <br />
                <span className="text-primary">{heroLine2 || "\u00A0"}</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl text-justify">
                {heroDesc || "\u00A0"}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => (window.location.href = "/register")}
                  data-testid="button-get-started"
                  className={`text-base px-8 ${gradientButton}`}
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={`text-base px-8 transition-colors hover:bg-primary/5 hover:border-primary/40 ${hoverScale}`}
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
              className="hidden lg:block relative"
            >
              <div
                className="relative will-change-transform"
                style={{
                  transform: `translateY(${heroImageY}px)`,
                }}
              >
                {/* Animated glow effect */}
                <motion.div
                  className="absolute -inset-4 bg-gradient-to-r from-chart-1/30 via-chart-2/30 to-chart-3/30 rounded-lg blur-2xl"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Floating animation wrapper */}
                <motion.div
                  animate={
                    reduceMotion
                      ? {}
                      : {
                          y: [0, -10, 0],
                        }
                  }
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative"
                >
                  {/* Carousel container with stacked images */}
                  <div className="relative rounded-lg overflow-hidden shadow-2xl">
                    {carouselImages.map((image, index) => (
                      <motion.img
                        key={index}
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-auto rounded-lg"
                        initial={false}
                        animate={{
                          opacity: currentImageIndex === index ? 1 : 0,
                          scale: currentImageIndex === index ? 1 : 0.95,
                          zIndex: currentImageIndex === index ? 10 : 0,
                        }}
                        transition={{
                          duration: 1,
                          ease: "easeInOut",
                        }}
                        style={{
                          position: index === 0 ? "relative" : "absolute",
                          top: index === 0 ? "auto" : 0,
                          left: index === 0 ? "auto" : 0,
                          width: "100%",
                        }}
                      />
                    ))}
                  </div>

                  {/* Carousel indicators */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {carouselImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentImageIndex === index
                            ? "bg-primary w-8"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scrolling Content Overlay */}
      <div
        className="relative z-20 will-change-transform"
        style={{
          marginTop: "100vh",
          transform: `scale(${contentScale})`,
          opacity: contentOpacity,
          transformOrigin: "top center",
        }}
      >
        {/* Stats Section */}
        <section
          ref={statsRef}
          className="py-12 bg-card border-y border-border backdrop-blur-sm"
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {roles.map((role, index) => (
                <motion.div
                  key={role.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`group text-center rounded-xl p-4 hover-elevate transition-all duration-200 ${hoverScale}`}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3 transition-colors group-hover:bg-primary/15">
                    <role.icon
                      className={`w-6 h-6 ${role.color} transition-transform duration-200 group-hover:scale-110`}
                    />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {(() => {
                      const { suffix } = parseCount(role.count);
                      const value = statsVisible
                        ? animatedCounts[index] ?? 0
                        : parseCount(role.count).num;
                      return `${new Intl.NumberFormat().format(
                        value
                      )}${suffix}`;
                    })()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {role.name}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
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
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -50, scale: 0.9 }}
                  viewport={{ once: false, amount: 0.3 }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <Card
                    className={`h-full hover-elevate transition-all duration-200 ${hoverScale}`}
                  >
                    <CardContent className="p-6">
                      <motion.div
                        className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4"
                        initial={{ rotate: 0 }}
                        whileInView={{ rotate: 360 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                      >
                        <feature.icon className="w-6 h-6 text-primary" />
                      </motion.div>
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
        <section className="relative py-20 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-black dark:via-indigo-950 dark:to-black">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 blur-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)] blur-2xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.1),transparent_50%)] blur-2xl"></div>
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/30 backdrop-blur-sm"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              viewport={{ once: false, amount: 0.4 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <motion.h2
                className="text-4xl font-bold mb-4 text-white"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Ready to Transform Healthcare Management?
              </motion.h2>
              <motion.p
                className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Join thousands of healthcare professionals and patients using{" "}
                {settings?.systemName || "MediVault"}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                viewport={{ once: false }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => (window.location.href = "/register")}
                  data-testid="button-cta-start"
                  className="text-base px-8 bg-white dark:bg-slate-100 text-slate-900 hover:bg-slate-50 border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Start Now
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 bg-muted/50 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-3xl font-bold text-center mb-12">
                Contact Us
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Card
                  className={`hover-elevate transition-all duration-200 ${hoverScale}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Phone</h3>
                    <p className="text-sm text-muted-foreground">
                      {settings?.systemPhone || "+94 76 914 6080"}
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`hover-elevate transition-all duration-200 ${hoverScale}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <p className="text-sm text-muted-foreground">
                      {settings?.systemEmail || "admin@medivault.com"}
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`hover-elevate transition-all duration-200 ${hoverScale}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Address</h3>
                    <p className="text-sm text-muted-foreground">
                      {settings?.systemAddress || "medivault.lk"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {settings?.systemDescription && (
                <div className="mt-12 text-center">
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {settings.systemDescription}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
