import { peekReturnUrl, setReturnUrl } from '@/lib/utils'

/**
 * Where to send someone after signing in, when a guard bounced them to the
 * sign-in page (hostile review of the wizard fixes, #3). Before, the sign-in
 * page ignored where they had been, so a person whose session ended in the
 * publishing wizard landed on the dashboard instead of back in their draft.
 */

const BASE = 'https://oqupa.invalid'
// Sending someone back to a sign-in page after signing in would loop.
const AUTH_PAGES = /^\/app\/(login|register|forgot-password|verify|auth)(\/|$)/

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
  if (url.pathname !== '/app' && !url.pathname.startsWith('/app/')) return null
  if (AUTH_PAGES.test(url.pathname)) return null
  return url.pathname + url.search + url.hash
}

// A deliberate sign-out (Salir) is not a session that ended: the page the
// person left is not a place to send the next sign-in back to.
const DELIBERATE_WINDOW_MS = 60_000
let deliberateSignOutAt = 0

export function noteDeliberateSignOut(): void {
  deliberateSignOutAt = Date.now()
}

/**
 * Called by the sign-in page's guard while nobody is signed in: remembers the
 * page a guard bounced the person from, unless it is not ours, a way back is
 * already stored (an errand such as contacting a seller wins), or the person
 * signed out on purpose.
 */
export function rememberBouncedFrom(from: unknown): void {
  const path = safeAppPath(from)
  if (!path) return
  if (Date.now() - deliberateSignOutAt < DELIBERATE_WINDOW_MS) return
  if (peekReturnUrl()) return
  setReturnUrl(path)
}
