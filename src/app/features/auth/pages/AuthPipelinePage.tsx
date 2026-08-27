import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
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
import { getPhoneAuthError } from '@/lib/authErrors'
import { Button, Input } from '@/app/components/ui'
import { pipelineStepsFor, type PipelineStep } from '../pipelineOrder'

// The pipeline: the steps a person still owes, in the approved order — name
// (only if unknown), phone, code, and the email link LAST, only for accounts
// whose provider did not already verify it. docs/new-user-navigation-path.md.
//
// The order is a pure function (pipelineOrder.ts); this page only renders
// whichever step is first in what remains, and re-asks after each one.

const stepVariants = {
  initial: (direction: number) => ({ opacity: 0, x: direction * 50 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -50 }),
}

const RESEND_SECONDS = 30
const EMAIL_POLL_MS = 4000

export default function AuthPipelinePage() {
  const navigate = useNavigate()
  const { user, firebaseUser, refreshUser, refreshFirebaseUser } = useAuthStore()

  // What is still owed, from the store's current view of the account. After
  // each step the store is refreshed, this shrinks, and the effect below moves
  // to the first remaining step — or finishes.
  const remaining = pipelineStepsFor({
    emailVerified: Boolean(firebaseUser?.emailVerified),
    hasName: Boolean(user?.name),
    phoneVerified: Boolean(user?.isPhoneVerified),
  })
  const [step, setStep] = useState<PipelineStep | null>(() => remaining[0] ?? null)
  const totalRef = useRef(remaining.length || 1)
  const [direction, setDirection] = useState(1)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recoveryHint, setRecoveryHint] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)
  const pendingPhoneRef = useRef<{ phoneNumber: string; countryName: string } | null>(null)

  const finish = useCallback(() => {
    navigate(consumeReturnUrl() ?? '/app', { replace: true })
  }, [navigate])

  const remainingKey = remaining.join(',')
  useEffect(() => {
    if (!firebaseUser) return
    if (remaining.length === 0) {
      finish()
      return
    }
    if (!step || !remaining.includes(step)) {
      setDirection(1)
      setStep(remaining[0] ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingKey, firebaseUser])

  const stepsDone = Math.max(0, totalRef.current - remaining.length)
  const stepNumber = Math.min(totalRef.current, stepsDone + 1)
  const totalSteps = totalRef.current

  useEffect(() => {
    if (smsCooldown <= 0) return
    const timer = setTimeout(() => setSmsCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [smsCooldown])

  useEffect(() => {
    if (!firebaseUser) navigate('/app/login')
  }, [firebaseUser, navigate])

  useEffect(() => {
    if (step === 'phone') authService.initializeRecaptcha('recaptcha-container')
  }, [step])
  useEffect(() => () => authService.cleanupRecaptcha(), [])

  // The email step checks by itself: every few seconds, and whenever the tab
  // regains focus (the link was probably opened in another tab or on the
  // phone). No "ya verifiqué" button — people tap it before clicking the
  // link and get stuck.
  useEffect(() => {
    if (step !== 'verify-email') return
    let cancelled = false
    let done = false
    const check = async () => {
      if (done) return
      try {
        const refreshed = await refreshFirebaseUser()
        if (!cancelled && !done && refreshed?.emailVerified) {
          done = true
          await authService.refreshSession()
          toast.success('Correo verificado')
          // the store now says verified → the effect above finishes
        }
      } catch {
        /* keep polling */
      }
    }
    void check() // the link may have been clicked during the phone step
    const interval = setInterval(check, EMAIL_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [step, refreshFirebaseUser])

  if (!step) return null

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
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
                  setRecoveryHint(null)
                  setIsSubmitting(true)
                  try {
                    if (!firebaseUser) throw new Error('Not authenticated')
                    await authService.updateUserName(firebaseUser.uid, data.name)
                    await refreshUser() // → effect moves to the next step
                  } catch {
                    setError('Error al guardar el nombre')
                    toast.error('Error al guardar el nombre')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            )}

            {step === 'phone' && (
              <PhoneStep
                error={error}
                recoveryHint={recoveryHint}
                isSubmitting={isSubmitting}
                cooldown={smsCooldown}
                onSubmit={async (data) => {
                  if (smsCooldown > 0) return
                  setError(null)
                  setRecoveryHint(null)
                  setIsSubmitting(true)
                  try {
                    const phoneWithCountry = `${data.countryCode}${data.phoneNumber}`
                    const countryName = data.countryCode === '+51' ? 'peru' : 'unitedStates'
                    const verId = await authService.sendPhoneVerificationCode(phoneWithCountry)
                    setVerificationId(verId)
                    setSmsCooldown(RESEND_SECONDS)
                    toast.success('Código enviado')
                    pendingPhoneRef.current = { phoneNumber: phoneWithCountry, countryName }
                    setDirection(1)
                    setStep('verify-code')
                  } catch (err) {
                    const errorInfo = getPhoneAuthError(err)
                    setError(errorInfo.message)
                    setRecoveryHint(errorInfo.recoveryHint ?? null)
                    toast.error(errorInfo.message)
                    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
                    if (code === 'auth/captcha-check-failed' || code === 'auth/missing-client-identifier') {
                      authService.cleanupRecaptcha()
                      authService.initializeRecaptcha('recaptcha-container')
                    }
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            )}

            {step === 'verify-code' && (
              <VerifyCodeStep
                error={error}
                recoveryHint={recoveryHint}
                isSubmitting={isSubmitting}
                cooldown={smsCooldown}
                onSubmit={async (data) => {
                  if (isSubmitting) return
                  setError(null)
                  setRecoveryHint(null)
                  setIsSubmitting(true)
                  try {
                    if (!verificationId) throw new Error('No verification ID')
                    await authService.verifyPhoneCode(verificationId, data.code)
                    const pending = pendingPhoneRef.current
                    if (pending && firebaseUser) {
                      await authService.updateUserContactInfo(firebaseUser.uid, {
                        whatsappPhoneNumber: pending.phoneNumber,
                        countryCode: pending.countryName,
                        preferredContactTimeSlot: 'anytime',
                      })
                      pendingPhoneRef.current = null
                    }
                    await refreshUser() // → effect moves on, or finishes
                    toast.success('Teléfono verificado')
                  } catch (err) {
                    const errorInfo = getPhoneAuthError(err)
                    setError(errorInfo.message)
                    setRecoveryHint(errorInfo.recoveryHint ?? null)
                    toast.error(errorInfo.message)
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                onResend={() => {
                  if (smsCooldown > 0) return
                  setDirection(-1)
                  setStep('phone')
                  setError(null)
                  setRecoveryHint(null)
                }}
                onChangeNumber={() => {
                  setDirection(-1)
                  setStep('phone')
                  setError(null)
                  setRecoveryHint(null)
                  setVerificationId(null)
                  setSmsCooldown(0)
                }}
              />
            )}

            {step === 'verify-email' && (
              <EmailVerifyStep
                email={firebaseUser?.email ?? null}
                isSubmitting={isSubmitting}
                onResend={async () => {
                  setIsSubmitting(true)
                  try {
                    await authService.sendEmailVerificationToCurrentUser()
                    toast.success('Te enviamos un nuevo enlace')
                  } catch {
                    toast.error('No pudimos reenviar el correo. Intenta de nuevo.')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

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
  const { register, handleSubmit, formState: { errors } } = useForm<NameFormData>({
    resolver: zodResolver(nameSchema),
  })
  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        ¿Cómo te llamas?
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Tu nombre aparecerá en tus anuncios
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Input
          label="Nombre completo"
          autoComplete="name"
          autoFocus
          placeholder="Ej: Juan Pérez"
          error={errors.name?.message}
          {...register('name')}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Continuar
        </Button>
      </form>
    </>
  )
}

function PhoneStep({
  error,
  recoveryHint,
  isSubmitting,
  cooldown,
  onSubmit,
}: {
  error: string | null
  recoveryHint: string | null
  isSubmitting: boolean
  cooldown: number
  onSubmit: (data: PhoneFormData) => void
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: '+51' },
  })
  const selectedCode = watch('countryCode')
  const placeholder = selectedCode === '+1' ? '(555) 123-4567' : '912 345 678'
  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Tu número de teléfono
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Te enviaremos un código por SMS
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <select
              {...register('countryCode')}
              aria-label="País"
              className="h-[42px] cursor-pointer appearance-none rounded-xl border border-border bg-gray-50 pl-3 pr-8 text-base text-text-secondary outline-none"
            >
              <option value="+51">+51</option>
              <option value="+1">+1</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            placeholder={placeholder}
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
        </div>
        <p className="text-sm text-text-secondary">
          Tu número confirma que eres una persona real. Nadie más puede usarlo para publicar.
        </p>
        {error && (
          <div>
            <p className="text-sm text-error">{error}</p>
            {recoveryHint && <p className="mt-1 text-sm text-text-tertiary">{recoveryHint}</p>}
          </div>
        )}
        <Button type="submit" isLoading={isSubmitting} disabled={cooldown > 0} className="w-full">
          {cooldown > 0 ? `Espera ${cooldown}s` : 'Enviar código'}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-text-tertiary">
        ¿Tienes un bloqueador de anuncios? Puede impedir el envío del código.
      </p>
    </>
  )
}

function VerifyCodeStep({
  error,
  recoveryHint,
  isSubmitting,
  cooldown,
  onSubmit,
  onResend,
  onChangeNumber,
}: {
  error: string | null
  recoveryHint: string | null
  isSubmitting: boolean
  cooldown: number
  onSubmit: (data: VerificationCodeFormData) => void
  onResend: () => void
  onChangeNumber: () => void
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
  })
  const rawCode = watch('code') ?? ''
  const code = rawCode.replace(/\D/g, '').slice(0, 6)
  const submittedRef = useRef<string | null>(null)

  // Submits itself on the sixth digit (typed or pasted). A wrong code
  // re-arms when the digits change.
  useEffect(() => {
    const digits = code
    if (digits.length === 6 && submittedRef.current !== digits && !isSubmitting) {
      submittedRef.current = digits
      // Submit the cleaned digits, not the raw field: "123 456" pasted from an
      // SMS must still verify.
      onSubmit({ code: digits })
    }
    if (digits.length < 6) submittedRef.current = null
  }, [code, isSubmitting, onSubmit])

  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Ingresa el código
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Te enviamos 6 dígitos por SMS
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="Código de 6 dígitos"
          className="text-center text-2xl tracking-[0.5em]"
          error={errors.code?.message}
          {...register('code')}
        />
        {isSubmitting && <p className="text-center text-sm text-text-secondary">Verificando…</p>}
        {error && (
          <div>
            <p className="text-sm text-error">{error}</p>
            {recoveryHint && <p className="mt-1 text-sm text-text-tertiary">{recoveryHint}</p>}
          </div>
        )}
      </form>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className={`text-base ${cooldown > 0 ? 'cursor-not-allowed text-text-tertiary' : 'text-secondary hover:text-secondary-hover'}`}
        >
          {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
        </button>
        <span className="text-text-tertiary">|</span>
        <button type="button" onClick={onChangeNumber} className="text-base text-secondary hover:text-secondary-hover">
          Cambiar número
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-text-tertiary">
        ¿No llega? A veces tarda unos minutos, según tu operador.
      </p>
    </>
  )
}

function EmailVerifyStep({
  email,
  isSubmitting,
  onResend,
}: {
  email: string | null
  isSubmitting: boolean
  onResend: () => void
}) {
  return (
    <>
      <h1 className="text-center font-serif text-[28px] font-normal text-text-primary">
        Revisa tu correo
      </h1>
      <p className="mt-2 text-center text-base text-text-secondary">
        Te enviamos un enlace
        {email ? (
          <>
            {' '}a <span className="font-medium text-text-primary">{email}</span>
          </>
        ) : null}
        . Ábrelo y vuelve aquí — lo detectamos solos.
      </p>
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-text-secondary">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-secondary" />
        Esperando el clic en el enlace…
      </div>
      <div className="mt-6 text-center">
        <Button type="button" onClick={onResend} variant="text" disabled={isSubmitting}>
          Reenviar correo
        </Button>
      </div>
      <p className="mt-6 text-center text-xs text-text-tertiary">
        Puede tardar un par de minutos. Revisa también la carpeta de spam.
      </p>
    </>
  )
}
