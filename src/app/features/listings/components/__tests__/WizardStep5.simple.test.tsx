// @vitest-environment jsdom
// ADR-043 D1, D9, D10 — Precio: the currency as two big buttons, S/ and US$;
// no agent help in the wizard (it is offered after publishing); ATRÁS and
// PUBLICAR at the foot.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, storage: {}, auth: { currentUser: { uid: 'owner-1' } } }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))

import WizardStep5 from '../WizardStep5'
import { useListingFormStore } from '@/stores/listingFormStore'

const renderStep = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <WizardStep5 />
      </MemoryRouter>
    </QueryClientProvider>,
  )
const btn = (name: string | RegExp) => screen.getByRole('button', { name })

describe('WizardStep5 — Precio (D9, D10)', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({ propertyType: 'casa', operationType: 'venta', role: 'owner' })
    useListingFormStore.getState().setStep(5)
  })

  // The buttons say the word too (Jerson, 2026-11-02): "S/ Soles", "US$ Dólares".
  it('the currency is two big buttons, "S/ Soles" (chosen) and "US$ Dólares"', () => {
    renderStep()
    expect(btn('S/ Soles').getAttribute('aria-pressed')).toBe('true')
    expect(btn('US$ Dólares').getAttribute('aria-pressed')).toBe('false')
    expect(btn('S/ Soles').className).toMatch(/\bmin-h-14\b/)
    expect(screen.queryByText(/\(PEN\)|\(USD\)/)).toBeNull()
    fireEvent.click(btn('US$ Dólares'))
    expect(btn('US$ Dólares').getAttribute('aria-pressed')).toBe('true')
    expect(useListingFormStore.getState().data.currency).toBe('USD')
  })

  it('the price box shows the chosen currency', () => {
    renderStep()
    expect(screen.getByLabelText('Precio en S/')).toBeTruthy()
    fireEvent.click(btn('US$ Dólares'))
    expect(screen.getByLabelText('Precio en US$')).toBeTruthy()
  })

  it('no agent help in the wizard, even with a price typed', () => {
    renderStep()
    fireEvent.change(screen.getByPlaceholderText(/^Ej:/), { target: { value: '250000' } })
    expect(screen.queryByText(/agente/i)).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('ATRÁS and PUBLICAR are on screen before a price is typed', () => {
    renderStep()
    expect(btn('Atrás')).toBeTruthy()
    expect(btn(/publicar/i)).toBeTruthy()
  })

  it('a rental says what the price is for', () => {
    useListingFormStore.getState().updateData({ operationType: 'alquiler', rentalDurationType: 'shortTerm' })
    renderStep()
    expect(screen.getByText('Precio por noche')).toBeTruthy()
  })
})
