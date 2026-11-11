import { describe, it, expect, beforeEach } from 'vitest'
import { arrivalVia, captureArrival, resetArrival } from '../arrival'

const at = (href: string, referrer = '') => {
  const url = new URL(href)
  captureArrival({ location: { pathname: url.pathname, search: url.search, href } as Location }, { referrer })
}

describe('arrival (ADR-058 R1)', () => {
  beforeEach(() => resetArrival())

  it('the first page of a visit says where the visit came from', () => {
    at('https://oqupa.com/property/L1?utm_source=whatsapp')
    expect(arrivalVia('/property/L1', true)).toBe('whatsapp')
    at('https://oqupa.com/property/L1', 'https://l.facebook.com/x')
    expect(arrivalVia('/property/L1', true)).toBe('facebook')
    at('https://oqupa.com/property/L1', 'https://www.google.com/')
    expect(arrivalVia('/property/L1', true)).toBe('google')
    at('https://oqupa.com/property/L1?utm_source=ig')
    expect(arrivalVia('/property/L1', true)).toBe('facebook')
  })

  it('no tag and no referrer is "other", never a guessed "direct" (WhatsApp often sends no referrer)', () => {
    at('https://oqupa.com/property/L1')
    expect(arrivalVia('/property/L1', true)).toBe('other')
  })

  it('a listing opened from inside Oqupa is "direct"', () => {
    at('https://oqupa.com/explorar?utm_source=facebook')
    expect(arrivalVia('/property/L1', false)).toBe('direct')
    expect(arrivalVia('/property/L1', true)).toBe('direct') // not the landing path
  })

  it('our own site as referrer is not an outside source', () => {
    at('https://oqupa.com/property/L1', 'https://oqupa.com/explorar')
    expect(arrivalVia('/property/L1', true)).toBe('other')
  })
})
