import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { profileSchema, type ProfileFormData } from '@/schemas/profileSchema'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Button, Input, Select, Card, Modal, Badge } from '@/app/components/ui'
import { CONTACT_TIME_SLOT_LABELS } from '@/types/enums'
import { CheckCircle, Shield, Clock, XCircle } from 'lucide-react'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[28px] font-normal text-text-primary">
        Mi Perfil
      </h1>

      {/* Verification status */}
      <Card className="mt-6">
        <h2 className="text-sm font-medium uppercase text-text-primary">
          Estado de verificacion
        </h2>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`h-4 w-4 ${user.isPhoneVerified ? 'text-success' : 'text-text-tertiary'}`}
            />
            <span className="text-sm text-text-secondary">
              Telefono {user.isPhoneVerified ? 'verificado' : 'no verificado'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Shield
              className={`h-4 w-4 ${user.isIdentityVerified ? 'text-success' : 'text-text-tertiary'}`}
            />
            <span className="text-sm text-text-secondary">
              Identidad {user.isIdentityVerified ? 'verificada' : 'no verificada'}
            </span>
          </div>
        </div>
      </Card>

      {/* Realtor status */}
      <Card className="mt-6">
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

      {/* Profile form */}
      <Card className="mt-6">
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

          <Input
            label="Telefono"
            value={user.contactInfo?.whatsappPhoneNumber ?? 'No registrado'}
            disabled
          />

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

      {/* Account info */}
      <Card className="mt-6">
        <h2 className="text-sm font-medium uppercase text-text-secondary">Cuenta</h2>
        <p className="mt-2 text-xs text-text-tertiary">
          Miembro desde {user.createdAt.toLocaleDateString('es-PE')}
        </p>
      </Card>

      {/* Delete account */}
      <Card className="mt-6">
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
