// "¿No es tu correo? Cámbialo" — the email sign-up fix, step 2
// (docs/email-signup-fix-plan.md; wording approved by Jerson 2026-10-21).
//
// A typo at sign-up used to leave the person waiting for a link that went to
// an address nobody reads; the only way out was to abandon the account. Now
// they can correct it on the email step: the new address gets the link.
//
// Measured on staging 2026-10-24, and what each fact means here:
//   - The request succeeds for ANY address, even one that already has an
//     account (enumeration protection). The client cannot tell; the link page
//     reports it when the change is refused.
//   - Opening the link switches the account's email AND confirms it, and signs
//     the old session out everywhere. So the person signs in again with the new
//     email and the same password — this file remembers the new address so the
//     sign-in screen can offer it.
//   - Nothing updates the profile's own `email` field; profileEmailToSync says
//     when the client must.
// The same words are pinned in the app (auth_error_messages.dart and the
// verify-email page).

export const EMAIL_CHANGE_COPY = {
  link: 'Cámbialo',
  linkLead: '¿No es tu correo?',
  fieldLabel: 'Tu correo correcto',
  send: 'Enviar enlace',
  cancel: 'Cancelar',
  sameEmail: 'Ese ya es el correo de tu cuenta.',
  invalidEmail: 'Ingresa un correo válido.',
  needsPassword: 'Por seguridad, confirma tu contraseña para cambiar el correo.',
  passwordLabel: 'Tu contraseña',
  wrongPassword: 'Contraseña incorrecta.',
  taken: 'Ese correo ya tiene una cuenta en Oqupa. Usa otro, o entra con ese correo.',
  sent: (email: string) =>
    `Te enviamos un enlace a ${email}. Ábrelo para confirmar tu nuevo correo. Luego entra con ese correo y tu misma contraseña.`,
  changedSignIn: 'Tu correo cambió. Entra con tu nuevo correo y tu contraseña.',
  linkDoneTitle: 'Correo actualizado',
  linkDone: (email: string) => `Tu correo ahora es ${email}. Entra a Oqupa con él y tu misma contraseña.`,
  // A used link reads the same as an expired one — and the likeliest reason
  // it is used is that this person already opened it (a reload, a second tap).
  linkExpired:
    'Este enlace ya se usó o venció. Si ya confirmaste tu nuevo correo, entra con él; si no, pide uno nuevo desde Oqupa.',
  linkFailed: 'No pudimos cambiar tu correo. Intenta de nuevo desde Oqupa.',
  failed: 'No pudimos cambiar tu correo. Intenta de nuevo.',
  recoverHelp:
    'Si alguien cambió el correo de tu cuenta de Oqupa sin tu permiso, escríbenos a admin@oqupa.com desde este correo y lo revisamos. Si el cambio lo hiciste tú, no tienes que hacer nada.',
} as const

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PENDING_KEY = 'oqupa_email_change_v1'
const PENDING_TTL_MS = 24 * 60 * 60 * 1000

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const norm = (email: string | null | undefined) => (email ?? '').trim().toLowerCase()

/** The sentence to show for [next], or null when it may be sent. */
export function validateNewEmail(current: string | null | undefined, next: string): string | null {
  const n = norm(next)
  if (!EMAIL_SHAPE.test(n)) return EMAIL_CHANGE_COPY.invalidEmail
  if (n === norm(current)) return EMAIL_CHANGE_COPY.sameEmail
  return null
}

export function rememberPendingEmailChange(
  email: string,
  now = Date.now(),
  storage: KeyValueStorage | null = defaultStorage(),
) {
  try {
    storage?.setItem(PENDING_KEY, JSON.stringify({ email: norm(email), at: now }))
  } catch {
    // A blocked storage only costs the prefilled field.
  }
}

/** The address a change was requested to in the last day, or null. */
export function pendingEmailChange(
  now = Date.now(),
  storage: KeyValueStorage | null = defaultStorage(),
): string | null {
  try {
    const raw = storage?.getItem(PENDING_KEY)
    if (!raw) return null
    const { email, at } = JSON.parse(raw) as { email?: unknown; at?: unknown }
    if (typeof email !== 'string' || typeof at !== 'number') return null
    if (now - at > PENDING_TTL_MS) return null
    return email
  } catch {
    return null
  }
}

export function clearPendingEmailChange(storage: KeyValueStorage | null = defaultStorage()) {
  try {
    storage?.removeItem(PENDING_KEY)
  } catch {
    // Nothing to do.
  }
}

/** Where to send someone whose session ended because their email changed. */
export function loginUrlAfterEmailChange(email: string): string {
  const q = new URLSearchParams({ correo: '1', cambio: '1', email })
  return `/app/login?${q.toString()}`
}

/** What the sign-in screen reads from its address. */
export function readEmailChangeArrival(search: string): { email: string; changed: boolean } {
  const q = new URLSearchParams(search)
  return { email: q.get('email') ?? '', changed: q.get('cambio') === '1' }
}

/**
 * The profile's `email` must follow the sign-in email once it is confirmed —
 * receipts and notices are sent to the profile's copy. Null when nothing to do.
 */
export function profileEmailToSync(input: {
  authEmail: string | null | undefined
  emailVerified: boolean
  profileEmail: string | null | undefined
}): string | null {
  const { authEmail, emailVerified, profileEmail } = input
  if (!authEmail || !emailVerified) return null
  if (norm(authEmail) === norm(profileEmail)) return null
  return authEmail
}
