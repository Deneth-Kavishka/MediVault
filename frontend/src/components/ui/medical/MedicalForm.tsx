"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn, fadeInUp, staggerContainer } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Heart,
  Activity,
  Thermometer,
  Weight,
  Ruler,
  Droplets,
  Save,
  UserPlus,
} from "lucide-react";

const patientSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  address: z.string().min(5, "Address must be at least 5 characters"),
  emergencyContact: z.string().min(10, "Emergency contact is required"),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  // Vitals
  height: z
    .number()
    .min(50, "Height must be at least 50cm")
    .max(300, "Height must be less than 300cm"),
  weight: z
    .number()
    .min(1, "Weight must be at least 1kg")
    .max(500, "Weight must be less than 500kg"),
  bloodPressureSystolic: z
    .number()
    .min(70, "Systolic pressure too low")
    .max(250, "Systolic pressure too high"),
  bloodPressureDiastolic: z
    .number()
    .min(40, "Diastolic pressure too low")
    .max(150, "Diastolic pressure too high"),
  heartRate: z
    .number()
    .min(30, "Heart rate too low")
    .max(220, "Heart rate too high"),
  temperature: z
    .number()
    .min(32, "Temperature too low")
    .max(45, "Temperature too high"),
  bloodSugar: z
    .number()
    .min(30, "Blood sugar too low")
    .max(600, "Blood sugar too high")
    .optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface MedicalFormProps {
  onSubmit: (data: PatientFormData) => void;
  initialData?: Partial<PatientFormData>;
  isLoading?: boolean;
  className?: string;
}

