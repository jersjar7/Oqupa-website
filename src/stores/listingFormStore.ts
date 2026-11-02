import { create } from 'zustand'
import type { PropertyType, OperationType, ListingRole, Currency, RentalDurationType } from '@/types/enums'
import type { PhotoUploadResult } from '@/services/storageService'
import { newPublishId } from '@/lib/publishIdentity'

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
  urbanizacion: string
  distrito: string
  provincia: string
  departamento: string
  showExactLocation: boolean
  // Editing a listing that hides its address: the blurred point the public
  // document holds, and the true one the form was loaded with. Lets the save
  // leave the public document alone when the owner did not move the pin.
  hiddenAddress: HiddenAddress | null
  photos: File[]
  existingPhotoUrls: string[] // for edit mode
  existingPhotoBlurHashes: string[] // parallel to existingPhotoUrls
  originalExistingPhotoUrls: string[] // snapshot at edit-init for delete diff
  originalCoverMicroThumb: string // the cover's blurred preview at edit-init ('' if none)

  // Photo ordering (maps final position to source)
  photoOrder: Array<{ type: 'existing' | 'new'; index: number }>

  // Step 4: Price
  amount: number | null
  currency: Currency
  wantsRealtorHelp: boolean
  maxRealtors: number
}

export interface HiddenAddress {
  publicLatitude: number
  publicLongitude: number
  trueLatitude: number
  trueLongitude: number
  trueCalle: string
}

interface ListingFormState {
  step: number
  direction: number // 1 = forward, -1 = backward
  data: ListingFormData
  isEditMode: boolean
  editListingId: string | null
  editPropertyId: string | null
  /**
   * The draft's publish identity (ADR-043): the new property and listing are
   * named from it, so every attempt to publish this draft writes the same two
   * documents. Created with the draft and stored with it.
   */
  publishId: string
  /** Photos that already reached the server, by photo fingerprint — a retry skips them. */
  uploadedPhotos: Record<string, PhotoUploadResult>
  /**
   * Set the moment the listing is saved. From then on the draft is gone from
   * storage, nothing re-saves it, and the wizard cannot publish again.
   */
  publishedListingId: string | null
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (partial: Partial<ListingFormData>) => void
  setEditMode: (listingId: string, propertyId: string) => void
  reset: () => void
  recordUploadedPhoto: (fingerprint: string, result: PhotoUploadResult) => void
  /** Writes the draft (and its identity) to storage now. */
  persistDraft: () => void
  markPublished: (listingId: string) => void
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
  urbanizacion: '',
  distrito: '',
  provincia: '',
  departamento: '',
  showExactLocation: true,
  hiddenAddress: null,
  photos: [],
  existingPhotoUrls: [],
  existingPhotoBlurHashes: [],
  originalExistingPhotoUrls: [],
  originalCoverMicroThumb: '',
  photoOrder: [],
  amount: null,
  currency: 'PEN',
  wantsRealtorHelp: false,
  maxRealtors: 3,
}

const STORAGE_KEY = 'oqupa-listing-form'

interface SavedDraft extends Partial<ListingFormData> {
  step?: number
  publishId?: string
  uploadedPhotos?: Record<string, PhotoUploadResult>
}

function loadFromSession(): SavedDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveToSession(
  step: number,
  data: ListingFormData,
  identity: { publishId: string; uploadedPhotos: Record<string, PhotoUploadResult> },
) {
  try {
    // Don't save File objects to sessionStorage
    const { photos: _photos, ...serializable } = data
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, ...serializable, ...identity }))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('Session storage quota exceeded — form progress not saved')
    }
  }
}

export const useListingFormStore = create<ListingFormState>((set, get) => {
  const { publishId: savedPublishId, uploadedPhotos: savedUploads, ...saved } = loadFromSession()

  // Every save goes through here. After a successful publish it does nothing,
  // so a late keystroke or step change cannot bring the published draft back.
  const save = (step: number, data: ListingFormData) => {
    const s = get()
    if (s.publishedListingId) return
    saveToSession(step, data, { publishId: s.publishId, uploadedPhotos: s.uploadedPhotos })
  }

  return {
    step: saved.step ?? 1,
    direction: 1,
    data: { ...INITIAL_DATA, ...saved },
    isEditMode: false,
    editListingId: null,
    editPropertyId: null,
    publishId: savedPublishId || newPublishId(),
    uploadedPhotos: savedUploads ?? {},
    publishedListingId: null,

    setStep: (step) => {
      const dir = step >= get().step ? 1 : -1
      set({ step, direction: dir })
      save(step, get().data)
    },

    nextStep: () => {
      const next = Math.min(get().step + 1, 5)
      set({ step: next, direction: 1 })
      save(next, get().data)
    },

    prevStep: () => {
      const prev = Math.max(get().step - 1, 1)
      set({ step: prev, direction: -1 })
      save(prev, get().data)
    },

    updateData: (partial) => {
      const updated = { ...get().data, ...partial }
      set({ data: updated })
      save(get().step, updated)
    },

    setEditMode: (listingId, propertyId) => {
      sessionStorage.removeItem(STORAGE_KEY)
      set({ isEditMode: true, editListingId: listingId, editPropertyId: propertyId })
    },

    reset: () => {
      sessionStorage.removeItem(STORAGE_KEY)
      set({
        step: 1,
        direction: 1,
        data: { ...INITIAL_DATA },
        isEditMode: false,
        editListingId: null,
        editPropertyId: null,
        publishId: newPublishId(),
        uploadedPhotos: {},
        publishedListingId: null,
      })
    },

    recordUploadedPhoto: (fingerprint, result) => {
      set({ uploadedPhotos: { ...get().uploadedPhotos, [fingerprint]: result } })
      save(get().step, get().data)
    },

    persistDraft: () => save(get().step, get().data),

    markPublished: (listingId) => {
      sessionStorage.removeItem(STORAGE_KEY)
      set({ publishedListingId: listingId })
    },
  }
})
