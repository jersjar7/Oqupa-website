// The public site, as a visitor, at computer, tablet and phone size. What the
// map, the list, the hearts and the doors promise on screen (ADR-030..034,
// docs/map-in-words-plan.md) — checked by doing it.
import { test, expect, type Page } from '@playwright/test'
import {
  asVisitor, collectPageErrors, openExplore, pins, dots, raised, tappableMarker,
  noHorizontalOverflow, shot, cutTexts, textLines, isPhone, deviceSaves, someListing, PIURA_FAR, NUDGE_KEY,
} from './helpers'

let errors: string[] = []
test.beforeEach(({ page }) => {
  errors = collectPageErrors(page)
})
test.afterEach(() => {
  expect(errors, 'the page reported errors').toEqual([])
})

/** The phone's list sits behind "VER LISTA"; on bigger screens it is beside the map. */
async function openList(page: Page, phone: boolean) {
  if (phone) await page.getByRole('button', { name: /VER LISTA · \d+/ }).click()
  await expect(listHeader(page)).toBeVisible()
}

// On a phone the computer's side panel is still in the page, hidden: only
// what is on screen counts.
const listHeader = (page: Page) => page.locator('[data-testid="map-list-header"]:visible')
const listCards = (page: Page) => page.locator('[data-testid="listing-list-card"]:visible')

/** The listing's own card on the map: beside the pin on a computer, at the bottom on a phone. */
const mapCard = (page: Page, phone: boolean) =>
  phone ? page.getByRole('dialog', { name: 'Detalle de la propiedad' }) : page.getByTestId('compact-listing-card')

test.describe('landing and header', () => {
  test('the landing page loads and the door says Anuncia tu propiedad', async ({ page }, info) => {
    await asVisitor(page)
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Anuncia tu propiedad' }).first()).toBeVisible()
    await noHorizontalOverflow(page)
    // Every header button on one line (they broke in two at tablet size).
    for (const lines of await textLines(page, 'header a, header button')) expect(lines).toBeLessThanOrEqual(1)
    await shot(page, info, '00-landing')
  })

  test('with something saved, the header heart fits too', async ({ page }) => {
    await asVisitor(page, PIURA_FAR, { oqupa_guardados: JSON.stringify(['x']) })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Guardados' }).first()).toBeVisible()
    await noHorizontalOverflow(page)
    for (const lines of await textLines(page, 'header a, header button')) expect(lines).toBeLessThanOrEqual(1)
    const header = (await page.locator('header').first().boundingBox())!
    for (const b of await page.locator('header a:visible, header button:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))) {
      expect(b).toBeLessThanOrEqual(header.x + header.width)
    }
  })

  test('a visitor pressing Anuncia tu propiedad is asked to sign in', async ({ page }) => {
    await asVisitor(page)
    await page.goto('/explorar')
    await page.getByRole('link', { name: 'Anuncia tu propiedad' }).first().click()
    await expect(page).toHaveURL(/\/app\/login/)
    await expect(page.getByText('Entra a Oqupa')).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar con Google/ })).toBeVisible()
  })
})

