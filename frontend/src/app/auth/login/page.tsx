'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/auth/AuthLayout'
import { cn, fadeInUp } from '@/lib/utils'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  Loader2, 
  Shield,
  Fingerprint,
  Smartphone
} from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock authentication
      if (data.email === 'admin@medivault.com' && data.password === 'admin123') {
        // Store token (in real app, this would come from backend)
        localStorage.setItem('medivault_token', 'mock_jwt_token')
        localStorage.setItem('medivault_user', JSON.stringify({
          id: '1',
          name: 'Dr. Alex Smith',
          email: data.email,
          role: 'Chief Medical Officer'
        }))
        
        router.push('/')
      } else {
        setError('email', { message: 'Invalid email or password' })
        setError('password', { message: 'Invalid email or password' })
      }
    } catch (error) {
      setError('email', { message: 'Login failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const InputField = ({ 
    label, 
    icon: Icon, 
    error, 
    type = 'text',
    ...props 
  }: {
    label: string
    icon: React.ComponentType<any>
    error?: string
    type?: string
  } & any) => (
    <motion.div variants={fadeInUp} className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <Icon className="w-4 h-4 text-blue-600" />
        <span>{label}</span>
      </label>
      <div className="relative">
        <input
          type={type}
          className={cn(
            "w-full px-4 py-3 pl-11 bg-white/80 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm",
            error ? "border-red-300 focus:ring-red-500" : "border-gray-200"
          )}
          {...props}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className={cn("h-5 w-5", error ? "text-red-400" : "text-gray-400")} />
        </div>
      </div>
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
  )

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your MediVault account to continue"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Demo Credentials Info */}
          <motion.div variants={fadeInUp}>
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Demo Credentials</span>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Email:</strong> admin@medivault.com</p>
                <p><strong>Password:</strong> admin123</p>
              </div>
            </div>
          </motion.div>

          {/* Email Field */}
          <InputField
            label="Email Address"
            icon={Mail}
            type="email"
            placeholder="Enter your email address"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password Field */}
          <motion.div variants={fadeInUp} className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className={cn(
                  "w-full px-4 py-3 pl-11 pr-11 bg-white/80 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm",
                  errors.password ? "border-red-300 focus:ring-red-500" : "border-gray-200"
                )}
                {...register('password')}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={cn("h-5 w-5", errors.password ? "text-red-400" : "text-gray-400")} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 flex items-center space-x-1"
              >
                <span>⚠️</span>
                <span>{errors.password.message}</span>
              </motion.p>
            )}
          </motion.div>

          {/* Remember Me & Forgot Password */}
          <motion.div variants={fadeInUp} className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                {...register('rememberMe')}
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link 
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </motion.div>

          {/* Login Button */}
          <motion.button
            variants={fadeInUp}
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          </motion.button>

          {/* Divider */}
          <motion.div variants={fadeInUp} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/80 text-gray-500">Or continue with</span>
            </div>
          </motion.div>

          {/* Alternative Auth Methods */}
          <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-gray-700 hover:bg-white transition-all duration-300"
            >
              <Fingerprint className="w-5 h-5" />
              <span>Biometric</span>
            </motion.button>
            
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-white/80 border border-gray-200 rounded-xl text-gray-700 hover:bg-white transition-all duration-300"
            >
              <Smartphone className="w-5 h-5" />
              <span>SMS Code</span>
            </motion.button>
          </motion.div>

          {/* Sign Up Link */}
          <motion.div variants={fadeInUp} className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                href="/auth/register"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
              >
                Sign up here
              </Link>
            </p>
          </motion.div>

          {/* Security Notice */}
          <motion.div variants={fadeInUp}>
            <div className="bg-green-50/80 border border-green-200 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold">Your data is protected</p>
                  <p>We use enterprise-grade encryption and HIPAA compliance standards to keep your information secure.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </form>
    </AuthLayout>
  )
}