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
  setDoc,
  serverTimestamp,
  type Timestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { WaitlistEntry } from '@/types/waitlist'
import type { ContactTimeSlot, SupportedCountryCode } from '@/types/enums'
import type { ListingWithProperty, ExploreListingsPage } from '@/types/explore'

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
    createdAt: toDate(data['createdAt']),
    publishedAt: data['publishedAt'] ? toDate(data['publishedAt']) : undefined,
    expiresAt: data['expiresAt'] ? toDate(data['expiresAt']) : undefined,
    updatedAt: toDate(data['updatedAt']),
    media: {
      propertyPhotoUrls: (mediaData?.['propertyPhotoUrls'] as string[]) ?? [],
    },
    wantsRealtorHelp: (data['wantsRealtorHelp'] as boolean) ?? false,
    maxRealtors: (data['maxRealtors'] as number) ?? 3,
    currentClaimsCount: (data['currentClaimsCount'] as number) ?? 0,
    assignedRealtorId: data['assignedRealtorId'] as string | undefined,
    assignedRealtorPhoneNumber: data['assignedRealtorPhoneNumber'] as string | undefined,
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
            <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${entry.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Interes:</td><td style="padding:8px;">${entry.intent}</td></tr>
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
        // Property is the source of truth for operationType — Flutter doesn't
        // write operationType to listing docs, so the listing default ('venta')
        // may be wrong for alquiler listings created from the mobile app.
        return {
          listing: { ...listing, operationType: property.operationType },
          property,
        }
      })
  },

  async getActiveListingsWithPropertiesPaginated(
    pageSize: number = 30,
    cursor?: QueryDocumentSnapshot,
  ): Promise<ExploreListingsPage> {
    let q = query(
      collection(db, 'listings'),
      where('status', '==', 'active'),
      orderBy('publishedAt', 'desc'),
      limit(pageSize),
    )

    if (cursor) {
      q = query(
        collection(db, 'listings'),
        where('status', '==', 'active'),
        orderBy('publishedAt', 'desc'),
        startAfter(cursor),
        limit(pageSize),
      )
    }

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
        return {
          listing: { ...listing, operationType: property.operationType },
          property,
        }
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
        return {
          listing: { ...listing, operationType: property.operationType },
          property,
        }
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
}
