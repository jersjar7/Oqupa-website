// @vitest-environment jsdom
// ADR-043 D6, D7 — Ubicación: the map opens where the person is and asks
// "¿Ubicación es correcta?" (Jerson's words, 2026-11-02); no pin on the city centre before anything is
// done; an address search limited to Piura; "¿Mostrar tu dirección exacta?"
// as two big buttons.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

interface PickerProps {
  latitude: number | null
  longitude: number | null
  provisional?: { lat: number; lng: number } | null
  focus?: { lat: number; lng: number; key: number } | null
  onChange: (lat: number, lng: number) => void
}
const picker = vi.hoisted(() => ({ props: null as null | PickerProps }))
vi.mock('../LocationPicker', () => ({
  default: (p: PickerProps) => {
    picker.props = p
    return <div data-testid="location-picker" />
  },
}))
vi.mock('@/lib/map/districtResolver', async () => {
  const { findDistrict } = await import('@/lib/map/peruGeography')
  return { DistrictResolver: { load: () => Promise.resolve({ districtForPin: () => findDistrict('Castilla') }) } }
})
const border = vi.hoisted(() => ({ inside: true }))
vi.mock('@/lib/map/departamentoBorder', () => ({
  DepartamentoBorder: { load: () => Promise.resolve({ contains: () => border.inside }) },
}))
const search = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/lib/map/addressSearch', async (orig) => ({
  ...(await orig<typeof import('@/lib/map/addressSearch')>()),
  searchAddresses: (...a: unknown[]) => search.fn(...a),
}))

import WizardStep3 from '../WizardStep3'
import { useListingFormStore } from '@/stores/listingFormStore'

const HERE = { latitude: -5.1801, longitude: -80.6201 }
function allowLocation(coords = HERE) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: { coords: typeof coords }) => void) => ok({ coords }) },
  })
}
function refuseLocation() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (_ok: unknown, no: (e: { code: number }) => void) => no({ code: 1 }) },
  })
}
const btn = (name: string | RegExp) => screen.getByRole('button', { name })

/** Reads like the app's choice buttons: Gotham Bold, upper case, tracked 1 px, a pill (ADR-038). */
function expectAppButtonStyle(el: HTMLElement) {
  const cls = el.className.split(/\s+/)
  expect(cls).toEqual(expect.arrayContaining(['font-sans', 'font-bold', 'uppercase', 'tracking-[1px]', 'rounded-full']))
  expect(cls).not.toContain('font-medium')
}
const ASK = '¿Ubicación es correcta?'
const TAP = 'Toca el mapa donde está tu propiedad o busca la dirección.'

describe('WizardStep3 — where the property is (D6)', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
    useListingFormStore.getState().setStep(3)
    picker.props = null
    border.inside = true
    search.fn.mockReset()
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })

  it('no pin before the person does anything (never the city centre)', async () => {
    refuseLocation()
    render(<WizardStep3 />)
    await waitFor(() => expect(picker.props).not.toBeNull())
    expect(picker.props!.latitude).toBeNull()
    expect(picker.props!.longitude).toBeNull()
    expect(await screen.findByText(TAP)).toBeTruthy()
    expect(screen.queryByText(ASK)).toBeNull()
  })

  it('location allowed: the map opens on the person and asks; SÍ places the pin there', async () => {
    allowLocation()
    render(<WizardStep3 />)
    expect(await screen.findByText(ASK)).toBeTruthy()
    expect(picker.props!.provisional).toEqual({ lat: HERE.latitude, lng: HERE.longitude })
    expect(picker.props!.latitude).toBeNull()
    await act(async () => fireEvent.click(btn('Sí')))
    await waitFor(() => expect(useListingFormStore.getState().data.latitude).toBe(HERE.latitude))
    expect(useListingFormStore.getState().data.longitude).toBe(HERE.longitude)
    expect(screen.queryByText(ASK)).toBeNull()
    expect(await screen.findByText('Castilla, Piura, Piura')).toBeTruthy()
  })

  it('NO: no pin, and the page says what to do instead', async () => {
    allowLocation()
    render(<WizardStep3 />)
    fireEvent.click(await screen.findByRole('button', { name: 'No' }))
    expect(screen.queryByText(ASK)).toBeNull()
    expect(screen.getByText(TAP)).toBeTruthy()
    expect(picker.props!.provisional ?? null).toBeNull()
    expect(useListingFormStore.getState().data.latitude).toBeNull()
  })

  it('tapping the map while it asks places the pin where tapped', async () => {
    allowLocation()
    render(<WizardStep3 />)
    await screen.findByText(ASK)
    await act(async () => picker.props!.onChange(-5.2, -80.64))
    await waitFor(() => expect(useListingFormStore.getState().data.latitude).toBe(-5.2))
    expect(screen.queryByText(ASK)).toBeNull()
  })

  it('a person outside Piura is not asked', async () => {
    allowLocation({ latitude: -12.04, longitude: -77.03 })
    border.inside = false
    render(<WizardStep3 />)
    expect(await screen.findByText(TAP)).toBeTruthy()
    expect(screen.queryByText(ASK)).toBeNull()
  })

  it('a listing that already has its pin is not asked again', async () => {
    allowLocation()
    useListingFormStore.getState().updateData({ latitude: -5.17, longitude: -80.6 })
    render(<WizardStep3 />)
    await waitFor(() => expect(picker.props!.latitude).toBe(-5.17))
    expect(screen.queryByText(ASK)).toBeNull()
  })

  it('SIGUIENTE without a pin stays and asks for one, in Spanish', async () => {
    refuseLocation()
    render(<WizardStep3 />)
    fireEvent.click(btn('Siguiente'))
    expect(await screen.findByText('Selecciona una ubicación en el mapa')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(3)
  })
})

