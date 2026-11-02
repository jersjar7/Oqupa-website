/**
 * Errors from uploading a listing photo, typed so the publishing engine can
 * tell the person what actually went wrong (see services/publishService).
 *
 * They live here, not in storageService, so code that mocks the storage
 * service in tests can still recognise them.
 */

/**
 * The photo PUT to storage did not succeed.
 *  - 'status':  the server answered with a non-2xx `status` (4xx refused, 5xx down)
 *  - 'network': the request never got an answer (offline, connection dropped)
 *  - 'aborted': we cancelled it (a time limit ran out, or another photo failed)
 *
 * The messages stay the ones the upload has always thrown.
 */
export class UploadError extends Error {
  constructor(
    readonly reason: 'status' | 'network' | 'aborted',
    readonly status?: number,
  ) {
    super(
      reason === 'status'
        ? `Upload failed with status ${status}`
        : reason === 'network'
          ? 'Upload failed'
          : 'Upload aborted',
    )
    this.name = 'UploadError'
  }
}

/** A photo could not be opened or compressed (corrupt, or a format the browser cannot read). */
export class PhotoUnreadableError extends Error {
  constructor(readonly cause: unknown) {
    super('Photo could not be read')
    this.name = 'PhotoUnreadableError'
  }
}
