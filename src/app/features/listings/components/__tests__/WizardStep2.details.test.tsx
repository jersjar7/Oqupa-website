// @vitest-environment jsdom
// ADR-043 step 3 — the wizard's Detalles page (bugs 1, 2, 4, 5, 6, 7).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WizardStep2 from '../WizardStep2'
import { useListingFormStore } from '@/stores/listingFormStore'

const ENGLISH = /invalid|expected|received|NaN/i

function prepare(propertyType: 'casa' | 'terreno' = 'casa') {
  useListingFormStore.getState().reset()
  useListingFormStore.getState().updateData({ propertyType, operationType: 'venta', role: 'owner' })
  useListingFormStore.getState().setStep(2)
}

const box = (label: RegExp) => screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement
const type = (label: RegExp, value: string) => fireEvent.change(box(label), { target: { value } })
const continuar = () => screen.getByRole('button', { name: /continuar/i })

async function fillValidCasa(bedrooms = '3') {
  fireEvent.change(screen.getByLabelText(/descripción/i), {
    target: { value: 'Casa amplia y luminosa cerca del parque central' },
  })
  await waitFor(() => box(/área total/i))
  type(/área total/i, '120')
  await waitFor(() => box(/dormitorios/i))
  type(/dormitorios/i, bedrooms)
  type(/baños/i, '2')
  await waitFor(() => continuar())
}

describe('WizardStep2 — Detalles', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    prepare()
  })

  it('0 bedrooms keeps CONTINUAR on screen and explains why it is refused', async () => {
    render(<WizardStep2 />)
    // Typed as the first value: before, a 0 hid CONTINUAR with no explanation.
    await fillValidCasa('0')
    type(/baños/i, '0')
    fireEvent.click(continuar())
    expect(await screen.findByText('Una casa necesita al menos 1 dormitorio.')).toBeTruthy()
    expect(screen.getByText('Una casa necesita al menos 1 baño.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(2)
  })

  it('clearing the optional parking box is allowed (no parking)', async () => {
    render(<WizardStep2 />)
    await fillValidCasa()
    type(/estacionamientos/i, '')
    fireEvent.click(continuar())
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.availableParkingSpaces).toBe(0)
    expect(document.body.textContent).not.toMatch(ENGLISH)
  })

  it('a half bathroom is refused in Spanish', async () => {
    render(<WizardStep2 />)
    await fillValidCasa()
    type(/baños/i, '1.5')
    fireEvent.click(continuar())
    expect(await screen.findByText('Escribe un número entero, sin decimales.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(2)
    expect(document.body.textContent).not.toMatch(ENGLISH)
  })

  it('letters in a number box are refused in Spanish', async () => {
    render(<WizardStep2 />)
    await fillValidCasa()
    type(/dormitorios/i, 'tres')
    fireEvent.click(continuar())
    expect(await screen.findByText('Escribe solo números.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(ENGLISH)
  })

  it('limits, in the app\'s words', async () => {
    render(<WizardStep2 />)
    await fillValidCasa()
    type(/dormitorios/i, '51')
    type(/área total/i, '1000001')
    fireEvent.click(continuar())
    expect(await screen.findByText('Máximo 50.')).toBeTruthy()
    expect(screen.getByText('El área máxima es 1,000,000 m².')).toBeTruthy()
  })

  it('"120,5" in the area is 120.5 m²', async () => {
    render(<WizardStep2 />)
    await fillValidCasa()
    type(/área total/i, '120,5')
    fireEvent.click(continuar())
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.totalAreaInSquareMeters).toBe(120.5)
  })

  it('ATRÁS keeps what was typed', async () => {
    const { unmount } = render(<WizardStep2 />)
    await fillValidCasa()
    type(/área total/i, '95,5')
    fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(useListingFormStore.getState().step).toBe(1)
    unmount()

    useListingFormStore.getState().setStep(2)
    render(<WizardStep2 />)
    expect((screen.getByLabelText(/descripción/i) as HTMLTextAreaElement).value).toBe(
      'Casa amplia y luminosa cerca del parque central',
    )
    expect(box(/área total/i).value).toBe('95.5')
    expect(box(/dormitorios/i).value).toBe('3')
    expect(box(/baños/i).value).toBe('2')
  })
})
