/**
 * Where to send someone after signing in, when a guard bounced them to the
 * sign-in page because their session ended (hostile reviews of the wizard
 * fixes, #3). Before, the sign-in page ignored where they had been, so a
 * person whose session ended in the publishing wizard landed on the
 * dashboard instead of back in their draft.
 *
 * The way back belongs to the account that was bounced: it is stored with
 * that account's uid and honoured only for the same uid. A deliberate
 * sign-out (Salir, deleting the account) in ANY tab stores no way back and
 * clears one already stored. It is kept apart from the errand return address
 * (lib/utils setReturnUrl: "contact this seller" and the like), which wins.
 */

const BASE = 'https://oqupa.invalid'
// Sending someone back to a sign-in page after signing in would loop. The
// router matches paths case-insensitively, so these checks do too.
const AUTH_PAGES = /^\/app\/(login|register|forgot-password|verify|auth)(\/|$)/i
const APP_PATH = /^\/app(\/|$)/i

const BOUNCED_KEY = 'oqupa_bouncedFrom'
const DELIBERATE_KEY = 'oqupa_signedOutOnPurposeAt'
const BOUNCED_TTL_MS = 30 * 60 * 1000
const DELIBERATE_WINDOW_MS = 60_000

/**
 * A same-site path inside the app (/app or /app/...), or null. Accepts a
 * router location (`{ pathname, search, hash }`) or a string; refuses
 * anything that could leave the site ("//host", "https://…", backslashes,
 * other schemes) and the sign-in pages themselves.
 */
export function safeAppPath(from: unknown): string | null {
  let raw: string | null = null
  if (typeof from === 'string') {
    raw = from
  } else if (from && typeof from === 'object' && typeof (from as { pathname?: unknown }).pathname === 'string') {
    const f = from as { pathname: string; search?: unknown; hash?: unknown }
    raw = f.pathname + (typeof f.search === 'string' ? f.search : '') + (typeof f.hash === 'string' ? f.hash : '')
  }
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  let url: URL
  try {
    url = new URL(raw, BASE)
  } catch {
    return null
  }
  if (url.origin !== BASE) return null
  if (!APP_PATH.test(url.pathname)) return null
  if (AUTH_PAGES.test(url.pathname)) return null
  return url.pathname + url.search + url.hash
}

// The last account seen signed in on this tab (told by the sign-in watcher):
// the one a bounce belongs to.
let lastAccount: string | null = null
// Fallback when storage is blocked: this tab only.
let deliberateHere = 0

export function noteSignedInAccount(uid: string | null): void {
  if (uid) lastAccount = uid
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing stored.
  }
}

/**
 * Salir or deleting the account: shared storage tells every tab (so none
 * stores a way back while Firebase signs it out too), and any way back
 * already stored is dropped.
 */
export function noteDeliberateSignOut(): void {
  deliberateHere = Date.now()
  lastAccount = null
  removeStorage(BOUNCED_KEY)
  try {
    localStorage.setItem(DELIBERATE_KEY, String(deliberateHere))
  } catch {
    // Storage blocked: this tab still knows.
  }
}

function signedOutOnPurposeRecently(): boolean {
  let at: number
  try {
    at = Number(localStorage.getItem(DELIBERATE_KEY) ?? 0)
  } catch {
    at = deliberateHere // storage blocked: only this tab's own sign-out is known
  }
  return Date.now() - at < DELIBERATE_WINDOW_MS
}

/**
 * Called by the sign-in page's guard while nobody is signed in: remembers the
 * page a guard bounced the person from, for the account that was bounced —
 * unless it is not ours or someone signed out on purpose.
 */
export function rememberBouncedFrom(from: unknown): void {
  const path = safeAppPath(from)
  if (!path || !lastAccount || signedOutOnPurposeRecently()) return
  try {
    localStorage.setItem(BOUNCED_KEY, JSON.stringify({ url: path, at: Date.now(), uid: lastAccount }))
  } catch {
    // Storage blocked: the person lands on their panel, as before.
  }
}

/** The way back for `uid`, removed once read; null for anyone else. */
export function consumeBouncedFor(uid: string): string | null {
  const raw = readStorage(BOUNCED_KEY)
  if (!raw) return null
  removeStorage(BOUNCED_KEY)
  try {
    const v = JSON.parse(raw) as { url?: unknown; at?: unknown; uid?: unknown }
    if (v.uid !== uid || typeof v.at !== 'number' || Date.now() - v.at > BOUNCED_TTL_MS) return null
    return safeAppPath(v.url)
  } catch {
    return null
  }
}
