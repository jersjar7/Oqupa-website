import { z } from 'zod'

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
      .min(6, 'La contrasena debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
