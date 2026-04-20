import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  realtorApplicationSchema,
  type RealtorApplicationFormData,
} from '@/schemas/realtorApplicationSchema'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import { Button, Input, Card, Modal, Spinner } from '@/app/components/ui'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

type PageStatus = 'loading' | 'form' | 'already-verified' | 'pending' | 'incomplete-profile'

export default function RealtorRegistrationPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RealtorApplicationFormData>({
    resolver: zodResolver(realtorApplicationSchema),
    defaultValues: {
      businessName: '',
      yearsExperience: 0,
      serviceZones: '',
      motivation: '',
    },
  })

  useEffect(() => {
    if (!user) return

    // Pre-flight checks
    if (!user.name || !user.isPhoneVerified || !user.contactInfo?.whatsappPhoneNumber) {
      setPageStatus('incomplete-profile')
      return
    }

    if (user.isVerifiedRealtor) {
      setPageStatus('already-verified')
      return
    }

    if (user.realtorApplicationStatus === 'pending') {
      setPageStatus('pending')
      return
    }

    // Rejected users can reapply — show form
    setPageStatus('form')
  }, [user])

  async function onSubmit(data: RealtorApplicationFormData) {
    if (!user) return
    setSubmitError(null)

    const serviceZones = data.serviceZones
      .split(',')
      .map((z) => z.trim())
      .filter((z) => z.length > 0)

    if (serviceZones.length === 0) {
      setSubmitError('Ingresa al menos una zona de servicio')
      return
    }

    try {
      // Re-check user state to prevent duplicate submission from multiple tabs
      await refreshUser()
      const currentUser = useAuthStore.getState().user
      if (currentUser?.realtorApplicationStatus === 'pending') {
        setPageStatus('pending')
        return
      }
      if (currentUser?.isVerifiedRealtor) {
        setPageStatus('already-verified')
        return
      }

      await firestoreService.submitRealtorApplication(user.id, {
        fullName: user.name!,
        phone: user.contactInfo!.whatsappPhoneNumber,
        email: user.email,
        businessName: data.businessName ?? '',
        yearsExperience: data.yearsExperience,
        serviceZones,
        motivation: data.motivation,
      })

      await refreshUser()
      setShowSuccessModal(true)
    } catch {
      setSubmitError('Error al enviar la solicitud. Intenta de nuevo.')
    }
  }

  if (!user) return null

  if (pageStatus === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-sans text-[28px] font-medium text-text-primary">
        Registrate como Agente
      </h1>

      {/* Incomplete profile */}
      {pageStatus === 'incomplete-profile' && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Completa tu perfil primero
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Necesitas tener tu nombre completo y telefono verificado antes de aplicar como agente.
              </p>
              <div className="mt-4">
                <Button onClick={() => navigate('/app/verify')}>
                  Completar verificacion
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Already verified */}
      {pageStatus === 'already-verified' && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Ya eres un agente verificado
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tu cuenta ya tiene acceso a las funciones de agente inmobiliario.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pending application */}
      {pageStatus === 'pending' && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Solicitud en revision
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tu solicitud esta siendo revisada. Te contactaremos en 24-48 horas.
              </p>
              {user.realtorApplicationDate && (
                <p className="mt-2 text-xs text-text-tertiary">
                  Enviada el{' '}
                  {user.realtorApplicationDate.toLocaleDateString('es-PE')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Registration form */}
      {pageStatus === 'form' && (
        <>
          {/* Rejected reapply notice */}
          {user.realtorApplicationStatus === 'rejected' && (
            <Card className="mt-6">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Tu solicitud anterior fue rechazada
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Puedes enviar una nueva solicitud con informacion actualizada.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* How it works */}
          <Card className="mt-6">
            <h2 className="text-sm font-medium uppercase text-text-primary">
              Como funciona
            </h2>
            <ol className="mt-3 space-y-3">
              {[
                'Completa el formulario con tu informacion profesional',
                'Nuestro equipo revisara tu solicitud',
                'Te contactaremos por telefono para verificar tu identidad',
                'Una vez aprobado, tendras acceso a oportunidades inmobiliarias',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text-secondary">{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          {/* Profile info (read-only) */}
          <Card className="mt-6">
            <h2 className="text-sm font-medium uppercase text-text-primary">
              Tu informacion
            </h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Nombre</span>
                <span className="text-text-primary">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Email</span>
                <span className="text-text-primary">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-tertiary">Telefono</span>
                <span className="text-text-primary">
                  {user.contactInfo?.whatsappPhoneNumber}
                </span>
              </div>
            </div>
          </Card>

          {/* Professional info form */}
          <Card className="mt-6">
            <h2 className="text-sm font-medium uppercase text-text-primary">
              Informacion profesional
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-4 space-y-4"
            >
              <Input
                label="Nombre del negocio (opcional)"
                placeholder="Ej: Inmobiliaria Los Andes"
                error={errors.businessName?.message}
                {...register('businessName')}
              />

              <Input
                label="Anos de experiencia"
                type="number"
                min={0}
                max={50}
                error={errors.yearsExperience?.message}
                {...register('yearsExperience', { valueAsNumber: true })}
              />

              <Input
                label="Zonas de servicio"
                placeholder="Ej: Piura, Castilla, Catacaos"
                error={errors.serviceZones?.message}
                {...register('serviceZones')}
              />
              <p className="-mt-2 text-xs text-text-tertiary">
                Separar multiples zonas con comas
              </p>

              <div>
                <label
                  htmlFor="motivation"
                  className="mb-1.5 block text-sm font-medium uppercase text-text-primary"
                >
                  Motivacion
                </label>
                <textarea
                  id="motivation"
                  rows={4}
                  placeholder="¿Por que quieres ser agente en Oqupa?"
                  className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    errors.motivation
                      ? 'border-error focus:border-error focus:ring-error/20'
                      : 'border-border'
                  }`}
                  {...register('motivation')}
                />
                {errors.motivation && (
                  <p className="mt-1.5 text-sm text-error">
                    {errors.motivation.message}
                  </p>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-error">{submitError}</p>
              )}

              <Button type="submit" isLoading={isSubmitting}>
                Enviar Solicitud
              </Button>
            </form>
          </Card>
        </>
      )}

      {/* Success modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          navigate('/app/profile')
        }}
        title="Solicitud enviada"
      >
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="h-12 w-12 text-success" />
          <p className="mt-4 text-sm text-text-secondary">
            Tu solicitud ha sido enviada exitosamente. Te contactaremos en
            24-48 horas para verificar tu identidad.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                navigate('/app/profile')
              }}
            >
              Ir a Mi Perfil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
