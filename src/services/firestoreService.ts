import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  increment,
  writeBatch,
  type Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { WaitlistEntry } from '@/types/waitlist'
import type { ContactTimeSlot, SupportedCountryCode, OperationType } from '@/types/enums'
import type { ListingWithProperty, ExploreListingsPage } from '@/types/explore'
import type { RealtorApplication } from '@/types/realtorApplication'
import type { RealtorClaim } from '@/types/realtorClaim'

// Strip undefined values recursively (Firestore rejects undefined)
// Omits undefined keys entirely to avoid writing null for fields that don't exist
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined keys entirely instead of converting to null
      continue
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !('toDate' in value) // Firestore Timestamp
    ) {
      result[key] = stripUndefined(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

// Timestamp converter
function toDate(value: unknown): Date {
  if (!value) {
    console.warn('[firestoreService] Missing timestamp field, defaulting to epoch')
    return new Date(0)
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  if (typeof value === 'string') return new Date(value)
  console.warn('[firestoreService] Unexpected timestamp format:', value)
  return new Date(0)
}

function listingFromDoc(id: string, data: Record<string, unknown>): Listing {
  const priceData = data['price'] as Record<string, unknown> | undefined
  const contactData = data['contactInfo'] as Record<string, unknown> | undefined
  const mediaData = data['media'] as Record<string, unknown> | undefined

  return {
    id,
    role: (data['role'] as Listing['role']) ?? 'owner',
    ownerId: data['ownerId'] as string,
    propertyId: data['propertyId'] as string,
    description: (data['description'] as string) ?? '',
    operationType: (data['operationType'] as Listing['operationType']) ?? 'venta',
    price: {
      amount: (priceData?.['amount'] as number) ?? 0,
      currency: ((priceData?.['currency'] as string) ?? 'PEN') as Listing['price']['currency'],
    },
    contactInfo: contactData
      ? {
          whatsappPhoneNumber: contactData['whatsappPhoneNumber'] as string,
          countryCode: (contactData['countryCode'] as SupportedCountryCode) ?? 'peru',
          preferredContactTimeSlot:
            (contactData['preferredContactTimeSlot'] as ContactTimeSlot) ?? 'anytime',
          additionalContactNotes: contactData['additionalContactNotes'] as string | undefined,
        }
      : undefined,
    status: (data['status'] as Listing['status']) ?? 'draft',
    viewCount: (data['viewCount'] as number) ?? 0,
    contactClickCount: (data['contactClickCount'] as number) ?? 0,
    createdAt: toDate(data['createdAt']),
    publishedAt: data['publishedAt'] ? toDate(data['publishedAt']) : undefined,
    expiresAt: data['expiresAt'] ? toDate(data['expiresAt']) : undefined,
    updatedAt: toDate(data['updatedAt']),
    media: {
      propertyPhotoUrls: (mediaData?.['propertyPhotoUrls'] as string[]) ?? [],
      thumbnailPhotoUrls: (mediaData?.['thumbnailPhotoUrls'] as string[]) ?? undefined,
      photoBlurHashes: (mediaData?.['photoBlurHashes'] as string[]) ?? undefined,
      primaryPhotoMicroThumb: (mediaData?.['primaryPhotoMicroThumb'] as string) ?? undefined,
    },
    wantsRealtorHelp: (data['wantsRealtorHelp'] as boolean) ?? false,
    maxRealtors: (data['maxRealtors'] as number) ?? 3,
    currentClaimsCount: (data['currentClaimsCount'] as number) ?? 0,
    assignedRealtorId: data['assignedRealtorId'] as string | undefined,
    assignedRealtorPhoneNumber: data['assignedRealtorPhoneNumber'] as string | undefined,
    // Boost fields
    isBoosted: (data['isBoosted'] as boolean) ?? false,
    boostedUntil: data['boostedUntil'] ? toDate(data['boostedUntil']) : undefined,
    boostTier: data['boostTier'] as Listing['boostTier'],
    boostScore: (data['boostScore'] as number) ?? 1,
    // Location privacy fields
    showExactLocation: (data['showExactLocation'] as boolean) ?? true,
    displayLatitude: data['displayLatitude'] as number | undefined,
    displayLongitude: data['displayLongitude'] as number | undefined,
  }
}

function propertyFromDoc(id: string, data: Record<string, unknown>): Property {
  const specsData = data['specs'] as Record<string, unknown> | undefined
  const locationData = data['location'] as Record<string, unknown> | undefined
  const mediaData = data['media'] as Record<string, unknown> | undefined
  const priceData = data['currentPrice'] as Record<string, unknown> | undefined

  const rentalDurationType = data['rentalDurationType'] as string | undefined
  return {
    id,
    listedByUserId: data['listedByUserId'] as string,
    propertyType: (data['propertyType'] as Property['propertyType']) ?? 'casa',
    operationType: (data['operationType'] as Property['operationType']) ?? 'venta',
    ...(rentalDurationType ? { rentalDurationType: rentalDurationType as Property['rentalDurationType'] } : {}),
    specs: {
      totalAreaInSquareMeters: (specsData?.['totalAreaInSquareMeters'] as number) ?? 0,
      bedroomCount: specsData?.['bedroomCount'] as number | undefined,
      bathroomCount: specsData?.['bathroomCount'] as number | undefined,
      availableParkingSpaces: (specsData?.['availableParkingSpaces'] as number) ?? 0,
      propertyAmenities: (specsData?.['propertyAmenities'] as string[]) ?? [],
      hasPrivateBathroom: specsData?.['hasPrivateBathroom'] as boolean | undefined,
    },
    location: {
      latitude: (locationData?.['latitude'] as number) ?? 0,
      longitude: (locationData?.['longitude'] as number) ?? 0,
      calle: (locationData?.['calle'] as string) ?? '',
      urbanizacion: (locationData?.['urbanizacion'] as string) ?? '',
      distrito: (locationData?.['distrito'] as string) ?? '',
      provincia: (locationData?.['provincia'] as string) ?? '',
      departamento: (locationData?.['departamento'] as string) ?? '',
      countryIsoCode: (locationData?.['countryIsoCode'] as string) ?? 'PE',
    },
    currentPrice: {
      amount: (priceData?.['amount'] as number) ?? 0,
      currency: ((priceData?.['currency'] as string) ?? 'PEN') as Property['currentPrice']['currency'],
    },
    normalizedAddress: (data['normalizedAddress'] as string) ?? '',
    media: {
      propertyPhotoUrls: (mediaData?.['propertyPhotoUrls'] as string[]) ?? [],
      thumbnailPhotoUrls: (mediaData?.['thumbnailPhotoUrls'] as string[]) ?? undefined,
      photoBlurHashes: (mediaData?.['photoBlurHashes'] as string[]) ?? undefined,
      primaryPhotoMicroThumb: (mediaData?.['primaryPhotoMicroThumb'] as string) ?? undefined,
    },
    updatedAt: toDate(data['updatedAt']),
    isAvailable: (data['isAvailable'] as boolean) ?? true,
  }
}

export const firestoreService = {
  async addWaitlistEntry(
    entry: Omit<WaitlistEntry, 'createdAt'>
  ) {
    const waitlistRef = collection(db, 'waitlist')
    const docRef = await addDoc(waitlistRef, {
      ...entry,
      createdAt: serverTimestamp(),
    })

    // Queue notification email via Firebase Trigger Email extension
    const mailRef = collection(db, 'mail')
    await addDoc(mailRef, {
      to: 'admin@oqupa.com',
      message: {
        subject: `Nueva inscripcion en lista de espera: ${entry.name}`,
        html: `
          <h2>Nueva inscripcion en la lista de espera</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;">Nombre:</td><td style="padding:8px;">${entry.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Telefono:</td><td style="padding:8px;">${entry.phone}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${entry.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Ciudad:</td><td style="padding:8px;">${entry.city}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Presupuesto:</td><td style="padding:8px;">${entry.budget || 'No especificado'}</td></tr>
          </table>
        `,
      },
    })

    return docRef
  },

  async getActiveListingsWithProperties(): Promise<ListingWithProperty[]> {
    const q = query(
      collection(db, 'listings'),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    const listings = snapshot.docs.map((d) =>
      listingFromDoc(d.id, d.data() as Record<string, unknown>)
    )

    // Batch-fetch unique properties
    const propertyIds = [...new Set(listings.map((l) => l.propertyId))]
    const propertyDocs = await Promise.all(
      propertyIds.map((id) => getDoc(doc(db, 'properties', id)))
    )
    const propertyMap = new Map<string, Property>()
    for (const snap of propertyDocs) {
      if (snap.exists()) {
        propertyMap.set(
          snap.id,
          propertyFromDoc(snap.id, snap.data() as Record<string, unknown>)
        )
      }
    }

    return listings
      .filter((l) => propertyMap.has(l.propertyId))
      .map((listing) => {
        const property = propertyMap.get(listing.propertyId)!
        return { listing, property }
      })
  },

  async getActiveListingsWithPropertiesPaginated(
    pageSize: number = 30,
    cursor?: QueryDocumentSnapshot,
    operationType?: OperationType,
  ): Promise<ExploreListingsPage> {
    const constraints = [
      where('status', '==', 'active'),
      ...(operationType ? [where('operationType', '==', operationType)] : []),
      orderBy('boostScore', 'desc'),
      orderBy('publishedAt', 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize),
    ]

    const q = query(collection(db, 'listings'), ...constraints)

    const snapshot = await getDocs(q)
    const listings = snapshot.docs.map((d) =>
      listingFromDoc(d.id, d.data() as Record<string, unknown>)
    )

    // Batch-fetch unique properties
    const propertyIds = [...new Set(listings.map((l) => l.propertyId))]
    const propertyDocs = await Promise.all(
      propertyIds.map((id) => getDoc(doc(db, 'properties', id)))
    )
    const propertyMap = new Map<string, Property>()
    for (const snap of propertyDocs) {
      if (snap.exists()) {
        propertyMap.set(
          snap.id,
          propertyFromDoc(snap.id, snap.data() as Record<string, unknown>)
        )
      }
    }

    const items = listings
      .filter((l) => propertyMap.has(l.propertyId))
      .map((listing) => {
        const property = propertyMap.get(listing.propertyId)!
        return { listing, property }
      })

    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : undefined

    return {
      items,
      lastDoc,
      hasMore: snapshot.docs.length === pageSize,
    }
  },

  async getUserListingsWithProperties(
    userId: string
  ): Promise<ListingWithProperty[]> {
    const listings = await this.getUserListings(userId)

    const propertyIds = [...new Set(listings.map((l) => l.propertyId))]
    const propertyDocs = await Promise.all(
      propertyIds.map((id) => getDoc(doc(db, 'properties', id)))
    )
    const propertyMap = new Map<string, Property>()
    for (const snap of propertyDocs) {
      if (snap.exists()) {
        propertyMap.set(
          snap.id,
          propertyFromDoc(snap.id, snap.data() as Record<string, unknown>)
        )
      }
    }

    return listings
      .filter((l) => propertyMap.has(l.propertyId))
      .map((listing) => {
        const property = propertyMap.get(listing.propertyId)!
        return { listing, property }
      })
  },

  async getUserListings(userId: string): Promise<Listing[]> {
    const q = query(
      collection(db, 'listings'),
      where('ownerId', '==', userId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) =>
      listingFromDoc(d.id, d.data() as Record<string, unknown>)
    )
  },

  async getListingById(listingId: string): Promise<Listing | null> {
    const snap = await getDoc(doc(db, 'listings', listingId))
    if (!snap.exists()) return null
    return listingFromDoc(snap.id, snap.data() as Record<string, unknown>)
  },

  async getPropertyById(propertyId: string): Promise<Property | null> {
    const snap = await getDoc(doc(db, 'properties', propertyId))
    if (!snap.exists()) return null
    return propertyFromDoc(snap.id, snap.data() as Record<string, unknown>)
  },

  async getListingWithProperty(
    listingId: string
  ): Promise<{ listing: Listing; property: Property } | null> {
    const listing = await this.getListingById(listingId)
    if (!listing) return null

    const property = await this.getPropertyById(listing.propertyId)
    if (!property) return null

    return { listing, property }
  },

  async updateListingStatus(
    listingId: string,
    status: Listing['status']
  ): Promise<void> {
    await updateDoc(doc(db, 'listings', listingId), {
      status,
      updatedAt: serverTimestamp(),
    })
  },

  async deactivateListing(listingId: string): Promise<void> {
    await this.updateListingStatus(listingId, 'deactivated')
  },

  async activateListing(listingId: string): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await updateDoc(doc(db, 'listings', listingId), {
      status: 'active',
      publishedAt: serverTimestamp(),
      expiresAt,
      updatedAt: serverTimestamp(),
    })
  },

  async createProperty(
    data: Omit<Property, 'id' | 'updatedAt'>
  ): Promise<string> {
    const propertyId = `property_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const cleaned = stripUndefined(data as unknown as Record<string, unknown>)
    await setDoc(doc(db, 'properties', propertyId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    })
    return propertyId
  },

  async updateProperty(
    propertyId: string,
    data: Partial<Property>
  ): Promise<void> {
    const { id: _id, ...rest } = data
    const cleaned = stripUndefined(rest as unknown as Record<string, unknown>)
    await updateDoc(doc(db, 'properties', propertyId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    })
  },

  async createListing(
    data: Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>
  ): Promise<string> {
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const cleaned = stripUndefined(data as unknown as Record<string, unknown>)
    await setDoc(doc(db, 'listings', listingId), {
      ...cleaned,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return listingId
  },

  async updateListing(
    listingId: string,
    data: Partial<Listing>
  ): Promise<void> {
    const { id: _id, ...rest } = data
    const cleaned = stripUndefined(rest as unknown as Record<string, unknown>)
    await updateDoc(doc(db, 'listings', listingId), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    })
  },

  async deleteListing(listingId: string): Promise<void> {
    await deleteDoc(doc(db, 'listings', listingId))
  },

  async deleteProperty(propertyId: string): Promise<void> {
    await deleteDoc(doc(db, 'properties', propertyId))
  },

  async submitRealtorApplication(
    userId: string,
    data: {
      fullName: string
      phone: string
      email: string
      businessName: string
      yearsExperience: number
      serviceZones: string[]
      motivation: string
    }
  ): Promise<void> {
    const batch = writeBatch(db)

    // 1. Create realtorApplications/{userId} document
    const applicationRef = doc(db, 'realtorApplications', userId)
    batch.set(applicationRef, {
      userId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      businessName: data.businessName,
      yearsExperience: data.yearsExperience,
      serviceZones: data.serviceZones,
      motivation: data.motivation,
      status: 'pending',
      submittedAt: serverTimestamp(),
    })

    // 2. Update users/{userId} with application status + denormalized realtor data
    const userRef = doc(db, 'users', userId)
    batch.update(userRef, {
      realtorApplicationStatus: 'pending',
      realtorApplicationDate: serverTimestamp(),
      realtorBusinessName: data.businessName,
      realtorYearsExperience: data.yearsExperience,
      realtorServiceZones: data.serviceZones,
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  },

  async getUserRealtorApplication(
    userId: string
  ): Promise<RealtorApplication | null> {
    const snap = await getDoc(doc(db, 'realtorApplications', userId))
    if (!snap.exists()) return null

    const data = snap.data() as Record<string, unknown>
    return {
      id: snap.id,
      userId: data['userId'] as string,
      fullName: data['fullName'] as string,
      phone: data['phone'] as string,
      email: data['email'] as string,
      businessName: (data['businessName'] as string) ?? '',
      yearsExperience: (data['yearsExperience'] as number) ?? 0,
      serviceZones: (data['serviceZones'] as string[]) ?? [],
      motivation: data['motivation'] as string,
      status: (data['status'] as RealtorApplication['status']) ?? 'pending',
      submittedAt: toDate(data['submittedAt']),
      reviewedAt: data['reviewedAt'] ? toDate(data['reviewedAt']) : undefined,
      reviewedBy: data['reviewedBy'] as string | undefined,
    }
  },

  async getAllRealtorApplications(
    statusFilter?: RealtorApplication['status']
  ): Promise<RealtorApplication[]> {
    const constraints = [
      ...(statusFilter ? [where('status', '==', statusFilter)] : []),
      orderBy('submittedAt', 'desc'),
    ]
    const q = query(collection(db, 'realtorApplications'), ...constraints)
    const snapshot = await getDocs(q)

    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        userId: data['userId'] as string,
        fullName: data['fullName'] as string,
        phone: data['phone'] as string,
        email: data['email'] as string,
        businessName: (data['businessName'] as string) ?? '',
        yearsExperience: (data['yearsExperience'] as number) ?? 0,
        serviceZones: (data['serviceZones'] as string[]) ?? [],
        motivation: data['motivation'] as string,
        status: (data['status'] as RealtorApplication['status']) ?? 'pending',
        submittedAt: toDate(data['submittedAt']),
        reviewedAt: data['reviewedAt'] ? toDate(data['reviewedAt']) : undefined,
        reviewedBy: data['reviewedBy'] as string | undefined,
      }
    })
  },

  async approveRealtorApplication(
    userId: string,
    reviewerId: string
  ): Promise<void> {
    const batch = writeBatch(db)

    batch.update(doc(db, 'users', userId), {
      isVerifiedRealtor: true,
      realtorApplicationStatus: 'approved',
      updatedAt: serverTimestamp(),
    })

    batch.update(doc(db, 'realtorApplications', userId), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
    })

    await batch.commit()
  },

  async rejectRealtorApplication(
    userId: string,
    reviewerId: string
  ): Promise<void> {
    const batch = writeBatch(db)

    batch.update(doc(db, 'users', userId), {
      realtorApplicationStatus: 'rejected',
      updatedAt: serverTimestamp(),
    })

    batch.update(doc(db, 'realtorApplications', userId), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId,
    })

    await batch.commit()
  },

  // =========================================================================
  // REALTOR LEADS
  // =========================================================================

  async getAvailableLeads(): Promise<ListingWithProperty[]> {
    const q = query(
      collection(db, 'listings'),
      where('status', '==', 'active'),
      where('wantsRealtorHelp', '==', true),
      orderBy('boostScore', 'desc'),
      orderBy('publishedAt', 'desc'),
    )
    const snapshot = await getDocs(q)
    const listings = snapshot.docs.map((d) =>
      listingFromDoc(d.id, d.data() as Record<string, unknown>)
    )

    // Batch-fetch unique properties
    const propertyIds = [...new Set(listings.map((l) => l.propertyId))]
    const propertyDocs = await Promise.all(
      propertyIds.map((id) => getDoc(doc(db, 'properties', id)))
    )
    const propertyMap = new Map<string, Property>()
    for (const snap of propertyDocs) {
      if (snap.exists()) {
        propertyMap.set(
          snap.id,
          propertyFromDoc(snap.id, snap.data() as Record<string, unknown>)
        )
      }
    }

    return listings
      .filter((l) => propertyMap.has(l.propertyId))
      .map((listing) => ({
        listing,
        property: propertyMap.get(listing.propertyId)!,
      }))
  },

  async createRealtorClaim(data: {
    listingId: string
    realtorId: string
    listingOwnerId: string
    realtorName: string
    realtorPhone: string
    realtorBusinessName: string
  }): Promise<void> {
    const batch = writeBatch(db)
    const now = new Date()
    const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const claimId = `claim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // 1. Create claim document
    const claimRef = doc(db, 'realtorClaims', claimId)
    batch.set(claimRef, {
      listingId: data.listingId,
      realtorId: data.realtorId,
      listingOwnerId: data.listingOwnerId,
      claimedAt: serverTimestamp(),
      claimMonth,
      realtorName: data.realtorName,
      realtorPhone: data.realtorPhone,
      realtorBusinessName: data.realtorBusinessName,
      ownerContacted: false,
      assignedByOwner: false,
    })

    // 2. Read user doc for current month count
    const userDoc = await getDoc(doc(db, 'users', data.realtorId))
    const userData = userDoc.data() as Record<string, unknown> | undefined
    const storedClaimMonth = userData?.['claimMonth'] as string | undefined
    const currentClaimCount = (userData?.['claimsThisMonth'] as number) ?? 0
    const newClaimCount = storedClaimMonth !== claimMonth ? 1 : currentClaimCount + 1

    // 3. Update user claim count
    const userRef = doc(db, 'users', data.realtorId)
    batch.update(userRef, {
      claimsThisMonth: newClaimCount,
      claimMonth,
      updatedAt: serverTimestamp(),
    })

    // 4. Increment listing's currentClaimsCount
    const listingRef = doc(db, 'listings', data.listingId)
    batch.update(listingRef, {
      currentClaimsCount: increment(1),
    })

    await batch.commit()
  },

  async getClaimedLeadsWithDetails(
    realtorId: string
  ): Promise<{ claim: RealtorClaim; listing: Listing; property: Property }[]> {
    const q = query(
      collection(db, 'realtorClaims'),
      where('realtorId', '==', realtorId),
      orderBy('claimedAt', 'desc'),
    )
    const snapshot = await getDocs(q)
    const claims: RealtorClaim[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return realtorClaimFromDoc(d.id, data)
    })

    if (claims.length === 0) return []

    // Batch-fetch listings
    const listingIds = [...new Set(claims.map((c) => c.listingId))]
    const listingDocs = await Promise.all(
      listingIds.map((id) => getDoc(doc(db, 'listings', id)))
    )
    const listingMap = new Map<string, Listing>()
    for (const snap of listingDocs) {
      if (snap.exists()) {
        listingMap.set(snap.id, listingFromDoc(snap.id, snap.data() as Record<string, unknown>))
      }
    }

    // Batch-fetch properties
    const propertyIds = [...new Set(
      [...listingMap.values()].map((l) => l.propertyId)
    )]
    const propertyDocs = await Promise.all(
      propertyIds.map((id) => getDoc(doc(db, 'properties', id)))
    )
    const propertyMap = new Map<string, Property>()
    for (const snap of propertyDocs) {
      if (snap.exists()) {
        propertyMap.set(snap.id, propertyFromDoc(snap.id, snap.data() as Record<string, unknown>))
      }
    }

    return claims
      .filter((c) => listingMap.has(c.listingId))
      .filter((c) => propertyMap.has(listingMap.get(c.listingId)!.propertyId))
      .map((claim) => {
        const listing = listingMap.get(claim.listingId)!
        const property = propertyMap.get(listing.propertyId)!
        return { claim, listing, property }
      })
  },

  async getClaimsForListing(
    listingOwnerId: string,
    listingId: string,
  ): Promise<RealtorClaim[]> {
    // Security rule requires listingOwnerId match on read
    const q = query(
      collection(db, 'realtorClaims'),
      where('listingOwnerId', '==', listingOwnerId),
    )
    const snapshot = await getDocs(q)
    const allClaims = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return realtorClaimFromDoc(d.id, data)
    })
    // Filter by listingId client-side
    return allClaims.filter((c) => c.listingId === listingId)
  },

  async assignRealtorToListing(
    listingId: string,
    realtorId: string,
    realtorPhone: string,
  ): Promise<void> {
    await updateDoc(doc(db, 'listings', listingId), {
      assignedRealtorId: realtorId,
      assignedRealtorPhoneNumber: realtorPhone,
      updatedAt: serverTimestamp(),
    })
  },

  getClaimStatus(
    user: { claimsThisMonth: number; claimMonth: string },
  ): { canClaim: boolean; remaining: number; limit: number } {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthlyLimit = 5

    if (user.claimMonth !== currentMonth) {
      return { canClaim: true, remaining: monthlyLimit, limit: monthlyLimit }
    }

    const remaining = Math.max(0, monthlyLimit - user.claimsThisMonth)
    return {
      canClaim: user.claimsThisMonth < monthlyLimit,
      remaining,
      limit: monthlyLimit,
    }
  },
}

function realtorClaimFromDoc(id: string, data: Record<string, unknown>): RealtorClaim {
  return {
    id,
    listingId: data['listingId'] as string,
    realtorId: data['realtorId'] as string,
    listingOwnerId: (data['listingOwnerId'] as string) ?? '',
    claimedAt: toDate(data['claimedAt']),
    claimMonth: data['claimMonth'] as string,
    realtorName: data['realtorName'] as string,
    realtorPhone: data['realtorPhone'] as string,
    realtorBusinessName: (data['realtorBusinessName'] as string) ?? '',
    ownerContacted: (data['ownerContacted'] as boolean) ?? false,
    assignedByOwner: (data['assignedByOwner'] as boolean) ?? false,
  }
}
