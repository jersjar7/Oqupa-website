// After the gate (ADR-046 #6): the WhatsApp greeting is the app's sentence;
// failures name the cause; the number is offered to call and copy.
import { describe, it, expect } from 'vitest'
import { whatsappGreeting, contactFailureMessage, telHref, displayPhone } from '../contactReveal'

describe('whatsappGreeting (the app sentence)', () => {
  it('greets by first name and says Oqupa', () => {
    expect(
      whatsappGreeting({ displayName: 'María López', propertyTypeLabel: 'Casa', place: 'Av. Grau 123, Castilla', priceText: 'US$ 98,000' }),
    ).toBe('Hola María, vi tu propiedad en Oqupa: Casa en Av. Grau 123, Castilla por US$ 98,000. Me interesa obtener más información.')
  })
  it('without a name just "Hola"; never "su sitio web"', () => {
    const text = whatsappGreeting({ displayName: null, propertyTypeLabel: 'Terreno', place: 'Castilla', priceText: 'S/. 50,000' })
    expect(text).toBe('Hola, vi tu propiedad en Oqupa: Terreno en Castilla por S/. 50,000. Me interesa obtener más información.')
    expect(text).not.toMatch(/sitio web/)
  })
  it('with no place, leaves it out', () => {
    expect(whatsappGreeting({ displayName: null, propertyTypeLabel: 'Casa', place: '', priceText: 'S/. 1' })).toBe(
      'Hola, vi tu propiedad en Oqupa: Casa por S/. 1. Me interesa obtener más información.',
    )
  })
})

describe('contactFailureMessage', () => {
  it('offline says so', () => {
    expect(contactFailureMessage('unavailable', false)).toBe('Sin conexión. Revisa tu internet y vuelve a intentarlo.')
  })
  it('the server sentences', () => {
    expect(contactFailureMessage('listing-not-available', true)).toBe('Esta publicación ya no está disponible.')
    expect(contactFailureMessage('listing-has-no-contact', true)).toBe('Esta publicación no tiene un número de contacto.')
    expect(contactFailureMessage('rate-limited', true)).toBe('Has visto muchos contactos hoy. Intenta de nuevo mañana.')
  })
  it('anything else is the catch-all', () => {
    expect(contactFailureMessage('unavailable', true)).toBe('Algo salió mal. Verifica tus datos y vuelve a intentarlo.')
  })
})

describe('the number', () => {
  it('tel: keeps the + and digits only', () => expect(telHref('+51 912 345 678')).toBe('tel:+51912345678'))
  it('Peru numbers are shown in groups', () => expect(displayPhone('+51912345678')).toBe('+51 912 345 678'))
  it('other numbers are shown as given', () => expect(displayPhone('+1 555 0100')).toBe('+1 555 0100'))
})
