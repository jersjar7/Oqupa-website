import { z } from 'zod'
import { PASSWORD_LOWERCASE, PASSWORD_UPPERCASE } from '@/lib/passwordRules'

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
  .regex(PASSWORD_UPPERCASE, 'Debe incluir al menos una mayúscula')
  .regex(PASSWORD_LOWERCASE, 'Debe incluir al menos una minúscula')
  .regex(/\d/, 'Debe incluir al menos un número')
  .regex(/[!@#$%^&*()_+\-=[\]{};:"\\|,.<>/?`~]/, 'Debe incluir al menos un símbolo')

// One password box, as in the app (ADR-046 #9): the person is choosing a
// password, not transcribing one, and the requirements show as they type.
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingresa un correo válido'),
  password: passwordSchema,
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

// One name rule on both apps (ADR-046 #10): 2–100 characters; letters
// (accents and ñ included), spaces, apostrophe, hyphen and period; no digits.
// Mirrored in the app's NameRule (lib/utils/validators/name_rule.dart).
export const NAME_DIGITS_MESSAGE = 'Tu nombre no puede llevar números.'
export const NAME_CHARACTERS_MESSAGE = "Usa solo letras, espacios, apóstrofo ('), guion (-) y punto (.)."

export const nameFieldSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre es demasiado largo')
  .refine((name) => !/\d/.test(name), NAME_DIGITS_MESSAGE)
  .refine(
    (name) => /\d/.test(name) || (/^[\p{L}\p{M} '’.-]+$/u.test(name) && /\p{L}/u.test(name)),
    NAME_CHARACTERS_MESSAGE,
  )

export const nameSchema = z.object({
  name: nameFieldSchema,
})
export type NameFormData = z.infer<typeof nameSchema>

export const PERU_MOBILE_MESSAGE = 'Ingresa tu celular: 9 dígitos que empiezan con 9.'

const COUNTRY_DIGITS: Record<string, string> = { '+51': '51', '+1': '1' }

/**
 * The digits of a national number, however it was typed or pasted: spaces,
 * dashes, dots and brackets go, and so does the country's own prefix
 * ("+51 912 345 678", "51912345678"). Anything else (a letter) is left in, so
 * the check below refuses it. Audit 2026-11-02, top item 4: the box refused
 * the spaces its own example shows.
 */
export function normalizeNationalPhoneNumber(typed: string, countryCode: string): string {
  let value = typed.replace(/[\s\-.()]/g, '')
  const prefix = COUNTRY_DIGITS[countryCode]
  const expected = countryCode === '+51' ? 9 : 10
  if (prefix) {
    if (value.startsWith(`+${prefix}`)) value = value.slice(prefix.length + 1)
    else if (value.startsWith(prefix) && value.length === prefix.length + expected) {
      value = value.slice(prefix.length)
    }
  }
  return value
}

export const phoneSchema = z
  .object({
    phoneNumber: z.string(),
    countryCode: z.enum(['+51', '+1']),
  })
  .transform((data) => ({
    ...data,
    phoneNumber: normalizeNationalPhoneNumber(data.phoneNumber, data.countryCode),
  }))
  .superRefine((data, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['phoneNumber'] })
    if (!data.phoneNumber) return issue('Ingresa un número de teléfono')
    if (!/^\d+$/.test(data.phoneNumber)) return issue('Solo dígitos')
    // A Peru number must be a mobile (ADR-046 #11): a landline was accepted
    // and the SMS never arrived. Other countries unchanged.
    if (data.countryCode === '+51' && !/^9\d{8}$/.test(data.phoneNumber)) {
      return issue(PERU_MOBILE_MESSAGE)
    }
    if (data.countryCode === '+1' && data.phoneNumber.length !== 10) {
      return issue('Ingresa un número válido para el país seleccionado')
    }
  })
export type PhoneFormData = z.infer<typeof phoneSchema>

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'El código debe tener 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe ser numérico'),
})
export type VerificationCodeFormData = z.infer<typeof verificationCodeSchema>
