// @vitest-environment jsdom
// ADR-043 D1–D3 — the wizard's first page: "¿Vendes o alquilas?" with three
// big buttons (no separate "plazo" question), "Soy el dueño" by default.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

import WizardStep1 from '../WizardStep1'
import { useListingFormStore } from '@/stores/listingFormStore'

const ENGLISH = /invalid|expected|received|undefined/i
const btn = (name: string | RegExp) => screen.getByRole('button', { name })

/** Reads like the app's choice buttons: Gotham Bold, upper case, tracked 1 px, a pill (ADR-038). */
function expectAppButtonStyle(el: HTMLElement) {
  const cls = el.className.split(/\s+/)
  expect(cls).toEqual(expect.arrayContaining(['font-sans', 'font-bold', 'uppercase', 'tracking-[1px]', 'rounded-full']))
  expect(cls).not.toContain('font-medium')
}
const renderStep = () =>
  render(
    <MemoryRouter>
      <WizardStep1 />
    </MemoryRouter>,
  )

describe('WizardStep1 — ¿Vendes o alquilas? (D2, D3)', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    navigate.mockReset()
    useListingFormStore.getState().reset()
  })

  it('asks "¿Vendes o alquilas?" with three big buttons and no plazo question', () => {
    renderStep()
    expect(screen.getByRole('heading', { name: '¿Vendes o alquilas?' })).toBeTruthy()
    for (const name of ['Venta', 'Alquiler por mes', 'Alquiler por noche']) {
      expect(btn(name).className).toMatch(/\bmin-h-14\b/)
    }
    expect(screen.queryByText(/plazo/i)).toBeNull()
    expect(screen.queryByText(/duración/i)).toBeNull()
    expect(screen.queryByText(/tipo de operación/i)).toBeNull()
  })

  it('"Alquiler por noche" is alquiler + shortTerm, and offers the short-stay types', async () => {
    renderStep()
    fireEvent.click(btn('Alquiler por noche'))
    expect(await screen.findByRole('button', { name: /Alojamiento/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Terreno/ })).toBeNull()
    fireEvent.click(btn(/Alojamiento/))
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(2))
    const d = useListingFormStore.getState().data
    expect(d.operationType).toBe('alquiler')
    expect(d.rentalDurationType).toBe('shortTerm')
  })

  it('"Alquiler por mes" is alquiler + longTerm; "Venta" has no plazo', async () => {
    renderStep()
    fireEvent.click(btn('Alquiler por mes'))
    fireEvent.click(await screen.findByRole('button', { name: /Cuarto/ }))
    fireEvent.click(btn('Venta'))
    // A Cuarto cannot be sold: the choice is cleared, not kept silently.
    expect(screen.queryByRole('button', { name: /Cuarto/ })).toBeNull()
    fireEvent.click(btn(/^Casa/))
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(2))
    expect(useListingFormStore.getState().data.operationType).toBe('venta')
    expect(useListingFormStore.getState().data.rentalDurationType).toBe('')
  })

  it('"Soy el dueño" is chosen by default; others tap "¿No eres el dueño?"', async () => {
    renderStep()
    expect(screen.getByText('Soy el dueño')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Soy agente inmobiliario' })).toBeNull()
    fireEvent.click(btn('Venta'))
    fireEvent.click(btn(/^Casa/))
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(2))
    expect(useListingFormStore.getState().data.role).toBe('owner')
  })

  it('an agent says so behind "¿No eres el dueño?"', async () => {
    renderStep()
    fireEvent.click(btn('¿No eres el dueño?'))
    fireEvent.click(btn('Soy agente inmobiliario'))
    fireEvent.click(btn('Venta'))
    fireEvent.click(btn(/^Casa/))
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(2))
    expect(useListingFormStore.getState().data.role).toBe('realtor')
  })

  it('not the owner: their own line shows, with "Cambiar" (not "¿No eres el dueño?" again)', () => {
    useListingFormStore.getState().updateData({ operationType: 'venta', propertyType: 'casa', role: 'relative' })
    renderStep()
    expect(screen.getByText('Represento al dueño')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '¿No eres el dueño?' })).toBeNull()
    fireEvent.click(btn('Cambiar'))
    expect(btn('Represento al dueño').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn('Soy el dueño'))
    expect(btn('¿No eres el dueño?')).toBeTruthy()
  })

  it('SIGUIENTE with nothing chosen stays and says what is missing, in Spanish', async () => {
    renderStep()
    fireEvent.click(btn('Siguiente'))
    expect(await screen.findByText('Elige si vendes o alquilas.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(1)
    expect(document.body.textContent).not.toMatch(ENGLISH)
    // The first message gets the focus (hostile review 2026-11-02).
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Elige si vendes o alquilas.'))
  })

  it('SIGUIENTE without a type asks for it', async () => {
    renderStep()
    fireEvent.click(btn('Venta'))
    fireEvent.click(btn('Siguiente'))
    expect(await screen.findByText('Elige el tipo de propiedad.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(1)
  })

  // Hostile review 2026-11-02: an older Alquiler saved without a rental
  // length showed "Alquiler por mes" chosen while SIGUIENTE refused it.
  it('an older Alquiler with no rental length shows nothing chosen, and asks', async () => {
    useListingFormStore.getState().updateData({ operationType: 'alquiler', rentalDurationType: '', propertyType: 'casa', role: 'owner' })
    renderStep()
    for (const name of ['Venta', 'Alquiler por mes', 'Alquiler por noche']) {
      expect(btn(name).getAttribute('aria-pressed')).toBe('false')
    }
    fireEvent.click(btn('Siguiente'))
    expect(await screen.findByText('Elige si vendes o alquilas.')).toBeTruthy()
    fireEvent.click(btn('Alquiler por mes'))
    fireEvent.click(btn('Siguiente'))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(2))
    expect(useListingFormStore.getState().data.rentalDurationType).toBe('longTerm')
  })

  it('ATRÁS on the first page leaves the wizard', () => {
    renderStep()
    fireEvent.click(btn('Atrás'))
    expect(navigate).toHaveBeenCalled()
  })

  // Brand consistency with the app (2026-11-13): the app shows VENTA /
  // ALQUILER POR MES / ALQUILER POR NOCHE as upper-case pill buttons.
  it('the deal buttons read like the app: upper case, bold, tracked pills', () => {
    render(<WizardStep1 />)
    for (const name of ['Venta', 'Alquiler por mes', 'Alquiler por noche']) expectAppButtonStyle(btn(name))
  })
})
