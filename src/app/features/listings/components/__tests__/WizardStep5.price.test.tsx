// @vitest-environment jsdom
// ADR-043 step 3 — the Precio page (bugs 2, 14, 15, 16).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, storage: {}, auth: { currentUser: { uid: 'owner-1' } } }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))

import WizardStep5 from '../WizardStep5'
import { useListingFormStore } from '@/stores/listingFormStore'

function renderStep() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WizardStep5 />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const priceBox = () => screen.getByPlaceholderText(/^Ej:/) as HTMLInputElement
const savedDraft = () => JSON.parse(sessionStorage.getItem('oqupa-listing-form') ?? '{}')

describe('WizardStep5 — Precio', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
    useListingFormStore.getState().setStep(5)
  })

  it('the price is kept in the draft as it is typed (a refresh keeps it)', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '250000' } })
    expect(useListingFormStore.getState().data.amount).toBe(250000)
    expect(savedDraft().amount).toBe(250000)
  })

  it('the currency is kept in the draft too', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /US\$/ }))
    expect(savedDraft().currency).toBe('USD')
  })

  it('ATRÁS keeps the price', () => {
    const { unmount } = renderStep()
    fireEvent.change(priceBox(), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(useListingFormStore.getState().step).toBe(4)
    unmount()
    useListingFormStore.getState().setStep(5)
    renderStep()
    expect(priceBox().value).toBe('1,500')
  })

  it('while typing, the box shows exactly what was typed (reformatting threw the cursor to the end)', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '15000' } })
    expect(priceBox().value).toBe('15000')
    fireEvent.change(priceBox(), { target: { value: '150900' } })
    expect(priceBox().value).toBe('150900')
    expect(useListingFormStore.getState().data.amount).toBe(150900)
  })

  it('leaving the box shows the thousands', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '250000' } })
    fireEvent.blur(priceBox())
    expect(priceBox().value).toBe('250,000')
  })

  it('"1500,50" is 1500.5', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '1500,50' } })
    expect(useListingFormStore.getState().data.amount).toBe(1500.5)
  })

  it('a price over the limit is refused in the app\'s words', async () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '1000000000' } })
    expect(await screen.findByText('Revisa el precio: es demasiado alto.')).toBeTruthy()
  })

  it('agent help says "vender" for a sale', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '1500' } })
    expect(screen.getByText(/ayudar a vender tu propiedad/)).toBeTruthy()
  })

  it('agent help says "alquilar" for a rental', () => {
    useListingFormStore.getState().updateData({ operationType: 'alquiler', rentalDurationType: 'longTerm' })
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '1500' } })
    expect(screen.getByText(/ayudar a alquilar tu propiedad/)).toBeTruthy()
    expect(screen.queryByText(/vender/)).toBeNull()
  })

  it('review #2: "S/. 800" typed with the currency is 800', () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: 'S/. 800' } })
    expect(useListingFormStore.getState().data.amount).toBe(800)
  })

  it('review #5: a separator too many is explained', async () => {
    renderStep()
    fireEvent.change(priceBox(), { target: { value: '1.5.00' } })
    expect(await screen.findByText('Revisa el número: tiene un punto o una coma de más.')).toBeTruthy()
  })
})
