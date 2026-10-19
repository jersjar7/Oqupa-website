export function formatPrice(price?: number): string {
  if (!price) return 'Precio no disponible'
  return `S/. ${price.toLocaleString('es-PE')}`
}

const RETURN_URL_KEY = 'oqupa_returnUrl'

// A stashed return address expires: an abandoned "contact this seller" from
// days ago must not turn a later sign-in into an automatic WhatsApp redirect
// (hostile review, 2026-08-26).
export const RETURN_URL_TTL_MS = 30 * 60 * 1000

export function setReturnUrl(url: string) {
  localStorage.setItem(RETURN_URL_KEY, JSON.stringify({ url, at: Date.now() }))
}

export function consumeReturnUrl(): string | null {
  const raw = localStorage.getItem(RETURN_URL_KEY)
  if (!raw) return null
  localStorage.removeItem(RETURN_URL_KEY)
  try {
    const parsed = JSON.parse(raw) as { url?: string; at?: number }
    if (typeof parsed.url === 'string' && typeof parsed.at === 'number') {
      return Date.now() - parsed.at <= RETURN_URL_TTL_MS ? parsed.url : null
    }
  } catch {
    /* legacy plain-string value from before the TTL */
  }
  return raw.startsWith('/') ? raw : null
}

/**
 * The stored return address and when it was stored, WITHOUT removing it, or
 * null when there is none or it has expired. For code that only needs to know
 * where the person is headed (the contact funnel events, metrics plan A10) —
 * consuming it would cancel their errand. A legacy plain-string value has no
 * time and returns null.
 */
export function peekReturnUrl(): { url: string; at: number } | null {
  try {
    const raw = localStorage.getItem(RETURN_URL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { url?: string; at?: number }
    if (typeof parsed.url !== 'string' || typeof parsed.at !== 'number') return null
    return Date.now() - parsed.at <= RETURN_URL_TTL_MS ? { url: parsed.url, at: parsed.at } : null
  } catch {
    return null
  }
}

export function getPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
