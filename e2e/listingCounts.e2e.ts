// ADR-051 — Apariciones and Vistas from the website, as a guest, against
// STAGING. This WRITES counts on staging (that is the point: the server must
// accept them). Never point it at production.
//
//   SHOTS_DIR=/tmp/counts npx playwright test listingCounts
//
// What it proves, in a real browser: list cards on screen for a second are
// sent as "shown"; the listing page kept open 2 s is sent as "seen"; both go
// to recordListingCounts as one grouped message and the server answers 200.
import { test, expect, type Page, type Request } from '@playwright/test'
import { asVisitor, openExplore, isPhone, shot, collectPageErrors } from './helpers'

interface Sent {
  deviceId: string
  platform: string
  events: Array<{ listingId: string; kind: 'shown' | 'seen' }>
}

function watchCounts(page: Page) {
  const sent: Sent[] = []
  const statuses: number[] = []
  page.on('request', (r: Request) => {
    if (!r.url().includes('recordListingCounts') || r.method() !== 'POST') return
    try {
      sent.push(JSON.parse(r.postData() ?? '{}').data as Sent)
    } catch {
      // not a callable body
    }
  })
  page.on('response', (r) => {
    if (r.url().includes('recordListingCounts') && r.request().method() === 'POST') statuses.push(r.status())
  })
  return { sent, statuses, events: () => sent.flatMap((m) => m.events) }
}

test.skip(({ baseURL }) => /oqupa\.com/.test(baseURL ?? ''), 'staging only: this writes counts')

test('a guest: list cards count Apariciones, the listing page counts a Vista', async ({ page }, info) => {
  test.setTimeout(150_000)
  const errors = collectPageErrors(page)
  const counts = watchCounts(page)
  await asVisitor(page)
  await openExplore(page)

  // The list: on a phone behind VER LISTA, beside the map elsewhere.
  if (isPhone(info)) await page.getByRole('button', { name: /VER LISTA · \d+/ }).click()
  const cards = page.locator('[data-testid="listing-list-card"]:visible')
  await expect(cards.first()).toBeVisible({ timeout: 30_000 })
  await shot(page, info, 'counts-01-list')

  // At least 1 s on screen, then the 3 s grouping, then the round trip.
  await expect.poll(() => counts.events().filter((e) => e.kind === 'shown').length, { timeout: 20_000 }).toBeGreaterThan(0)
  const shownIds = counts.events().filter((e) => e.kind === 'shown').map((e) => e.listingId)
  // Every id sent as shown is a card that is actually in the list.
  const listed = await cards.evaluateAll((els) => els.map((el) => el.closest('[data-listing-id]')?.getAttribute('data-listing-id') ?? (el.querySelector('a')?.getAttribute('href') ?? '').split('/').pop()))
  for (const id of shownIds) expect(listed).toContain(id)
  expect(counts.sent.every((m) => m.platform === 'web' && m.deviceId.length >= 16)).toBe(true)
  expect(counts.sent.every((m) => m.events.length <= 50)).toBe(true)
  // Nothing was opened yet: no Vista.
  expect(counts.events().some((e) => e.kind === 'seen')).toBe(false)

  // Open the first card: the listing page, kept open.
  const href = await cards.first().locator('a').first().getAttribute('href')
  const listingId = (href ?? '').split('/').pop()!
  await cards.first().locator('a').first().click()
  await expect(page).toHaveURL(new RegExp(`/property/${listingId}`))
  await page.waitForTimeout(800)
  await shot(page, info, 'counts-02-listing-page')
  await expect.poll(() => counts.events().some((e) => e.kind === 'seen' && e.listingId === listingId), { timeout: 20_000 }).toBe(true)

  // The server accepted every message.
  await expect.poll(() => counts.statuses.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(counts.sent.length)
  expect(counts.statuses.every((s) => s === 200)).toBe(true)
  expect(errors).toEqual([])
})

test('a card scrolled past quickly is not counted', async ({ page }, info) => {
  test.skip(!isPhone(info), 'the phone list is where people fling past cards')
  test.setTimeout(120_000)
  const counts = watchCounts(page)
  await asVisitor(page)
  await openExplore(page)
  await page.getByRole('button', { name: /VER LISTA · \d+/ }).click()
  const cards = page.locator('[data-testid="listing-list-card"]:visible')
  await expect(cards.first()).toBeVisible({ timeout: 30_000 })
  const total = await cards.count()
  test.skip(total < 6, 'needs a list longer than one screen')
  // Let the cards on the first screen count, then fling to the bottom.
  await page.waitForTimeout(1500)
  const lastId = await cards.last().locator('a').first().getAttribute('href')
  const middleIds = await cards.evaluateAll((els) => els.slice(3, -3).map((el) => (el.querySelector('a')?.getAttribute('href') ?? '').split('/').pop()))
  await page.mouse.wheel(0, 100_000)
  await page.waitForTimeout(6000)
  const shown = counts.events().filter((e) => e.kind === 'shown').map((e) => e.listingId)
  // Cards only flown past (never a full second on screen) were not sent.
  const flownPast = middleIds.filter((id) => id && !shown.includes(id))
  expect(flownPast.length).toBeGreaterThan(0)
  expect(lastId).toBeTruthy()
})
