import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo valido'),
  password: z
    .string()
    .min(1, 'La contrasena es requerida'),
})
export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El correo es requerido')
      .email('Ingresa un correo valido'),
    password: z
      .string()
      .min(6, 'La contrasena debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword'],
  })
export type RegisterFormData = z.infer<typeof registerSchema>

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo valido'),
})
export type MagicLinkFormData = z.infer<typeof magicLinkSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo valido'),
})
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'La contrasena debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
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
    .min(1, 'Ingresa un numero de telefono')
    .regex(/^\d+$/, 'Solo digitos'),
  countryCode: z.enum(['+51', '+1']),
}).refine((data) => {
  if (data.countryCode === '+51') return data.phoneNumber.length === 9
  if (data.countryCode === '+1') return data.phoneNumber.length === 10
  return false
}, {
  message: 'Ingresa un numero valido para el pais seleccionado',
  path: ['phoneNumber'],
})
export type PhoneFormData = z.infer<typeof phoneSchema>

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'El codigo debe tener 6 digitos')
    .regex(/^\d{6}$/, 'El codigo debe ser numerico'),
})
export type VerificationCodeFormData = z.infer<typeof verificationCodeSchema>
