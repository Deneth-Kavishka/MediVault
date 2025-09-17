"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/ui/medical/Navigation";
import { DashboardStats } from "@/components/ui/medical/DashboardStats";
import { PatientCard } from "@/components/ui/medical/PatientCard";
import { AppointmentCard } from "@/components/ui/medical/AppointmentCard";
import { MedicalLoading } from "@/components/ui/medical/LoadingSpinner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn, fadeInUp, staggerContainer } from "@/lib/utils";
import {
  Calendar,
  Users,
  Activity,
  TrendingUp,
  Bell,
  Plus,
} from "lucide-react";

// Mock data for demonstration
const mockStats = {
  totalPatients: 2847,
  patientsChange: 12.5,
  todayAppointments: 47,
  appointmentsChange: 8.3,
  activePatients: 156,
  activePatientsChange: -2.1,
  revenue: 124500,
  revenueChange: 15.7,
  criticalAlerts: 3,
  alertsChange: -33.3,
  averageWaitTime: 23,
  waitTimeChange: -12.8,
};

const mockPatients = [
  {
    id: "1",
    name: "Sarah Johnson",
    age: 34,
    gender: "Female",
    bloodType: "A+",
    lastVisit: new Date("2024-01-15"),
    nextAppointment: new Date("2024-01-25T14:30"),
    condition: "Hypertension monitoring, stable condition with medication",
    status: "stable" as const,
    vitals: {
      temperature: 36.8,
      heartRate: 78,
      bloodPressure: { systolic: 130, diastolic: 85 },
      bloodSugar: 95,
    },
  },
  {
    id: "2",
    name: "Michael Chen",
    age: 67,
    gender: "Male",
    bloodType: "O-",
    lastVisit: new Date("2024-01-20"),
    condition: "Post-operative recovery, requires daily monitoring",
    status: "critical" as const,
    vitals: {
      temperature: 37.9,
      heartRate: 105,
      bloodPressure: { systolic: 165, diastolic: 95 },
      bloodSugar: 180,
    },
  },
  {
    id: "3",
    name: "Emma Williams",
    age: 28,
    gender: "Female",
    bloodType: "B+",
    lastVisit: new Date("2024-01-18"),
    nextAppointment: new Date("2024-01-30T10:00"),
    condition: "Routine checkup, excellent health status",
    status: "normal" as const,
    vitals: {
      temperature: 36.5,
      heartRate: 72,
      bloodPressure: { systolic: 115, diastolic: 75 },
      bloodSugar: 88,
    },
  },
];

const mockAppointments = [
  {
    id: "1",
    patientName: "David Rodriguez",
    patientAge: 45,
    doctorName: "Dr. Emily Carter",
    specialty: "Cardiology",
    date: new Date("2024-01-25"),
    time: "09:30 AM",
    duration: 45,
    type: "in-person" as const,
    status: "confirmed" as const,
    location: "Cardiology Wing - Room 203",
    notes: "Follow-up for chest pain evaluation",
    urgency: "medium" as const,
  },
  {
    id: "2",
    patientName: "Lisa Thompson",
    patientAge: 32,
    doctorName: "Dr. James Wilson",
    specialty: "Dermatology",
    date: new Date("2024-01-25"),
    time: "11:00 AM",
    duration: 30,
    type: "video" as const,
    status: "scheduled" as const,
    notes: "Skin condition consultation",
    urgency: "low" as const,
  },
  {
    id: "3",
    patientName: "Robert Kim",
    patientAge: 58,
    doctorName: "Dr. Sarah Davis",
    specialty: "Emergency",
    date: new Date("2024-01-25"),
    time: "02:15 PM",
    duration: 60,
    type: "in-person" as const,
    status: "in-progress" as const,
    location: "Emergency Room - Bay 1",
    notes: "Acute abdominal pain - urgent assessment required",
    urgency: "high" as const,
  },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulate loading and real-time updates
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(clockTimer);
    };
  }, []);

  const handleAppointmentAction = (action: string, appointmentId: string) => {
    console.log(`Action: ${action} for appointment: ${appointmentId}`);
    // Implement appointment actions
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex items-center justify-center min-h-screen">
          <MedicalLoading message="Loading MediVault Dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navigation */}
        <Navigation currentPath="/" notifications={5} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-8"
          >
            {/* Welcome Header */}
            <motion.div variants={fadeInUp} className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back, Dr. Smith
                  </h1>
                  <p className="text-xl text-gray-600">
                    {currentTime.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    •{" "}
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeInUp} className="flex justify-center">
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Patient</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Schedule Appointment</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Bell className="w-5 h-5" />
                  <span>View Alerts</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Dashboard Stats */}
            <DashboardStats stats={mockStats} />

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Patients */}
              <motion.div variants={fadeInUp} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                    <Users className="w-7 h-7 text-blue-600" />
                    <span>Recent Patients</span>
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                  >
                    View All →
                  </motion.button>
                </div>

                <div className="space-y-4">
                  {mockPatients.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      variants={fadeInUp}
                      transition={{ delay: index * 0.1 }}
                    >
                      <PatientCard patient={patient} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Today's Appointments */}
              <motion.div variants={fadeInUp} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                    <Calendar className="w-7 h-7 text-green-600" />
                    <span>Today's Appointments</span>
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-green-600 hover:text-green-700 font-semibold text-sm"
                  >
                    View Schedule →
                  </motion.button>
                </div>

                <div className="space-y-4">
                  {mockAppointments.map((appointment, index) => (
                    <motion.div
                      key={appointment.id}
                      variants={fadeInUp}
                      transition={{ delay: index * 0.1 }}
                    >
                      <AppointmentCard
                        appointment={appointment}
                        onAction={handleAppointmentAction}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div variants={fadeInUp} className="text-center py-8">
              <div className="backdrop-blur-lg bg-white/60 border border-white/20 rounded-xl p-6 shadow-lg">
                <p className="text-gray-600 mb-2">
                  MediVault Healthcare Management System
                </p>
                <p className="text-sm text-gray-500">
                  Empowering healthcare professionals with intelligent patient
                  management
                </p>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
