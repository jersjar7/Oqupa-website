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
   * The account the identity was first used by. Another account publishing
   * over a leftover draft gets a fresh identity instead of colliding with it.
   */
  publishOwnerId: string | null
  /**
   * Set the moment the listing is saved. From then on the draft is gone from
   * storage, nothing re-saves it, and the wizard cannot publish again.
   */
  publishedListingId: string | null
  /**
   * True while the wizard must not change page — publishing or saving. The
   * browser's back button is held on the page meanwhile.
   */
  navigationLocked: boolean
  setNavigationLocked: (locked: boolean) => void
  /**
   * The account this draft belongs to (hostile review #1). Another account
   * opening the wizard on the same computer gets a clean draft and a fresh
   * identity — never someone else's photos, address or ids.
   */
  draftOwnerId: string | null
  /** Opening the wizard as `uid`: keep the draft if it is theirs, else drop it. */
  adoptDraftFor: (uid: string) => void
  /** Drops the draft from memory and from this tab's storage (Salir). */
  discardDraft: () => void
  /**
   * Editing: the listing as it was loaded. New limits apply only to fields
   * the owner changes, so an older listing over them stays editable
   * (hostile review #6).
   */
  editBaseline: Partial<ListingFormData> | null
  markEditBaseline: () => void
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (partial: Partial<ListingFormData>) => void
  setEditMode: (listingId: string, propertyId: string) => void
  reset: () => void
  recordUploadedPhoto: (fingerprint: string, result: PhotoUploadResult) => void
  /** Writes the draft (and its identity) to storage now. False if storage refused it. */
  persistDraft: () => boolean
  /** The identity to publish with as `uid`; a fresh one if the draft was another account's. */
  claimPublishIdentity: (uid: string) => string
  /** A fresh identity for `uid` (the old ids turned out to belong to someone else). */
  renewPublishIdentity: (uid: string) => string
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
  draftOwnerId?: string | null
  publishId?: string
  uploadedPhotos?: Record<string, PhotoUploadResult>
  publishOwnerId?: string | null
}

// Storage can be blocked (private mode, site data off) and then THROWS.
// Nothing about publishing may fail because of that.
function removeSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored, nothing to remove.
  }
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
  identity: {
    publishId: string
    uploadedPhotos: Record<string, PhotoUploadResult>
    publishOwnerId: string | null
    draftOwnerId: string | null
  },
): boolean {
  try {
    // Don't save File objects to sessionStorage
    const { photos: _photos, ...serializable } = data
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, ...serializable, ...identity }))
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('Session storage quota exceeded — form progress not saved')
    }
    return false
  }
}

export const useListingFormStore = create<ListingFormState>((set, get) => {
  const {
    publishId: savedPublishId,
    uploadedPhotos: savedUploads,
    publishOwnerId: savedOwner,
    draftOwnerId: savedDraftOwner,
    ...saved
  } = loadFromSession()

  // Every save goes through here. After a successful publish it does nothing,
  // so a late keystroke or step change cannot bring the published draft back.
  const save = (step: number, data: ListingFormData): boolean => {
    const s = get()
    if (s.publishedListingId) return false
    return saveToSession(step, data, {
      publishId: s.publishId,
      uploadedPhotos: s.uploadedPhotos,
      publishOwnerId: s.publishOwnerId,
      draftOwnerId: s.draftOwnerId,
    })
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
    publishOwnerId: savedOwner ?? null,
    publishedListingId: null,
    navigationLocked: false,
    draftOwnerId: savedDraftOwner ?? null,

    adoptDraftFor: (uid) => {
      const s = get()
      if (s.isEditMode) return
      // A draft saved before owners were recorded goes by who claimed its ids.
      const owner = s.draftOwnerId ?? s.publishOwnerId
      if (owner && owner !== uid) get().reset()
      if (get().draftOwnerId !== uid) {
        set({ draftOwnerId: uid })
        save(get().step, get().data)
      }
    },

    discardDraft: () => get().reset(),

    editBaseline: null,
    markEditBaseline: () => set({ editBaseline: { ...get().data } }),

    setNavigationLocked: (locked) => set({ navigationLocked: locked }),

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
      removeSession()
      set({ isEditMode: true, editListingId: listingId, editPropertyId: propertyId })
    },

    reset: () => {
      removeSession()
      set({
        step: 1,
        direction: 1,
        data: { ...INITIAL_DATA },
        isEditMode: false,
        editListingId: null,
        editPropertyId: null,
        publishId: newPublishId(),
        uploadedPhotos: {},
        publishOwnerId: null,
        publishedListingId: null,
        navigationLocked: false,
        draftOwnerId: null,
        editBaseline: null,
      })
    },

    recordUploadedPhoto: (fingerprint, result) => {
      set({ uploadedPhotos: { ...get().uploadedPhotos, [fingerprint]: result } })
      save(get().step, get().data)
    },

    persistDraft: () => save(get().step, get().data),

    claimPublishIdentity: (uid) => {
      const owner = get().publishOwnerId
      if (owner && owner !== uid) return get().renewPublishIdentity(uid)
      if (!owner) {
        set({ publishOwnerId: uid })
        save(get().step, get().data)
      }
      return get().publishId
    },

    renewPublishIdentity: (uid) => {
      // Photos uploaded under the old identity live under the old property's
      // name, so they cannot be reused.
      set({ publishId: newPublishId(), uploadedPhotos: {}, publishOwnerId: uid })
      save(get().step, get().data)
      return get().publishId
    },

    markPublished: (listingId) => {
      removeSession()
      set({ publishedListingId: listingId })
    },
  }
})
