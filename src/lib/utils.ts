export function formatPrice(price?: number): string {
  if (!price) return 'Precio no disponible'
  return `S/ ${price.toLocaleString('es-PE')}`
}

const RETURN_URL_KEY = 'oqupa_returnUrl'

export function setReturnUrl(url: string) {
  localStorage.setItem(RETURN_URL_KEY, url)
}

export function consumeReturnUrl(): string | null {
  const url = localStorage.getItem(RETURN_URL_KEY)
  if (url) localStorage.removeItem(RETURN_URL_KEY)
  return url
}

export function getPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
