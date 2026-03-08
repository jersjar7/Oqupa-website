import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormData } from '@/schemas/profileSchema'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Button, Input, Select, Card } from '@/app/components/ui'
import { CONTACT_TIME_SLOT_LABELS } from '@/types/enums'
import { CheckCircle, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshUser } = useAuthStore()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    } catch {
      setError('Error al actualizar el perfil')
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
    </div>
  )
}
