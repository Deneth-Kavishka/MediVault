'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/auth/AuthLayout'
import { cn, fadeInUp, staggerContainer } from '@/lib/utils'
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Loader2, 
  Shield,
  Building,
  Phone,
  MapPin,
  CheckCircle,
  Stethoscope
} from 'lucide-react'

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  organization: z.string().min(2, 'Organization name is required'),
  role: z.enum(['doctor', 'nurse', 'admin', 'receptionist']),
  specialization: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors }, watch, setError } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const watchedRole = watch('role')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      // Mock registration success
      console.log('Registration data:', data)
      
      // Redirect to login with success message
      router.push('/auth/login?message=Registration successful! Please sign in.')
    } catch (error) {
      setError('email', { message: 'Registration failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const InputField = ({ 
    label, 
    icon: Icon, 
    error, 
    type = 'text',
    required = true,
    ...props 
  }: {
    label: string
    icon: React.ComponentType<any>
    error?: string
    type?: string
    required?: boolean
  } & any) => (
    <motion.div variants={fadeInUp} className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <Icon className="w-4 h-4 text-blue-600" />
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
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

  const SelectField = ({ 
    label, 
    icon: Icon, 
    error, 
    children,
    required = true,
    ...props 
  }: {
    label: string
    icon: React.ComponentType<any>
    error?: string
    children: React.ReactNode
    required?: boolean
  } & any) => (
    <motion.div variants={fadeInUp} className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <Icon className="w-4 h-4 text-blue-600" />
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          className={cn(
            "w-full px-4 py-3 pl-11 bg-white/80 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm appearance-none",
            error ? "border-red-300 focus:ring-red-500" : "border-gray-200"
          )}
          {...props}
        >
          {children}
        </select>
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

  const PasswordField = ({ 
    label, 
    error, 
    showPassword: show, 
    onToggle,
    ...props 
  }: {
    label: string
    error?: string
    showPassword: boolean
    onToggle: () => void
  } & any) => (
    <motion.div variants={fadeInUp} className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
        <Lock className="w-4 h-4 text-blue-600" />
        <span>{label}</span>
        <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className={cn(
            "w-full px-4 py-3 pl-11 pr-11 bg-white/80 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm",
            error ? "border-red-300 focus:ring-red-500" : "border-gray-200"
          )}
          {...props}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className={cn("h-5 w-5", error ? "text-red-400" : "text-gray-400")} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors duration-200"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
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
      title="Join MediVault"
      subtitle="Create your account to start managing healthcare data"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Progress Indicator */}
          <motion.div variants={fadeInUp}>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <span className="text-sm font-medium text-blue-600">Personal Info</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 rounded-full">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="text-sm font-medium text-blue-600">Complete</span>
              </div>
            </div>
          </motion.div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="First Name"
              icon={User}
              placeholder="Enter first name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />

            <InputField
              label="Last Name"
              icon={User}
              placeholder="Enter last name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <InputField
            label="Email Address"
            icon={Mail}
            type="email"
            placeholder="Enter your email address"
            error={errors.email?.message}
            {...register('email')}
          />

          <InputField
            label="Phone Number"
            icon={Phone}
            type="tel"
            placeholder="Enter your phone number"
            error={errors.phone?.message}
            {...register('phone')}
          />

          {/* Professional Information */}
          <motion.div variants={fadeInUp}>
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Professional Information</span>
              </div>
            </div>
          </motion.div>

          <InputField
            label="Organization / Hospital"
            icon={Building}
            placeholder="Enter your organization name"
            error={errors.organization?.message}
            {...register('organization')}
          />

          <SelectField
            label="Professional Role"
            icon={User}
            error={errors.role?.message}
            {...register('role')}
          >
            <option value="">Select your role</option>
            <option value="doctor">Doctor / Physician</option>
            <option value="nurse">Nurse / Practitioner</option>
            <option value="admin">Administrator</option>
            <option value="receptionist">Receptionist</option>
          </SelectField>

          {watchedRole === 'doctor' && (
            <InputField
              label="Specialization"
              icon={Stethoscope}
              placeholder="Enter your medical specialization"
              error={errors.specialization?.message}
              required={false}
              {...register('specialization')}
            />
          )}

          {/* Security */}
          <motion.div variants={fadeInUp}>
            <div className="bg-green-50/80 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Account Security</span>
              </div>
            </div>
          </motion.div>

          <PasswordField
            label="Password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            {...register('password')}
          />

          <PasswordField
            label="Confirm Password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            showPassword={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            {...register('confirmPassword')}
          />

          {/* Password Requirements */}
          <motion.div variants={fadeInUp}>
            <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Password Requirements:</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>At least 8 characters long</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Contains uppercase and lowercase letters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Contains at least one number</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Terms and Conditions */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
                {...register('agreeToTerms')}
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{errors.agreeToTerms.message}</span>
              </p>
            )}

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
                {...register('agreeToPrivacy')}
              />
              <span className="text-sm text-gray-600">
                I acknowledge that I understand HIPAA compliance requirements and will handle patient data appropriately
              </span>
            </label>
            {errors.agreeToPrivacy && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{errors.agreeToPrivacy.message}</span>
              </p>
            )}
          </motion.div>

          {/* Register Button */}
          <motion.button
            variants={fadeInUp}
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
          </motion.button>

          {/* Sign In Link */}
          <motion.div variants={fadeInUp} className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>

          {/* Security Notice */}
          <motion.div variants={fadeInUp}>
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">HIPAA Compliant & Secure</p>
                  <p>Your account will be verified by our medical team within 24 hours. All data is encrypted and stored securely in compliance with healthcare regulations.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </form>
    </AuthLayout>
  )
}