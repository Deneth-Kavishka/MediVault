'use client'

import { motion } from 'framer-motion'
import { cn, fadeInUp, staggerContainer, formatters } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Users, Calendar, Activity, DollarSign, Heart, UserCheck, Clock, AlertTriangle } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal'
  subtitle?: string
  className?: string
}

function StatCard({ title, value, change, changeType, icon, color, subtitle, className }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      text: 'text-blue-600',
      light: 'bg-blue-50/80',
      border: 'border-blue-200'
    },
    green: {
      bg: 'from-green-500 to-green-600',
      text: 'text-green-600',
      light: 'bg-green-50/80',
      border: 'border-green-200'
    },
    red: {
      bg: 'from-red-500 to-red-600',
      text: 'text-red-600',
      light: 'bg-red-50/80',
      border: 'border-red-200'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      text: 'text-purple-600',
      light: 'bg-purple-50/80',
      border: 'border-purple-200'
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      text: 'text-orange-600',
      light: 'bg-orange-50/80',
      border: 'border-orange-200'
    },
    teal: {
      bg: 'from-teal-500 to-teal-600',
      text: 'text-teal-600',
      light: 'bg-teal-50/80',
      border: 'border-teal-200'
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'decrease': return <TrendingDown className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase': return 'text-green-600'
      case 'decrease': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(className)}
    >
      <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300",
          colorClasses[color].bg
        )} />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className={cn(
                  "p-3 rounded-lg bg-gradient-to-br shadow-md",
                  colorClasses[color].bg
                )}>
                  <div className="text-white">
                    {icon}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">{title}</p>
                  {subtitle && (
                    <p className="text-xs text-gray-500">{subtitle}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-3xl font-bold text-gray-800">{value}</p>
                
                <div className="flex items-center space-x-2">
                  {getChangeIcon()}
                  <span className={cn("text-sm font-semibold", getChangeColor())}>
                    {Math.abs(change)}%
                  </span>
                  <span className="text-xs text-gray-500">vs last month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface DashboardStatsProps {
  stats: {
    totalPatients: number
    patientsChange: number
    todayAppointments: number
    appointmentsChange: number
    activePatients: number
    activePatientsChange: number
    revenue: number
    revenueChange: number
    criticalAlerts: number
    alertsChange: number
    averageWaitTime: number
    waitTimeChange: number
  }
  className?: string
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients.toLocaleString(),
      change: stats.patientsChange,
      changeType: stats.patientsChange >= 0 ? 'increase' : 'decrease' as const,
      icon: <Users className="w-6 h-6" />,
      color: 'blue' as const,
      subtitle: 'Registered patients'
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      change: stats.appointmentsChange,
      changeType: stats.appointmentsChange >= 0 ? 'increase' : 'decrease' as const,
      icon: <Calendar className="w-6 h-6" />,
      color: 'green' as const,
      subtitle: 'Scheduled for today'
    },
    {
      title: 'Active Patients',
      value: stats.activePatients,
      change: stats.activePatientsChange,
      changeType: stats.activePatientsChange >= 0 ? 'increase' : 'decrease' as const,
      icon: <UserCheck className="w-6 h-6" />,
      color: 'purple' as const,
      subtitle: 'Currently in treatment'
    },
    {
      title: 'Monthly Revenue',
      value: formatters.currency(stats.revenue),
      change: stats.revenueChange,
      changeType: stats.revenueChange >= 0 ? 'increase' : 'decrease' as const,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'teal' as const,
      subtitle: 'This month'
    },
    {
      title: 'Critical Alerts',
      value: stats.criticalAlerts,
      change: stats.alertsChange,
      changeType: stats.alertsChange <= 0 ? 'increase' : 'decrease' as const,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'red' as const,
      subtitle: 'Requiring attention'
    },
    {
      title: 'Avg Wait Time',
      value: `${stats.averageWaitTime}min`,
      change: stats.waitTimeChange,
      changeType: stats.waitTimeChange <= 0 ? 'increase' : 'decrease' as const,
      icon: <Clock className="w-6 h-6" />,
      color: 'orange' as const,
      subtitle: 'Patient wait time'
    }
  ]

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <motion.div variants={fadeInUp} className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-800">Medical Dashboard</h2>
        <p className="text-gray-600">Real-time healthcare analytics and patient insights</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
          />
        ))}
      </div>

      {/* Additional Insights */}
      <motion.div variants={fadeInUp} className="mt-8">
        <div className="backdrop-blur-lg bg-white/80 border border-white/20 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50/80 rounded-lg border border-blue-200">
              <Heart className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">98.5%</p>
              <p className="text-sm text-gray-600">Patient Satisfaction</p>
            </div>
            
            <div className="text-center p-4 bg-green-50/80 rounded-lg border border-green-200">
              <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">94.2%</p>
              <p className="text-sm text-gray-600">Treatment Success</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50/80 rounded-lg border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">856</p>
              <p className="text-sm text-gray-600">New Patients</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50/80 rounded-lg border border-orange-200">
              <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">1,247</p>
              <p className="text-sm text-gray-600">Appointments</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}