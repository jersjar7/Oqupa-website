import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  realtorApplicationSchema,
  EXPERIENCE_RANGES,
  type RealtorApplicationFormData,
} from '@/schemas/realtorApplicationSchema'
import { POPULAR_PIURA_DISTRICTS } from '@/lib/map/piuraDistricts'
import OfficialDistrictPicker from '@/app/features/listings/components/OfficialDistrictPicker'
import { useAuthStore } from '@/stores/authStore'
import { firestoreService } from '@/services/firestoreService'
import { AnalyticsLogger } from '@/lib/analytics'
import { Button, Card, Modal, Spinner } from '@/app/components/ui'
import { Check, CheckCircle, Clock, Search, X, XCircle } from 'lucide-react'

type PageStatus = 'loading' | 'form' | 'already-verified' | 'pending' | 'incomplete-profile'

export default function RealtorRegistrationPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // realtor_application_started goes out once per visit; the effect below
  // reruns whenever the user object changes.
  const startedSentRef = useRef(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RealtorApplicationFormData>({
    resolver: zodResolver(realtorApplicationSchema),
    defaultValues: {
      yearsExperience: undefined,
      serviceZones: [],
      motivation: '',
    },
  })

  useEffect(() => {
    if (!user) return

    // Anyone who can still apply, including the incomplete-profile screen, to
    // match the app. Not verified realtors or a pending application.
    if (
      !startedSentRef.current &&
      !user.isVerifiedRealtor &&
      user.realtorApplicationStatus !== 'pending'
    ) {
      startedSentRef.current = true
      try {
        AnalyticsLogger.realtorApplicationStarted()
      } catch {
        // Analytics must never affect the page.
      }
    }

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

    const serviceZones = [...data.serviceZones].sort((a, b) => a.localeCompare(b, 'es'))

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
        // Independent by default, as in the app (the field left the form).
        businessName: '',
        yearsExperience: data.yearsExperience,
        serviceZones,
        motivation: data.motivation,
      })
      // Right after the write: the application exists now, even if the
      // refresh below fails.
      AnalyticsLogger.realtorApplicationSubmitted()

      await refreshUser()
      setShowSuccessModal(true)
    } catch {
      setSubmitError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'Sin conexión. Revisa tu internet y vuelve a intentarlo.'
          : 'Error al enviar la solicitud. Vuelve a intentarlo.',
      )
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
      <h1 className="font-serif text-[28px] font-normal text-text-primary">
        Regístrate como agente
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
                Necesitas tener tu nombre completo y teléfono verificado antes de aplicar como agente.
              </p>
              <div className="mt-4">
                <Button onClick={() => navigate('/app/verify')}>
                  Completar verificación
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
                Solicitud en revisión
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Tu solicitud está siendo revisada. Te verificamos en 24-48 h.
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
                    Puedes enviar una nueva solicitud con información actualizada.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* How it works — the app's words (ADR-046 #19) */}
          <Card className="mt-6">
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-secondary">Antes de empezar</p>
            <h2 className="mt-1 font-serif text-[22px] font-normal text-text-primary">
              Así funciona ser agente en Oqupa
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Conectamos a dueños que quieren ayuda con agentes verificados como tú. En 4 pasos:
            </p>
            <ol className="mt-4 space-y-3">
              {[
                ['Postúlate', '3 preguntas rápidas. Te verificamos en 24-48 h.'],
                ['Ve "Oportunidades"', 'Anuncios donde el dueño pidió ayuda de un agente.'],
                ['Reclama (hasta 5 al mes)', 'Al reclamar, recibes el contacto del dueño.'],
                ['El dueño elige', 'Si te elige, tu número aparece en el anuncio como contacto.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{title}</span>
                    <span className="block text-sm text-text-secondary">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-secondary">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span className="normal-case">Sin comisiones — Oqupa no cobra por esto</span>
            </p>
          </Card>

          {/* Profile info (read-only) */}
          <Card className="mt-6">
            <h2 className="text-sm font-medium uppercase text-text-primary">
              Tu información
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
                <span className="text-text-tertiary">Teléfono</span>
                <span className="text-text-primary">
                  {user.contactInfo?.whatsappPhoneNumber}
                </span>
              </div>
            </div>
          </Card>

          {/* Professional info form */}
          <Card className="mt-6">
            <h2 className="text-sm font-medium uppercase text-text-primary">
              Información profesional
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-4 space-y-4"
            >
              {/* Experience: the app's ranges */}
              <fieldset>
                <legend className="mb-2 block font-sans text-xs font-medium uppercase text-secondary">
                  ¿Cuántos años llevas trabajando como agente?
                </legend>
                <Controller
                  control={control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <div role="radiogroup" className="flex flex-col gap-2">
                      {EXPERIENCE_RANGES.map((r) => {
                        const checked = field.value === r.years
                        return (
                          <button
                            key={r.years}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            onClick={() => field.onChange(r.years)}
                            className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-base transition-colors ${
                              checked
                                ? 'border-secondary bg-secondary/10 text-text-primary'
                                : 'border-border bg-white text-text-primary hover:bg-background-secondary'
                            }`}
                          >
                            {r.label}
                            {checked && <Check className="h-5 w-5 text-secondary" aria-hidden="true" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
                {errors.yearsExperience && (
                  <p className="mt-1.5 text-sm text-error">{errors.yearsExperience.message}</p>
                )}
              </fieldset>

              {/* Districts: the official list, as in the app */}
              <fieldset>
                <legend className="mb-1 block font-sans text-xs font-medium uppercase text-secondary">
                  ¿En qué distritos trabajas?
                </legend>
                <p className="mb-2 text-sm text-text-secondary">
                  Oqupa cubre todo el departamento de Piura. Elige todos los que apliquen.
                </p>
                <Controller
                  control={control}
                  name="serviceZones"
                  render={({ field }) => {
                    const selected = [...field.value].sort((a, b) => a.localeCompare(b, 'es'))
                    const add = (name: string) => {
                      if (!field.value.includes(name)) field.onChange([...field.value, name])
                    }
                    return (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {selected.map((name) => (
                            <button
                              key={name}
                              type="button"
                              aria-label={`Quitar ${name}`}
                              onClick={() => field.onChange(field.value.filter((z) => z !== name))}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-medium text-white"
                            >
                              {name}
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ))}
                          {POPULAR_PIURA_DISTRICTS.filter((d) => !field.value.includes(d)).map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => add(name)}
                              className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-text-primary hover:bg-background-secondary"
                            >
                              {name}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-secondary hover:text-secondary-hover"
                          >
                            <Search className="h-4 w-4" aria-hidden="true" />
                            Buscar distrito
                          </button>
                        </div>
                        {pickerOpen && (
                          <OfficialDistrictPicker
                            onPick={(d) => {
                              add(d.distrito)
                              setPickerOpen(false)
                            }}
                            onClose={() => setPickerOpen(false)}
                          />
                        )}
                      </>
                    )
                  }}
                />
                {errors.serviceZones && (
                  <p className="mt-1.5 text-sm text-error">
                    {errors.serviceZones.message ?? errors.serviceZones.root?.message}
                  </p>
                )}
              </fieldset>

              <div>
                <label
                  htmlFor="motivation"
                  className="mb-1.5 block font-sans font-medium uppercase text-xs text-secondary"
                >
                  Motivación
                </label>
                <textarea
                  id="motivation"
                  rows={4}
                  placeholder="¿Por qué quieres ser agente en Oqupa?"
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
                Enviar solicitud
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
            Te verificamos en 24-48 h. Mientras tanto, sigue explorando propiedades.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                navigate('/app/profile')
              }}
            >
              Ir a Mi perfil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
