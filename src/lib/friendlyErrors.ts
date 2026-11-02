// Turns a failed server call into words a person can act on: the cause and
// the next step (feature audit 2026-11-02, sections E–G). Never the SDK's own
// English ("internal", "deadline-exceeded") and never raw server text that is
// not Spanish.

export const OFFLINE_MESSAGE = 'Sin conexión. Revisa tu internet y vuelve a intentarlo.'
export const GENERIC_MESSAGE = 'Algo salió mal. Verifica tus datos y vuelve a intentarlo.'

/** Codes a dropped connection or timeout produces (Functions, Firestore,
 *  Auth). Not functions/internal: that is a server fault, not the network
 *  (review 2026-11-02). */
const NETWORK_CODES = new Set([
  'functions/unavailable',
  'functions/deadline-exceeded',
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
  // A server fault may carry a Spanish sentence of its own; the SDK's bare
  // word "internal" is filtered out below.
  'functions/internal',
])

/** Server sentences that are still English, in Spanish. Anything English not
 *  listed here falls to the catch-all rather than reaching the screen. */
const ENGLISH_SERVER_MESSAGES: Record<string, string> = {
  'You are not assigned to this listing': 'El dueño ya no te tiene asignado a esta publicación.',
  'Assignment must be accepted before editing': 'Primero acepta la invitación del dueño.',
  'Listing not found': 'Esta publicación ya no existe.',
  'Property not found': 'Esta publicación ya no existe.',
  'Listing has no associated property': 'Esta publicación ya no existe.',
  'Must be logged in': 'Tu sesión se cerró. Vuelve a iniciar sesión.',
  // getUploadUrl: only the owner can upload photos for now (review 2026-11-02).
  'You do not own this property': 'Por ahora solo el dueño puede agregar fotos nuevas.',
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

/** The server's untranslated sentences are English ("Must be logged in",
 *  "listingId is required"); Spanish ones never use these words. */
function looksEnglish(text: string): boolean {
  return /\b(the|is|are|must|be|not|required|invalid|cannot|only|should|to|of|and|failed|internal)\b/i.test(text)
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
  const code = codeOf(err)
  const message = messageOf(err)
  // The English lookup first: a known sentence always reads in Spanish.
  if (message && ENGLISH_SERVER_MESSAGES[message]) return ENGLISH_SERVER_MESSAGES[message]
  if (isOfflineError(err, online)) return OFFLINE_MESSAGE
  // The SDK's own word ("internal", "not-found"…) is never a sentence.
  const sdkWord = code ? code.replace(/^functions\//, '') : ''
  if (code && BUSINESS_CODES.has(code) && message && message !== sdkWord && !looksEnglish(message)) return message
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
