// ADR-058 R1 — how a person arrived at a listing, for the owner's "Desde dónde
// llegan": opened from inside Oqupa (the map, a list) → 'direct'; the first page
// of the visit → where the visit came from. A visit with no campaign tag and no
// referrer is 'other': WhatsApp's own app often sends no referrer, so guessing
// "direct" would be untrue.

export type Via = 'direct' | 'whatsapp' | 'facebook' | 'google' | 'other'

/** The path this tab first opened on — recorded before the router changes the address. */
let landingPath: string | null = null
let landingVia: Via | null = null

function viaFromSource(source: string | null, referrerHost: string | null): Via {
  const s = (source ?? referrerHost ?? '').toLowerCase()
  if (!s) return 'other'
  if (/whatsapp|wa\.me/.test(s)) return 'whatsapp'
  if (/facebook|fb\.com|instagram|^ig$|^fb$/.test(s)) return 'facebook'
  if (/google/.test(s)) return 'google'
  return 'other'
}

/** Call once at start-up, before anything navigates. */
export function captureArrival(win: Pick<Window, 'location'> = window, doc: Pick<Document, 'referrer'> = document): void {
  landingPath = win.location.pathname
  const params = new URLSearchParams(win.location.search)
  let host: string | null = null
  try {
    host = doc.referrer ? new URL(doc.referrer).hostname.replace(/^www\./, '') : null
    if (host && host === new URL(win.location.href).hostname.replace(/^www\./, '')) host = null
  } catch {
    host = null
  }
  landingVia = viaFromSource(params.get('utm_source'), host)
}

/** How the person arrived at the listing page at `path` right now. */
export function arrivalVia(path: string, firstPage: boolean): Via {
  if (firstPage && landingPath === path && landingVia) return landingVia
  return 'direct'
}

/** For tests. */
export function resetArrival(): void {
  landingPath = null
  landingVia = null
}
