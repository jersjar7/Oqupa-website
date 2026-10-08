// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  addDocMock, setDocMock, updateDocMock, deleteDocMock,
  getDocMock, getDocsMock,
  queryMock, collectionMock, docMock, whereMock, orderByMock, limitMock, startAfterMock,
  writeBatchMock, batchSetMock, batchUpdateMock, batchCommitMock,
  httpsCallableMock, callableFnMock,
  getOrCreateClientIdMock,
} = vi.hoisted(() => {
  const callableFnMock = vi.fn()
  const batchSetMock = vi.fn()
  const batchUpdateMock = vi.fn()
  const batchCommitMock = vi.fn().mockResolvedValue(undefined)
  return {
    addDocMock: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    setDocMock: vi.fn().mockResolvedValue(undefined),
    updateDocMock: vi.fn().mockResolvedValue(undefined),
    deleteDocMock: vi.fn().mockResolvedValue(undefined),
    getDocMock: vi.fn(),
    getDocsMock: vi.fn(),
    queryMock: vi.fn((...args: unknown[]) => ({ __query: args })),
    collectionMock: vi.fn(() => ({ __col: true })),
    docMock: vi.fn((_db: unknown, ...parts: string[]) => ({ path: parts.join('/') })),
    whereMock: vi.fn(() => ({ __where: true })),
    orderByMock: vi.fn(() => ({ __orderBy: true })),
    limitMock: vi.fn(() => ({ __limit: true })),
    startAfterMock: vi.fn(() => ({ __startAfter: true })),
    writeBatchMock: vi.fn(() => ({
      set: batchSetMock,
      update: batchUpdateMock,
      commit: batchCommitMock,
    })),
    batchSetMock,
    batchUpdateMock,
    batchCommitMock,
    httpsCallableMock: vi.fn(() => callableFnMock),
    callableFnMock,
    getOrCreateClientIdMock: vi.fn(() => 'client-id-123'),
  }
})

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
  startAfter: (...args: unknown[]) => startAfterMock(...args),
  serverTimestamp: vi.fn(() => ({ _server: true })),
  writeBatch: (...args: unknown[]) => writeBatchMock(...args),
  Timestamp: class MockTimestamp {
    constructor(public seconds: number, public nanoseconds: number) {}
    toDate() { return new Date(this.seconds * 1000) }
  },
  deleteField: vi.fn(() => ({ __deleteField: true })),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}))

vi.mock('@/lib/firebase', () => ({
  db: { __fakeDb: true },
  functions: { __functions: true },
}))

vi.mock('@/lib/clientId', () => ({
  getOrCreateClientId: () => getOrCreateClientIdMock(),
}))

import { firestoreService } from '../firestoreService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDocSnap(id: string, data: Record<string, unknown>, exists = true) {
  return {
    id,
    exists: () => exists,
    data: () => data,
  }
}

function makeDocsSnap(docs: { id: string; data: Record<string, unknown> }[]) {
  return {
    docs: docs.map((d) => makeDocSnap(d.id, d.data)),
  }
}

function makeListingData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    role: 'owner',
    ownerId: 'user-1',
    propertyId: 'prop-1',
    description: 'Great apartment',
    operationType: 'venta',
    price: { amount: 150000, currency: 'USD' },
    status: 'active',
    viewCount: 5,
    contactClickCount: 2,
    createdAt: { toDate: () => new Date('2026-01-01') },
    updatedAt: { toDate: () => new Date('2026-01-02') },
    wantsRealtorHelp: false,
    maxRealtors: 3,
    currentClaimsCount: 0,
    isBoosted: false,
    boostScore: 1,
    showExactLocation: true,
    ...overrides,
  }
}

