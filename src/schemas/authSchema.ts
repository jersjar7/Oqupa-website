import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
})
export type LoginFormData = z.infer<typeof loginSchema>

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/\d/, 'Debe incluir al menos un número')
  .regex(/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>/?`~]/, 'Debe incluir al menos un símbolo')

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Ingresa un correo válido'),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
export type RegisterFormData = z.infer<typeof registerSchema>

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
})
export type MagicLinkFormData = z.infer<typeof magicLinkSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
})
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const setPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
export type SetPasswordFormData = z.infer<typeof setPasswordSchema>

export const nameSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
})
export type NameFormData = z.infer<typeof nameSchema>

export const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Ingresa un número de teléfono')
    .regex(/^\d+$/, 'Solo dígitos'),
  countryCode: z.enum(['+51', '+1']),
}).refine((data) => {
  if (data.countryCode === '+51') return data.phoneNumber.length === 9
  if (data.countryCode === '+1') return data.phoneNumber.length === 10
  return false
}, {
  message: 'Ingresa un número válido para el país seleccionado',
  path: ['phoneNumber'],
})
export type PhoneFormData = z.infer<typeof phoneSchema>

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico'),
})
export type VerificationCodeFormData = z.infer<typeof verificationCodeSchema>
