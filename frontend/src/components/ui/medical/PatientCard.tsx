"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, fadeInUp, getVitalStatus, formatters } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Activity,
  Heart,
  Thermometer,
  Droplets,
} from "lucide-react";

interface PatientCardProps {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    bloodType: string;
    lastVisit: Date;
    nextAppointment?: Date;
    condition: string;
    status: "stable" | "critical" | "warning" | "normal";
    vitals: {
      temperature: number;
      heartRate: number;
      bloodPressure: { systolic: number; diastolic: number };
      bloodSugar: number;
    };
    avatar?: string;
  };
  className?: string;
}

export function PatientCard({ patient, className }: PatientCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-500/20 text-red-700 border-red-500/30";
      case "warning":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
      case "stable":
        return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      default:
        return "bg-green-500/20 text-green-700 border-green-500/30";
    }
  };

  const getVitalColor = (type: string, value: number) => {
    const status = getVitalStatus(type, value);
    switch (status) {
      case "critical":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-green-600";
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(className)}
    >
      <Card className="backdrop-blur-lg bg-white/80 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {patient.avatar ? (
                    <img
                      src={patient.avatar}
                      alt={patient.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white",
                    patient.status === "critical"
                      ? "bg-red-500"
                      : patient.status === "warning"
                        ? "bg-yellow-500"
                        : patient.status === "stable"
                          ? "bg-blue-500"
                          : "bg-green-500"
                  )}
                />
              </div>

              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  {patient.name}
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <User className="w-4 h-4" />
                  <span>
                    {patient.age} years • {patient.gender} • {patient.bloodType}
                  </span>
                </div>
              </div>
            </div>

            <Badge className={cn("border", getStatusColor(patient.status))}>
              {patient.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {/* Condition */}
          <div className="bg-gray-50/80 rounded-lg p-3 backdrop-blur-sm">
            <h4 className="font-semibold text-gray-800 mb-1">
              Current Condition
            </h4>
            <p className="text-gray-600 text-sm">{patient.condition}</p>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2">
                <Thermometer
                  className={cn(
                    "w-4 h-4",
                    getVitalColor("temperature", patient.vitals.temperature)
                  )}
                />
                <span className="text-xs font-medium text-gray-600">
                  Temperature
                </span>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  getVitalColor("temperature", patient.vitals.temperature)
                )}
              >
                {formatters.temperature(patient.vitals.temperature)}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2">
                <Heart
                  className={cn(
                    "w-4 h-4",
                    getVitalColor("heartRate", patient.vitals.heartRate)
                  )}
                />
                <span className="text-xs font-medium text-gray-600">
                  Heart Rate
                </span>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  getVitalColor("heartRate", patient.vitals.heartRate)
                )}
              >
                {formatters.heartRate(patient.vitals.heartRate)}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2">
                <Activity
                  className={cn(
                    "w-4 h-4",
                    getVitalColor(
                      "bloodPressureSystolic",
                      patient.vitals.bloodPressure.systolic
                    )
                  )}
                />
                <span className="text-xs font-medium text-gray-600">
                  Blood Pressure
                </span>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  getVitalColor(
                    "bloodPressureSystolic",
                    patient.vitals.bloodPressure.systolic
                  )
                )}
              >
                {formatters.bloodPressure(
                  patient.vitals.bloodPressure.systolic,
                  patient.vitals.bloodPressure.diastolic
                )}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2">
                <Droplets
                  className={cn(
                    "w-4 h-4",
                    getVitalColor("bloodSugar", patient.vitals.bloodSugar)
                  )}
                />
                <span className="text-xs font-medium text-gray-600">
                  Blood Sugar
                </span>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  getVitalColor("bloodSugar", patient.vitals.bloodSugar)
                )}
              >
                {formatters.bloodSugar(patient.vitals.bloodSugar)}
              </p>
            </div>
          </div>

          {/* Appointment Info */}
          <div className="space-y-2 pt-2 border-t border-gray-200/60">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Last visit: {formatters.date(patient.lastVisit)}</span>
            </div>

            {patient.nextAppointment && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Next: {formatters.date(patient.nextAppointment)} at{" "}
                  {formatters.time(patient.nextAppointment)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
