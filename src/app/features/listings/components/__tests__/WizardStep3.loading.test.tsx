// @vitest-environment jsdom
// ADR-043 step 3, bug 9: "Elige el distrito" showed in red while the district
// for a fresh pin was still being worked out. No error while loading.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'

const pinRef = vi.hoisted(() => ({ onChange: null as null | ((lat: number, lng: number) => void) }))
vi.mock('../LocationPicker', () => ({
  default: (p: { onChange: (lat: number, lng: number) => void }) => {
    pinRef.onChange = p.onChange
    return <div data-testid="location-picker" />
  },
}))
const loader = vi.hoisted(() => ({ resolve: null as null | ((r: unknown) => void) }))
vi.mock('@/lib/map/districtResolver', () => ({
  DistrictResolver: { load: () => new Promise((r) => { loader.resolve = r }) },
}))

import WizardStep3 from '../WizardStep3'
import { useListingFormStore } from '@/stores/listingFormStore'
import { findDistrict } from '@/lib/map/peruGeography'

describe('WizardStep3 — while the district loads', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    localStorage.clear()
    useListingFormStore.getState().reset()
    pinRef.onChange = null
    loader.resolve = null
  })

  it('says it is looking, in neutral words, not an error', async () => {
    render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.1738, -80.609))
    expect(screen.queryByText('Elige el distrito')).toBeNull()
    expect(screen.getByText('Buscando el distrito…')).toBeDefined()

    await act(async () => loader.resolve!({ districtForPin: () => findDistrict('Castilla') }))
    await waitFor(() => expect(screen.getByText('Castilla, Piura, Piura')).toBeDefined())
    expect(screen.queryByText('Buscando el distrito…')).toBeNull()
  })

  it('once loaded and no district matches, then it asks', async () => {
    render(<WizardStep3 />)
    await waitFor(() => expect(pinRef.onChange).not.toBeNull())
    await act(async () => pinRef.onChange!(-5.2, -82.0))
    await act(async () => loader.resolve!({ districtForPin: () => null }))
    await waitFor(() => expect(screen.getAllByText('Elige el distrito').length).toBeGreaterThan(0))
  })
})
