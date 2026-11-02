// Turns a failed server call into words a person can act on: the cause and
// the next step (feature audit 2026-11-02, sections E–G). Never the SDK's own
// English ("internal", "deadline-exceeded") and never raw server text that is
// not Spanish.

export const OFFLINE_MESSAGE = 'Sin conexión. Revisa tu internet y vuelve a intentarlo.'
export const GENERIC_MESSAGE = 'Algo salió mal. Verifica tus datos y vuelve a intentarlo.'

/** Codes a dropped connection or timeout produces (Functions, Firestore, Auth). */
const NETWORK_CODES = new Set([
  'functions/unavailable',
  'functions/deadline-exceeded',
  'functions/internal',
  'unavailable',
  'deadline-exceeded',
  'auth/network-request-failed',
])

/** Codes whose message is the server's own sentence for the person. */
const BUSINESS_CODES = new Set([
  'functions/unauthenticated',
  'functions/permission-denied',
  'functions/failed-precondition',
  'functions/already-exists',
  'functions/resource-exhausted',
  'functions/not-found',
  'functions/out-of-range',
])

/** Server sentences that are still English, in Spanish. Anything English not
 *  listed here falls to the catch-all rather than reaching the screen. */
const ENGLISH_SERVER_MESSAGES: Record<string, string> = {
  'You are not assigned to this listing': 'El propietario ya no te tiene asignado a esta publicación.',
  'Assignment must be accepted before editing': 'Primero acepta la invitación del propietario.',
  'Listing not found': 'Esta publicación ya no existe.',
  'Property not found': 'Esta publicación ya no existe.',
  'Listing has no associated property': 'Esta publicación ya no existe.',
  'Must be logged in': 'Tu sesión se cerró. Vuelve a iniciar sesión.',
}

function codeOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : undefined
}

function messageOf(err: unknown): string {
  const message = (err as { message?: unknown } | null)?.message
  return typeof message === 'string' ? message.trim() : ''
}

function browserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Spanish text has accents, ñ, ¿/¡, or common Spanish words; the server's
 *  English sentences have none of these. */
function looksSpanish(text: string): boolean {
  return /[áéíóúñ¿¡]/i.test(text) || /\b(esta|este|tu|tus|ya|no|el|la|los|las|de|en|por|para|que)\b/i.test(text)
}

export function isOfflineError(err: unknown, online: boolean = browserOnline()): boolean {
  if (!online) return true
  const code = codeOf(err)
  return code != null && NETWORK_CODES.has(code)
}

/** For an httpsCallable failure. */
export function callableErrorMessage(
  err: unknown,
  opts: { online?: boolean; fallback?: string } = {},
): string {
  const online = opts.online ?? browserOnline()
  const fallback = opts.fallback ?? GENERIC_MESSAGE
  if (isOfflineError(err, online)) return OFFLINE_MESSAGE
  const code = codeOf(err)
  const message = messageOf(err)
  if (message && ENGLISH_SERVER_MESSAGES[message]) return ENGLISH_SERVER_MESSAGES[message]
  if (code && BUSINESS_CODES.has(code) && message && looksSpanish(message)) return message
  return fallback
}

/** For a direct Firestore write on the person's own listing. */
export function firestoreWriteErrorMessage(
  err: unknown,
  opts: { online?: boolean } = {},
): string {
  const online = opts.online ?? browserOnline()
  if (isOfflineError(err, online)) return OFFLINE_MESSAGE
  const code = codeOf(err)
  if (code === 'permission-denied' || code === 'not-found') {
    return 'Esta publicación ya no existe o no es tuya. Actualiza la página.'
  }
  return 'No se pudo guardar el cambio. Vuelve a intentarlo.'
}
