"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/ui/medical/Navigation";
import { PatientCard } from "@/components/ui/medical/PatientCard";
import { MedicalLoading } from "@/components/ui/medical/LoadingSpinner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn, fadeInUp, staggerContainer } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  Users,
  Download,
  Upload,
  SortDesc,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  Activity,
} from "lucide-react";

// Mock patients data
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
    phone: "+1 (555) 123-4567",
    email: "sarah.johnson@email.com",
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
    phone: "+1 (555) 987-6543",
    email: "michael.chen@email.com",
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
    phone: "+1 (555) 456-7890",
    email: "emma.williams@email.com",
  },
  {
    id: "4",
    name: "Robert Kim",
    age: 45,
    gender: "Male",
    bloodType: "AB+",
    lastVisit: new Date("2024-01-22"),
    condition: "Diabetes Type 2 management",
    status: "warning" as const,
    vitals: {
      temperature: 36.9,
      heartRate: 82,
      bloodPressure: { systolic: 145, diastolic: 90 },
      bloodSugar: 165,
    },
    phone: "+1 (555) 234-5678",
    email: "robert.kim@email.com",
  },
  {
    id: "5",
    name: "Lisa Thompson",
    age: 52,
    gender: "Female",
    bloodType: "O+",
    lastVisit: new Date("2024-01-19"),
    nextAppointment: new Date("2024-01-28T16:00"),
    condition: "Chronic pain management",
    status: "stable" as const,
    vitals: {
      temperature: 36.7,
      heartRate: 75,
      bloodPressure: { systolic: 125, diastolic: 80 },
      bloodSugar: 92,
    },
    phone: "+1 (555) 345-6789",
    email: "lisa.thompson@email.com",
  },
  {
    id: "6",
    name: "David Rodriguez",
    age: 38,
    gender: "Male",
    bloodType: "A-",
    lastVisit: new Date("2024-01-21"),
    condition: "Anxiety disorder treatment",
    status: "normal" as const,
    vitals: {
      temperature: 36.6,
      heartRate: 68,
      bloodPressure: { systolic: 120, diastolic: 78 },
      bloodSugar: 85,
    },
    phone: "+1 (555) 567-8901",
    email: "david.rodriguez@email.com",
  },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState(mockPatients);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || patient.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "age":
        return a.age - b.age;
      case "lastVisit":
        return (
          new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
        );
      default:
        return 0;
    }
  });

  const stats = {
    total: patients.length,
    critical: patients.filter((p) => p.status === "critical").length,
    warning: patients.filter((p) => p.status === "warning").length,
    stable: patients.filter((p) => p.status === "stable").length,
    normal: patients.filter((p) => p.status === "normal").length,
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Navigation currentPath="/patients" notifications={5} />
          <div className="flex items-center justify-center min-h-[60vh]">
            <MedicalLoading message="Loading patient records..." />
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
            className="space-y-8"
          >
            {/* Header */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    Patient Management
                  </h1>
                  <p className="text-gray-600">
                    Manage and monitor all patient records
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Patient</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/80 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-all duration-300"
                >
                  <Upload className="w-5 h-5" />
                  <span>Import</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/80 border border-gray-200 text-gray-700 rounded-xl hover:bg-white transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  <span>Export</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={fadeInUp}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.total}
                  </p>
                  <p className="text-sm text-gray-600">Total Patients</p>
                </div>
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {stats.critical}
                  </p>
                  <p className="text-sm text-gray-600">Critical</p>
                </div>
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.warning}
                  </p>
                  <p className="text-sm text-gray-600">Warning</p>
                </div>
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.stable}
                  </p>
                  <p className="text-sm text-gray-600">Stable</p>
                </div>
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.normal}
                  </p>
                  <p className="text-sm text-gray-600">Normal</p>
                </div>
              </div>
            </motion.div>

            {/* Filters and Search */}
            <motion.div variants={fadeInUp}>
              <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search patients by name, email, or condition..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="stable">Stable</option>
                    <option value="normal">Normal</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="age">Sort by Age</option>
                    <option value="lastVisit">Sort by Last Visit</option>
                  </select>

                  {/* View Mode */}
                  <div className="flex border border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "px-4 py-3 transition-all duration-300",
                        viewMode === "grid"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-blue-50"
                      )}
                    >
                      <Grid className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "px-4 py-3 transition-all duration-300",
                        viewMode === "list"
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-blue-50"
                      )}
                    >
                      <List className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Results Count */}
            <motion.div variants={fadeInUp}>
              <p className="text-gray-600">
                Showing {sortedPatients.length} of {patients.length} patients
              </p>
            </motion.div>

            {/* Patients Grid/List */}
            <motion.div variants={fadeInUp}>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedPatients.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      variants={fadeInUp}
                      transition={{ delay: index * 0.1 }}
                      className="relative group"
                    >
                      <PatientCard patient={patient} />

                      {/* Action Buttons Overlay */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors duration-200"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/80 border-b border-gray-200/60">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Patient
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Age/Gender
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Blood Type
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Last Visit
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/60">
                        {sortedPatients.map((patient, index) => (
                          <motion.tr
                            key={patient.id}
                            variants={fadeInUp}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-blue-50/30 transition-colors duration-200"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {patient.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    {patient.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {patient.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {patient.age} • {patient.gender}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                {patient.bloodType}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-sm font-medium",
                                  patient.status === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : patient.status === "warning"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : patient.status === "stable"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                )}
                              >
                                {patient.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {patient.lastVisit.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                >
                                  <Eye className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                >
                                  <Edit className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Empty State */}
            {sortedPatients.length === 0 && (
              <motion.div variants={fadeInUp} className="text-center py-12">
                <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl p-8">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No patients found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || filterStatus !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Start by adding your first patient to the system."}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Add First Patient</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
