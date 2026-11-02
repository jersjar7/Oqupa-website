import { storageService, type PhotoUploadResult } from '@/services/storageService'
import { firestoreService } from '@/services/firestoreService'
import { withTimeout } from '@/lib/withTimeout'
import { draftHash } from '@/lib/draftHash'
import { listingIdFor, propertyIdFor, photoFingerprints } from '@/lib/publishIdentity'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

/**
 * The publishing engine (ADR-043, decision 1).
 *
 *   1. Photos first, under the draft's identity, 4 at a time, 30 s each.
 *      Photos that already reached the server on an earlier attempt are
 *      skipped — the caller keeps them with the draft.
 *   2. Then the property and the listing, saved together in one write
 *      (20 s). Nothing is public until both are in, so there is no
 *      half-published listing to clean up and no delete-on-failure.
 *
 * Every attempt for the same draft targets the same two documents, so no
 * number of retries can make a second listing. Whatever goes wrong, the
 * person reads one Spanish sentence (PUBLISH_FAILED_MESSAGE).
 */

export const PUBLISH_FAILED_MESSAGE =
  'No pudimos publicar. Revisa tu conexión y vuelve a intentarlo. Tu anuncio no se duplicará.'

/** The property + listing save gets this long. */
export const PUBLISH_SAVE_TIMEOUT_MS = 20_000

/**
 * Any failure on the publish path. Its message is always the Spanish sentence.
 * `kind: 'id-taken'` means the draft's ids already belong to another account
 * (a draft left in this browser by someone else): the caller should take a
 * fresh identity and try again, not show a connection error.
 */
export class PublishError extends Error {
  readonly kind: 'id-taken' | 'failed'
  constructor(readonly reason: unknown) {
    super(PUBLISH_FAILED_MESSAGE)
    this.name = 'PublishError'
    this.kind = isIdTaken(reason) ? 'id-taken' : 'failed'
  }
}

function isIdTaken(reason: unknown): boolean {
  const e = reason as { code?: unknown; message?: unknown } | null
  const message = typeof e?.message === 'string' ? e.message : ''
  if (message === 'publish-id-taken') return true
  // getUploadUrl refuses photo URLs for a property someone else owns.
  return e?.code === 'functions/permission-denied' && message.includes('do not own this property')
}

export interface PublishMedia {
  photoKeys: string[]
  blurHashes: string[]
  /** The cover photo's tiny preview ('' when none could be made). */
  microThumb: string
}

export type PropertyDoc = Omit<Property, 'id' | 'updatedAt'>
export type ListingDoc = Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>

export interface PublishRequest {
  publishId: string
  /** In display order; the first is the cover. */
  photos: File[]
  /** Photos already uploaded for this draft, by fingerprint. */
  uploadedPhotos: Record<string, PhotoUploadResult>
  /** Called as each photo reaches the server; keep it with the draft. */
  onPhotoUploaded?: (fingerprint: string, result: PhotoUploadResult) => void
  /** Builds the two documents once the photo keys are known. */
  buildDocs: (ctx: { propertyId: string; listingId: string; media: PublishMedia }) => {
    property: PropertyDoc
    listing: ListingDoc
  }
  /** Real progress: 'photos' 0..1 by bytes, then 'save' 0..1. */
  onProgress?: (stage: 'photos' | 'save', fraction: number) => void
}

export interface PublishOutcome {
  propertyId: string
  listingId: string
  property: PropertyDoc
  listing: ListingDoc
  media: PublishMedia
  /** True when an earlier attempt had already saved it; nothing was written. */
  alreadyPublished: boolean
  /**
   * True when the listing that already exists came from an EARLIER version of
   * the draft: the person's later changes were not saved.
   */
  contentChanged: boolean
}

export async function publishListing(req: PublishRequest): Promise<PublishOutcome> {
  const propertyId = propertyIdFor(req.publishId)
  const listingId = listingIdFor(req.publishId)
  const { onProgress } = req

  try {
    const fingerprints = photoFingerprints(req.photos)
    const pending = req.photos
      .map((_, i) => i)
      .filter((i) => !req.uploadedPhotos[fingerprints[i]!])

    const weight = (f: File) => Math.max(f.size, 1)
    const totalBytes = req.photos.reduce((s, f) => s + weight(f), 0) || 1
    const pendingBytes = pending.reduce((s, i) => s + weight(req.photos[i]!), 0)
    const doneBytes = totalBytes - pendingBytes
    onProgress?.('photos', doneBytes / totalBytes)

    const fresh = new Map<number, PhotoUploadResult>()
    if (pending.length > 0) {
      const results = await storageService.uploadPropertyPhotosPooled(
        propertyId,
        pending.map((i) => req.photos[i]!),
        {
          onProgress: (f) => onProgress?.('photos', (doneBytes + f * pendingBytes) / totalBytes),
          onPhotoUploaded: (j, result) => {
            const i = pending[j]!
            fresh.set(i, result)
            req.onPhotoUploaded?.(fingerprints[i]!, result)
          },
        },
      )
      results.forEach((r, j) => fresh.set(pending[j]!, r))
    }
    onProgress?.('photos', 1)

    const all = req.photos.map((_, i) => fresh.get(i) ?? req.uploadedPhotos[fingerprints[i]!]!)
    const media: PublishMedia = {
      photoKeys: all.map((r) => r.objectKey),
      blurHashes: all.map((r) => r.blurHash),
      microThumb: all[0]?.microThumb ?? '',
    }

    const { property, listing } = req.buildDocs({ propertyId, listingId, media })

    onProgress?.('save', 0)
    const { alreadyPublished, sameContent } = await withTimeout(
      firestoreService.publishPropertyAndListing(
        { propertyId, listingId },
        property,
        listing,
        () => onProgress?.('save', 0.5),
        draftHash(property, listing),
      ),
      PUBLISH_SAVE_TIMEOUT_MS,
      'publish save',
    )
    onProgress?.('save', 1)

    return {
      propertyId,
      listingId,
      property,
      listing,
      media,
      alreadyPublished,
      contentChanged: alreadyPublished && !sameContent,
    }
  } catch (err) {
    throw err instanceof PublishError ? err : new PublishError(err)
  }
}
