import { create } from 'zustand'
import type { PropertyType, OperationType, ListingRole, Currency, RentalDurationType } from '@/types/enums'

export interface ListingFormData {
  // Step 1: Basics
  propertyType: PropertyType | ''
  operationType: OperationType | ''
  rentalDurationType: RentalDurationType | '' // '' for venta
  role: ListingRole | ''

  // Step 2: Details
  description: string
  totalAreaInSquareMeters: number | null
  bedroomCount: number | null
  bathroomCount: number | null
  availableParkingSpaces: number
  propertyAmenities: string[]
  hasPrivateBathroom: boolean // only for habitacion

  // Step 3: Location + Photos
  latitude: number | null
  longitude: number | null
  calle: string
  distrito: string
  provincia: string
  departamento: string
  photos: File[]
  existingPhotoUrls: string[] // for edit mode

  // Step 4: Price
  amount: number | null
  currency: Currency
  wantsRealtorHelp: boolean
  maxRealtors: number
}

interface ListingFormState {
  step: number
  data: ListingFormData
  isEditMode: boolean
  editListingId: string | null
  editPropertyId: string | null
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (partial: Partial<ListingFormData>) => void
  setEditMode: (listingId: string, propertyId: string) => void
  reset: () => void
}

const INITIAL_DATA: ListingFormData = {
  propertyType: '',
  operationType: '',
  rentalDurationType: '',
  role: '',
  description: '',
  totalAreaInSquareMeters: null,
  bedroomCount: null,
  bathroomCount: null,
  availableParkingSpaces: 0,
  propertyAmenities: [],
  hasPrivateBathroom: false,
  latitude: null,
  longitude: null,
  calle: '',
  distrito: '',
  provincia: '',
  departamento: '',
  photos: [],
  existingPhotoUrls: [],
  amount: null,
  currency: 'PEN',
  wantsRealtorHelp: false,
  maxRealtors: 3,
}

const STORAGE_KEY = 'oqupa-listing-form'

function loadFromSession(): Partial<ListingFormData> & { step?: number } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveToSession(step: number, data: ListingFormData) {
  try {
    // Don't save File objects to sessionStorage
    const { photos: _photos, ...serializable } = data
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, ...serializable }))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('Session storage quota exceeded — form progress not saved')
    }
  }
}

export const useListingFormStore = create<ListingFormState>((set, get) => {
  const saved = loadFromSession()

  return {
    step: saved.step ?? 1,
    data: { ...INITIAL_DATA, ...saved },
    isEditMode: false,
    editListingId: null,
    editPropertyId: null,

    setStep: (step) => {
      set({ step })
      saveToSession(step, get().data)
    },

    nextStep: () => {
      const next = Math.min(get().step + 1, 4)
      set({ step: next })
      saveToSession(next, get().data)
    },

    prevStep: () => {
      const prev = Math.max(get().step - 1, 1)
      set({ step: prev })
      saveToSession(prev, get().data)
    },

    updateData: (partial) => {
      const updated = { ...get().data, ...partial }
      set({ data: updated })
      saveToSession(get().step, updated)
    },

    setEditMode: (listingId, propertyId) => {
      sessionStorage.removeItem(STORAGE_KEY)
      set({ isEditMode: true, editListingId: listingId, editPropertyId: propertyId })
    },

    reset: () => {
      sessionStorage.removeItem(STORAGE_KEY)
      set({
        step: 1,
        data: { ...INITIAL_DATA },
        isEditMode: false,
        editListingId: null,
        editPropertyId: null,
      })
    },
  }
})
