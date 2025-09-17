"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, fadeInUp, slideInLeft } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Users,
  Calendar,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Activity,
  Heart,
  Stethoscope,
  Pill,
  UserPlus,
  LogOut,
  User,
} from "lucide-react";

interface NavigationProps {
  currentPath?: string;
  notifications?: number;
  className?: string;
}

export function Navigation({
  currentPath = "/",
  notifications = 0,
  className,
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  const mainNavItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/patients", label: "Patients", icon: Users },
    { href: "/appointments", label: "Appointments", icon: Calendar },
    { href: "/medical-records", label: "Records", icon: FileText },
    { href: "/vitals", label: "Vitals", icon: Activity },
    { href: "/prescriptions", label: "Prescriptions", icon: Pill },
  ];

  const quickActions = [
    { href: "/patients/new", label: "New Patient", icon: UserPlus },
    { href: "/appointments/new", label: "Schedule", icon: Calendar },
    { href: "/emergency", label: "Emergency", icon: Heart },
  ];

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  const NavItem = ({
    href,
    label,
    icon: Icon,
    isActive = false,
    isMobile = false,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<any>;
    isActive?: boolean;
    isMobile?: boolean;
  }) => (
    <motion.a
      href={href}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 group relative",
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
          : "text-gray-600 hover:bg-white/60 hover:text-blue-600 hover:shadow-md",
        isMobile ? "w-full" : ""
      )}
      onClick={() => isMobile && setIsMobileMenuOpen(false)}
    >
      <Icon
        className={cn(
          "w-5 h-5 transition-colors duration-300",
          isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
        )}
      />
      <span className={cn(isMobile ? "block" : "hidden lg:block")}>
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-blue-600 rounded-xl -z-10"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.a>
  );

  return (
    <motion.nav
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={cn(
        "backdrop-blur-lg bg-white/80 border-b border-white/20 shadow-lg sticky top-0 z-50",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MediVault
              </h1>
              <p className="text-xs text-gray-500">Healthcare Management</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={currentPath === item.href}
              />
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <motion.div
              className="hidden md:block relative"
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search patients..."
                className="block w-64 pl-10 pr-3 py-2 border border-white/20 rounded-xl bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              />
            </motion.div>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-300"
            >
              <Bell className="w-6 h-6" />
              {notifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
                >
                  {notifications > 9 ? "9+" : notifications}
                </motion.span>
              )}
            </motion.button>

            {/* Quick Actions - Desktop */}
            <div className="hidden lg:flex items-center space-x-2">
              {quickActions.map((action) => (
                <motion.a
                  key={action.href}
                  href={action.href}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    action.label === "Emergency"
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                  )}
                >
                  <action.icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </motion.a>
              ))}
            </div>

            {/* User Profile */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/60 transition-all duration-300"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "DR"}
                </div>
                {user && (
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-800">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                )}
              </motion.button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 backdrop-blur-lg bg-white/90 border border-white/20 rounded-xl shadow-xl py-2 z-50"
                  >
                    <a
                      href="/profile"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/60 transition-colors duration-200"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-white/60 transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </a>
                    <hr className="my-2 border-gray-200/60" />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50/60 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-white/60 rounded-xl transition-all duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={slideInLeft}
            initial="initial"
            animate="animate"
            exit="exit"
            className="lg:hidden backdrop-blur-lg bg-white/90 border-t border-white/20"
          >
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="block w-full pl-10 pr-3 py-2 border border-white/20 rounded-xl bg-white/60 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Mobile Navigation */}
              <div className="space-y-2">
                {mainNavItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={currentPath === item.href}
                    isMobile
                  />
                ))}
              </div>

              {/* Mobile Quick Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-200/60">
                <p className="text-sm font-semibold text-gray-600 px-4">
                  Quick Actions
                </p>
                {quickActions.map((action) => (
                  <NavItem
                    key={action.href}
                    href={action.href}
                    label={action.label}
                    icon={action.icon}
                    isMobile
                  />
                ))}
              </div>

              {/* Mobile User Section */}
              <div className="pt-4 border-t border-gray-200/60">
                <div className="flex items-center space-x-3 px-4 py-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "DR"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.name || "Dr. Admin"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.role || "Administrator"}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50/60 rounded-xl transition-all duration-300 mx-4 mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