describe('WizardStep3 — address search (D6)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
    useListingFormStore.getState().setStep(3)
    refuseLocation()
    search.fn.mockReset()
  })

  it('finds the address and moves the map there; the pin waits for the person\'s yes, then the street fills Dirección', async () => {
    search.fn.mockResolvedValue([
      { id: 'a', name: 'Avenida Grau 123', place: 'Castilla, Departamento de Piura, Perú', latitude: -5.2138, longitude: -80.6255, isStreet: true },
    ])
    render(<WizardStep3 />)
    fireEvent.change(screen.getByLabelText('Busca tu dirección'), { target: { value: 'Av Grau 123' } })
    const result = await screen.findByRole('button', { name: /Avenida Grau 123/ })
    await act(async () => fireEvent.click(result))
    expect(picker.props!.focus).toMatchObject({ lat: -5.2138, lng: -80.6255 })
    // Not saved until confirmed (hostile review): a geocoding point is a guess.
    expect(await screen.findByText(ASK)).toBeTruthy()
    expect(useListingFormStore.getState().data.latitude).toBeNull()
    await act(async () => fireEvent.click(btn('Sí')))
    await waitFor(() => expect(useListingFormStore.getState().data.latitude).toBe(-5.2138))
    expect((screen.getByLabelText('Dirección') as HTMLInputElement).value).toBe('Avenida Grau 123')
    expect(screen.queryByRole('button', { name: /Avenida Grau 123/ })).toBeNull()
  })

  it('nothing found says so, in Spanish', async () => {
    search.fn.mockResolvedValue([])
    render(<WizardStep3 />)
    fireEvent.change(screen.getByLabelText('Busca tu dirección'), { target: { value: 'zzzz' } })
    expect(await screen.findByText('No encontramos esa dirección. Toca el mapa donde está tu propiedad.')).toBeTruthy()
  })

  it('a failed search says so, in Spanish', async () => {
    search.fn.mockRejectedValue(new Error('network'))
    render(<WizardStep3 />)
    fireEvent.change(screen.getByLabelText('Busca tu dirección'), { target: { value: 'Av Grau' } })
    expect(await screen.findByText('No pudimos buscar. Toca el mapa donde está tu propiedad.')).toBeTruthy()
  })
})

describe('WizardStep3 — ¿Mostrar tu dirección exacta? (D7)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({
      propertyType: 'casa', operationType: 'venta', role: 'owner',
      latitude: -5.17, longitude: -80.6, calle: 'Av. Grau 1', distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura',
    })
    useListingFormStore.getState().setStep(3)
    refuseLocation()
  })

  it('asks with two big buttons, Sí by default', () => {
    render(<WizardStep3 />)
    expect(screen.getByRole('heading', { name: '¿Mostrar tu dirección exacta?' })).toBeTruthy()
    expect(btn('Sí').getAttribute('aria-pressed')).toBe('true')
    expect(btn('No').getAttribute('aria-pressed')).toBe('false')
    expect(btn('Sí').className).toMatch(/\bmin-h-14\b/)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('No is kept with the draft and published', () => {
    render(<WizardStep3 />)
    fireEvent.click(btn('No'))
    expect(useListingFormStore.getState().data.showExactLocation).toBe(false)
    expect(screen.getByText('Se mostrará solo el distrito y una ubicación aproximada en el mapa')).toBeTruthy()
  })

  // Brand consistency with the app (2026-11-13): OqupaChoiceButtons.
  it('Sí / No read like the app: upper case, bold, tracked pills', () => {
    render(<WizardStep3 />)
    expectAppButtonStyle(btn('Sí'))
    expectAppButtonStyle(btn('No'))
  })
})

describe('WizardStep3 — "¿Ubicación es correcta?" reads like the app', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
    useListingFormStore.getState().setStep(3)
    picker.props = null
    border.inside = true
    search.fn.mockReset()
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })

  // Brand consistency with the app (2026-11-13): NO outlined, SÍ filled.
  it('"¿Ubicación es correcta?" answers like the app: NO outlined then SÍ filled, upper-case pills', async () => {
    allowLocation()
    render(<WizardStep3 />)
    await screen.findByText(ASK)
    const no = btn('No')
    const yes = btn('Sí')
    expectAppButtonStyle(no)
    expectAppButtonStyle(yes)
    expect(no.compareDocumentPosition(yes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(yes.className).toMatch(/\bbg-secondary\b/)
    expect(no.className).toMatch(/\bbg-white\b/)
  })
})
