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

  // ── addWaitlistEntry ─────────────────────────────────────────────────────

  describe('addWaitlistEntry', () => {
    it('calls addDoc twice — once for waitlist, once for mail', async () => {
      await firestoreService.addWaitlistEntry({
        name: 'Juan García',
        phone: '987654321',
        email: 'juan@example.com',
        departamento: 'Arequipa',
        contactConsent: true,
      })
      expect(addDocMock).toHaveBeenCalledTimes(2)
    })

    it('adds a serverTimestamp to the waitlist entry', async () => {
      await firestoreService.addWaitlistEntry({
        name: 'Ana López',
        phone: '912345678',
        email: 'ana@example.com',
        departamento: 'Cusco',
        contactConsent: true,
      })
      const waitlistPayload = addDocMock.mock.calls[0][1] as Record<string, unknown>
      expect(waitlistPayload.createdAt).toEqual({ _server: true })
    })

    it('sends email to admin@oqupa.com', async () => {
      await firestoreService.addWaitlistEntry({
        name: 'Test',
        phone: '900000000',
        email: 'test@example.com',
        departamento: 'Lima',
        contactConsent: false,
      })
      const mailPayload = addDocMock.mock.calls[1][1] as Record<string, unknown>
      expect(mailPayload.to).toBe('admin@oqupa.com')
    })

    it('returns the docRef from the first addDoc call', async () => {
      addDocMock.mockResolvedValueOnce({ id: 'waitlist-id-1' })
      addDocMock.mockResolvedValueOnce({ id: 'mail-id-1' })
      const result = await firestoreService.addWaitlistEntry({
        name: 'Test',
        phone: '900000000',
        email: 'test@example.com',
        departamento: 'Lima',
        contactConsent: false,
      })
      expect(result.id).toBe('waitlist-id-1')
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
})
