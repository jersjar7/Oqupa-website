import { describe, it, expect, beforeEach } from 'vitest'
import { arrivalVia, captureArrival, resetArrival } from '../arrival'

const at = (href: string, referrer = '') => {
  const url = new URL(href)
  captureArrival({ location: { pathname: url.pathname, search: url.search, href } as Location }, { referrer }, null)
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

  it('Oqupa\'s share link: WhatsApp when the referrer says so, else "share" (web 4 #1)', () => {
    at('https://oqupa.com/property/L1?utm_source=share&utm_medium=web', 'android-app://com.whatsapp/')
    expect(arrivalVia('/property/L1', true)).toBe('whatsapp')
    at('https://oqupa.com/property/L1?utm_source=share&utm_medium=web')
    expect(arrivalVia('/property/L1', true)).toBe('share')
  })

  it('the Gmail app is not Google; our own hosts are not a source (web 4 #4)', () => {
    at('https://oqupa.com/property/L1', 'android-app://com.google.android.gm/')
    expect(arrivalVia('/property/L1', true)).toBe('other')
    at('https://oqupa.com/property/L1', 'https://oqupa-production.web.app/explorar')
    expect(arrivalVia('/property/L1', true)).toBe('other')
  })

  it('once per tab: coming back from a sign-in page keeps the first arrival (web 4 #4)', () => {
    const store = new Map<string, string>()
    const session = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
    captureArrival({ location: { pathname: '/property/L1', search: '?utm_source=whatsapp', href: 'https://oqupa.com/property/L1?utm_source=whatsapp' } as Location }, { referrer: '' }, session)
    captureArrival({ location: { pathname: '/property/L1', search: '', href: 'https://oqupa.com/property/L1' } as Location }, { referrer: 'https://accounts.google.com/' }, session)
    expect(arrivalVia('/property/L1', true)).toBe('whatsapp')
  })

  it('a new visit from elsewhere in the same tab is a new arrival (web 5 #2)', () => {
    const store = new Map<string, string>()
    const session = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
    captureArrival({ location: { pathname: '/property/A', search: '?utm_source=whatsapp', href: 'https://oqupa.com/property/A?utm_source=whatsapp' } as Location }, { referrer: '' }, session)
    captureArrival({ location: { pathname: '/property/C', search: '', href: 'https://oqupa.com/property/C' } as Location }, { referrer: 'https://www.google.com/' }, session)
    expect(arrivalVia('/property/C', true)).toBe('google')
  })
})