export function MedicalForm({
  onSubmit,
  initialData,
  isLoading = false,
  className,
}: MedicalFormProps) {
  const [activeTab, setActiveTab] = useState("personal");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: initialData,
  });

  const FormField = ({
    label,
    icon: Icon,
    error,
    children,
    required = false,
  }: {
    label: string;
    icon: React.ComponentType<any>;
    error?: string;
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <motion.div variants={fadeInUp} className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <Icon className="w-4 h-4 text-blue-600" />
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 flex items-center space-x-1"
        >
          <span>⚠️</span>
          <span>{error}</span>
        </motion.p>
      )}
    </motion.div>
  );

  const Input = ({
    className: inputClassName,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className={cn(
        "w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm",
        inputClassName
      )}
      {...props}
    />
  );

  const Select = ({
    children,
    className: selectClassName,
    ...props
  }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      className={cn(
        "w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm",
        selectClassName
      )}
      {...props}
    >
      {children}
    </select>
  );

  const Textarea = ({
    className: textareaClassName,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      className={cn(
        "w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none",
        textareaClassName
      )}
      rows={3}
      {...props}
    />
  );

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "medical", label: "Medical History", icon: Heart },
    { id: "vitals", label: "Vital Signs", icon: Activity },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={cn("max-w-4xl mx-auto", className)}
    >
      <motion.div
        variants={fadeInUp}
        className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Patient Registration</h2>
              <p className="text-blue-100">Complete medical information form</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200/60 bg-white/60 backdrop-blur-sm">
          <div className="flex space-x-0">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center space-x-2 px-6 py-4 font-medium border-b-2 transition-all duration-300",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 bg-blue-50/60"
                    : "border-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50/30"
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Personal Information Tab */}
          {activeTab === "personal" && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="First Name"
                  icon={User}
                  error={errors.firstName?.message}
                  required
                >
                  <Input
                    {...register("firstName")}
                    placeholder="Enter first name"
                  />
                </FormField>

                <FormField
                  label="Last Name"
                  icon={User}
                  error={errors.lastName?.message}
                  required
                >
                  <Input
                    {...register("lastName")}
                    placeholder="Enter last name"
                  />
                </FormField>

                <FormField
                  label="Email"
                  icon={Mail}
                  error={errors.email?.message}
                  required
                >
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="Enter email address"
                  />
                </FormField>

                <FormField
                  label="Phone"
                  icon={Phone}
                  error={errors.phone?.message}
                  required
                >
                  <Input
                    {...register("phone")}
                    placeholder="Enter phone number"
                  />
                </FormField>

                <FormField
                  label="Date of Birth"
                  icon={Calendar}
                  error={errors.dateOfBirth?.message}
                  required
                >
                  <Input {...register("dateOfBirth")} type="date" />
                </FormField>

                <FormField
                  label="Gender"
                  icon={Users}
                  error={errors.gender?.message}
                  required
                >
                  <Select {...register("gender")}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>

                <FormField
                  label="Blood Type"
                  icon={Droplets}
                  error={errors.bloodType?.message}
                  required
                >
                  <Select {...register("bloodType")}>
                    <option value="">Select blood type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </Select>
                </FormField>

                <FormField
                  label="Emergency Contact"
                  icon={Phone}
                  error={errors.emergencyContact?.message}
                  required
                >
                  <Input
                    {...register("emergencyContact")}
                    placeholder="Emergency contact number"
                  />
                </FormField>
              </div>

              <FormField
                label="Address"
                icon={MapPin}
                error={errors.address?.message}
                required
              >
                <Textarea
                  {...register("address")}
                  placeholder="Enter full address"
                />
              </FormField>
            </motion.div>
          )}

          {/* Medical History Tab */}
          {activeTab === "medical" && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              <FormField
                label="Medical History"
                icon={Heart}
                error={errors.medicalHistory?.message}
              >
                <Textarea
                  {...register("medicalHistory")}
                  placeholder="Previous medical conditions, surgeries, family history..."
                  rows={4}
                />
              </FormField>

              <FormField
                label="Allergies"
                icon={Activity}
                error={errors.allergies?.message}
              >
                <Textarea
                  {...register("allergies")}
                  placeholder="Known allergies (medications, food, environmental)..."
                />
              </FormField>

              <FormField
                label="Current Medications"
                icon={Heart}
                error={errors.currentMedications?.message}
              >
                <Textarea
                  {...register("currentMedications")}
                  placeholder="Current medications and dosages..."
                />
              </FormField>
            </motion.div>
          )}

          {/* Vital Signs Tab */}
          {activeTab === "vitals" && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  label="Height (cm)"
                  icon={Ruler}
                  error={errors.height?.message}
                  required
                >
                  <Input
                    {...register("height", { valueAsNumber: true })}
                    type="number"
                    placeholder="170"
                  />
                </FormField>

                <FormField
                  label="Weight (kg)"
                  icon={Weight}
                  error={errors.weight?.message}
                  required
                >
                  <Input
                    {...register("weight", { valueAsNumber: true })}
                    type="number"
                    placeholder="70"
                  />
                </FormField>

                <FormField
                  label="Temperature (°C)"
                  icon={Thermometer}
                  error={errors.temperature?.message}
                  required
                >
                  <Input
                    {...register("temperature", { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                  />
                </FormField>

                <FormField
                  label="Heart Rate (bpm)"
                  icon={Heart}
                  error={errors.heartRate?.message}
                  required
                >
                  <Input
                    {...register("heartRate", { valueAsNumber: true })}
                    type="number"
                    placeholder="72"
                  />
                </FormField>

                <FormField
                  label="Systolic BP (mmHg)"
                  icon={Activity}
                  error={errors.bloodPressureSystolic?.message}
                  required
                >
                  <Input
                    {...register("bloodPressureSystolic", {
                      valueAsNumber: true,
                    })}
                    type="number"
                    placeholder="120"
                  />
                </FormField>

                <FormField
                  label="Diastolic BP (mmHg)"
                  icon={Activity}
                  error={errors.bloodPressureDiastolic?.message}
                  required
                >
                  <Input
                    {...register("bloodPressureDiastolic", {
                      valueAsNumber: true,
                    })}
                    type="number"
                    placeholder="80"
                  />
                </FormField>

                <FormField
                  label="Blood Sugar (mg/dL)"
                  icon={Droplets}
                  error={errors.bloodSugar?.message}
                >
                  <Input
                    {...register("bloodSugar", { valueAsNumber: true })}
                    type="number"
                    placeholder="90"
                  />
                </FormField>
              </div>

              {/* Vital Signs Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200/60">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Vital Signs Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600">BMI</p>
                    <p className="text-xl font-bold text-blue-600">
                      {watch("height") && watch("weight")
                        ? (
                            (watch("weight") as number) /
                            Math.pow((watch("height") as number) / 100, 2)
                          ).toFixed(1)
                        : "--"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Blood Pressure</p>
                    <p className="text-xl font-bold text-green-600">
                      {watch("bloodPressureSystolic") &&
                      watch("bloodPressureDiastolic")
                        ? `${watch("bloodPressureSystolic")}/${watch("bloodPressureDiastolic")}`
                        : "--/--"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Heart Rate</p>
                    <p className="text-xl font-bold text-red-600">
                      {watch("heartRate")
                        ? `${watch("heartRate")} bpm`
                        : "-- bpm"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Temperature</p>
                    <p className="text-xl font-bold text-orange-600">
                      {watch("temperature")
                        ? `${watch("temperature")}°C`
                        : "--°C"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation & Submit */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200/60">
            <div className="flex space-x-4">
              {activeTab !== "personal" && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const currentIndex = tabs.findIndex(
                      (tab) => tab.id === activeTab
                    );
                    if (currentIndex > 0)
                      setActiveTab(tabs[currentIndex - 1].id);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300"
                >
                  Previous
                </motion.button>
              )}

              {activeTab !== "vitals" && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const currentIndex = tabs.findIndex(
                      (tab) => tab.id === activeTab
                    );
                    if (currentIndex < tabs.length - 1)
                      setActiveTab(tabs[currentIndex + 1].id);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300"
                >
                  Next
                </motion.button>
              )}
            </div>

            {activeTab === "vitals" && (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25"
              >
                <Save className="w-5 h-5" />
                <span>{isLoading ? "Saving..." : "Save Patient"}</span>
              </motion.button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
