export function formatPrice(price?: number): string {
  if (!price) return 'Precio no disponible'
  return `S/. ${price.toLocaleString('es-PE')}`
}

const RETURN_URL_KEY = 'oqupa_returnUrl'

// A stashed return address expires: an abandoned "contact this seller" from
// days ago must not turn a later sign-in into an automatic WhatsApp redirect
// (hostile review, 2026-08-26).
const RETURN_URL_TTL_MS = 30 * 60 * 1000

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

export function getPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