test.describe('the map', () => {
  test('far out: one dot per listing, no pins', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    await expect.poll(() => dots(page).count()).toBeGreaterThan(0)
    expect(await pins(page).count()).toBe(0)
    await noHorizontalOverflow(page)
    await shot(page, info, '01-map-far-dots')
  })

  // Jerson, 2026-10-30: "I don't want to tap twice to see the listing card.
  // [...] When the dot is tapped, the dot should have the leader line
  // animation and display the listing card at the same time." It used to take
  // a second tap, on the raised pin.
  test('one tap on a dot raises its pin on a line and opens its card; the map does not move', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    const dot = await tappableMarker(page, 'dot')
    const id = await dot.getAttribute('data-listing-id')
    // Another dot as a fixed point: if the map moved, it moves.
    const otherId = await dots(page).evaluateAll(
      (els, mine) => els.map((e) => e.getAttribute('data-listing-id')).find((x) => x && x !== mine) ?? null,
      id,
    )
    const other = page.locator(`.mapboxgl-marker[data-listing-id="${otherId}"]:not([data-raised])`).first()
    const before = otherId ? await other.boundingBox() : null
    await dot.locator('button').click()
    const up = raised(page)
    await expect(up).toHaveCount(1)
    await expect(up).toHaveAttribute('data-listing-id', id!)
    await expect(up.locator('[data-role="leader"]')).toBeVisible()
    // The card is open after that one tap, and it is this dot's listing.
    const card = mapCard(page, isPhone(info))
    await expect(card).toBeVisible()
    // The raised pin stays, and shows as the open one.
    await expect(up.locator('[data-selected="1"]')).toHaveCount(1)
    await page.waitForTimeout(400)
    const after = await other.boundingBox()
    if (before && after && !isPhone(info)) {
      expect(Math.abs(after.x - before.x)).toBeLessThan(2)
      expect(Math.abs(after.y - before.y)).toBeLessThan(2)
    }
    await shot(page, info, '02-dot-raised-and-card')

    // Closing the card (a tap on the map) drops the pin back into its dot.
    const box = (await page.getByTestId('explore-map').boundingBox())!
    await page.mouse.click(box.x + 20, box.y + box.height / 2)
    await expect(raised(page)).toHaveCount(0)
    await expect(card).toBeHidden()
    await shot(page, info, '03-card-closed')
  })

  test('close in: pins with the type word and the price; a pin opens its card', async ({ page }, info) => {
    const l = await someListing('venta')
    await asVisitor(page, { lat: l.lat, lng: l.lng, zoom: 15.5 })
    await openExplore(page)
    await expect.poll(() => pins(page).count()).toBeGreaterThan(0)
    expect(await dots(page).count()).toBe(0)
    const pin = page.locator(`.mapboxgl-marker[data-marker-id="${l.id}"]`)
    await expect(pin).toBeVisible()
    // Words on the pin: a type and a price.
    await expect(pin).toHaveText(/(S\/\.?|US\$)\s?[\d.,]+/)
    await shot(page, info, '04-map-close-pins')

    await pin.locator('button').first().click()
    const card = mapCard(page, isPhone(info))
    await expect(card).toBeVisible()
    await expect(card).toContainText(/(S\/\.?|US\$)/)
    await noHorizontalOverflow(page)
    await shot(page, info, '05-pin-card')

    // The card opens the listing; back returns to the map.
    await page.getByLabel('Ver detalles de la propiedad').locator('visible=true').first().click({ position: { x: 60, y: 40 } })
    await expect(page).toHaveURL(new RegExp(`/property/${l.id}`))
    await expect(page.getByRole('button', { name: /Escríbele por WhatsApp/ })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/\/explorar/)
    await expect(page.getByTestId('explore-map')).toBeVisible()
  })

  test('Venta / Alquiler shows one or the other', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    const phone = isPhone(info)
    await openList(page, phone)
    const header = listHeader(page)
    await expect(header).toContainText('en venta aquí')
    if (phone) {
      await page.getByRole('button', { name: 'VER MAPA' }).click()
      await page.getByRole('button', { name: /^Filtros/ }).click()
      await page.getByRole('button', { name: 'Alquiler', exact: true }).click()
      await page.getByRole('button', { name: /en alquiler|VER/i }).last().click()
      await openList(page, phone)
    } else {
      await page.getByRole('button', { name: 'Alquiler', exact: true }).click()
    }
    await expect(header).toContainText('en alquiler aquí')
  })
})

