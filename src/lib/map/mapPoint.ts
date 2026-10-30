import type { ListingWithProperty } from '@/types/explore'

/** Where the map draws a listing: the public display point for a listing that
 *  hides its exact location, otherwise the property's own point. */
export function mapPointOf({ listing, property }: ListingWithProperty): { lat: number; lng: number } {
  return {
    lat: listing.displayLatitude ?? property.location.latitude,
    lng: listing.displayLongitude ?? property.location.longitude,
  }
}

export interface Bounds { south: number; west: number; north: number; east: number }
