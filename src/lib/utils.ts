export function formatPrice(price?: number): string {
  if (!price) return 'Precio no disponible'
  return `S/ ${price.toLocaleString('es-PE')}`
}

export function getPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}
