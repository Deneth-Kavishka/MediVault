"use client";

import { motion } from "framer-motion";
import { cn, fadeInUp, slideInLeft } from "@/lib/utils";
import {
  Stethoscope,
  Shield,
  Heart,
  Activity,
  Users,
  Calendar,
} from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  const features = [
    {
      icon: Stethoscope,
      title: "Advanced Medical Records",
      description:
        "Comprehensive patient management with digital health records",
    },
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Enterprise-grade security for sensitive medical data",
    },
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description: "Live vital signs tracking and health analytics",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "AI-powered appointment management and optimization",
    },
  ];

  const stats = [
    { value: "10K+", label: "Patients Managed" },
    { value: "50+", label: "Healthcare Providers" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Left Side - Branding & Features */}
      <motion.div
        variants={slideInLeft}
        initial="initial"
        animate="animate"
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800" />
        <div className="absolute inset-0 bg-[url('/medical-pattern.svg')] opacity-10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 text-white w-full">
          {/* Logo & Brand */}
          <motion.div
            variants={fadeInUp}
            className="flex items-center space-x-4"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center border border-white/30">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MediVault</h1>
              <p className="text-blue-100">Healthcare Management System</p>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-12">
            <motion.div variants={fadeInUp} className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                Modern Healthcare
                <br />
                <span className="text-blue-200">Management</span>
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed">
                Streamline your medical practice with our comprehensive platform
                designed for healthcare professionals.
              </p>
            </motion.div>

            {/* Features */}
            <motion.div variants={fadeInUp} className="space-y-6">
              <h3 className="text-2xl font-semibold mb-6">
                Why Choose MediVault?
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4 p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        {feature.title}
                      </h4>
                      <p className="text-blue-100 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div variants={fadeInUp}>
            <div className="grid grid-cols-4 gap-4 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-blue-100 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-purple-400/20 rounded-full blur-xl" />
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-blue-400/20 rounded-full blur-xl" />
      </motion.div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediVault
                </h1>
                <p className="text-gray-600 text-sm">Healthcare Management</p>
              </div>
            </div>
          </div>

          {/* Auth Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>

          {/* Auth Form */}
          <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-2xl shadow-xl p-8">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2024 MediVault. All rights reserved.
              <br />
              Secure • HIPAA Compliant • Professional
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
