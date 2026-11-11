// ADR-058 R1 — how a person arrived at a listing, for the owner's "Desde dónde
// llegan": opened from inside Oqupa (the map, a list) → 'direct'; the first page
// of the visit → where the visit came from. A visit with no campaign tag and no
// referrer is 'other': WhatsApp's own app often sends no referrer, so guessing
// "direct" would be untrue.

export type Via = 'direct' | 'whatsapp' | 'facebook' | 'google' | 'share' | 'other'

/** The path this tab first opened on — recorded before the router changes the address. */
let landingPath: string | null = null
let landingVia: Via | null = null

/** Our own hosts: a referrer from one of them is not an outside source. */
const OWN_HOSTS = /(^|\.)oqupa\.com$|^oqupa-(production|staging)\.(web\.app|firebaseapp\.com)$|^localhost$/

function viaFromSource(source: string | null, referrerHost: string | null): Via {
  const tag = (source ?? '').toLowerCase()
  const ref = (referrerHost ?? '').toLowerCase()
  // Oqupa's own share link: the referrer says where it was shared, when it says (web 4 #1).
  if (tag === 'share') return ref ? viaFromSource(null, ref) === 'other' ? 'share' : viaFromSource(null, ref) : 'share'
  const s = tag || ref
  if (!s) return 'other'
  if (/^android-app:\/\/com\.google\.android\.gm|gmail/.test(s)) return 'other' // the Gmail app is not Google search (web 4 #4)
  if (/whatsapp|wa\.me/.test(s)) return 'whatsapp'
  if (/facebook|fb\.com|instagram|^ig$|^fb$/.test(s)) return 'facebook'
  if (/google/.test(s)) return 'google'
  return 'other'
}

/** Call once at start-up, before anything navigates. */
export function captureArrival(
  win: Pick<Window, 'location'> = window,
  doc: Pick<Document, 'referrer'> = document,
  session: Pick<Storage, 'getItem' | 'setItem'> | null = typeof sessionStorage !== 'undefined' ? sessionStorage : null,
): void {
  // Once per tab: coming back from a sign-in page is not a new arrival (web 4 #4).
  try {
    const kept = session?.getItem('oqupa_arrival_v1')
    let refHost = ''
    try { refHost = doc.referrer ? new URL(doc.referrer).hostname : '' } catch { refHost = '' }
    // Reused only coming back from our own pages or a sign-in page; a new visit
    // from elsewhere in the same tab is a new arrival (web 5 #2).
    const tagged = new URLSearchParams(win.location.search).has('utm_source') // a tagged link is always a new arrival (web 6 #2)
    const back = !tagged && (!refHost || OWN_HOSTS.test(refHost.replace(/^www\./, '')) || /^(accounts\.google\.com|appleid\.apple\.com)$/.test(refHost))
    if (kept && back) {
      const parsed = JSON.parse(kept) as { path: string; via: Via }
      landingPath = parsed.path
      landingVia = parsed.via
      return
    }
  } catch { /* no storage: work per page load */ }
  landingPath = win.location.pathname
  const params = new URLSearchParams(win.location.search)
  let host: string | null = null
  try {
    const ref = doc.referrer ? new URL(doc.referrer) : null
    host = ref ? (ref.protocol === 'android-app:' ? `android-app://${ref.hostname}` : ref.hostname.replace(/^www\./, '')) : null
    if (host && (host === new URL(win.location.href).hostname.replace(/^www\./, '') || OWN_HOSTS.test(host))) host = null
  } catch {
    host = null
  }
  landingVia = viaFromSource(params.get('utm_source'), host)
  try {
    session?.setItem('oqupa_arrival_v1', JSON.stringify({ path: landingPath, via: landingVia }))
  } catch { /* fine */ }
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
