/** Photos a new listing needs. The app gates at the same number (kMinPhotos). */
export const MIN_PHOTOS = 3

/**
 * How many photos the photo step asks for. A new listing: 3. An edit: never
 * more than the listing already had (the app asks for none on an edit), and
 * never fewer than one.
 */
export function minPhotosFor({ isEditMode, originalCount }: { isEditMode: boolean; originalCount: number }): number {
  if (!isEditMode) return MIN_PHOTOS
  return Math.max(1, Math.min(MIN_PHOTOS, originalCount))
}
