// @vitest-environment jsdom
// ADR-043 step 3 — the wizard's Detalles page (bugs 1, 2, 4, 5, 6, 7).
// ADR-043 D4 (approved): dormitorios, baños and estacionamientos became − / +
// buttons, so the tests that typed into those boxes (0 dormitorios hiding the
// button, a cleared parking box, "1.5" baños, "tres" dormitorios, 51) now
// check the area box, the one number still typed; the steppers' own rules are
// in WizardStep2.simple.test.tsx.
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
const siguiente = () => screen.getByRole('button', { name: 'Siguiente' })

function fillValidCasa() {
  fireEvent.change(screen.getByLabelText(/descripción/i), {
    target: { value: 'Casa amplia y luminosa cerca del parque central' },
  })
  type(/área total/i, '120')
}

describe('WizardStep2 — Detalles', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    localStorage.clear()
    sessionStorage.clear()
    prepare()
  })

  it('SIGUIENTE is always on screen, before anything is typed', () => {
    render(<WizardStep2 />)
    expect(siguiente()).toBeTruthy()
  })

  it('no parking is 0, never an error', async () => {
    render(<WizardStep2 />)
    fillValidCasa()
    fireEvent.click(siguiente())
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.availableParkingSpaces).toBe(0)
    expect(document.body.textContent).not.toMatch(ENGLISH)
  })

  it('letters in the area box are refused in Spanish', async () => {
    render(<WizardStep2 />)
    fillValidCasa()
    type(/área total/i, 'cien')
    fireEvent.click(siguiente())
    expect(await screen.findByText('Escribe solo números.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(2)
    expect(document.body.textContent).not.toMatch(ENGLISH)
  })

  it('limits, in the app\'s words', async () => {
    render(<WizardStep2 />)
    fillValidCasa()
    type(/área total/i, '1000001')
    fireEvent.click(siguiente())
    expect(await screen.findByText('El área máxima es 1,000,000 m².')).toBeTruthy()
  })

  it('"120,5" in the area is 120.5 m²', async () => {
    render(<WizardStep2 />)
    fillValidCasa()
    type(/área total/i, '120,5')
    fireEvent.click(siguiente())
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
    expect(useListingFormStore.getState().data.totalAreaInSquareMeters).toBe(120.5)
  })

  it('ATRÁS keeps what was typed', () => {
    const { unmount } = render(<WizardStep2 />)
    fillValidCasa()
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
  })
})
