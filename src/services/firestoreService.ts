import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { ContactTimeSlot, SupportedCountryCode } from '@/types/enums'
import type { ListingWithProperty } from '@/types/explore'

// Strip undefined values recursively (Firestore rejects undefined)
// Converts undefined to null to match Flutter behavior
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Firestore stores null for missing optional fields (matches Flutter)
      result[key] = null
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
  if (!value) return new Date()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  if (typeof value === 'string') return new Date(value)
  return new Date()
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

  return {
    id,
    listedByUserId: data['listedByUserId'] as string,
    propertyType: (data['propertyType'] as Property['propertyType']) ?? 'casa',
    operationType: (data['operationType'] as Property['operationType']) ?? 'venta',
    specs: {
      totalAreaInSquareMeters: (specsData?.['totalAreaInSquareMeters'] as number) ?? 0,
      bedroomCount: specsData?.['bedroomCount'] as number | undefined,
      bathroomCount: specsData?.['bathroomCount'] as number | undefined,
      availableParkingSpaces: (specsData?.['availableParkingSpaces'] as number) ?? 0,
      propertyAmenities: (specsData?.['propertyAmenities'] as string[]) ?? [],
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
      .map((listing) => ({
        listing,
        property: propertyMap.get(listing.propertyId)!,
      }))
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
    const cleaned = stripUndefined(data as unknown as Record<string, unknown>)
    const docRef = await addDoc(collection(db, 'properties'), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    })
    return docRef.id
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
    const cleaned = stripUndefined(data as unknown as Record<string, unknown>)
    const docRef = await addDoc(collection(db, 'listings'), {
      ...cleaned,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
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
