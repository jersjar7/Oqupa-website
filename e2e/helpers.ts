// Shared steps for the walkthrough. Everything here is read-only against the
// target site: the only writes are this browser's own localStorage.
import { expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const CAMERA_KEY = 'oqupa-map-camera-mapbox'
export const SAVES_KEY = 'oqupa_guardados'
export const NUDGE_KEY = 'oqupa_guardados_aviso'

/** Piura, far enough out that listings are dots (pins start at zoom 14). */
export const PIURA_FAR = { lat: -5.19, lng: -80.63, zoom: 12 }

const FIRESTORE_PROJECT = process.env.E2E_FIRESTORE_PROJECT ?? 'oqupa-staging'
const FS = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`

type FsValue = { stringValue?: string; doubleValue?: number; integerValue?: string; mapValue?: { fields: Record<string, FsValue> } }
const num = (v?: FsValue) => (v?.doubleValue ?? (v?.integerValue != null ? Number(v.integerValue) : undefined))

/** One active listing of the given operation and where it shows on the map —
 *  read the same way a visitor's browser reads it (listings are public). */
export async function someListing(operation: 'venta' | 'alquiler'): Promise<{ id: string; lat: number; lng: number }> {
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'listings' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } },
              { fieldFilter: { field: { fieldPath: 'operationType' }, op: 'EQUAL', value: { stringValue: operation } } },
            ],
          },
        },
        limit: 20,
      },
    }),
  })
  const rows = (await res.json()) as { document?: { name: string; fields: Record<string, FsValue> } }[]
  for (const r of rows) {
    if (!r.document) continue
    const f = r.document.fields
    const id = r.document.name.split('/').pop()!
    let lat = num(f.displayLatitude)
    let lng = num(f.displayLongitude)
    if (lat == null || lng == null) {
      const pid = f.propertyId?.stringValue
      if (!pid) continue
      const p = (await (await fetch(`${FS}/properties/${pid}`)).json()) as { fields?: Record<string, FsValue> }
      const loc = p.fields?.location?.mapValue?.fields
      lat = num(loc?.latitude)
      lng = num(loc?.longitude)
    }
    if (lat != null && lng != null) return { id, lat, lng }
  }
  throw new Error(`no active ${operation} listing with a location on ${FIRESTORE_PROJECT}`)
}

/** A fresh visitor: no saves, no remembered card, the map opening where asked. */
export async function asVisitor(page: Page, camera: { lat: number; lng: number; zoom: number } = PIURA_FAR, extra: Record<string, string> = {}) {
  await page.addInitScript(
    ([key, cam, more]) => {
      // Only on the first load of this test: later navigations keep what the
      // test did (saves, the camera after moving).
      if (sessionStorage.getItem('__e2e_seeded')) return
      sessionStorage.setItem('__e2e_seeded', '1')
      localStorage.clear()
      localStorage.setItem(key as string, JSON.stringify(cam))
      for (const [k, v] of Object.entries(more as Record<string, string>)) localStorage.setItem(k, v)
    },
    [CAMERA_KEY, camera, extra] as const,
  )
}

/** Errors the page itself reports. Third-party noise (analytics blocked,
 *  map tile aborts while moving) is not the site's fault and is left out. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  const ignore = /googletagmanager|google-analytics|facebook|tiktok|clarity|doubleclick|ERR_ABORTED|net::ERR_FAILED.*(api\.mapbox|events\.mapbox)|AbortError|recaptcha|appCheck|App Check|Failed to load resource/i
  // A local dev server uses a map key that Mapbox refuses for some tiles on
  // localhost; that is the key's domain list, not the site.
  const local = /localhost|127\.0\.0\.1/.test(process.env.E2E_BASE_URL ?? '')
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error' || ignore.test(m.text())) return
    // (mapbox-gl reports those refusals as a bare minified error, "ee",
    // passed on by the site's error buffer.)
    if (local && (/mapbox/.test(m.location().url + m.text()) || m.text() === 'ee')) return
    errors.push(`console: ${m.text()}`)
  })
  return errors
}

export async function openExplore(page: Page) {
  await page.goto('/explorar')
  await expect(page.getByTestId('explore-map')).toBeVisible()
  // The map has drawn its markers once listings arrived.
  await expect(page.locator('.mapboxgl-marker').first()).toBeAttached({ timeout: 45_000 })
  await page.waitForTimeout(800)
}

export const pins = (page: Page) => page.locator('.mapboxgl-marker[data-marker-id]')
export const dots = (page: Page) =>
  page.locator('.mapboxgl-marker[data-listing-id]:not([data-marker-id]):not([data-raised])')
export const raised = (page: Page) => page.locator('.mapboxgl-marker[data-raised="1"]')

/** A dot or pin whose centre is inside the visible map and clear of the
 *  controls floating over it, so a tap lands on it and nothing else. */
export async function tappableMarker(page: Page, which: 'dot' | 'pin') {
  const map = (await page.getByTestId('explore-map').boundingBox())!
  const list = which === 'dot' ? dots(page) : pins(page)
  const n = await list.count()
  const margin = { top: 120, bottom: 200, side: 60 }
  for (let i = 0; i < n; i++) {
    const m = list.nth(i)
    const b = await m.boundingBox()
    if (!b) continue
    const cx = b.x + b.width / 2
    const cy = b.y + b.height / 2
    if (cx < map.x + margin.side || cx > map.x + map.width - margin.side) continue
    if (cy < map.y + margin.top || cy > map.y + map.height - margin.bottom) continue
    return m
  }
  throw new Error(`no ${which} clear of the controls (${n} on the map)`)
}

export async function noHorizontalOverflow(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(scroll, 'the page must not scroll sideways').toBeLessThanOrEqual(client + 1)
}

/** Screenshots for a person to look at, by size: SHOTS_DIR/<size>/<name>.png */
export async function shot(page: Page, info: TestInfo, name: string) {
  const dir = process.env.SHOTS_DIR
  if (!dir) return
  const out = join(dir, info.project.name)
  mkdirSync(out, { recursive: true })
  await page.screenshot({ path: join(out, `${name}.png`) })
}

export const isPhone = (info: TestInfo) => info.project.name === 'phone'

export async function deviceSaves(page: Page): Promise<string[]> {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (!raw) return []
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : Array.isArray(v?.ids) ? v.ids : []
  }, SAVES_KEY)
}

/** Words cut short with "…" inside the given elements: the text is wider
 *  than its box. Returns the cut texts. */
export async function cutTexts(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((roots) => {
    const out: string[] = []
    for (const r of roots) {
      for (const e of r.querySelectorAll<HTMLElement>('span, p, h2, h3')) {
        if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow === 'ellipsis') {
          out.push(e.textContent ?? '')
        }
      }
    }
    return out
  })
}

/** How many lines a control's words take (a button label broken onto two
 *  lines reads as two buttons). */
export async function textLines(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => {
        const r = document.createRange()
        r.selectNodeContents(e)
        const tops = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)))
        return tops.size
      }),
  )
}
