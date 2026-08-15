/**
 * TikTok pixel — the same job as the Meta one, for the other platform.
 *
 * Deliberately mirrors metaPixel.ts rather than inventing a second shape. The
 * two platforms measure the same four moments, so comparing them later is a
 * matter of reading two numbers, not reconciling two designs.
 *
 * WHAT IS SENT
 * ------------
 * That an event happened, plus a property's district for context. NOT sent:
 * names, emails, phone numbers, exact addresses. TikTok offers advanced
 * matching in exchange for customer data, same as Meta; it is off here for the
 * same reason (ADR-006, no PII), and turning it on should be a dated decision.
 *
 * PRODUCTION ONLY
 * ---------------
 * Gated on MODE, not PROD — `vite build` sets PROD for the staging deploy too.
 * Verified by counting occurrences in each bundle, not by assuming.
 *
 * THE SECURITY POLICY MATTERS AS MUCH AS THIS FILE
 * ------------------------------------------------
 * `analytics.tiktok.com` has to be allowed in script-src, connect-src and
 * img-src in firebase.json. Without all three the script either never loads or
 * loads and silently sends nothing — which is indistinguishable from working.
 * That exact failure cost a day on the Meta pixel (2026-08-13), so the policy
 * change ships in the same commit as this file, never after it.
 */

const PIXEL_ID = 'DA072E3C77U1IFUQUTEG'

type TtqFn = {
  (...args: unknown[]): void
  page?: (...args: unknown[]) => void
  track?: (event: string, params?: Record<string, unknown>) => void
  load?: (id: string, options?: Record<string, unknown>) => void
  methods?: string[]
  setAndDefer?: (target: unknown, method: string) => void
  push?: unknown
  instance?: unknown
  _i?: Record<string, unknown>
  _t?: Record<string, unknown>
  _o?: Record<string, unknown>
}

declare global {
  interface Window {
    ttq?: TtqFn
    TiktokAnalyticsObject?: string
  }
}

const isProduction = import.meta.env.MODE === 'production'

let started = false

/** Load the pixel and report the first page view. */
export function initTikTokPixel(): void {
  if (!isProduction || started || typeof window === 'undefined') return
  started = true

  /* eslint-disable */
  // TikTok's standard loader, reformatted but unchanged in behaviour. It builds
  // the ttq queue so calls made before the script lands are replayed, not lost.
  ;(function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t
    const ttq = (w[t] = w[t] || [])
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
      'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
      'revokeConsent', 'grantConsent',
    ]
    ttq.setAndDefer = function (target: any, method: string) {
      target[method] = function () {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
    ttq.instance = function (id: string) {
      const e = ttq._i[id] || []
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n])
      return e
    }
    ttq.load = function (id: string, options?: any) {
      const url = 'https://analytics.tiktok.com/i18n/pixel/events.js'
      ttq._i = ttq._i || {}
      ttq._i[id] = []
      ttq._i[id]._u = url
      ttq._t = ttq._t || {}
      ttq._t[id] = +new Date()
      ttq._o = ttq._o || {}
      ttq._o[id] = options || {}
      const script = d.createElement('script') as HTMLScriptElement
      script.type = 'text/javascript'
      script.async = true
      script.src = url + '?sdkid=' + id + '&lib=' + t
      // TikTok's own snippet assumes a <script> tag already exists and inserts
      // before it. On a page where none has parsed yet that throws, and the
      // pixel silently never loads. Fall back to the head.
      const first = d.getElementsByTagName('script')[0]
      if (first?.parentNode) {
        first.parentNode.insertBefore(script, first)
      } else {
        (d.head || d.documentElement).appendChild(script)
      }
    }
    ttq.load(PIXEL_ID)
    ttq.page()
  })(window, document, 'ttq')
  /* eslint-enable */
}

/**
 * Report an event. Silent outside production and wherever the script was
 * blocked — measurement must never break the page it is measuring.
 */
export function trackTikTok(event: string, params?: Record<string, unknown>): void {
  if (!isProduction || typeof window === 'undefined') return
  try {
    window.ttq?.track?.(event, params)
  } catch {
    /* blocked or not loaded; nothing to do about it here */
  }
}

export const __testing = { PIXEL_ID, isProduction }
