/**
 * Meta pixel — tells Meta that something happened on oqupa.com.
 *
 * WHY IT EXISTS
 * -------------
 * Without it Meta sees a click leave Facebook and nothing after. It cannot tell
 * whether the click became a visitor who looked at three properties or someone
 * who bounced in two seconds, so it optimises for whatever is cheapest to buy —
 * which is bounces. Reporting real events is what lets it find people who act.
 *
 * WHAT IS SENT
 * ------------
 * That an event happened, and a property's district and price band for context.
 * Deliberately NOT sent: names, emails, phone numbers, exact addresses, or
 * anything Meta could use to identify a person on our behalf. Meta calls that
 * "advanced matching" and it improves their attribution; it also hands them
 * customer data, and this platform's position on that is already settled
 * (ADR-006, no PII). If it is ever switched on, it should be a decision with a
 * date on it, not a default someone inherited.
 *
 * PRODUCTION ONLY
 * ---------------
 * Staging shares this dataset, and a developer clicking through the publish
 * wizard fifty times would teach Meta that fifty listings came from nothing.
 * Gated on MODE, not PROD — `vite build` sets PROD for any minified build
 * including the staging deploy, which is a trap this codebase has hit before.
 */

const DATASET_ID = '4589259354641565'

type FbqFn = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean }

declare global {
  interface Window {
    fbq?: FbqFn
    _fbq?: FbqFn
  }
}

const isProduction = import.meta.env.MODE === 'production'

let started = false

/**
 * Load the pixel and report the first page view.
 *
 * Injected at runtime rather than pasted into index.html so that it loads on
 * production only, and so the dataset id lives beside the code that documents
 * what it is for.
 */
export function initMetaPixel(): void {
  if (!isProduction || started || typeof window === 'undefined') return
  started = true

  /* eslint-disable */
  // Meta's standard loader, unchanged apart from formatting. It creates the
  // fbq() queue so calls made before the script arrives are not lost.
  ;(function (f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode!.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  window.fbq?.('init', DATASET_ID)
  window.fbq?.('track', 'PageView')
}

/**
 * Report a standard Meta event.
 *
 * Silent when the pixel is not loaded, which is every non-production build and
 * any browser where the script was blocked. Measurement must never be the thing
 * that breaks the page.
 */
export function trackMeta(event: string, params?: Record<string, unknown>): void {
  if (!isProduction || typeof window === 'undefined') return
  try {
    window.fbq?.('track', event, params)
  } catch {
    /* an ad blocker ate it; not our problem to solve */
  }
}

/** For events Meta has no standard name for. */
export function trackMetaCustom(event: string, params?: Record<string, unknown>): void {
  if (!isProduction || typeof window === 'undefined') return
  try {
    window.fbq?.('trackCustom', event, params)
  } catch {
    /* see trackMeta */
  }
}

export const __testing = { DATASET_ID, isProduction }
