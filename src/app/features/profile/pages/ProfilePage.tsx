import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { profileSchema, type ProfileFormData } from '@/schemas/profileSchema'
import { phoneSchema, verificationCodeSchema, type PhoneFormData, type VerificationCodeFormData } from '@/schemas/authSchema'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { getPhoneAuthError } from '@/lib/authErrors'
import { Button, Input, Select, Card, Modal, Badge } from '@/app/components/ui'
import { CONTACT_TIME_SLOT_LABELS } from '@/types/enums'
import { CheckCircle, Shield, Clock, XCircle, Phone } from 'lucide-react'

type PhoneMode = 'idle' | 'enter-phone' | 'enter-code'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Phone verification state
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('idle')
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneRecoveryHint, setPhoneRecoveryHint] = useState<string | null>(null)
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)

  // Store the pending phone number to save AFTER verification
  const pendingPhoneRef = useRef<{ phoneNumber: string; countryName: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      preferredContactTimeSlot:
        user?.contactInfo?.preferredContactTimeSlot ?? 'anytime',
      additionalContactNotes:
        user?.contactInfo?.additionalContactNotes ?? '',
    },
  })

  // SMS cooldown timer
  useEffect(() => {
    if (smsCooldown <= 0) return
    const timer = setTimeout(() => setSmsCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [smsCooldown])

  // Initialize reCAPTCHA when entering phone mode, cleanup unconditionally on exit
  useEffect(() => {
    if (phoneMode === 'enter-phone') {
      authService.initializeRecaptcha('profile-recaptcha-container')
    }
    return () => {
      authService.cleanupRecaptcha()
    }
  }, [phoneMode])

  async function onSubmit(data: ProfileFormData) {
    if (!user) return
    setError(null)
    setSuccess(null)

    try {
      await authService.updateUserName(user.id, data.name)

      if (user.contactInfo) {
        await authService.updateUserContactInfo(user.id, {
          whatsappPhoneNumber: user.contactInfo.whatsappPhoneNumber,
          countryCode: user.contactInfo.countryCode,
          preferredContactTimeSlot: data.preferredContactTimeSlot,
          additionalContactNotes: data.additionalContactNotes,
        })
      }

      await refreshUser()
      setSuccess('Perfil actualizado')
      toast.success('Perfil actualizado')
    } catch {
      setError('Error al actualizar el perfil')
      toast.error('Error al actualizar el perfil')
    }
  }

  async function handleSendCode(data: PhoneFormData) {
    if (smsCooldown > 0 || !user) return
    setPhoneError(null)
    setPhoneRecoveryHint(null)
    setIsPhoneSubmitting(true)
    try {
      const phoneWithCountry = `${data.countryCode}${data.phoneNumber}`
      const countryName = data.countryCode === '+51' ? 'peru' : 'unitedStates'
      const verId = await authService.sendPhoneVerificationCode(phoneWithCountry)
      setVerificationId(verId)
      setSmsCooldown(60)
      toast.success('Codigo enviado')

      // Store pending phone to save AFTER successful verification
      pendingPhoneRef.current = { phoneNumber: phoneWithCountry, countryName }

      setPhoneMode('enter-code')
    } catch (err) {

      const errorInfo = getPhoneAuthError(err)
      setPhoneError(errorInfo.message)
      setPhoneRecoveryHint(errorInfo.recoveryHint ?? null)
      toast.error(errorInfo.message)

      // Re-initialize reCAPTCHA on captcha failures
      const code = err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : ''
      if (code === 'auth/captcha-check-failed' || code === 'auth/missing-client-identifier') {
        authService.cleanupRecaptcha()
        authService.initializeRecaptcha('profile-recaptcha-container')
      }
    } finally {
      setIsPhoneSubmitting(false)
    }
  }

  async function handleVerifyCode(data: VerificationCodeFormData) {
    if (!user) return
    setPhoneError(null)
    setPhoneRecoveryHint(null)
    setIsPhoneSubmitting(true)
    try {
      if (!verificationId) throw new Error('No verification ID')
      await authService.verifyPhoneCode(verificationId, data.code)

      // Save contact info AFTER successful verification
      const pending = pendingPhoneRef.current
      if (pending) {
        await authService.updateUserContactInfo(user.id, {
          whatsappPhoneNumber: pending.phoneNumber,
          countryCode: pending.countryName,
          preferredContactTimeSlot: user.contactInfo?.preferredContactTimeSlot ?? 'anytime',
          additionalContactNotes: user.contactInfo?.additionalContactNotes ?? '',
        })
        pendingPhoneRef.current = null
      }

      await refreshUser()
      toast.success('Telefono verificado')
      setPhoneMode('idle')
      setVerificationId(null)
    } catch (err) {

      const errorInfo = getPhoneAuthError(err)
      setPhoneError(errorInfo.message)
      setPhoneRecoveryHint(errorInfo.recoveryHint ?? null)
      toast.error(errorInfo.message)
    } finally {
      setIsPhoneSubmitting(false)
    }
  }

  function handleChangeNumber() {
    // No Firebase operations needed — just show the phone form.
    // The new number will replace the old one via updatePhoneNumber in verifyPhoneCode.
    setPhoneError(null)
    setPhoneRecoveryHint(null)
    setVerificationId(null)
    setSmsCooldown(0)
    pendingPhoneRef.current = null
    setPhoneMode('enter-phone')
  }

  async function handleDeleteAccount() {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await authService.deleteAccount()
      toast.success('Cuenta eliminada')
      navigate('/app/login')
    } catch {
      setDeleteError('Error al eliminar la cuenta. Intenta de nuevo.')
      toast.error('Error al eliminar la cuenta. Intenta de nuevo.')
      setIsDeleting(false)
    }
  }

  if (!user) return null

  const timeSlotOptions = Object.entries(CONTACT_TIME_SLOT_LABELS).map(
    ([value, label]) => ({ value, label })
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Title lives in the Topbar via DashboardShell's default route title */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 on desktop): primary task — contact info form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile form (moved up — primary task above status/meta) */}
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Correo electronico"
                value={user.email}
                disabled
              />

              <Input
                label="Nombre completo"
                error={errors.name?.message}
                {...register('name')}
              />

              {/* Phone display (read-only when not in phone verification mode).
                  No <label> here — there's no form control to associate with.
                  Uses <span> for the heading-like text and role='group' with
                  aria-labelledby so SR users hear "Telefono: +51 ..." as one
                  announcement. */}
              {phoneMode === 'idle' && (
                <div role="group" aria-labelledby="profile-phone-label">
                  <span
                    id="profile-phone-label"
                    className="mb-1.5 block text-sm font-medium uppercase text-text-primary"
                  >
                    Telefono
                  </span>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-gray-50 px-4 py-2.5">
                    <Phone className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                    <span className="text-base text-text-secondary">
                      {user.contactInfo?.whatsappPhoneNumber || 'No registrado'}
                    </span>
                  </div>
                </div>
              )}

              <Select
                label="Horario de contacto preferido"
                options={timeSlotOptions}
                error={errors.preferredContactTimeSlot?.message}
                {...register('preferredContactTimeSlot')}
              />

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium uppercase text-text-primary"
                >
                  Notas adicionales de contacto
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Ej: Prefiero WhatsApp"
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...register('additionalContactNotes')}
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}
              {success && <p className="text-sm text-success">{success}</p>}

              <Button type="submit" isLoading={isSubmitting}>
                Guardar Cambios
              </Button>
            </form>
          </Card>
        </div>

        {/* Right column (1/3 on desktop): status + meta cards */}
        <div className="space-y-6">
          {/* Verification status */}
          <Card>
        <h2 className="text-sm font-medium uppercase text-text-primary">
          Estado de verificacion
        </h2>
        <div className="mt-3 space-y-3">
          {/* Phone verification row */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle
                  className={`h-4 w-4 ${user.isPhoneVerified ? 'text-success' : 'text-text-tertiary'}`}
                />
                <span className="text-sm text-text-secondary">
                  Telefono {user.isPhoneVerified ? 'verificado' : 'no verificado'}
                </span>
              </div>
              {!user.isPhoneVerified && phoneMode === 'idle' && (
                <button
                  type="button"
                  onClick={() => setPhoneMode('enter-phone')}
                  className="text-sm font-medium text-secondary hover:text-secondary-hover"
                >
                  Verificar ahora
                </button>
              )}
              {user.isPhoneVerified && phoneMode === 'idle' && (
                <button
                  type="button"
                  onClick={handleChangeNumber}
                  className="text-sm font-medium text-secondary hover:text-secondary-hover"
                >
                  Cambiar numero
                </button>
              )}
            </div>

            {/* Inline phone form */}
            {phoneMode === 'enter-phone' && (
              <PhoneForm
                error={phoneError}
                recoveryHint={phoneRecoveryHint}
                isSubmitting={isPhoneSubmitting}
                cooldown={smsCooldown}
                onSubmit={handleSendCode}
                onCancel={() => {
                  setPhoneMode('idle')
                  setPhoneError(null)
                  setPhoneRecoveryHint(null)
                  setVerificationId(null)
                  pendingPhoneRef.current = null
                }}
              />
            )}

            {/* Inline code form */}
            {phoneMode === 'enter-code' && (
              <CodeForm
                error={phoneError}
                recoveryHint={phoneRecoveryHint}
                isSubmitting={isPhoneSubmitting}
                cooldown={smsCooldown}
                onSubmit={handleVerifyCode}
                onResend={() => {
                  if (smsCooldown > 0) return
                  setPhoneMode('enter-phone')
                  setPhoneError(null)
                  setPhoneRecoveryHint(null)
                }}
                onChangeNumber={() => {
                  setPhoneMode('enter-phone')
                  setPhoneError(null)
                  setPhoneRecoveryHint(null)
                  setVerificationId(null)
                  setSmsCooldown(0)
                  pendingPhoneRef.current = null
                }}
              />
            )}
          </div>

          {/* Identity verification row */}
          <div className="flex items-center gap-2">
            <Shield
              className={`h-4 w-4 ${user.isIdentityVerified ? 'text-success' : 'text-text-tertiary'}`}
            />
            <span className="text-sm text-text-secondary">
              Identidad {user.isIdentityVerified ? 'verificada' : 'no verificada'}
            </span>
          </div>
        </div>

        {/* reCAPTCHA container for profile */}
        <div id="profile-recaptcha-container" />
      </Card>

      {/* Realtor status */}
      <Card>
        <h2 className="text-sm font-medium uppercase text-text-primary">
          Agente inmobiliario
        </h2>
        <div className="mt-3">
          {user.isVerifiedRealtor ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm text-text-secondary">Agente verificado</span>
              <Badge variant="success">Verificado</Badge>
            </div>
          ) : user.realtorApplicationStatus === 'pending' ? (
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <span className="text-sm text-text-secondary">
                  Solicitud de agente en revision
                </span>
                {user.realtorApplicationDate && (
                  <p className="text-xs text-text-tertiary">
                    Enviada el{' '}
                    {user.realtorApplicationDate.toLocaleDateString('es-PE')}
                  </p>
                )}
              </div>
            </div>
          ) : user.realtorApplicationStatus === 'rejected' ? (
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <div>
                <span className="text-sm text-text-secondary">
                  Solicitud rechazada
                </span>
                <p className="mt-1">
                  <Link
                    to="/app/realtor-registration"
                    className="text-sm font-medium text-secondary hover:text-secondary-hover"
                  >
                    Enviar nueva solicitud
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                ¿Eres agente inmobiliario?
              </span>
              <Link
                to="/app/realtor-registration"
                className="text-sm font-medium text-secondary hover:text-secondary-hover"
              >
                Registrate como Agente
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Account info */}
      <Card>
        <h2 className="text-sm font-medium uppercase text-text-secondary">Cuenta</h2>
        <p className="mt-2 text-xs text-text-tertiary">
          Miembro desde {user.createdAt.toLocaleDateString('es-PE')}
        </p>
      </Card>

      {/* Delete account */}
      <Card>
        <h2 className="text-sm font-medium uppercase text-text-secondary">
          Configuracion de cuenta
        </h2>
        <p className="mt-2 text-sm text-text-tertiary">
          Al eliminar tu cuenta se desactivaran tus anuncios y se eliminaran tus datos personales.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            Eliminar Cuenta
          </Button>
        </div>
      </Card>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false)
            setDeleteError(null)
          }
        }}
        title="Eliminar cuenta"
      >
        <p className="text-sm text-text-secondary">
          Esta accion es permanente. Se eliminara:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-text-secondary">
          <li>Tu perfil y datos personales</li>
          <li>Tus favoritos y notificaciones</li>
          <li>Tus anuncios activos seran desactivados</li>
        </ul>
        <p className="mt-3 text-sm font-medium text-text-primary">
          ¿Estas seguro que deseas continuar?
        </p>

        {deleteError && (
          <p className="mt-3 text-sm text-error">{deleteError}</p>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setShowDeleteModal(false)
              setDeleteError(null)
            }}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            isLoading={isDeleting}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function PhoneForm({
  error,
  recoveryHint,
  isSubmitting,
  cooldown,
  onSubmit,
  onCancel,
}: {
  error: string | null
  recoveryHint: string | null
  isSubmitting: boolean
  cooldown: number
  onSubmit: (data: PhoneFormData) => void
  onCancel: () => void
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
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

      {error && (
        <div>
          <p className="text-sm text-error">{error}</p>
          {recoveryHint && (
            <p className="mt-1 text-sm text-text-tertiary">{recoveryHint}</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Espera ${cooldown}s` : 'Enviar codigo'}
        </Button>
        <Button
          type="button"
          variant="text"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function CodeForm({
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationCodeFormData>({
    resolver: zodResolver(verificationCodeSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        maxLength={6}
        className="text-center text-lg tracking-[0.3em]"
        error={errors.code?.message}
        {...register('code')}
      />

      {error && (
        <div>
          <p className="text-sm text-error">{error}</p>
          {recoveryHint && (
            <p className="mt-1 text-sm text-text-tertiary">{recoveryHint}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          Verificar
        </Button>
        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0}
          className={`text-sm ${cooldown > 0 ? 'text-text-tertiary cursor-not-allowed' : 'text-secondary hover:text-secondary-hover'}`}
        >
          {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar'}
        </button>
        <button
          type="button"
          onClick={onChangeNumber}
          className="text-sm text-secondary hover:text-secondary-hover"
        >
          Cambiar numero
        </button>
      </div>
    </form>
  )
}
