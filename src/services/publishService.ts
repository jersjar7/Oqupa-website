import { storageService, type PhotoUploadResult } from '@/services/storageService'
import { firestoreService } from '@/services/firestoreService'
import { withTimeout, TimeoutError } from '@/lib/withTimeout'
import { UploadError, PhotoUnreadableError } from '@/lib/uploadErrors'
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
 * number of retries can make a second listing. When something goes wrong,
 * the person reads one Spanish sentence that says WHAT went wrong
 * (PUBLISH_ERROR_MESSAGES) — specific, because older people especially need
 * to know whether to find signal, change a photo, sign in again or wait.
 * None of them mentions duplicates: that was our bug, not theirs (Jerson,
 * 2026-11-02). The Flutter app uses the same words.
 */

/** Why a publish failed, as far as the person needs to know. */
export type PublishFailure =
  | 'id-taken'
  | 'offline'
  | 'slow'
  | 'server'
  | 'session'
  | 'not-allowed'
  | 'photo-unreadable'
  | 'photo-refused'
  | 'other'

export const PUBLISH_ERROR_MESSAGES = {
  offline: 'No tienes conexión a internet. Conéctate y vuelve a intentarlo.',
  slow: 'La conexión está muy lenta. Busca mejor señal y vuelve a intentarlo.',
  server: 'Oqupa no responde en este momento. Vuelve a intentarlo en unos minutos.',
  session: 'Tu sesión se cerró. Vuelve a iniciar sesión y publica de nuevo.',
  'not-allowed': 'Tu cuenta no puede publicar en este momento. Escríbenos a admin@oqupa.com.',
  'photo-unreadable': 'No pudimos abrir una de tus fotos. Cámbiala por otra y vuelve a intentarlo.',
  'photo-refused': 'No pudimos subir tus fotos. Vuelve a intentarlo.',
  other: 'Algo salió mal. Verifica tus datos y vuelve a intentarlo.',
} as const satisfies Record<Exclude<PublishFailure, 'id-taken'>, string>

/** The property + listing save gets this long. */
export const PUBLISH_SAVE_TIMEOUT_MS = 20_000

/** What was true when the failure happened. */
export interface FailureContext {
  online: boolean
  signedIn: boolean
}

/**
 * Any failure on the publish path. Its message is the Spanish sentence for
 * its `failure`; the original error is kept as `reason`.
 * `kind: 'id-taken'` means the draft's ids already belong to another account
 * (a draft left in this browser by someone else): the caller should take a
 * fresh identity and try again, not show an error.
 */
export class PublishError extends Error {
  readonly kind: 'id-taken' | 'failed'
  readonly failure: PublishFailure
  constructor(
    readonly reason: unknown,
    context: FailureContext = { online: true, signedIn: true },
  ) {
    const failure = classifyPublishFailure(reason, context)
    super(failure === 'id-taken' ? PUBLISH_ERROR_MESSAGES.other : PUBLISH_ERROR_MESSAGES[failure])
    this.name = 'PublishError'
    this.failure = failure
    this.kind = failure === 'id-taken' ? 'id-taken' : 'failed'
  }
}

function isIdTaken(reason: unknown): boolean {
  const e = reason as { code?: unknown; message?: unknown } | null
  const message = typeof e?.message === 'string' ? e.message : ''
  if (message === 'publish-id-taken') return true
  // getUploadUrl refuses photo URLs for a property someone else owns.
  return e?.code === 'functions/permission-denied' && message.includes('do not own this property')
}

/** Firestore says 'unavailable', a callable says 'functions/unavailable': same thing. */
function errorCode(reason: unknown): string {
  const code = (reason as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code.replace(/^(functions|firestore)\//, '') : ''
}

const SESSION_CODES = new Set([
  'unauthenticated',
  'auth/user-token-expired',
  'auth/id-token-expired',
  'auth/invalid-user-token',
  'auth/user-not-found',
])
const SERVER_CODES = new Set(['unavailable', 'internal', 'resource-exhausted'])

/**
 * Sorts a publish failure into the cause the person is told about.
 * Order matters: being offline explains every other symptom, so it wins.
 */
export function classifyPublishFailure(reason: unknown, { online, signedIn }: FailureContext): PublishFailure {
  if (isIdTaken(reason)) return 'id-taken'
  if (!online) return 'offline'

  if (reason instanceof PhotoUnreadableError) return 'photo-unreadable'
  if (reason instanceof TimeoutError) return 'slow'
  if (reason instanceof UploadError) {
    if (reason.reason === 'status' && reason.status !== undefined) {
      if (reason.status >= 500) return 'server'
      if (reason.status >= 400) return 'photo-refused'
    }
    // No answer while the browser thinks it is online, or cut off by our own
    // time limit: the connection is too poor to carry the photos.
    return 'slow'
  }

  const code = errorCode(reason)
  if (code === 'deadline-exceeded') return 'slow'
  if (SESSION_CODES.has(code)) return 'session'
  if (code === 'permission-denied') return signedIn ? 'not-allowed' : 'session'
  if (SERVER_CODES.has(code)) return 'server'
  if (!signedIn) return 'session'
  return 'other'
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
  /** Whether the account is still signed in; asked only when something fails. */
  isSignedIn?: () => boolean
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
    if (err instanceof PublishError) throw err
    throw new PublishError(err, {
      online: typeof navigator === 'undefined' || navigator.onLine !== false,
      signedIn: req.isSignedIn?.() ?? true,
    })
  }
}
