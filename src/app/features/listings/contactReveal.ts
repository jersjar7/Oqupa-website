// What the contact button says and offers once the server hands the number
// over (ADR-046 #6, audit 2026-11-02 section B).
import { OFFLINE_MESSAGE, GENERIC_MESSAGE } from '@/lib/friendlyErrors'
import type { ContactDenialReason } from '@/services/contactService'

/** The app's greeting (action_buttons_section.dart), so the seller reads the
 *  same message from either platform — and it says Oqupa. */
export function whatsappGreeting(input: {
  displayName: string | null | undefined
  propertyTypeLabel: string
  place: string
  priceText: string
}): string {
  const first = input.displayName?.trim().split(/\s+/)[0]
  const greeting = first ? `Hola ${first}` : 'Hola'
  const where = input.place ? ` en ${input.place}` : ''
  return `${greeting}, vi tu propiedad en Oqupa: ${input.propertyTypeLabel}${where} por ${input.priceText}. Me interesa obtener más información.`
}

export function contactFailureMessage(reason: ContactDenialReason, online: boolean): string {
  if (reason === 'listing-not-available') return 'Esta publicación ya no está disponible.'
  if (reason === 'listing-has-no-contact') return 'Esta publicación no tiene un número de contacto.'
  if (reason === 'rate-limited') return 'Has visto muchos contactos hoy. Intenta de nuevo mañana.'
  return online ? GENERIC_MESSAGE : OFFLINE_MESSAGE
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** "+51 912 345 678" for a Peru mobile; anything else as given. */
export function displayPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  const m = /^\+51(9\d{2})(\d{3})(\d{3})$/.exec(digits)
  return m ? `+51 ${m[1]} ${m[2]} ${m[3]}` : phone
}
