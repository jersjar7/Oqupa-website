// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

/**
 * Opening "Editar" must load the listing exactly as it is, so saving an
 * unrelated change (the price) writes back what was already there.
 *
 * Found 2026-10-31 on staging: the form did not load "Mostrar ubicación exacta"
 * or the urbanización. It defaulted to exact location ON and an empty
 * urbanización, so an owner who had hidden their address and only changed
 * the price published their real street and coordinates, and lost their
 * urbanización.
 */

const { details, privateLocation } = vi.hoisted(() => ({
  details: { current: null as unknown },
  privateLocation: vi.fn(),
}))

vi.mock('@/hooks/useListings', () => ({
  useListingDetails: () => ({ data: details.current, isLoading: false, error: null }),
}))
vi.mock('@/services/firestoreService', () => ({
  firestoreService: { getPrivatePropertyLocation: privateLocation },
}))
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'L1' }),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/app/components/ui', () => ({ Spinner: () => null }))
vi.mock('../../components/WizardProgress', () => ({ default: () => null }))
vi.mock('../../components/WizardStep1', () => ({ default: () => null }))
vi.mock('../../components/WizardStep2', () => ({ default: () => null }))
vi.mock('../../components/WizardStep3', () => ({ default: () => null }))
vi.mock('../../components/WizardStep4', () => ({ default: () => null }))
vi.mock('../../components/WizardStep5', () => ({ default: () => null }))

import EditListingPage from '../EditListingPage'
import { useListingFormStore } from '@/stores/listingFormStore'

function fixture(showExactLocation: boolean) {
  return {
    listing: {
      id: 'L1', propertyId: 'P1', role: 'owner', description: 'Casa', status: 'active',
      price: { amount: 1000, currency: 'PEN' }, wantsRealtorHelp: false, maxRealtors: 3,
      showExactLocation,
    },
    property: {
      id: 'P1', propertyType: 'casa', operationType: 'venta',
      specs: { totalAreaInSquareMeters: 120, availableParkingSpaces: 0, propertyAmenities: [] },
      location: {
        latitude: -5.1, longitude: -80.6, calle: showExactLocation ? 'Av. Grau 123' : '',
        urbanizacion: 'Urb. Miraflores', distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura',
      },
      media: { photoKeys: ['a', 'b', 'c'], photoBlurHashes: [] },
    },
  }
}

describe('EditListingPage — loads the listing as it is', () => {
  beforeEach(() => {
    useListingFormStore.getState().reset()
    privateLocation.mockReset()
  })

  it('a listing that hides its address stays hidden', async () => {
    details.current = fixture(false)
    privateLocation.mockResolvedValue({ latitude: -5.2, longitude: -80.7, calle: 'Calle Real 9' })
    render(<EditListingPage />)
    await waitFor(() => expect(useListingFormStore.getState().isEditMode).toBe(true))
    const data = useListingFormStore.getState().data
    expect(data.showExactLocation).toBe(false)
    expect(data.calle).toBe('Calle Real 9')
    // Remembered, so a save that does not move the pin leaves the public point alone.
    expect(data.hiddenAddress).toEqual({
      publicLatitude: -5.1, publicLongitude: -80.6,
      trueLatitude: -5.2, trueLongitude: -80.7, trueCalle: 'Calle Real 9',
    })
  })

  it('a listing that shows its address keeps showing it', async () => {
    details.current = fixture(true)
    render(<EditListingPage />)
    await waitFor(() => expect(useListingFormStore.getState().isEditMode).toBe(true))
    expect(useListingFormStore.getState().data.showExactLocation).toBe(true)
    expect(useListingFormStore.getState().data.hiddenAddress).toBeNull()
  })

  it('the urbanización is kept', async () => {
    details.current = fixture(true)
    render(<EditListingPage />)
    await waitFor(() => expect(useListingFormStore.getState().isEditMode).toBe(true))
    expect(useListingFormStore.getState().data.urbanizacion).toBe('Urb. Miraflores')
  })
})
