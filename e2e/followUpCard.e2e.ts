// A11b — the "¿Pudiste contactar al dueño?" card on the website, against
// STAGING with a throwaway seeker. Unlike the walkthrough this WRITES (it
// answers real follow-ups and makes one real contact), so it only runs when
// given the throwaway's credentials, made and deleted by the app repo's tool:
//
//   FU_CREDS=/path/.creds.json python3 -I ../oqupa/integration_test/tools/staging_follow_up_seeker.py create
//   FU_CREDS=/path/.creds.json npx playwright test followUpCard --project=desktop
//   FU_CREDS=/path/.creds.json python3 -I ../oqupa/integration_test/tools/staging_follow_up_seeker.py check
//   FU_CREDS=/path/.creds.json python3 -I ../oqupa/integration_test/tools/staging_follow_up_seeker.py delete
//
// Never point it at production. SHOTS_DIR saves a screenshot of each state.
import { test, expect, type Page } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

interface Creds {
  email: string
  password: string
  listings: Record<'fresh' | 'days' | 'agent', { listingId: string }>
}

const credsPath = process.env.FU_CREDS
const creds: Creds | null = credsPath ? JSON.parse(readFileSync(credsPath, 'utf8')) : null
const shots = process.env.SHOTS_DIR

const PHONE = { width: 390, height: 844 }
const COMPUTER = { width: 1440, height: 900 }

async function shot(page: Page, name: string) {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await page.screenshot({ path: join(shots, `${name}.png`) })
}

const card = (page: Page) => page.locator('dialog[data-follow-up-card]')

/**
 * Leaves the Oqupa tab for WhatsApp's, then comes back. Automated Chrome
 * never reports a background tab as hidden (Playwright keeps every page
 * "visible" and focused), so the events the browser fires on a real tab
 * switch are fired here — visibilitychange + blur, then visibilitychange +
 * focus. Everything else in this test is real.
 */
async function leaveAndComeBack(page: Page, other: Page) {
  await other.bringToFront()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('blur'))
  })
  await page.waitForTimeout(1500)
  await page.bringToFront()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
}

test.describe.configure({ mode: 'serial' })

test('the follow-up card: on sign-in, after a real WhatsApp hand-off, "agente", and no repeat', async ({ page, context }, testInfo) => {
  test.skip(!creds, 'needs FU_CREDS from staging_follow_up_seeker.py create')
  test.skip(testInfo.project.name !== 'desktop', 'one run: it answers real follow-ups')
  test.skip(/oqupa\.com/.test(testInfo.project.use.baseURL ?? ''), 'staging only')
  test.setTimeout(240_000)
  const c = creds!
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  // 1. Phone. Signing in: the card for the most recent contact (2 days ago, the owner).
  await page.setViewportSize(PHONE)
  await page.goto('/app/login')
  await page.getByRole('button', { name: /continuar con correo/i }).click()
  await page.getByLabel('Correo electrónico').fill(c.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(c.password)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(card(page)).toBeVisible({ timeout: 30_000 })
  await expect(card(page).getByText('¿Pudiste contactar al dueño?')).toBeVisible()
  await expect(card(page).getByRole('link')).toHaveAttribute('href', `/property/${c.listings.days.listingId}`)
  await expect(card(page).locator('img')).toBeVisible()
  await page.waitForTimeout(500)
  await shot(page, '01-phone-signin-wrote-owner')
  await Promise.all([page.waitForResponse((r) => r.url().includes('answerFollowUp') && r.status() === 200), card(page).getByRole('button', { name: 'TODAVÍA NO' }).click()])
  await expect(card(page)).toHaveCount(0)
  await expect(page.getByText('¡Gracias!')).toBeVisible()
  await page.waitForTimeout(400)
  await shot(page, '02-phone-gracias')

  // 2. Opening the site again: the next due card — the agent's listing says "agente". Closed with the (x).
  await page.reload()
  await expect(card(page)).toBeVisible({ timeout: 30_000 })
  await expect(card(page).getByText('¿Pudiste contactar al agente?')).toBeVisible()
  await expect(card(page).getByRole('link')).toHaveAttribute('href', `/property/${c.listings.agent.listingId}`)
  await page.waitForTimeout(500)
  await shot(page, '03-phone-reload-wrote-agent')
  await Promise.all([page.waitForResponse((r) => r.url().includes('answerFollowUp') && r.status() === 200), card(page).getByRole('button', { name: 'Cerrar' }).click()])
  await expect(card(page)).toHaveCount(0)

  // 3. Computer. Nothing is due now: opening the listing shows no card.
  await page.setViewportSize(COMPUTER)
  await page.goto(`/property/${c.listings.fresh.listingId}`)
  const whatsapp = page.getByRole('button', { name: /whatsapp/i }).first()
  await expect(whatsapp).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(4000)
  await expect(card(page)).toHaveCount(0)

  // 4. A real contact: the number from getListingContact, WhatsApp in a new tab, and back.
  const [wa] = await Promise.all([context.waitForEvent('page'), whatsapp.click()])
  await expect.poll(() => wa.url(), { timeout: 20_000 }).toMatch(/wa\.me|whatsapp\.com/)
  // While still on the Oqupa tab right after the hand-off, nothing appears.
  await page.waitForTimeout(1500)
  await expect(card(page)).toHaveCount(0)
  await leaveAndComeBack(page, wa)
  await expect(card(page)).toBeVisible({ timeout: 20_000 })
  await expect(card(page).getByText('¿Pudiste contactar al dueño?')).toBeVisible()
  await expect(card(page).getByRole('link')).toHaveAttribute('href', `/property/${c.listings.fresh.listingId}`)
  await page.waitForTimeout(500)
  await shot(page, '04-computer-return-from-whatsapp')
  await Promise.all([page.waitForResponse((r) => r.url().includes('answerFollowUp') && r.status() === 200), card(page).getByRole('button', { name: 'SÍ' }).click()])
  await expect(card(page)).toHaveCount(0)

  // 5. Another trip: nothing more is due, and no card.
  await leaveAndComeBack(page, wa)
  await page.waitForTimeout(4000)
  await expect(card(page)).toHaveCount(0)
  await shot(page, '05-computer-next-return-no-card')
  await wa.close()

  expect(errors).toEqual([])
})
