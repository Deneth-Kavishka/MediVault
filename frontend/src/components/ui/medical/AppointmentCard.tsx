"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, fadeInUp, formatters, getMedicalIcon } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  MessageSquare,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface AppointmentCardProps {
  appointment: {
    id: string;
    patientName: string;
    patientAge: number;
    doctorName: string;
    specialty: string;
    date: Date;
    time: string;
    duration: number;
    type: "in-person" | "video" | "phone";
    status:
      | "scheduled"
      | "confirmed"
      | "in-progress"
      | "completed"
      | "cancelled";
    location?: string;
    notes?: string;
    urgency: "low" | "medium" | "high";
    patientAvatar?: string;
    doctorAvatar?: string;
  };
  onAction?: (action: string, appointmentId: string) => void;
  className?: string;
}

export function AppointmentCard({
  appointment,
  onAction,
  className,
}: AppointmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500/20 text-blue-700 border-blue-500/30";
      case "confirmed":
        return "bg-green-500/20 text-green-700 border-green-500/30";
      case "in-progress":
        return "bg-purple-500/20 text-purple-700 border-purple-500/30";
      case "completed":
        return "bg-gray-500/20 text-gray-700 border-gray-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-700 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/30";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "border-l-red-500 bg-red-50/50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50/50";
      default:
        return "border-l-green-500 bg-green-50/50";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "phone":
        return <Phone className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "in-progress":
        return <AlertCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.01, y: -2 }}
      className={cn(className)}
    >
      <Card
        className={cn(
          "backdrop-blur-lg bg-white/80 border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border-l-4",
          getUrgencyColor(appointment.urgency)
        )}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {getMedicalIcon(appointment.specialty)}
              </div>

              <div>
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <span>{appointment.patientName}</span>
                  {getStatusIcon(appointment.status)}
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                  <User className="w-4 h-4" />
                  <span>
                    Age {appointment.patientAge} • {appointment.specialty}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <Badge
                className={cn(
                  "border text-xs",
                  getStatusColor(appointment.status)
                )}
              >
                {appointment.status.replace("-", " ").toUpperCase()}
              </Badge>
              {appointment.urgency === "high" && (
                <Badge variant="destructive" className="text-xs">
                  URGENT
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          {/* Doctor Info */}
          <div className="flex items-center space-x-3 bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
              {appointment.doctorAvatar ? (
                <img
                  src={appointment.doctorAvatar}
                  alt={appointment.doctorName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                appointment.doctorName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {appointment.doctorName}
              </p>
              <p className="text-sm text-gray-600">{appointment.specialty}</p>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Date</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {formatters.date(appointment.date)}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Time</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {appointment.time} ({appointment.duration}min)
              </p>
            </div>

            <div className="col-span-2 bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center space-x-2 mb-1">
                {getTypeIcon(appointment.type)}
                <span className="text-xs font-medium text-gray-600">
                  {appointment.type === "in-person" ? "Location" : "Type"}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {appointment.type === "in-person"
                  ? appointment.location || "Main Hospital"
                  : `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} Consultation`}
              </p>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-gray-50/80 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-600">Notes</span>
              </div>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {appointment.status === "scheduled" && (
            <div className="flex space-x-2 pt-2 border-t border-gray-200/60">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onAction?.("confirm", appointment.id)}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onAction?.("reschedule", appointment.id)}
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => onAction?.("cancel", appointment.id)}
              >
                Cancel
              </Button>
            </div>
          )}

          {appointment.status === "confirmed" && (
            <div className="flex space-x-2 pt-2 border-t border-gray-200/60">
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => onAction?.("start", appointment.id)}
              >
                Start Session
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onAction?.("contact", appointment.id)}
              >
                Contact Patient
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
