/**
 * Remembers where a visitor came from, so a listing published on Thursday can
 * still be traced to the ad clicked on Monday.
 *
 * WHY THIS EXISTS
 * ---------------
 * The question the six-week plan exists to answer is "did anyone we did not
 * recruit publish a listing?", and after that, "did paid advertising produce
 * one?". Neither is answerable today: a visit from a Facebook ad and a visit
 * from a friend's WhatsApp message look identical by the time someone reaches
 * the publish wizard.
 *
 * Meta's own reporting cannot answer it either. It attributes a conversion only
 * if it recognises the browser, which it increasingly does not — ad blockers,
 * Safari, and iOS all interfere. This is a first-party record kept on our side
 * and written onto the listing itself, so the answer survives regardless of
 * what Meta can or cannot see.
 *
 * WHAT IS STORED
 * --------------
 * Only campaign labels from the URL, the referring site, and a timestamp. No
 * name, no email, no phone, no identifier we could resolve to a person. It sits
 * in the visitor's own browser and travels no further than the listing they
 * choose to publish.
 *
 * FIRST touch is never overwritten; LAST touch always is. The distinction
 * matters: an ad usually earns the discovery, and something else — a search for
 * the brand, a saved link — usually earns the visit where the person finally
 * acts. Recording only the last would credit the ad with nothing.
 */

const STORAGE_KEY = 'oqupa_attribution_v1'

/**
 * How long a first touch stays credited.
 *
 * Meta's default reporting window is 7 days, which is tuned for buying things
 * online. Deciding to advertise a property is slower than buying shoes, and a
 * fortnight between "saw the ad" and "photographed the house" is ordinary. 90
 * days is generous on purpose: an over-long window credits an ad with a listing
 * it may not have caused, which is a smaller error than never seeing the link
 * at all — and the raw dates are kept, so a shorter window can be applied later
 * when reading the data.
 */
const FIRST_TOUCH_TTL_DAYS = 90

export interface Touch {
  /** utm_source, or a channel inferred from the referrer. */
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  /** Facebook's fbclid or Google's gclid — proof of a paid click. */
  clickId: string | null
  /** Where the browser came from, when it says. */
  referrer: string | null
  /** The page they landed on. */
  landingPath: string
  /** ISO timestamp. */
  at: string
}

export interface Attribution {
  first: Touch
  last: Touch
}

function readParam(params: URLSearchParams, name: string): string | null {
  const value = params.get(name)
  if (!value) return null
  // Campaign labels are ours; anything long is junk or an injection attempt.
  return value.slice(0, 120)
}

/**
 * Infer a channel when the link carries no campaign tags — most real traffic.
 * A referrer is not a campaign, but "came from Facebook" is far better than
 * "unknown" when the whole point is telling recruited visits from organic ones.
 */
function inferSource(referrer: string): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (host === window.location.hostname) return null // internal navigation
    if (/facebook|fb\.com|instagram|l\.facebook/.test(host)) return 'facebook'
    if (/google\./.test(host)) return 'google'
    if (/tiktok/.test(host)) return 'tiktok'
    if (/whatsapp|wa\.me/.test(host)) return 'whatsapp'
    return host
  } catch {
    return null
  }
}

/** True when the referrer is one of our own pages. */
function isInternal(referrer: string): boolean {
  if (!referrer) return false
  try {
    return new URL(referrer).hostname === window.location.hostname
  } catch {
    return false
  }
}

function currentTouch(): Touch {
  const params = new URLSearchParams(window.location.search)
  const rawReferrer = document.referrer || ''
  // Moving between our own pages is not an arrival. Recorded as a referrer it
  // would look like a real touch, and — the part that actually bites — it would
  // occupy the FIRST-touch slot, so a genuine ad click arriving afterwards
  // could only ever be recorded as the last. The ad would show as producing
  // nothing. Caught by a test; there is no visible symptom.
  const referrer = isInternal(rawReferrer) ? '' : rawReferrer
  const clickId = readParam(params, 'fbclid') ?? readParam(params, 'gclid')

  return {
    source: readParam(params, 'utm_source') ?? inferSource(referrer),
    medium: readParam(params, 'utm_medium') ?? (clickId ? 'paid' : null),
    campaign: readParam(params, 'utm_campaign') ?? readParam(params, 'c'),
    content: readParam(params, 'utm_content'),
    term: readParam(params, 'utm_term'),
    clickId,
    referrer: referrer ? referrer.slice(0, 200) : null,
    landingPath: window.location.pathname,
    at: new Date().toISOString(),
  }
}

/** A touch with nothing in it tells us nothing and must not overwrite one that does. */
function isEmpty(touch: Touch): boolean {
  return !touch.source && !touch.campaign && !touch.clickId && !touch.referrer
}

function read(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Attribution
    if (!parsed?.first?.at) return null

    const ageDays = (Date.now() - Date.parse(parsed.first.at)) / 86_400_000
    if (ageDays > FIRST_TOUCH_TTL_DAYS) return null

    return parsed
  } catch {
    // Private browsing, disabled storage, or corrupted JSON. Attribution is a
    // nice-to-have; it must never break the page it is measuring.
    return null
  }
}

function write(attribution: Attribution): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    /* see read() */
  }
}

/**
 * Record this visit. Call once, as early as possible, on every page load.
 */
export function captureAttribution(): void {
  const touch = currentTouch()
  const existing = read()

  if (!existing) {
    if (isEmpty(touch)) return // nothing worth remembering yet
    write({ first: touch, last: touch })
    return
  }

  if (isEmpty(touch)) return // a plain revisit does not erase how they arrived
  write({ first: existing.first, last: touch })
}

/**
 * What gets written onto a listing when someone publishes one.
 *
 * Flattened deliberately: this lands in a database document that people read by
 * eye, and `attribution.firstSource` is legible where a nested object is not.
 */
export function attributionForListing(): Record<string, string> | null {
  const stored = read()
  if (!stored) return null

  const record: Record<string, string> = {}
  const put = (key: string, value: string | null) => {
    if (value) record[key] = value
  }

  // Timestamps alone are not attribution. If nothing identifies a source, the
  // honest answer is "we do not know", not a pair of dates.
  if (!stored.first.source && !stored.first.campaign && !stored.first.clickId &&
      !stored.last.source && !stored.last.campaign && !stored.last.clickId) {
    return null
  }

  put('firstSource', stored.first.source)
  put('firstMedium', stored.first.medium)
  put('firstCampaign', stored.first.campaign)
  put('firstAt', stored.first.at)
  put('lastSource', stored.last.source)
  put('lastMedium', stored.last.medium)
  put('lastCampaign', stored.last.campaign)
  put('lastAt', stored.last.at)
  // Presence of a click id is the honest signal for "this was a paid click".
  // The value itself is not kept — it is Meta's identifier for a person, and
  // storing it would put an advertising identifier in our own database.
  if (stored.first.clickId) record.firstWasPaidClick = 'true'
  if (stored.last.clickId) record.lastWasPaidClick = 'true'

  return Object.keys(record).length > 0 ? record : null
}

/** Exposed for tests. */
export const __testing = { STORAGE_KEY, FIRST_TOUCH_TTL_DAYS, inferSource }
