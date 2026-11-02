import { z } from 'zod'
import { nameFieldSchema } from './authSchema'

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  preferredContactTimeSlot: z.enum(['morning', 'afternoon', 'evening', 'anytime']),
  additionalContactNotes: z.string().max(500).optional(),
})
export type ProfileFormData = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

/**
 * Mi perfil: the setup's one name rule (ADR-046 #10), applied only when the
 * person changed the name — stored names are never re-checked (hostile
 * review 2026-11-02, item 4). Null when there is nothing to say.
 */
export function editedNameError(typed: string, stored: string | undefined): string | null {
  if (typed.trim() === (stored ?? '').trim()) return null
  const result = nameFieldSchema.safeParse(typed)
  return result.success ? null : (result.error.issues[0]?.message ?? null)
}