test.describe('the list', () => {
  test('VER LISTA count matches the list, every sort works, VER MAPA returns', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    const phone = isPhone(info)
    let promised: number | null = null
    if (phone) {
      const label = await page.getByRole('button', { name: /VER LISTA · \d+/ }).innerText()
      promised = Number(/(\d+)/.exec(label)![1])
    }
    await openList(page, phone)
    const header = listHeader(page)
    const count = Number(/(\d+)/.exec(await header.innerText())![1])
    if (promised != null) expect(count, 'the button promised this many').toBe(promised)
    const cards = listCards(page)
    await expect(cards).toHaveCount(count)
    // The price and the type word are both read in full (the type word was
    // cut to "DEPARTAMEN…" beside longer prices on a computer, 2026-10-25).
    const cut = (await cutTexts(page, '[data-testid="listing-list-card"]:visible')).filter((t) => !/,/.test(t))
    expect(cut, 'words cut short on the list cards').toEqual([])
    await shot(page, info, '06-list')

    const sorts = ['Nuevos en el mercado', 'Precio: de menos a más', 'Precio: de más a menos', 'Más grandes primero', 'Recomendados']
    for (const s of sorts) {
      await header.getByRole('button').click()
      const sheet = page.getByRole('dialog', { name: 'Ordenar' })
      await expect(sheet).toBeVisible()
      // The last choice must not hide behind anything at the bottom.
      const last = sheet.getByRole('button').last()
      const lb = (await last.boundingBox())!
      expect(lb.y + lb.height).toBeLessThanOrEqual(page.viewportSize()!.height)
      if (s === 'Precio: de menos a más') await shot(page, info, '07-sort-sheet')
      await sheet.getByRole('button', { name: new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click()
      await expect(sheet).toBeHidden()
      await expect(header.getByRole('button')).toContainText(s)
      await expect(cards).toHaveCount(count)
    }

    if (phone) {
      await page.getByRole('button', { name: 'VER MAPA' }).click()
      await expect(listHeader(page)).toBeHidden()
      await expect(page.getByRole('button', { name: /VER LISTA · \d+/ })).toBeVisible()
    }
  })

  test('a list card opens its listing, and back returns', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    await openList(page, isPhone(info))
    const first = listCards(page).first()
    await first.getByRole('link').first().click()
    await expect(page).toHaveURL(/\/property\//)
    await page.goBack()
    await expect(page).toHaveURL(/\/explorar/)
  })
})

test.describe('Guardados sin cuenta (ADR-034)', () => {
  test('the heart saves in this browser and un-saves; the card after the third save; /guardados', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    await openList(page, isPhone(info))
    const cards = listCards(page)
    expect(await cards.count()).toBeGreaterThanOrEqual(3)
    // Nothing saved yet: no heart in the header.
    await expect(page.getByRole('link', { name: 'Guardados' })).toHaveCount(0)

    // Save and un-save one.
    const heart = (i: number) => cards.nth(i).getByRole('button', { name: /Guardar propiedad|Quitar de Guardados/ })
    await heart(0).click()
    await expect.poll(() => deviceSaves(page)).toHaveLength(1)
    await expect(heart(0)).toHaveAttribute('aria-label', 'Quitar de Guardados')
    await expect(page).toHaveURL(/\/explorar/) // the heart does not open the listing
    await heart(0).click()
    await expect.poll(() => deviceSaves(page)).toHaveLength(0)

    // Three saves bring the card, once.
    const nudge = page.getByRole('dialog', { name: 'No pierdas tus guardados' })
    for (let i = 0; i < 3; i++) {
      await expect(nudge).toHaveCount(0)
      await heart(i).click()
      await expect.poll(() => deviceSaves(page)).toHaveLength(i + 1)
    }
    await expect(nudge).toBeVisible()
    await expect(nudge).toContainText('No pierdas tus guardados. Crea una cuenta')
    await expect(nudge.getByRole('button', { name: /Crear cuenta/i })).toBeVisible()
    // Inside the screen, not behind a bar.
    const nb = (await nudge.boundingBox())!
    expect(nb.y).toBeGreaterThanOrEqual(0)
    expect(nb.y + nb.height).toBeLessThanOrEqual(page.viewportSize()!.height)
    await shot(page, info, '08-guardados-card')
    expect(await page.evaluate((k) => localStorage.getItem(k), NUDGE_KEY)).toBe('1')
    await nudge.getByRole('button', { name: 'Cerrar' }).click()
    await expect(nudge).toHaveCount(0)

    // The header heart leads to the visitor's Guardados.
    const link = page.getByRole('link', { name: 'Guardados' })
    await expect(link).toBeVisible()
    const saved = await deviceSaves(page)
    await link.click()
    await expect(page).toHaveURL(/\/guardados/)
    for (const id of saved) await expect(page.locator(`a[href="/property/${id}"]`).first()).toBeVisible()
    await noHorizontalOverflow(page)
    await shot(page, info, '09-guardados-page')

    // A fourth save never shows the card again.
    await page.goto('/explorar')
    await openList(page, isPhone(info))
    const fourth = listCards(page).nth(3)
    if (await fourth.count()) {
      await fourth.getByRole('button', { name: 'Guardar propiedad' }).click()
      await page.waitForTimeout(600)
      await expect(nudge).toHaveCount(0)
    }
  })

  test('CREAR CUENTA on the card goes to create an account', async ({ page }, info) => {
    await asVisitor(page, PIURA_FAR)
    await openExplore(page)
    await openList(page, isPhone(info))
    const cards = listCards(page)
    for (let i = 0; i < 3; i++) await cards.nth(i).getByRole('button', { name: 'Guardar propiedad' }).click()
    await page.getByRole('dialog', { name: 'No pierdas tus guardados' }).getByRole('button', { name: /Crear cuenta/i }).click()
    await expect(page).toHaveURL(/\/app\/register/)
  })
})

test.describe('the listing page', () => {
  test('a visitor sees the listing; WhatsApp asks for an account', async ({ page }, info) => {
    const l = await someListing('venta')
    await asVisitor(page)
    await page.goto(`/property/${l.id}`)
    const wa = page.getByRole('button', { name: /Escríbele por WhatsApp/ })
    await expect(wa).toBeVisible()
    await expect(page.getByText(/(S\/\.?|US\$)\s?[\d.,]+/).first()).toBeVisible()
    // The listing's photo arrives (not just the page around it).
    await expect
      .poll(() => page.evaluate(() => [...document.images].some((i) => i.naturalWidth > 0 && i.getBoundingClientRect().width > 300)))
      .toBe(true)
    await page.waitForTimeout(600)
    await noHorizontalOverflow(page)
    await shot(page, info, '10-listing-page')
    await wa.click()
    await expect(page.getByText('Escríbele al propietario')).toBeVisible()
    await expect(page.getByText(/crea tu cuenta y verifica tu número/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'CREA TU CUENTA' }).or(page.getByRole('button', { name: 'CREA TU CUENTA' }))).toBeVisible()
    await shot(page, info, '11-whatsapp-gate')
  })
})
