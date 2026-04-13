import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  nameSchema,
  phoneSchema,
  verificationCodeSchema,
  type NameFormData,
  type PhoneFormData,
  type VerificationCodeFormData,
} from '@/schemas/authSchema'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { Button, Input } from '@/app/components/ui'

type PipelineStep = 'name' | 'phone' | 'verify-code'

const STEP_ORDER: PipelineStep[] = ['name', 'phone', 'verify-code']

const stepVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction * 50,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -50,
  }),
}

export default function AuthPipelinePage() {
  const navigate = useNavigate()
  const { user, firebaseUser, refreshUser } = useAuthStore()

  // Determine starting step based on user state
  const getInitialStep = (): PipelineStep => {
    if (!user?.name) return 'name'
    if (!user?.isPhoneVerified) return 'phone'
    return 'name' // fallback, should redirect
  }

  const [step, setStep] = useState<PipelineStep>(getInitialStep)
  const [direction, setDirection] = useState(1)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)

  const goToStep = (target: PipelineStep) => {
    const currentIndex = STEP_ORDER.indexOf(step)
    const targetIndex = STEP_ORDER.indexOf(target)
    setDirection(targetIndex >= currentIndex ? 1 : -1)
    setStep(target)
  }

  // SMS cooldown timer
  useEffect(() => {
    if (smsCooldown <= 0) return
    const timer = setTimeout(() => setSmsCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [smsCooldown])

  // Redirect if already fully verified
  useEffect(() => {
    if (user?.name && user?.isPhoneVerified) {
      navigate(consumeReturnUrl() ?? '/app')
    }
  }, [user, navigate])

  // Redirect if not authenticated
  useEffect(() => {
    if (!firebaseUser) {
      navigate('/app/login')
    }
  }, [firebaseUser, navigate])

  // Initialize recaptcha when entering phone step
  useEffect(() => {
    if (step === 'phone') {
      authService.initializeRecaptcha('recaptcha-container')
    }
  }, [step])

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      authService.cleanupRecaptcha()
    }
  }, [])

  const stepNumber =
    step === 'name' ? 1 : step === 'phone' ? 2 : 3
  const totalSteps = 3

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Paso {stepNumber} de {totalSteps}</span>
            <span>{Math.round((stepNumber / totalSteps) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {step === 'name' && (
              <NameStep
                error={error}
                isSubmitting={isSubmitting}
                onSubmit={async (data) => {
                  setError(null)
                  setIsSubmitting(true)
                  try {
                    if (!firebaseUser) throw new Error('Not authenticated')
                    await authService.updateUserName(firebaseUser.uid, data.name)
                    await refreshUser()
                    goToStep('phone')
                  } catch {
                    setError('Error al guardar el nombre')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            )}

            {step === 'phone' && (
              <PhoneStep
                error={error}
                isSubmitting={isSubmitting}
                cooldown={smsCooldown}
                onSubmit={async (data) => {
                  if (smsCooldown > 0) return
                  setError(null)
                  setIsSubmitting(true)
                  try {
                    const phoneWithCountry = `${data.countryCode}${data.phoneNumber}`
                    const countryName = data.countryCode === '+51' ? 'peru' : 'usa'
                    const verId =
                      await authService.sendPhoneVerificationCode(phoneWithCountry)
                    setVerificationId(verId)
                    setSmsCooldown(60)

                    // Save contact info
                    if (firebaseUser) {
                      await authService.updateUserContactInfo(firebaseUser.uid, {
                        whatsappPhoneNumber: phoneWithCountry,
                        countryCode: countryName,
                        preferredContactTimeSlot: 'anytime',
                      })
                    }

                    goToStep('verify-code')
                  } catch {
                    setError(
                      'Error al enviar el codigo. Verifica tu numero e intenta de nuevo.'
                    )
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            )}

            {step === 'verify-code' && (
              <VerifyCodeStep
                error={error}
                isSubmitting={isSubmitting}
                cooldown={smsCooldown}
                onSubmit={async (data) => {
                  setError(null)
                  setIsSubmitting(true)
                  try {
                    if (!verificationId) throw new Error('No verification ID')
                    await authService.verifyPhoneCode(verificationId, data.code)
                    await refreshUser()
                    navigate(consumeReturnUrl() ?? '/app')
                  } catch {
                    setError('Codigo incorrecto. Intenta de nuevo.')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                onResend={() => {
                  if (smsCooldown > 0) return
                  goToStep('phone')
                  setError(null)
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Invisible recaptcha container */}
        <div id="recaptcha-container" />
      </div>
    </div>
  )
}

function NameStep({
  error,
  isSubmitting,
  onSubmit,
}: {
  error: string | null
  isSubmitting: boolean
  onSubmit: (data: NameFormData) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
  })

  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Como te llamas?
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Tu nombre aparecera en tus publicaciones
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Input
          label="Nombre completo"
          autoComplete="name"
          autoFocus
          placeholder="Ej: Juan Perez"
          error={errors.name?.message}
          {...register('name')}
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
        >
          Continuar
        </Button>
      </form>
    </>
  )
}

function PhoneStep({
  error,
  isSubmitting,
  cooldown,
  onSubmit,
}: {
  error: string | null
  isSubmitting: boolean
  cooldown: number
  onSubmit: (data: PhoneFormData) => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: '+51' },
  })

  const selectedCode = watch('countryCode')
  const placeholder = selectedCode === '+1' ? '(555) 123-4567' : '912 345 678'

  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Tu numero de telefono
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Te enviaremos un codigo SMS para verificar tu numero
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <select
              {...register('countryCode')}
              className="h-[42px] cursor-pointer appearance-none rounded-xl border border-border bg-gray-50 pl-3 pr-8 text-base text-text-secondary outline-none"
            >
              <option value="+51">+51</option>
              <option value="+1">+1</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <Input
            type="tel"
            autoComplete="tel-national"
            autoFocus
            placeholder={placeholder}
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={cooldown > 0}
          className="w-full"
        >
          {cooldown > 0 ? `Espera ${cooldown}s` : 'Enviar codigo'}
        </Button>
      </form>
    </>
  )
}

function VerifyCodeStep({
  error,
  isSubmitting,
  cooldown,
  onSubmit,
  onResend,
}: {
  error: string | null
  isSubmitting: boolean
  cooldown: number
  onSubmit: (data: VerificationCodeFormData) => void
  onResend: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
  })

  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Ingresa el codigo
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Enviamos un codigo de 6 digitos a tu telefono
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          maxLength={6}
          className="text-center text-2xl tracking-[0.5em]"
          error={errors.code?.message}
          {...register('code')}
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
        >
          Verificar
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className={`text-base ${cooldown > 0 ? 'text-text-tertiary cursor-not-allowed' : 'text-secondary hover:text-secondary-hover'}`}
        >
          {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar codigo'}
        </button>
      </div>
    </>
  )
}
