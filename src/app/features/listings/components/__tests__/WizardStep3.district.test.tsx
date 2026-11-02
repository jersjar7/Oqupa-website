// @vitest-environment jsdom
// Map plan step 1, website half (ADR-031): the district comes from where the
// pin is (official IGN outlines), never from free typing; the owner corrects it
// only by choosing from the official list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const pinRef = vi.hoisted(() => ({ onChange: null as null | ((lat: number, lng: number) => void) }))
vi.mock('../LocationPicker', () => ({
  default: (p: { onChange: (lat: number, lng: number) => void }) => {
    pinRef.onChange = p.onChange
    return <div data-testid="location-picker" />
  },
}))
const resolverMock = vi.hoisted(() => ({ districtForPin: vi.fn() }))
vi.mock('@/lib/map/districtResolver', () => ({
  DistrictResolver: { load: () => Promise.resolve(resolverMock) },
}))

import WizardStep3 from '../WizardStep3'
import { useListingFormStore } from '@/stores/listingFormStore'
import { findDistrict } from '@/lib/map/peruGeography'

describe('WizardStep3 — the district', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; the reveal animations ask for reduced motion.
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    // jsdom has no scrollIntoView; RevealField calls it on a timer after reveal.
    Element.prototype.scrollIntoView = vi.fn()
    useListingFormStore.getState().reset?.()
    pinRef.onChange = null
    resolverMock.districtForPin.mockReset()
  })

  it('has no free-text district or provincia boxes', () => {
    render(<WizardStep3 />)
    expect(screen.queryByLabelText('Distrito')).toBeNull()
    expect(screen.queryByLabelText('Provincia')).toBeNull()
  })

  it('the pin sets the official district, provincia and departamento', async () => {
    resolverMock.districtForPin.mockReturnValue(findDistrict('Castilla'))
    render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.1738, -80.609))
    await waitFor(() => expect(screen.getByText('Castilla, Piura, Piura')).toBeDefined())
    expect(resolverMock.districtForPin).toHaveBeenCalledWith(-5.1738, -80.609)
  })

  it('a pin outside every district asks the owner to choose', async () => {
    resolverMock.districtForPin.mockReturnValue(null)
    render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.2, -82.0))
    await waitFor(() => expect(screen.getByText('Elige el distrito')).toBeDefined())
  })

  it('"Cambiar distrito" opens the official list; choosing one sets it', async () => {
    resolverMock.districtForPin.mockReturnValue(findDistrict('Piura'))
    render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.1945, -80.6328))
    await waitFor(() => expect(screen.getByText('Piura, Piura, Piura')).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar distrito' }))
    fireEvent.change(screen.getByLabelText('Busca tu distrito'), { target: { value: 'veintiseis' } })
    fireEvent.click(screen.getByRole('button', { name: /Veintiséis de Octubre/ }))
    expect(screen.getByText('Veintiséis de Octubre, Piura, Piura')).toBeDefined()
  })
})

// ADR-043 step 3, bug 2: ATRÁS on Ubicación keeps the pin and the address.
describe('WizardStep3 — ATRÁS', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    localStorage.clear()
    useListingFormStore.getState().reset?.()
    useListingFormStore.getState().setStep(3)
    pinRef.onChange = null
    resolverMock.districtForPin.mockReset()
  })

  it('keeps the pin, the street and the district', async () => {
    resolverMock.districtForPin.mockReturnValue(findDistrict('Castilla'))
    const { unmount } = render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.1738, -80.609))
    await waitFor(() => expect(screen.getByText('Castilla, Piura, Piura')).toBeDefined())
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Av. Grau 123' } })
    fireEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(useListingFormStore.getState().step).toBe(2)
    unmount()

    const d = useListingFormStore.getState().data
    expect([d.latitude, d.longitude, d.calle, d.distrito]).toEqual([-5.1738, -80.609, 'Av. Grau 123', 'Castilla'])
    useListingFormStore.getState().setStep(3)
    render(<WizardStep3 />)
    expect((screen.getByLabelText('Dirección') as HTMLInputElement).value).toBe('Av. Grau 123')
    expect(screen.getByText('Castilla, Piura, Piura')).toBeDefined()
  })

  it('without a pin, the map\'s starting point is not saved as the person\'s address', async () => {
    const { unmount } = render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    unmount()
    expect(useListingFormStore.getState().data.latitude).toBeNull()
  })
})
