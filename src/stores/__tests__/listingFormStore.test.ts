// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useListingFormStore } from '../listingFormStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function store() {
  return useListingFormStore.getState()
}

function reset() {
  useListingFormStore.setState(useListingFormStore.getInitialState?.() ?? {}, true)
  sessionStorage.clear()
  // Re-initialise to the default state by calling the store's own reset()
  useListingFormStore.getState().reset()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('listingFormStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useListingFormStore.getState().reset()
  })

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts at step 1', () => {
      expect(store().step).toBe(1)
    })

    it('direction starts as 1 (forward)', () => {
      expect(store().direction).toBe(1)
    })

    it('isEditMode starts as false', () => {
      expect(store().isEditMode).toBe(false)
    })

    it('editListingId starts as null', () => {
      expect(store().editListingId).toBeNull()
    })

    it('editPropertyId starts as null', () => {
      expect(store().editPropertyId).toBeNull()
    })

    it('data starts with blank strings and nulls for all fields', () => {
      const { data } = store()
      expect(data.propertyType).toBe('')
      expect(data.operationType).toBe('')
      expect(data.description).toBe('')
      expect(data.totalAreaInSquareMeters).toBeNull()
      expect(data.bedroomCount).toBeNull()
      expect(data.bathroomCount).toBeNull()
      expect(data.amount).toBeNull()
      expect(data.availableParkingSpaces).toBe(0)
      expect(data.currency).toBe('PEN')
      expect(data.wantsRealtorHelp).toBe(false)
      expect(data.maxRealtors).toBe(3)
      expect(data.photos).toEqual([])
      expect(data.propertyAmenities).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // nextStep / prevStep / setStep
  // -------------------------------------------------------------------------
  describe('nextStep', () => {
    it('advances the step by 1', () => {
      store().nextStep()
      expect(store().step).toBe(2)
    })

    it('sets direction to 1 (forward)', () => {
      store().nextStep()
      expect(store().direction).toBe(1)
    })

    it('does not advance past step 5', () => {
      const s = store()
      for (let i = 0; i < 10; i++) s.nextStep()
      expect(store().step).toBe(5)
    })
  })

  describe('prevStep', () => {
    it('decrements the step by 1', () => {
      store().nextStep()
      store().nextStep()
      store().prevStep()
      expect(store().step).toBe(2)
    })

    it('sets direction to -1 (backward)', () => {
      store().nextStep()
      store().prevStep()
      expect(store().direction).toBe(-1)
    })

    it('does not go below step 1', () => {
      for (let i = 0; i < 5; i++) store().prevStep()
      expect(store().step).toBe(1)
    })
  })

  describe('setStep', () => {
    it('sets the step to the given value', () => {
      store().setStep(3)
      expect(store().step).toBe(3)
    })

    it('sets direction to 1 when moving forward', () => {
      store().setStep(4)
      expect(store().direction).toBe(1)
    })

    it('sets direction to -1 when moving backward', () => {
      store().setStep(4)
      store().setStep(2)
      expect(store().direction).toBe(-1)
    })
  })

  // -------------------------------------------------------------------------
  // updateData
  // -------------------------------------------------------------------------
  describe('updateData', () => {
    it('merges partial data into the existing data', () => {
      store().updateData({ description: 'Casa linda en el centro', bedroomCount: 3 })
      expect(store().data.description).toBe('Casa linda en el centro')
      expect(store().data.bedroomCount).toBe(3)
    })

    it('does not overwrite unrelated fields', () => {
      store().updateData({ description: 'test' })
      expect(store().data.amount).toBeNull()
      expect(store().data.currency).toBe('PEN')
    })

    it('allows updating amount and currency', () => {
      store().updateData({ amount: 250000, currency: 'USD' })
      expect(store().data.amount).toBe(250000)
      expect(store().data.currency).toBe('USD')
    })

    it('allows updating propertyAmenities array', () => {
      store().updateData({ propertyAmenities: ['Piscina', 'Jardín'] })
      expect(store().data.propertyAmenities).toEqual(['Piscina', 'Jardín'])
    })

    it('persists partial updates to sessionStorage', () => {
      store().updateData({ description: 'persisted' })
      const raw = sessionStorage.getItem('oqupa-listing-form')
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.description).toBe('persisted')
    })
  })

  // -------------------------------------------------------------------------
  // setEditMode
  // -------------------------------------------------------------------------
  describe('setEditMode', () => {
    it('sets isEditMode to true', () => {
      store().setEditMode('listing-123', 'property-456')
      expect(store().isEditMode).toBe(true)
    })

    it('stores editListingId', () => {
      store().setEditMode('listing-123', 'property-456')
      expect(store().editListingId).toBe('listing-123')
    })

    it('stores editPropertyId', () => {
      store().setEditMode('listing-123', 'property-456')
      expect(store().editPropertyId).toBe('property-456')
    })

    it('clears sessionStorage', () => {
      sessionStorage.setItem('oqupa-listing-form', '{"step":3}')
      store().setEditMode('listing-123', 'property-456')
      expect(sessionStorage.getItem('oqupa-listing-form')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------
  describe('reset', () => {
    it('resets step to 1', () => {
      store().nextStep()
      store().nextStep()
      store().reset()
      expect(store().step).toBe(1)
    })

    it('resets direction to 1', () => {
      store().prevStep() // triggers direction = -1 (clamped)
      store().reset()
      expect(store().direction).toBe(1)
    })

    it('resets isEditMode to false', () => {
      store().setEditMode('listing-123', 'property-456')
      store().reset()
      expect(store().isEditMode).toBe(false)
    })

    it('resets editListingId to null', () => {
      store().setEditMode('listing-123', 'property-456')
      store().reset()
      expect(store().editListingId).toBeNull()
    })

    it('resets data to initial blank state', () => {
      store().updateData({ description: 'some description', amount: 100000 })
      store().reset()
      expect(store().data.description).toBe('')
      expect(store().data.amount).toBeNull()
    })

    it('clears sessionStorage', () => {
      store().updateData({ description: 'test' }) // writes to session
      store().reset()
      expect(sessionStorage.getItem('oqupa-listing-form')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // sessionStorage persistence
  // -------------------------------------------------------------------------
  describe('sessionStorage persistence', () => {
    it('nextStep writes step to sessionStorage', () => {
      store().nextStep()
      const raw = sessionStorage.getItem('oqupa-listing-form')
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!).step).toBe(2)
    })

    it('prevStep writes step to sessionStorage', () => {
      store().nextStep()
      store().nextStep()
      store().prevStep()
      const raw = sessionStorage.getItem('oqupa-listing-form')
      expect(JSON.parse(raw!).step).toBe(2)
    })

    it('does not store File objects in sessionStorage', () => {
      store().updateData({ photos: [new File([''], 'photo.jpg')] })
      const raw = sessionStorage.getItem('oqupa-listing-form')
      expect(raw).not.toContain('photo.jpg')
      expect(raw).not.toContain('"photos"')
    })

    it('survives sessionStorage throwing QuotaExceededError without throwing', () => {
      const origSetItem = sessionStorage.setItem.bind(sessionStorage)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new DOMException('quota exceeded', 'QuotaExceededError')
        throw err
      })
      expect(() => store().nextStep()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('quota exceeded'))
      spy.mockRestore()
      warnSpy.mockRestore()
    })

    it('swallows non-QuotaExceededError exceptions silently, without the quota warning (line 108 false branch)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        // Throw a different DOMException — not QuotaExceededError
        throw new DOMException('security error', 'SecurityError')
      })
      expect(() => store().nextStep()).not.toThrow()
      expect(warnSpy).not.toHaveBeenCalled()
      spy.mockRestore()
      warnSpy.mockRestore()
    })
  })

  // -------------------------------------------------------------------------
  // loadFromSession — module-reload tests
  // -------------------------------------------------------------------------
  describe('loadFromSession — rehydration on module init', () => {
    afterEach(() => {
      vi.resetModules()
      sessionStorage.clear()
    })

    it('rehydrates step from sessionStorage when the module loads', async () => {
      // Write a valid JSON session before module init
      sessionStorage.setItem('oqupa-listing-form', JSON.stringify({ step: 3, description: 'restored' }))
      vi.resetModules()
      const { useListingFormStore: freshStore } = await import('../listingFormStore')
      expect(freshStore.getState().step).toBe(3)
    })

    it('falls back to step 1 when sessionStorage contains invalid JSON', async () => {
      // Write corrupted JSON so JSON.parse throws (covers lines 97-98)
      sessionStorage.setItem('oqupa-listing-form', 'NOT_JSON{{{')
      vi.resetModules()
      const { useListingFormStore: freshStore } = await import('../listingFormStore')
      expect(freshStore.getState().step).toBe(1)
    })
  })
})
