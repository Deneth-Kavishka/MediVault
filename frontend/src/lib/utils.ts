import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Medical color palette utilities
export const medicalColors = {
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    900: "#1e3a8a",
  },
  medical: {
    red: "#ef4444",
    green: "#10b981",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    orange: "#f97316",
  },
  status: {
    critical: "#dc2626",
    warning: "#f59e0b",
    normal: "#10b981",
    stable: "#3b82f6",
  },
};

// Animation variants for framer-motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Format utilities for medical data
export const formatters = {
  temperature: (temp: number) => `${temp}°C`,
  bloodPressure: (systolic: number, diastolic: number) =>
    `${systolic}/${diastolic} mmHg`,
  heartRate: (rate: number) => `${rate} bpm`,
  weight: (weight: number) => `${weight} kg`,
  height: (height: number) => `${height} cm`,
  bloodSugar: (sugar: number) => `${sugar} mg/dL`,
  date: (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date),
  time: (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  currency: (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount),
};

// Medical status utilities
export const getVitalStatus = (type: string, value: number) => {
  const ranges = {
    temperature: {
      normal: [36.1, 37.2],
      warning: [37.3, 38.0],
      critical: [38.1, 42],
    },
    heartRate: { normal: [60, 100], warning: [100, 120], critical: [120, 200] },
    bloodPressureSystolic: {
      normal: [90, 140],
      warning: [140, 160],
      critical: [160, 250],
    },
    bloodSugar: {
      normal: [70, 140],
      warning: [140, 180],
      critical: [180, 400],
    },
  };

  const range = ranges[type as keyof typeof ranges];
  if (!range) return "normal";

  if (value >= range.normal[0] && value <= range.normal[1]) return "normal";
  if (value >= range.warning[0] && value <= range.warning[1]) return "warning";
  return "critical";
};

// Generate medical icons based on specialty
export const getMedicalIcon = (specialty: string) => {
  const icons = {
    cardiology: "❤️",
    neurology: "🧠",
    orthopedics: "🦴",
    pediatrics: "👶",
    dermatology: "🔬",
    psychiatry: "🧘",
    emergency: "🚨",
    surgery: "⚕️",
    general: "👨‍⚕️",
  };
  return icons[specialty.toLowerCase() as keyof typeof icons] || "👨‍⚕️";
};
