// Persistent per-browser identifier used to dedupe anonymous listing views.
// Stored in localStorage so it survives tab closes but is scoped to this origin.
// Cleared if the user clears site data — that's acceptable; they simply get
// counted once more.

const STORAGE_KEY = 'oqupa.clientId'

let memoryFallback: string | null = null

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getOrCreateClientId(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      if (!memoryFallback) memoryFallback = randomUuid()
      return memoryFallback
    }
    let id = window.localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = randomUuid()
      window.localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    if (!memoryFallback) memoryFallback = randomUuid()
    return memoryFallback
  }
}
