// @vitest-environment jsdom
// Hostile review #6: an older listing that is over a limit introduced now
// (51 dormitorios, 2,000,000 m², a price over 999,999,999, 0 dormitorios
// from the app) must still be editable — the limits apply to the fields the
// owner changes.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WizardStep2 from '../components/WizardStep2'
import { useListingFormStore } from '@/stores/listingFormStore'
import { fullListingSchema } from '@/schemas/listingSchema'
import { issuesThatCount } from '../editLimits'

const box = (label: RegExp) => screen.getByLabelText(label, { selector: 'input' }) as HTMLInputElement

function openEdit() {
  const s = useListingFormStore.getState()
  s.reset()
  s.setEditMode('L1', 'P1')
  s.updateData({
    propertyType: 'casa', operationType: 'venta', role: 'owner',
    description: 'Casa grande heredada, con muchos cuartos y patio',
    totalAreaInSquareMeters: 2_000_000, bedroomCount: 60, bathroomCount: 0, availableParkingSpaces: 70,
    amount: 2_000_000_000, currency: 'PEN',
  })
  s.markEditBaseline()
  s.setStep(2)
}

describe('editing an older listing over the new limits', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    openEdit()
  })

  it('unchanged fields do not block CONTINUAR', async () => {
    render(<WizardStep2 />)
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    await waitFor(() => expect(useListingFormStore.getState().step).toBe(3))
  })

  it('a field the owner changes gets the limit', async () => {
    render(<WizardStep2 />)
    fireEvent.change(box(/dormitorios/i), { target: { value: '61' } })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(await screen.findByText('Máximo 50.')).toBeTruthy()
    expect(useListingFormStore.getState().step).toBe(2)
  })

  it('the pre-save check lets unchanged fields through, and only those', () => {
    const d = useListingFormStore.getState().data
    const values = { ...d, latitude: -5.19, longitude: -80.63, calle: 'Av. Grau 1', distrito: 'Piura', provincia: 'Piura', departamento: 'Piura', wantsRealtorHelp: false, maxRealtors: 3 }
    const r = fullListingSchema.safeParse(values)
    expect(r.success).toBe(false)
    expect(issuesThatCount(r.success ? [] : r.error.issues, values)).toEqual([])
    const changed = { ...values, amount: 3_000_000_000 }
    const r2 = fullListingSchema.safeParse(changed)
    expect(issuesThatCount(r2.success ? [] : r2.error.issues, changed).map((i) => i.message)).toEqual(['Revisa el precio: es demasiado alto.'])
  })

  it('a new listing gets every limit', () => {
    useListingFormStore.getState().reset()
    const values = { totalAreaInSquareMeters: 2_000_000 }
    const r = fullListingSchema.safeParse(values)
    const issues = issuesThatCount(r.success ? [] : r.error.issues, values)
    expect(issues.some((i) => i.message === 'El área máxima es 1,000,000 m².')).toBe(true)
  })
})
