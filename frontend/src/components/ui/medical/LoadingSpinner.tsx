'use client'

import { motion } from 'framer-motion'
import { cn, fadeInUp } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'medical' | 'pulse'
  className?: string
}

export function LoadingSpinner({ size = 'md', variant = 'primary', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className={cn("flex items-center justify-center", className)}
      >
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "rounded-full bg-gradient-to-r from-blue-500 to-purple-600",
                size === 'sm' ? 'w-2 h-2' : 
                size === 'md' ? 'w-3 h-3' :
                size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  if (variant === 'medical') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className={cn("relative flex items-center justify-center", className)}
      >
        {/* Outer ring */}
        <motion.div
          className={cn(
            "rounded-full border-4 border-red-200",
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner cross */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className={cn(
            "text-red-500 font-bold",
            size === 'sm' ? 'text-xs' :
            size === 'md' ? 'text-sm' :
            size === 'lg' ? 'text-lg' : 'text-xl'
          )}>
            ⚕️
          </div>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          className={cn(
            "absolute top-0 rounded-full border-4 border-transparent border-t-red-500",
            sizeClasses[size]
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={cn("relative flex items-center justify-center", className)}
    >
      {/* Background circle */}
      <div className={cn(
        "rounded-full border-4 border-gray-200",
        sizeClasses[size]
      )} />
      
      {/* Animated progress */}
      <motion.div
        className={cn(
          "absolute top-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500",
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Gradient overlay */}
      <motion.div
        className={cn(
          "absolute top-0 rounded-full border-4 border-transparent",
          sizeClasses[size]
        )}
        style={{
          borderImage: "linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899) 1"
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  )
}

interface MedicalLoadingProps {
  message?: string
  className?: string
}

export function MedicalLoading({ message = "Loading medical data...", className }: MedicalLoadingProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={cn("flex flex-col items-center justify-center space-y-4 p-8", className)}
    >
      <LoadingSpinner size="lg" variant="medical" />
      
      <motion.div
        className="text-center space-y-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <p className="text-lg font-semibold text-gray-700">{message}</p>
        <div className="flex space-x-1 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}