function makePropertyData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    listedByUserId: 'user-1',
    propertyType: 'apartamento',
    operationType: 'venta',
    specs: {
      totalAreaInSquareMeters: 80,
      bedroomCount: 2,
      bathroomCount: 1,
      availableParkingSpaces: 0,
      propertyAmenities: [],
    },
    location: {
      latitude: -12.0464,
      longitude: -77.0428,
      calle: 'Av. Larco 123',
      urbanizacion: 'Miraflores',
      distrito: 'Miraflores',
      provincia: 'Lima',
      departamento: 'Lima',
      countryIsoCode: 'PE',
    },
    currentPrice: { amount: 150000, currency: 'USD' },
    normalizedAddress: 'Av. Larco 123, Miraflores, Lima',
    media: { propertyPhotoUrls: [] },
    updatedAt: { toDate: () => new Date('2026-01-02') },
    isAvailable: true,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('firestoreService', () => {
  beforeEach(() => {
    addDocMock.mockReset().mockResolvedValue({ id: 'new-doc-id' })
    setDocMock.mockReset().mockResolvedValue(undefined)
    updateDocMock.mockReset().mockResolvedValue(undefined)
    deleteDocMock.mockReset().mockResolvedValue(undefined)
    getDocMock.mockReset()
    getDocsMock.mockReset()
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    whereMock.mockReset().mockReturnValue({ __where: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
    limitMock.mockReset().mockReturnValue({ __limit: true })
    writeBatchMock.mockReset().mockReturnValue({
      set: batchSetMock,
      update: batchUpdateMock,
      commit: batchCommitMock,
    })
    batchSetMock.mockReset()
    batchUpdateMock.mockReset()
    batchCommitMock.mockReset().mockResolvedValue(undefined)
    httpsCallableMock.mockReset().mockReturnValue(callableFnMock)
    callableFnMock.mockReset()
    getOrCreateClientIdMock.mockReset().mockReturnValue('client-id-123')
  })

  // ── getPrivatePropertyLocation ───────────────────────────────────────────

  describe('getPrivatePropertyLocation', () => {
    it('returns location data when doc exists', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('location', {
        latitude: -12.0464,
        longitude: -77.0428,
        calle: 'Av. Larco 123',
      }))
      const result = await firestoreService.getPrivatePropertyLocation('prop-1')
      expect(result).toEqual({ latitude: -12.0464, longitude: -77.0428, calle: 'Av. Larco 123' })
    })

    it('returns null when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('location', {}, false))
      const result = await firestoreService.getPrivatePropertyLocation('prop-1')
      expect(result).toBeNull()
    })

    it('returns null when Firestore throws (non-owner access)', async () => {
      getDocMock.mockRejectedValue(new Error('permission-denied'))
      const result = await firestoreService.getPrivatePropertyLocation('prop-1')
      expect(result).toBeNull()
    })

    it('returns null when latitude is missing or not a number', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('location', {
        latitude: 'invalid',
        longitude: -77.0428,
      }))
      const result = await firestoreService.getPrivatePropertyLocation('prop-1')
      expect(result).toBeNull()
    })

    it('falls back to empty string for calle when missing', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('location', {
        latitude: -12.0,
        longitude: -77.0,
        // calle omitted
      }))
      const result = await firestoreService.getPrivatePropertyLocation('prop-1')
      expect(result?.calle).toBe('')
    })
  })

  // ── submitBugReport ──────────────────────────────────────────────────────

  describe('submitBugReport', () => {
    it('calls addDoc to the mail collection', async () => {
      await firestoreService.submitBugReport({
        contact: 'user@example.com',
        description: 'App crashes on submit',
        technical: 'TypeError: Cannot read property x',
        pageUrl: 'https://oqupa.com/app',
        userAgent: 'Mozilla/5.0',
      })
      expect(addDocMock).toHaveBeenCalledOnce()
    })

    it('sends the email to admin@oqupa.com', async () => {
      await firestoreService.submitBugReport({
        contact: 'user@example.com',
        description: 'Bug',
        technical: '',
        pageUrl: 'https://oqupa.com',
        userAgent: 'Chrome',
      })
      const payload = addDocMock.mock.calls[0][1] as Record<string, unknown>
      expect(payload.to).toBe('admin@oqupa.com')
    })

    it('HTML-escapes the contact field to prevent XSS', async () => {
      await firestoreService.submitBugReport({
        contact: '<script>alert(1)</script>',
        description: 'XSS test',
        technical: '',
        pageUrl: 'https://oqupa.com',
        userAgent: 'Chrome',
      })
      const payload = addDocMock.mock.calls[0][1] as { message: { html: string } }
      expect(payload.message.html).toContain('&lt;script&gt;')
      expect(payload.message.html).not.toContain('<script>')
    })
  })

  // ── getListingById ───────────────────────────────────────────────────────

  describe('getListingById', () => {
    it('returns a Listing when doc exists', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('listing-1', makeListingData()))
      const result = await firestoreService.getListingById('listing-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('listing-1')
      expect(result!.description).toBe('Great apartment')
      expect(result!.operationType).toBe('venta')
    })

    it('returns null when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('listing-1', {}, false))
      const result = await firestoreService.getListingById('listing-1')
      expect(result).toBeNull()
    })

    it('applies defaults for missing fields', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('listing-1', {
        ownerId: 'u1',
        propertyId: 'p1',
        createdAt: null,
        updatedAt: null,
      }))
      const result = await firestoreService.getListingById('listing-1')
      expect(result!.viewCount).toBe(0)
      expect(result!.boostScore).toBe(1)
      expect(result!.isBoosted).toBe(false)
      expect(result!.role).toBe('owner')
      expect(result!.description).toBe('')
    })

    it('defaults countryCode to peru when absent from contactInfo (line 99 ?? peru branch)', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('listing-cc', {
        ...makeListingData(),
        contactInfo: { whatsappPhoneNumber: '+51987' }, // countryCode absent
      }))
      const result = await firestoreService.getListingById('listing-cc')
      expect(result!.contactInfo?.countryCode).toBe('peru')
    })

    it('maps publishedAt, expiresAt, boostedUntil when present and ?? anytime when contactInfo lacks slot (lines 101,109,110,132 true branches)', async () => {
      const pub = new Date('2026-09-01')
      const exp = new Date('2026-12-01')
      const boost = new Date('2026-10-15')
      getDocMock.mockResolvedValue(makeDocSnap('listing-opt', {
        ...makeListingData(),
        publishedAt: { toDate: () => pub },
        expiresAt: { toDate: () => exp },
        boostedUntil: { toDate: () => boost },
        contactInfo: { whatsappPhoneNumber: '+51987', countryCode: 'peru' },
        // preferredContactTimeSlot absent → ?? 'anytime' fires
      }))
      const result = await firestoreService.getListingById('listing-opt')
      expect(result!.publishedAt).toEqual(pub)
      expect(result!.expiresAt).toEqual(exp)
      expect(result!.boostedUntil).toEqual(boost)
      expect(result!.contactInfo?.preferredContactTimeSlot).toBe('anytime')
    })
  })

  // ── getPropertyById ──────────────────────────────────────────────────────

  describe('getPropertyById', () => {
    it('returns a Property when doc exists', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', makePropertyData()))
      const result = await firestoreService.getPropertyById('prop-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('prop-1')
      expect(result!.propertyType).toBe('apartamento')
    })

    it('returns null when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', {}, false))
      const result = await firestoreService.getPropertyById('prop-1')
      expect(result).toBeNull()
    })

    it('applies defaults for missing fields', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', {
        listedByUserId: 'u1',
        updatedAt: null,
      }))
      const result = await firestoreService.getPropertyById('prop-1')
      expect(result!.propertyType).toBe('casa')
      expect(result!.specs.totalAreaInSquareMeters).toBe(0)
      expect(result!.location.distrito).toBe('')
    })
  })

  // ── getListingWithProperty ───────────────────────────────────────────────

  describe('getListingWithProperty', () => {
    it('returns listing and property when both exist', async () => {
      getDocMock
        .mockResolvedValueOnce(makeDocSnap('listing-1', makeListingData({ propertyId: 'prop-1' })))
        .mockResolvedValueOnce(makeDocSnap('prop-1', makePropertyData()))
      const result = await firestoreService.getListingWithProperty('listing-1')
      expect(result).not.toBeNull()
      expect(result!.listing.id).toBe('listing-1')
      expect(result!.property.id).toBe('prop-1')
    })

    it('returns null when listing does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('listing-1', {}, false))
      const result = await firestoreService.getListingWithProperty('listing-1')
      expect(result).toBeNull()
    })

    it('returns null when property does not exist', async () => {
      getDocMock
        .mockResolvedValueOnce(makeDocSnap('listing-1', makeListingData({ propertyId: 'prop-1' })))
        .mockResolvedValueOnce(makeDocSnap('prop-1', {}, false))
      const result = await firestoreService.getListingWithProperty('listing-1')
      expect(result).toBeNull()
    })
  })

  // ── recordListingView ────────────────────────────────────────────────────

  describe('recordListingView', () => {
    it('calls the recordListingView Cloud Function with listingId and clientId', async () => {
      callableFnMock.mockResolvedValue({ data: { incremented: true } })
      await firestoreService.recordListingView('listing-abc')
      expect(callableFnMock).toHaveBeenCalledWith({
        listingId: 'listing-abc',
        clientId: 'client-id-123',
      })
    })

    it('calls httpsCallable with "recordListingView"', async () => {
      callableFnMock.mockResolvedValue({ data: { incremented: true } })
      await firestoreService.recordListingView('listing-1')
      expect(httpsCallableMock).toHaveBeenCalledWith(
        expect.anything(),
        'recordListingView',
      )
    })
  })

  // ── updateListingStatus ──────────────────────────────────────────────────

  describe('updateListingStatus', () => {
    it('calls updateDoc with status and serverTimestamp', async () => {
      await firestoreService.updateListingStatus('listing-1', 'deactivated')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.status).toBe('deactivated')
      expect(payload.updatedAt).toEqual({ _server: true })
    })
  })

  // ── deactivateListing ────────────────────────────────────────────────────

  describe('deactivateListing', () => {
    it('calls updateListingStatus with "deactivated"', async () => {
      await firestoreService.deactivateListing('listing-1')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.status).toBe('deactivated')
    })
  })

  // ── activateListing ──────────────────────────────────────────────────────

  describe('activateListing', () => {
    it('calls updateDoc with status=active, publishedAt, expiresAt, and updatedAt', async () => {
      await firestoreService.activateListing('listing-1')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.status).toBe('active')
      expect(payload.publishedAt).toEqual({ _server: true })
      expect(payload.expiresAt).toBeInstanceOf(Date)
      expect(payload.updatedAt).toEqual({ _server: true })
    })

    it('sets expiresAt to approximately 30 days from now', async () => {
      const before = Date.now()
      await firestoreService.activateListing('listing-1')
      const payload = updateDocMock.mock.calls[0][1]
      const after = Date.now()
      const expiresMs = (payload.expiresAt as Date).getTime()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDaysMs)
      expect(expiresMs).toBeLessThanOrEqual(after + thirtyDaysMs)
    })
  })

  // ── createProperty ───────────────────────────────────────────────────────

  describe('createProperty', () => {
    it('returns a property ID string', async () => {
      const id = await firestoreService.createProperty({
        listedByUserId: 'user-1',
        propertyType: 'casa',
        operationType: 'venta',
        specs: { totalAreaInSquareMeters: 100, availableParkingSpaces: 0, propertyAmenities: [] },
        location: { latitude: -12, longitude: -77, calle: '', urbanizacion: '', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima', countryIsoCode: 'PE' },
        currentPrice: { amount: 100000, currency: 'USD' },
        normalizedAddress: '',
        media: { propertyPhotoUrls: [] },
        isAvailable: true,
      })
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^property_/)
    })

    it('calls setDoc with updatedAt serverTimestamp', async () => {
      await firestoreService.createProperty({
        listedByUserId: 'user-1',
        propertyType: 'casa',
        operationType: 'venta',
        specs: { totalAreaInSquareMeters: 100, availableParkingSpaces: 0, propertyAmenities: [] },
        location: { latitude: -12, longitude: -77, calle: '', urbanizacion: '', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima', countryIsoCode: 'PE' },
        currentPrice: { amount: 100000, currency: 'USD' },
        normalizedAddress: '',
        media: { propertyPhotoUrls: [] },
        isAvailable: true,
      })
      const payload = setDocMock.mock.calls[0][1]
      expect(payload.updatedAt).toEqual({ _server: true })
    })
  })

  // ── createListing ────────────────────────────────────────────────────────

  describe('createListing', () => {
    it('returns a listing ID string', async () => {
      const id = await firestoreService.createListing({
        role: 'owner',
        ownerId: 'user-1',
        propertyId: 'prop-1',
        description: 'Nice house',
        operationType: 'venta',
        price: { amount: 100000, currency: 'USD' },
        status: 'draft',
        contactClickCount: 0,
        wantsRealtorHelp: false,
        maxRealtors: 3,
        currentClaimsCount: 0,
        isBoosted: false,
        boostScore: 1,
        showExactLocation: true,
      })
      expect(typeof id).toBe('string')
      expect(id).toMatch(/^listing_/)
    })

    it('calls setDoc with viewCount=0 and serverTimestamps', async () => {
      await firestoreService.createListing({
        role: 'owner',
        ownerId: 'user-1',
        propertyId: 'prop-1',
        description: 'Nice house',
        operationType: 'venta',
        price: { amount: 100000, currency: 'USD' },
        status: 'draft',
        contactClickCount: 0,
        wantsRealtorHelp: false,
        maxRealtors: 3,
        currentClaimsCount: 0,
        isBoosted: false,
        boostScore: 1,
        showExactLocation: true,
      })
      const payload = setDocMock.mock.calls[0][1]
      expect(payload.viewCount).toBe(0)
      expect(payload.createdAt).toEqual({ _server: true })
      expect(payload.updatedAt).toEqual({ _server: true })
    })
  })

  // ── updateListing ────────────────────────────────────────────────────────

  describe('updateListing', () => {
    it('calls updateDoc with the provided fields and updatedAt', async () => {
      await firestoreService.updateListing('listing-1', { description: 'Updated description' })
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.description).toBe('Updated description')
      expect(payload.updatedAt).toEqual({ _server: true })
    })

    it('strips the id field from the update payload', async () => {
      await firestoreService.updateListing('listing-1', { description: 'New desc' })
      const payload = updateDocMock.mock.calls[0][1]
      expect(Object.keys(payload)).not.toContain('id')
    })
  })

  // ── updateProperty ───────────────────────────────────────────────────────

  describe('updateProperty', () => {
    it('calls updateDoc with the provided fields and updatedAt', async () => {
      await firestoreService.updateProperty('prop-1', { normalizedAddress: 'New address' })
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.normalizedAddress).toBe('New address')
      expect(payload.updatedAt).toEqual({ _server: true })
    })
  })

  // ── deleteListing ────────────────────────────────────────────────────────

  describe('deleteListing', () => {
    it('calls deleteDoc for the given listing', async () => {
      await firestoreService.deleteListing('listing-1')
      expect(deleteDocMock).toHaveBeenCalledOnce()
      expect(docMock).toHaveBeenCalledWith(expect.anything(), 'listings', 'listing-1')
    })
  })

  // ── deleteProperty ───────────────────────────────────────────────────────

  describe('deleteProperty', () => {
    it('calls deleteDoc for the given property', async () => {
      await firestoreService.deleteProperty('prop-1')
      expect(deleteDocMock).toHaveBeenCalledOnce()
      expect(docMock).toHaveBeenCalledWith(expect.anything(), 'properties', 'prop-1')
    })
  })

  // ── submitRealtorApplication ─────────────────────────────────────────────

  describe('submitRealtorApplication', () => {
    it('commits a batch with application and user updates', async () => {
      await firestoreService.submitRealtorApplication('uid-1', {
        fullName: 'Juan García',
        phone: '987654321',
        email: 'juan@realtor.com',
        businessName: 'JG Realty',
        yearsExperience: 5,
        serviceZones: ['Miraflores'],
        motivation: 'I love real estate',
      })
      expect(batchSetMock).toHaveBeenCalledOnce()
      expect(batchUpdateMock).toHaveBeenCalledOnce()
      expect(batchCommitMock).toHaveBeenCalledOnce()
    })

    it('sets status to "pending" in the application', async () => {
      await firestoreService.submitRealtorApplication('uid-1', {
        fullName: 'Juan',
        phone: '987654321',
        email: 'juan@example.com',
        businessName: 'JG',
        yearsExperience: 3,
        serviceZones: [],
        motivation: 'Test',
      })
      const appPayload = batchSetMock.mock.calls[0][1] as Record<string, unknown>
      expect(appPayload.status).toBe('pending')
    })
  })

  // ── getUserRealtorApplication ────────────────────────────────────────────

  describe('getUserRealtorApplication', () => {
    it('returns an application when doc exists', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('uid-1', {
        userId: 'uid-1',
        fullName: 'Juan García',
        phone: '987654321',
        email: 'juan@example.com',
        businessName: 'JG',
        yearsExperience: 5,
        serviceZones: ['Miraflores'],
        motivation: 'I love it',
        status: 'pending',
        submittedAt: { toDate: () => new Date('2026-09-01') },
      }))
      const result = await firestoreService.getUserRealtorApplication('uid-1')
      expect(result).not.toBeNull()
      expect(result!.fullName).toBe('Juan García')
      expect(result!.status).toBe('pending')
    })

    it('returns null when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('uid-1', {}, false))
      const result = await firestoreService.getUserRealtorApplication('uid-1')
      expect(result).toBeNull()
    })

    it('defaults businessName, yearsExperience, serviceZones, and status when absent (lines 619-623 ?? branches)', async () => {
      getDocMock.mockResolvedValue(makeDocSnap('uid-defaults', {
        userId: 'uid-defaults',
        fullName: 'Defaults',
        phone: '000',
        email: 'd@e.com',
        motivation: 'reason',
        submittedAt: { toDate: () => new Date('2026-09-01') },
        // businessName, yearsExperience, serviceZones, status all absent
      }))
      const result = await firestoreService.getUserRealtorApplication('uid-defaults')
      expect(result!.businessName).toBe('')
      expect(result!.yearsExperience).toBe(0)
      expect(result!.serviceZones).toEqual([])
      expect(result!.status).toBe('pending')
    })

    it('maps reviewedAt when present (line 625 true branch)', async () => {
      const reviewedDate = new Date('2026-10-01')
      getDocMock.mockResolvedValue(makeDocSnap('uid-rev', {
        userId: 'uid-rev',
        fullName: 'Reviewed',
        phone: '111',
        email: 'r@e.com',
        motivation: 'reason',
        status: 'approved',
        submittedAt: { toDate: () => new Date('2026-09-01') },
        reviewedAt: { toDate: () => reviewedDate },
      }))
      const result = await firestoreService.getUserRealtorApplication('uid-rev')
      expect(result!.reviewedAt).toEqual(reviewedDate)
    })
  })

  // ── approveRealtorApplication ────────────────────────────────────────────

  describe('approveRealtorApplication', () => {
    it('commits batch with isVerifiedRealtor=true and status=approved', async () => {
      await firestoreService.approveRealtorApplication('uid-1', 'admin-uid')
      expect(batchUpdateMock).toHaveBeenCalledTimes(2)
      const userUpdate = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>
      const appUpdate = batchUpdateMock.mock.calls[1][1] as Record<string, unknown>
      expect(userUpdate.isVerifiedRealtor).toBe(true)
      expect(appUpdate.status).toBe('approved')
      expect(appUpdate.reviewedBy).toBe('admin-uid')
    })
  })

  // ── rejectRealtorApplication ─────────────────────────────────────────────

  describe('rejectRealtorApplication', () => {
    it('commits batch with realtorApplicationStatus=rejected', async () => {
      await firestoreService.rejectRealtorApplication('uid-1', 'admin-uid')
      const userUpdate = batchUpdateMock.mock.calls[0][1] as Record<string, unknown>
      const appUpdate = batchUpdateMock.mock.calls[1][1] as Record<string, unknown>
      expect(userUpdate.realtorApplicationStatus).toBe('rejected')
      expect(appUpdate.status).toBe('rejected')
    })
  })

  // ── assignRealtorToListing ───────────────────────────────────────────────

  describe('assignRealtorToListing', () => {
    it('calls updateDoc with realtorId, phone, and pending_acceptance status', async () => {
      await firestoreService.assignRealtorToListing('listing-1', 'realtor-1', '+51987654321')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.assignedRealtorId).toBe('realtor-1')
      expect(payload.assignedRealtorPhoneNumber).toBe('+51987654321')
      expect(payload.assignmentStatus).toBe('pending_acceptance')
    })
  })

  // ── acceptAssignment ─────────────────────────────────────────────────────

  describe('acceptAssignment', () => {
    it('calls updateDoc with assignmentStatus=accepted', async () => {
      await firestoreService.acceptAssignment('listing-1')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.assignmentStatus).toBe('accepted')
    })
  })

  // ── declineAssignment ────────────────────────────────────────────────────

  describe('declineAssignment', () => {
    it('clears realtor fields and appends agentId to declinedRealtorIds', async () => {
      await firestoreService.declineAssignment('listing-1', ['agent-old'], 'agent-new')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.assignedRealtorId).toBeNull()
      expect(payload.assignedRealtorPhoneNumber).toBeNull()
      expect(payload.assignmentStatus).toBeNull()
      expect(payload.declinedRealtorIds).toEqual(['agent-old', 'agent-new'])
    })
  })

  // ── getClaimStatus ───────────────────────────────────────────────────────

  describe('getClaimStatus', () => {
    it('returns canClaim=true with 5 remaining when claim month does not match current', () => {
      const user = { claimsThisMonth: 3, claimMonth: '2025-01' }
      const result = firestoreService.getClaimStatus(user)
      expect(result.canClaim).toBe(true)
      expect(result.remaining).toBe(5)
      expect(result.limit).toBe(5)
    })

    it('returns canClaim=false when user has reached monthly limit', () => {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const user = { claimsThisMonth: 5, claimMonth: currentMonth }
      const result = firestoreService.getClaimStatus(user)
      expect(result.canClaim).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('returns correct remaining count for partial usage in current month', () => {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const user = { claimsThisMonth: 2, claimMonth: currentMonth }
      const result = firestoreService.getClaimStatus(user)
      expect(result.canClaim).toBe(true)
      expect(result.remaining).toBe(3)
    })
  })

  // ── createRealtorClaim ───────────────────────────────────────────────────

  describe('createRealtorClaim', () => {
    it('calls the claimOpportunity Cloud Function with listingId', async () => {
      callableFnMock.mockResolvedValue({ data: {} })
      await firestoreService.createRealtorClaim({
        listingId: 'listing-1',
        realtorId: 'realtor-1',
        listingOwnerId: 'owner-1',
        realtorName: 'Juan',
        realtorPhone: '+51987',
        realtorBusinessName: 'JG Realty',
      })
      expect(callableFnMock).toHaveBeenCalledWith({ listingId: 'listing-1' })
      expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'claimOpportunity')
    })

    it('throws with a user-friendly message when claimOpportunity fails with functions/ error', async () => {
      callableFnMock.mockRejectedValue({
        code: 'functions/resource-exhausted',
        message: 'No tienes más créditos este mes',
      })
      await expect(firestoreService.createRealtorClaim({
        listingId: 'listing-1',
        realtorId: 'realtor-1',
        listingOwnerId: 'owner-1',
        realtorName: 'Juan',
        realtorPhone: '+51987',
        realtorBusinessName: 'JG',
      })).rejects.toThrow('No tienes más créditos este mes')
    })

    it('throws a generic fallback message for non-functions errors', async () => {
      callableFnMock.mockRejectedValue(new Error('network error'))
      await expect(firestoreService.createRealtorClaim({
        listingId: 'listing-1',
        realtorId: 'realtor-1',
        listingOwnerId: 'owner-1',
        realtorName: 'Juan',
        realtorPhone: '+51987',
        realtorBusinessName: 'JG',
      })).rejects.toThrow('No se pudo reclamar la oportunidad. Intenta de nuevo.')
    })

    it('throws a generic fallback message when functions/ error has an empty message (line 37 middle && branch)', async () => {
      // isFunctionsError=true but message is empty → condition false → generic fallback
      callableFnMock.mockRejectedValue({
        code: 'functions/resource-exhausted',
        message: '',
      })
      await expect(firestoreService.createRealtorClaim({
        listingId: 'listing-1',
        realtorId: 'realtor-1',
        listingOwnerId: 'owner-1',
        realtorName: 'Juan',
        realtorPhone: '+51987',
        realtorBusinessName: 'JG',
      })).rejects.toThrow('No se pudo reclamar la oportunidad. Intenta de nuevo.')
    })
  })

  // ── getActiveListingsWithProperties ──────────────────────────────────────

  describe('getActiveListingsWithProperties', () => {
    it('returns empty array when no listings exist', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      const result = await firestoreService.getActiveListingsWithProperties()
      expect(result).toEqual([])
    })

    it('queries for active listings', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getActiveListingsWithProperties()
      expect(whereMock).toHaveBeenCalledWith('status', '==', 'active')
    })

    it('returns listings paired with their properties', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        { id: 'listing-1', data: makeListingData({ propertyId: 'prop-1' }) },
      ]))
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', makePropertyData()))

      const result = await firestoreService.getActiveListingsWithProperties()
      expect(result).toHaveLength(1)
      expect(result[0]!.listing.id).toBe('listing-1')
      expect(result[0]!.property.id).toBe('prop-1')
    })

    it('excludes listings whose property does not exist', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        { id: 'listing-1', data: makeListingData({ propertyId: 'missing-prop' }) },
      ]))
      getDocMock.mockResolvedValue(makeDocSnap('missing-prop', {}, false))

      const result = await firestoreService.getActiveListingsWithProperties()
      expect(result).toHaveLength(0)
    })
  })

  // ── getActiveListingsWithPropertiesPaginated ──────────────────────────────

  describe('getActiveListingsWithPropertiesPaginated', () => {
    it('returns an ExploreListingsPage with items, lastDoc, hasMore', async () => {
      const docs = [{ id: 'listing-1', data: makeListingData({ propertyId: 'prop-1' }) }]
      const rawDocs = docs.map((d) => ({ ...makeDocSnap(d.id, d.data), data: () => d.data }))
      getDocsMock.mockResolvedValue({ docs: rawDocs })
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', makePropertyData()))

      const result = await firestoreService.getActiveListingsWithPropertiesPaginated(30)
      expect(result.items).toHaveLength(1)
      expect(result.lastDoc).toBe(rawDocs[0])
      expect(result.hasMore).toBe(false) // 1 doc, pageSize=30
    })

    it('sets hasMore=true when docs count equals pageSize', async () => {
      const docs = Array.from({ length: 2 }, (_, i) => ({
        id: `listing-${i}`,
        data: makeListingData({ propertyId: `prop-${i}` }),
      }))
      const rawDocs = docs.map((d) => ({ ...makeDocSnap(d.id, d.data), data: () => d.data }))
      getDocsMock.mockResolvedValue({ docs: rawDocs })
      getDocMock.mockImplementation((ref: { path: string }) => {
        const id = ref.path.split('/').pop()!
        return Promise.resolve(makeDocSnap(id, makePropertyData()))
      })

      const result = await firestoreService.getActiveListingsWithPropertiesPaginated(2)
      expect(result.hasMore).toBe(true)
    })

    it('returns lastDoc=undefined when no docs returned', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      const result = await firestoreService.getActiveListingsWithPropertiesPaginated(30)
      expect(result.lastDoc).toBeUndefined()
      expect(result.items).toHaveLength(0)
    })

    it('filters by operationType when provided', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      await firestoreService.getActiveListingsWithPropertiesPaginated(30, undefined, 'venta')
      expect(whereMock).toHaveBeenCalledWith('operationType', '==', 'venta')
    })

    it('excludes listings whose property doc does not exist (line 342 false branch)', async () => {
      const rawDoc = { ...makeDocSnap('listing-1', makeListingData({ propertyId: 'prop-deleted' })), data: () => makeListingData({ propertyId: 'prop-deleted' }) }
      getDocsMock.mockResolvedValue({ docs: [rawDoc] })
      // Property snap does not exist
      getDocMock.mockResolvedValue(makeDocSnap('prop-deleted', {}, false))
      const result = await firestoreService.getActiveListingsWithPropertiesPaginated(30)
      expect(result.items).toHaveLength(0)
    })

    it('passes cursor to startAfter when provided (line 324 true branch)', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      const fakeCursor = { id: 'cursor-doc' } as unknown as import('firebase/firestore').QueryDocumentSnapshot
      await firestoreService.getActiveListingsWithPropertiesPaginated(30, fakeCursor)
      expect(startAfterMock).toHaveBeenCalledWith(fakeCursor)
    })

    it('maps rentalDurationType when present on property (line 154 true branch)', async () => {
      const listingData = makeListingData({ propertyId: 'prop-rental' })
      const rawDoc = { ...makeDocSnap('listing-rental', listingData), data: () => listingData }
      getDocsMock.mockResolvedValue({ docs: [rawDoc] })
      getDocMock.mockResolvedValue(makeDocSnap('prop-rental', makePropertyData({ rentalDurationType: 'long-term' })))
      const result = await firestoreService.getActiveListingsWithPropertiesPaginated(30)
      expect((result.items[0]!.property as Record<string, unknown>).rentalDurationType).toBe('long-term')
    })
  })

  // ── getUserListingsWithProperties ────────────────────────────────────────

  describe('getUserListingsWithProperties', () => {
    it('returns listings paired with properties for a user', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        { id: 'listing-1', data: makeListingData({ propertyId: 'prop-1' }) },
      ]))
      getDocMock.mockResolvedValue(makeDocSnap('prop-1', makePropertyData()))

      const result = await firestoreService.getUserListingsWithProperties('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.listing.id).toBe('listing-1')
      expect(result[0]!.property.id).toBe('prop-1')
    })

    it('excludes listings without matching property', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        { id: 'listing-1', data: makeListingData({ propertyId: 'orphan-prop' }) },
      ]))
      getDocMock.mockResolvedValue(makeDocSnap('orphan-prop', {}, false))

      const result = await firestoreService.getUserListingsWithProperties('user-1')
      expect(result).toHaveLength(0)
    })
  })

  // ── getUserListings ──────────────────────────────────────────────────────

  describe('getUserListings', () => {
    it('returns mapped listings for a user', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        { id: 'listing-1', data: makeListingData() },
      ]))
      const result = await firestoreService.getUserListings('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('listing-1')
    })

    it('queries with userId filter', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getUserListings('user-xyz')
      expect(whereMock).toHaveBeenCalledWith('ownerId', '==', 'user-xyz')
    })
  })

  // ── getAvailableLeads ────────────────────────────────────────────────────

  describe('getAvailableLeads', () => {
    it('returns empty array when no listings match', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      const result = await firestoreService.getAvailableLeads()
      expect(result).toEqual([])
    })

    it('filters out listings where all claim slots are full', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'listing-full',
          data: makeListingData({ maxRealtors: 3, currentClaimsCount: 3, wantsRealtorHelp: true, propertyId: 'p1' }),
        },
      ]))
      const result = await firestoreService.getAvailableLeads()
      expect(result).toHaveLength(0)
    })

    it('includes listings with open slots and existing property', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'listing-open',
          data: makeListingData({ maxRealtors: 3, currentClaimsCount: 1, wantsRealtorHelp: true, propertyId: 'p1' }),
        },
      ]))
      getDocMock.mockResolvedValue(makeDocSnap('p1', makePropertyData()))
      const result = await firestoreService.getAvailableLeads()
      expect(result).toHaveLength(1)
    })

    it('excludes listings whose property doc does not exist (line 744 false branch)', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([{
        id: 'listing-1',
        data: makeListingData({ maxRealtors: 3, currentClaimsCount: 0, wantsRealtorHelp: true, propertyId: 'p-deleted' }),
      }]))
      // Property snap does not exist
      getDocMock.mockResolvedValue(makeDocSnap('p-deleted', {}, false))
      const result = await firestoreService.getAvailableLeads()
      expect(result).toEqual([])
    })

    it('when currentUserId is provided, fetches claims and excludes already-claimed listings', async () => {
      // First getDocs call: listings
      getDocsMock.mockResolvedValueOnce(makeDocsSnap([
        { id: 'listing-claimed', data: makeListingData({ maxRealtors: 3, currentClaimsCount: 0, wantsRealtorHelp: true, propertyId: 'p1' }) },
        { id: 'listing-open', data: makeListingData({ maxRealtors: 3, currentClaimsCount: 0, wantsRealtorHelp: true, propertyId: 'p2' }) },
      ]))
      // Second getDocs call: existing claims for this realtor
      getDocsMock.mockResolvedValueOnce(makeDocsSnap([
        { id: 'claim-1', data: { listingId: 'listing-claimed', realtorId: 'realtor-1' } },
      ]))
      // Property fetches
      getDocMock.mockImplementation((ref: { path: string }) => {
        const id = ref.path.split('/').pop()!
        return Promise.resolve(makeDocSnap(id, makePropertyData()))
      })

      const result = await firestoreService.getAvailableLeads('realtor-1')
      // listing-claimed is excluded, listing-open remains
      expect(result).toHaveLength(1)
      expect(result[0]!.listing.id).toBe('listing-open')
    })
  })

  // ── getAllRealtorApplications ─────────────────────────────────────────────

  describe('getAllRealtorApplications', () => {
    it('returns all applications without status filter', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'uid-1',
          data: {
            userId: 'uid-1',
            fullName: 'Juan',
            phone: '987',
            email: 'j@e.com',
            businessName: 'JG',
            yearsExperience: 3,
            serviceZones: [],
            motivation: '',
            status: 'pending',
            submittedAt: { toDate: () => new Date('2026-09-01') },
          },
        },
      ]))
      const result = await firestoreService.getAllRealtorApplications()
      expect(result).toHaveLength(1)
      expect(result[0]!.fullName).toBe('Juan')
    })

    it('applies status filter when provided', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getAllRealtorApplications('approved')
      expect(whereMock).toHaveBeenCalledWith('status', '==', 'approved')
    })

    it('does not add status filter when not provided', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getAllRealtorApplications()
      const whereCalls = whereMock.mock.calls as unknown[][]
      const statusWhere = whereCalls.find((c) => c[0] === 'status')
      expect(statusWhere).toBeUndefined()
    })

    it('maps reviewedAt when present (line 654 true branch)', async () => {
      const reviewedDate = new Date('2026-10-01')
      getDocsMock.mockResolvedValue(makeDocsSnap([{
        id: 'uid-reviewed',
        data: {
          userId: 'uid-reviewed',
          fullName: 'Reviewed',
          phone: '111',
          email: 'r@e.com',
          motivation: 'reason',
          status: 'approved',
          submittedAt: { toDate: () => new Date('2026-09-01') },
          reviewedAt: { toDate: () => reviewedDate },
        },
      }]))
      const result = await firestoreService.getAllRealtorApplications()
      expect(result[0]!.reviewedAt).toEqual(reviewedDate)
    })

    it('defaults businessName, yearsExperience, serviceZones, and status when absent (lines 648-652 ?? branches)', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([{
        id: 'uid-missing',
        data: {
          userId: 'uid-missing',
          fullName: 'Test',
          phone: '123',
          email: 't@e.com',
          motivation: 'reason',
          submittedAt: { toDate: () => new Date('2026-09-01') },
          // businessName, yearsExperience, serviceZones, status, reviewedAt all absent
        },
      }]))
      const result = await firestoreService.getAllRealtorApplications()
      expect(result[0]!.businessName).toBe('')
      expect(result[0]!.yearsExperience).toBe(0)
      expect(result[0]!.serviceZones).toEqual([])
      expect(result[0]!.status).toBe('pending')
      expect(result[0]!.reviewedAt).toBeUndefined()
    })
  })

  // ── getClaimsForListing ──────────────────────────────────────────────────

  describe('getClaimsForListing', () => {
    it('returns claims filtered by listingId', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'claim-1',
          data: {
            listingId: 'listing-1',
            realtorId: 'r1',
            listingOwnerId: 'owner-1',
            claimedAt: { toDate: () => new Date('2026-09-01') },
            claimMonth: '2026-09',
            realtorName: 'Juan',
            realtorPhone: '+51987',
            realtorBusinessName: 'JG',
            ownerContacted: false,
            assignedByOwner: false,
          },
        },
        {
          id: 'claim-2',
          data: {
            listingId: 'listing-other',
            realtorId: 'r2',
            listingOwnerId: 'owner-1',
            claimedAt: { toDate: () => new Date('2026-09-02') },
            claimMonth: '2026-09',
            realtorName: 'Ana',
            realtorPhone: '+51912',
            realtorBusinessName: 'AG',
            ownerContacted: false,
            assignedByOwner: false,
          },
        },
      ]))

      const result = await firestoreService.getClaimsForListing('owner-1', 'listing-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.listingId).toBe('listing-1')
    })

    it('queries with listingOwnerId filter', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getClaimsForListing('owner-xyz', 'listing-1')
      expect(whereMock).toHaveBeenCalledWith('listingOwnerId', '==', 'owner-xyz')
    })
  })

  // ── getClaimedLeadsWithDetails ───────────────────────────────────────────

  describe('getClaimedLeadsWithDetails', () => {
    it('returns empty array when no claims exist', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      const result = await firestoreService.getClaimedLeadsWithDetails('realtor-1')
      expect(result).toEqual([])
    })

    it('queries claims by realtorId', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getClaimedLeadsWithDetails('realtor-xyz')
      expect(whereMock).toHaveBeenCalledWith('realtorId', '==', 'realtor-xyz')
    })

    it('returns claims with listing and property when all exist', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'claim-1',
          data: {
            listingId: 'listing-1',
            realtorId: 'realtor-1',
            listingOwnerId: 'owner-1',
            claimedAt: { toDate: () => new Date('2026-09-01') },
            claimMonth: '2026-09',
            realtorName: 'Juan',
            realtorPhone: '+51987',
            realtorBusinessName: 'JG',
            ownerContacted: false,
            assignedByOwner: false,
          },
        },
      ]))
      // First getDoc: listing
      getDocMock.mockResolvedValueOnce(makeDocSnap('listing-1', makeListingData({ propertyId: 'prop-1' })))
      // Second getDoc: property
      getDocMock.mockResolvedValueOnce(makeDocSnap('prop-1', makePropertyData()))

      const result = await firestoreService.getClaimedLeadsWithDetails('realtor-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.claim.id).toBe('claim-1')
      expect(result[0]!.listing.id).toBe('listing-1')
      expect(result[0]!.property.id).toBe('prop-1')
    })

    it('excludes claims whose listing doc no longer exists (line 804 false branch)', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'claim-orphan',
          data: {
            listingId: 'deleted-listing',
            realtorId: 'realtor-1',
            listingOwnerId: 'owner-1',
            claimedAt: null,
            claimMonth: '2026-09',
            realtorName: 'Juan',
            realtorPhone: '+51987',
            realtorBusinessName: '',
            ownerContacted: false,
            assignedByOwner: false,
          },
        },
      ]))
      // Listing no longer exists
      getDocMock.mockResolvedValueOnce(makeDocSnap('deleted-listing', {}, false))

      const result = await firestoreService.getClaimedLeadsWithDetails('realtor-1')
      expect(result).toEqual([])
    })

    it('excludes claims whose property doc no longer exists (line 818 false branch)', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'claim-missing-prop',
          data: {
            listingId: 'listing-1',
            realtorId: 'realtor-1',
            listingOwnerId: 'owner-1',
            claimedAt: null,
            claimMonth: '2026-09',
            realtorName: 'Juan',
            realtorPhone: '+51987',
            realtorBusinessName: '',
            ownerContacted: false,
            assignedByOwner: false,
          },
        },
      ]))
      // Listing exists but property does not
      getDocMock.mockResolvedValueOnce(makeDocSnap('listing-1', makeListingData({ propertyId: 'deleted-prop' })))
      getDocMock.mockResolvedValueOnce(makeDocSnap('deleted-prop', {}, false))

      const result = await firestoreService.getClaimedLeadsWithDetails('realtor-1')
      expect(result).toEqual([])
    })

    it('defaults listingOwnerId, realtorBusinessName, ownerContacted, assignedByOwner when absent (lines 920-927)', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([
        {
          id: 'claim-minimal',
          data: {
            listingId: 'listing-1',
            realtorId: 'realtor-1',
            // listingOwnerId, realtorBusinessName, ownerContacted, assignedByOwner intentionally omitted
            claimedAt: null,
            claimMonth: '2026-09',
            realtorName: 'Juan',
            realtorPhone: '+51987',
          },
        },
      ]))
      getDocMock.mockResolvedValueOnce(makeDocSnap('listing-1', makeListingData({ propertyId: 'prop-1' })))
      getDocMock.mockResolvedValueOnce(makeDocSnap('prop-1', makePropertyData()))

      const result = await firestoreService.getClaimedLeadsWithDetails('realtor-1')
      expect(result[0]!.claim.listingOwnerId).toBe('')      // ?? ''
      expect(result[0]!.claim.realtorBusinessName).toBe('')  // ?? ''
      expect(result[0]!.claim.ownerContacted).toBe(false)    // ?? false
      expect(result[0]!.claim.assignedByOwner).toBe(false)   // ?? false
    })
  })

  // ── getAgentAssignedListingsWithProperties ─────────────────────────────

  describe('getAgentAssignedListingsWithProperties', () => {
    it('returns empty array when agent has no assigned listings', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      const result = await firestoreService.getAgentAssignedListingsWithProperties('agent-1')
      expect(result).toHaveLength(0)
    })

    it('queries listings by assignedRealtorId', async () => {
      getDocsMock.mockResolvedValue(makeDocsSnap([]))
      await firestoreService.getAgentAssignedListingsWithProperties('agent-1')
      expect(whereMock).toHaveBeenCalledWith('assignedRealtorId', '==', 'agent-1')
    })

    it('returns matched listing+property pairs', async () => {
      getDocsMock
        .mockResolvedValueOnce(makeDocsSnap([
          { id: 'listing-1', data: makeListingData({ propertyId: 'prop-1' }) },
        ]))
        .mockResolvedValueOnce(makeDocsSnap([
          { id: 'prop-1', data: makePropertyData() },
        ]))

      const result = await firestoreService.getAgentAssignedListingsWithProperties('agent-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.listing.id).toBe('listing-1')
      expect(result[0]!.property.id).toBe('prop-1')
    })

    it('excludes listings whose property does not exist', async () => {
      getDocsMock
        .mockResolvedValueOnce(makeDocsSnap([
          { id: 'listing-1', data: makeListingData({ propertyId: 'prop-missing' }) },
        ]))
        .mockResolvedValueOnce(makeDocsSnap([]))

      const result = await firestoreService.getAgentAssignedListingsWithProperties('agent-1')
      expect(result).toHaveLength(0)
    })
  })

  // ── unassignRealtor ────────────────────────────────────────────────────

  describe('unassignRealtor', () => {
    it('calls updateDoc with deleteField for assignment fields', async () => {
      await firestoreService.unassignRealtor('listing-xyz')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1] as Record<string, unknown>
      // deleteField is mocked to return { __deleteField: true }
      expect(payload.assignedRealtorId).toBeDefined()
      expect(payload.assignedRealtorPhoneNumber).toBeDefined()
      expect(payload.assignmentStatus).toBeDefined()
    })

    it('targets the correct listing document', async () => {
      await firestoreService.unassignRealtor('listing-xyz')
      expect(docMock).toHaveBeenCalledWith(expect.anything(), 'listings', 'listing-xyz')
    })
  })

  // ── toDate() string branch (line 76) ──────────────────────────────────────
  // When a Firestore document has a string timestamp (e.g. a legacy record),
  // toDate() converts it via new Date(value). Covered via getListingById.

  describe('toDate() — string timestamp branch (line 76)', () => {
    it('converts a string createdAt to a Date when fetching a listing', async () => {
      getDocMock.mockResolvedValueOnce(
        makeDocSnap('listing-str', makeListingData({ createdAt: '2026-01-01T00:00:00Z' }))
      )
      const listing = await firestoreService.getListingById('listing-str')
      expect(listing).not.toBeNull()
      expect(listing!.createdAt).toBeInstanceOf(Date)
    })

    it('falls back to new Date(0) and warns for unexpected timestamp type (line 77-78)', async () => {
      // Pass a number — not a Timestamp object, not a string → hits the unexpected branch
      getDocMock.mockResolvedValueOnce(
        makeDocSnap('listing-num', makeListingData({ createdAt: 99999 }))
      )
      const listing = await firestoreService.getListingById('listing-num')
      expect(listing).not.toBeNull()
      // new Date(0) is the epoch fallback
      expect(listing!.createdAt.getTime()).toBe(new Date(0).getTime())
    })
  })

  // ── stripUndefined() — continue branch (line 51) ──────────────────────────
  // When a field value is undefined, stripUndefined skips it (continue).
  // Covered by calling createListing with optional fields set to undefined.

  describe('stripUndefined() — undefined key is omitted (line 51)', () => {
    it('omits undefined optional fields when creating a listing', async () => {
      await firestoreService.createListing({
        role: 'owner',
        ownerId: 'user-1',
        propertyId: 'prop-1',
        description: 'Test',
        operationType: 'venta',
        price: { amount: 100000, currency: 'USD' },
        status: 'draft',
        contactClickCount: 0,
        wantsRealtorHelp: false,
        maxRealtors: 3,
        currentClaimsCount: 0,
        isBoosted: false,
        boostScore: 1,
        showExactLocation: true,
        // Optional fields intentionally set to undefined — triggers the continue branch in stripUndefined
        publishedAt: undefined,
        expiresAt: undefined,
        boostedUntil: undefined,
      })
      expect(setDocMock).toHaveBeenCalledOnce()
      // The payload written to Firestore should not contain the undefined fields
      const payload = setDocMock.mock.calls[0][1] as Record<string, unknown>
      expect(payload).not.toHaveProperty('publishedAt')
      expect(payload).not.toHaveProperty('expiresAt')
      expect(payload).not.toHaveProperty('boostedUntil')
    })
  })
})
