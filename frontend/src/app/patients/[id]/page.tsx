"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Navigation } from "@/components/ui/medical/Navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MedicalLoading } from "@/components/ui/medical/LoadingSpinner";
import { cn, fadeInUp, staggerContainer } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Heart,
  Activity,
  FileText,
  Edit,
  Save,
  X,
  Download,
  Upload,
  History,
  Thermometer,
  Stethoscope,
  Pill,
  AlertTriangle,
} from "lucide-react";

// Mock patient data (in real app, this would come from API)
const mockPatient = {
  id: "1",
  name: "Sarah Johnson",
  age: 34,
  gender: "Female",
  bloodType: "A+",
  phone: "+1 (555) 123-4567",
  email: "sarah.johnson@email.com",
  address: "123 Main St, Springfield, IL 62701",
  emergencyContact: {
    name: "John Johnson",
    relationship: "Spouse",
    phone: "+1 (555) 987-6543",
  },
  insurance: {
    provider: "Blue Cross Blue Shield",
    policyNumber: "BCBS-123456789",
    groupNumber: "GRP-001",
  },
  lastVisit: new Date("2024-01-15"),
  nextAppointment: new Date("2024-01-25T14:30"),
  condition: "Hypertension monitoring, stable condition with medication",
  status: "stable" as const,
  vitals: {
    temperature: 36.8,
    heartRate: 78,
    bloodPressure: { systolic: 130, diastolic: 85 },
    bloodSugar: 95,
    weight: 65,
    height: 165,
    bmi: 23.9,
    lastUpdated: new Date("2024-01-15T10:30"),
  },
  medications: [
    {
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      prescribedDate: new Date("2023-06-15"),
      notes: "For blood pressure control",
    },
    {
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      prescribedDate: new Date("2023-08-20"),
      notes: "Diabetes management",
    },
  ],
  allergies: ["Penicillin", "Shellfish"],
  medicalHistory: [
    {
      date: new Date("2024-01-15"),
      type: "Visit",
      description: "Routine check-up, blood pressure monitoring",
      provider: "Dr. Smith",
      notes: "Patient doing well, continue current medication",
    },
    {
      date: new Date("2023-12-10"),
      type: "Lab",
      description: "Blood work - comprehensive metabolic panel",
      provider: "Lab Tech",
      notes: "All values within normal range",
    },
    {
      date: new Date("2023-11-05"),
      type: "Visit",
      description: "Follow-up appointment",
      provider: "Dr. Smith",
      notes: "Medication adjustment, patient responding well",
    },
  ],
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState(mockPatient);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "stable":
        return "bg-green-100 text-green-800 border-green-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getVitalStatus = (vital: string, value: number) => {
    // Simplified vital sign assessment
    switch (vital) {
      case "temperature":
        if (value < 36 || value > 37.5) return "text-red-600";
        return "text-green-600";
      case "heartRate":
        if (value < 60 || value > 100) return "text-yellow-600";
        return "text-green-600";
      case "bloodSugar":
        if (value < 70 || value > 140) return "text-yellow-600";
        return "text-green-600";
      default:
        return "text-green-600";
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "vitals", label: "Vitals", icon: Activity },
    { id: "medications", label: "Medications", icon: Pill },
    { id: "history", label: "History", icon: History },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Navigation currentPath="/patients" notifications={5} />
          <div className="flex items-center justify-center min-h-[60vh]">
            <MedicalLoading message="Loading patient details..." />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navigation currentPath="/patients" notifications={5} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Header */}
            <motion.div
              variants={fadeInUp}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {patient.name}
                  </h1>
                  <p className="text-gray-600">Patient ID: {patient.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded-full border",
                    getStatusColor(patient.status)
                  )}
                >
                  {patient.status.charAt(0).toUpperCase() +
                    patient.status.slice(1)}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Patient
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Patient Summary Card */}
            <motion.div
              variants={fadeInUp}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto lg:mx-0">
                    {patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                </div>
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Basic Information</p>
                    <p className="font-semibold">
                      {patient.age} years old, {patient.gender}
                    </p>
                    <p className="text-sm text-gray-600">
                      Blood Type: {patient.bloodType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact</p>
                    <p className="font-semibold flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {patient.phone}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {patient.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Visit</p>
                    <p className="font-semibold">
                      {patient.lastVisit.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Next: {patient.nextAppointment?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              variants={fadeInUp}
              className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20"
            >
              <div className="border-b border-gray-200/50">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Personal Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <span>{patient.address}</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Emergency Contact
                            </p>
                            <p className="font-medium">
                              {patient.emergencyContact.name} (
                              {patient.emergencyContact.relationship})
                            </p>
                            <p className="text-sm text-gray-600">
                              {patient.emergencyContact.phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Insurance Information
                        </h3>
                        <div className="space-y-2">
                          <p>
                            <span className="text-gray-500">Provider:</span>{" "}
                            {patient.insurance.provider}
                          </p>
                          <p>
                            <span className="text-gray-500">Policy #:</span>{" "}
                            {patient.insurance.policyNumber}
                          </p>
                          <p>
                            <span className="text-gray-500">Group #:</span>{" "}
                            {patient.insurance.groupNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Allergies
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm border border-red-200"
                          >
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Current Condition
                      </h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-xl">
                        {patient.condition}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vitals Tab */}
                {activeTab === "vitals" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Current Vitals
                      </h3>
                      <p className="text-sm text-gray-500">
                        Last updated:{" "}
                        {patient.vitals.lastUpdated.toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-100">
                        <div className="flex items-center space-x-3">
                          <Thermometer className="w-8 h-8 text-red-500" />
                          <div>
                            <p className="text-sm text-gray-600">Temperature</p>
                            <p
                              className={cn(
                                "text-2xl font-bold",
                                getVitalStatus(
                                  "temperature",
                                  patient.vitals.temperature
                                )
                              )}
                            >
                              {patient.vitals.temperature}°C
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center space-x-3">
                          <Heart className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-600">Heart Rate</p>
                            <p
                              className={cn(
                                "text-2xl font-bold",
                                getVitalStatus(
                                  "heartRate",
                                  patient.vitals.heartRate
                                )
                              )}
                            >
                              {patient.vitals.heartRate} bpm
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex items-center space-x-3">
                          <Stethoscope className="w-8 h-8 text-purple-500" />
                          <div>
                            <p className="text-sm text-gray-600">
                              Blood Pressure
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                              {patient.vitals.bloodPressure.systolic}/
                              {patient.vitals.bloodPressure.diastolic}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center space-x-3">
                          <Activity className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-600">Blood Sugar</p>
                            <p
                              className={cn(
                                "text-2xl font-bold",
                                getVitalStatus(
                                  "bloodSugar",
                                  patient.vitals.bloodSugar
                                )
                              )}
                            >
                              {patient.vitals.bloodSugar} mg/dL
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-100">
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="text-xl font-bold text-yellow-600">
                          {patient.vitals.weight} kg
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                        <p className="text-sm text-gray-600">Height</p>
                        <p className="text-xl font-bold text-teal-600">
                          {patient.vitals.height} cm
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-sm text-gray-600">BMI</p>
                        <p className="text-xl font-bold text-indigo-600">
                          {patient.vitals.bmi}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medications Tab */}
                {activeTab === "medications" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Current Medications
                    </h3>
                    <div className="space-y-3">
                      {patient.medications.map((medication, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {medication.name}
                              </h4>
                              <p className="text-gray-600">
                                {medication.dosage} - {medication.frequency}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {medication.notes}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Prescribed
                              </p>
                              <p className="font-medium">
                                {medication.prescribedDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Medical History
                    </h3>
                    <div className="space-y-4">
                      {patient.medicalHistory.map((record, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {record.description}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Provider: {record.provider}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {record.type}
                              </span>
                              <p className="text-sm text-gray-500 mt-1">
                                {record.date.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-700">{record.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Medical Documents
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </motion.button>
                    </div>
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No documents uploaded yet</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
