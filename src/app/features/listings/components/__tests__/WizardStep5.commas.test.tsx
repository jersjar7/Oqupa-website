// @vitest-environment jsdom
// ADR-061 — the price (Precio) and area (Detalles) boxes show thousands with
// commas while the person types, key by key, with the caret where they expect
// it (founder, 2026-11-13: "Commas as they type for consistency").
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, storage: {}, auth: { currentUser: { uid: 'owner-1' } } }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))

import WizardStep5 from '../WizardStep5'
import WizardStep2 from '../WizardStep2'
import { useListingFormStore } from '@/stores/listingFormStore'

function renderPrice() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WizardStep5 />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const priceBox = () => screen.getByPlaceholderText(/^Ej:/) as HTMLInputElement
const areaBox = () => screen.getByLabelText(/área total/i, { selector: 'input' }) as HTMLInputElement

/** One key, as a browser delivers it: the caret is where it was, the key lands there. */
function key(el: HTMLInputElement, ch: string) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  fireEvent.keyDown(el, { key: ch })
  const value = el.value.slice(0, start) + ch + el.value.slice(end)
  fireEvent.change(el, { target: { value, selectionStart: start + 1, selectionEnd: start + 1 } })
}
function backspace(el: HTMLInputElement) {
  const at = el.selectionStart ?? el.value.length
  fireEvent.keyDown(el, { key: 'Backspace' })
  const value = el.value.slice(0, at - 1) + el.value.slice(at)
  fireEvent.change(el, { target: { value, selectionStart: at - 1, selectionEnd: at - 1 } })
}
function caretAt(el: HTMLInputElement, at: number) {
  el.setSelectionRange(at, at)
  fireEvent.select(el)
}
const shown = (el: HTMLInputElement) => `${el.value.slice(0, el.selectionStart!)}|${el.value.slice(el.selectionStart!)}`

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  localStorage.clear()
  sessionStorage.clear()
  useListingFormStore.getState().reset()
  useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
})

describe('Precio', () => {
  beforeEach(() => useListingFormStore.getState().setStep(5))

  it('typing 250000 shows commas key by key, the caret after the last digit', () => {
    renderPrice()
    const el = priceBox()
    act(() => el.focus())
    const seen: string[] = []
    for (const d of '250000') {
      key(el, d)
      seen.push(shown(el))
    }
    expect(seen).toEqual(['2|', '25|', '250|', '2,500|', '25,000|', '250,000|'])
    expect(useListingFormStore.getState().data.amount).toBe(250000)
  })

  it('1250000 shows 1,250,000 and stays so after leaving the box', () => {
    renderPrice()
    const el = priceBox()
    act(() => el.focus())
    for (const d of '1250000') key(el, d)
    expect(el.value).toBe('1,250,000')
    fireEvent.blur(el)
    expect(el.value).toBe('1,250,000')
    expect(useListingFormStore.getState().data.amount).toBe(1250000)
  })

  it('typing in the middle and deleting a comma keep the caret by its digit', () => {
    renderPrice()
    const el = priceBox()
    act(() => el.focus())
    for (const d of '25000') key(el, d)
    caretAt(el, 3) // "25,|000"
    key(el, '9')
    expect(shown(el)).toBe('259|,000')
    caretAt(el, 4) // "259,|000"
    backspace(el)
    expect(shown(el)).toBe('25|,000')
    expect(useListingFormStore.getState().data.amount).toBe(25000)
  })

  it('rent 1500 with decimals', () => {
    renderPrice()
    const el = priceBox()
    act(() => el.focus())
    for (const ch of '1500.5') key(el, ch)
    expect(el.value).toBe('1,500.5')
    expect(useListingFormStore.getState().data.amount).toBe(1500.5)
  })

  it('a pasted "250.000" shows 250,000 and is 250000', () => {
    renderPrice()
    fireEvent.change(priceBox(), { target: { value: '250.000' } })
    expect(priceBox().value).toBe('250,000')
    expect(useListingFormStore.getState().data.amount).toBe(250000)
  })

  it('a saved price opens with commas', () => {
    useListingFormStore.getState().updateData({ amount: 1250000 })
    renderPrice()
    expect(priceBox().value).toBe('1,250,000')
  })
})

describe('Área (Detalles)', () => {
  beforeEach(() => useListingFormStore.getState().setStep(2))

  it('typing 1250 shows 1,250 and keeps 1250 m²', () => {
    render(<WizardStep2 />)
    const el = areaBox()
    act(() => el.focus())
    const seen: string[] = []
    for (const d of '1250') {
      key(el, d)
      seen.push(el.value)
    }
    expect(seen).toEqual(['1', '12', '125', '1,250'])
    expect(useListingFormStore.getState().data.totalAreaInSquareMeters).toBe(1250)
  })

  it('"120,5" typed with a comma key is 120.5 m², shown "120.5"', () => {
    render(<WizardStep2 />)
    const el = areaBox()
    act(() => el.focus())
    for (const ch of '120,5') key(el, ch)
    expect(el.value).toBe('120.5')
    expect(useListingFormStore.getState().data.totalAreaInSquareMeters).toBe(120.5)
  })

  it('review: a saved area with three decimals opens and saves as shown (120.12)', async () => {
    useListingFormStore.getState().updateData({ totalAreaInSquareMeters: 120.123 })
    render(<WizardStep2 />)
    expect(areaBox().value).toBe('120.12')
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Casa amplia y luminosa cerca del parque central' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    // The number kept is the one on screen, as the app saves it.
    await waitFor(() => expect(useListingFormStore.getState().data.totalAreaInSquareMeters).toBe(120.12))
  })

  it('a saved area opens as "1,250"', () => {
    useListingFormStore.getState().updateData({ totalAreaInSquareMeters: 1250 })
    render(<WizardStep2 />)
    expect(areaBox().value).toBe('1,250')
  })
})
