import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  upload: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@/services/storageService', () => ({
  storageService: { uploadPropertyPhotosPooled: (...a: unknown[]) => h.upload(...a) },
}))
vi.mock('@/services/firestoreService', () => ({
  firestoreService: { publishPropertyAndListing: (...a: unknown[]) => h.save(...a) },
}))

import { publishListing, PublishError, PUBLISH_ERROR_MESSAGES, PUBLISH_SAVE_TIMEOUT_MS } from '../publishService'
import { UploadError, PhotoUnreadableError } from '@/lib/uploadErrors'
import { TimeoutError } from '@/lib/withTimeout'
import { photoFingerprints } from '@/lib/publishIdentity'

const file = (name: string, size = 10) => new File(['x'.repeat(size)], name, { lastModified: 1 })
const result = (k: string) => ({ objectKey: k, blurHash: `h-${k}`, microThumb: `m-${k}` })

function request(overrides: Partial<Parameters<typeof publishListing>[0]> = {}) {
  return {
    publishId: '1_abcdefg',
    photos: [file('a'), file('b'), file('c')],
    uploadedPhotos: {},
    buildDocs: ({ media }: { media: { photoKeys: string[] } }) => ({
      property: { listedByUserId: 'u1', media: { photoKeys: media.photoKeys } } as never,
      listing: { ownerId: 'u1', media: { photoKeys: media.photoKeys } } as never,
    }),
    ...overrides,
  }
}

beforeEach(() => {
  h.upload.mockReset().mockImplementation(async (_pid: string, files: File[], opts: { onPhotoUploaded?: (i: number, r: unknown) => void; onProgress?: (f: number) => void }) => {
    opts.onProgress?.(0.5)
    const res = files.map((f) => result(`k-${f.name}`))
    res.forEach((r, i) => opts.onPhotoUploaded?.(i, r))
    opts.onProgress?.(1)
    return res
  })
  h.save.mockReset().mockImplementation(async (_ids: unknown, _p: unknown, _l: unknown, onStage?: (s: string) => void) => {
    onStage?.('read')
    return { alreadyPublished: false }
  })
})

afterEach(() => vi.useRealTimers())

describe('publishListing', () => {
  it('uploads photos under the draft identity first, then saves both documents once', async () => {
    const out = await publishListing(request())
    expect(h.upload).toHaveBeenCalledOnce()
    expect(h.upload.mock.calls[0]![0]).toBe('property_1_abcdefg')
    expect(h.save).toHaveBeenCalledOnce()
    expect(h.save.mock.calls[0]![0]).toEqual({ propertyId: 'property_1_abcdefg', listingId: 'listing_1_abcdefg' })
    expect(h.upload.mock.invocationCallOrder[0]!).toBeLessThan(h.save.mock.invocationCallOrder[0]!)
    expect(out.media).toEqual({
      photoKeys: ['k-a', 'k-b', 'k-c'],
      blurHashes: ['h-k-a', 'h-k-b', 'h-k-c'],
      microThumb: 'm-k-a',
    })
  })

  it('skips photos already uploaded and keeps the original order', async () => {
    const photos = [file('a'), file('b'), file('c')]
    const fp = photoFingerprints(photos)
    const out = await publishListing(request({
      photos,
      uploadedPhotos: { [fp[0]!]: result('old-a'), [fp[2]!]: result('old-c') },
    }))
    expect((h.upload.mock.calls[0]![1] as File[]).map((f) => f.name)).toEqual(['b'])
    expect(out.media.photoKeys).toEqual(['old-a', 'k-b', 'old-c'])
    expect(out.media.microThumb).toBe('m-old-a')
  })

  it('every photo already uploaded: no upload at all', async () => {
    const photos = [file('a')]
    const [fp] = photoFingerprints(photos)
    await publishListing(request({ photos, uploadedPhotos: { [fp!]: result('old') } }))
    expect(h.upload).not.toHaveBeenCalled()
    expect(h.save).toHaveBeenCalledOnce()
  })

  it('hands each finished photo back by fingerprint, so it can be kept with the draft', async () => {
    const photos = [file('a'), file('b')]
    const fp = photoFingerprints(photos)
    const onPhotoUploaded = vi.fn()
    await publishListing(request({ photos, onPhotoUploaded }))
    expect(onPhotoUploaded).toHaveBeenCalledWith(fp[0], result('k-a'))
    expect(onPhotoUploaded).toHaveBeenCalledWith(fp[1], result('k-b'))
  })

  it('reports photos by bytes, then the save, never backwards', async () => {
    const events: Array<[string, number]> = []
    await publishListing(request({ onProgress: (s, f) => events.push([s, f]) }))
    const scale = events.map(([s, f]) => (s === 'photos' ? f : 1 + f))
    for (let i = 1; i < scale.length; i++) expect(scale[i]!).toBeGreaterThanOrEqual(scale[i - 1]!)
    expect(events[events.length - 1]).toEqual(['save', 1])
    expect(events).toContainEqual(['save', 0.5])
  })

  it('a failed upload is reported in Spanish, and nothing is saved', async () => {
    h.upload.mockRejectedValue(new Error('Upload failed'))
    const err = await publishListing(request()).catch((e) => e)
    expect(err).toBeInstanceOf(PublishError)
    expect(err.message).toBe(PUBLISH_ERROR_MESSAGES.other)
    expect(h.save).not.toHaveBeenCalled()
  })

  it('a failed save is reported in Spanish', async () => {
    h.save.mockRejectedValue(new Error('PERMISSION_DENIED'))
    await expect(publishListing(request())).rejects.toThrow(PUBLISH_ERROR_MESSAGES.other)
  })

  it('a save that takes longer than 20 s fails with the Spanish message', async () => {
    vi.useFakeTimers()
    h.save.mockReturnValue(new Promise(() => {}))
    const p = publishListing(request())
    const assertion = expect(p).rejects.toThrow(PUBLISH_ERROR_MESSAGES.slow)
    await vi.advanceTimersByTimeAsync(PUBLISH_SAVE_TIMEOUT_MS)
    await assertion
    expect(PUBLISH_SAVE_TIMEOUT_MS).toBe(20000)
  })

  it('says when an earlier attempt had already saved it', async () => {
    h.save.mockResolvedValue({ alreadyPublished: true, sameContent: true })
    const out = await publishListing(request())
    expect(out.alreadyPublished).toBe(true)
    expect(out.contentChanged).toBe(false)
  })

  it('passes the draft fingerprint to the save', async () => {
    await publishListing(request())
    expect(typeof h.save.mock.calls[0]![4]).toBe('string')
    const first = h.save.mock.calls[0]![4]
    await publishListing(request())
    expect(h.save.mock.calls[1]![4]).toBe(first)
  })

  it('says when the listing that exists is an EARLIER version of the draft', async () => {
    h.save.mockResolvedValue({ alreadyPublished: true, sameContent: false })
    expect((await publishListing(request())).contentChanged).toBe(true)
  })

  it('ids taken by another account are their own kind of failure', async () => {
    h.save.mockRejectedValue(new Error('publish-id-taken'))
    const err = await publishListing(request()).catch((e) => e)
    expect(err.kind).toBe('id-taken')
    h.save.mockReset()
    h.upload.mockRejectedValue(Object.assign(new Error('You do not own this property'), { code: 'functions/permission-denied' }))
    expect((await publishListing(request()).catch((e) => e)).kind).toBe('id-taken')
  })

  it('anything else is an ordinary failure', async () => {
    h.upload.mockRejectedValue(Object.assign(new Error('nope'), { code: 'functions/permission-denied' }))
    expect((await publishListing(request()).catch((e) => e)).kind).toBe('failed')
  })

  it('a retry with a fresh identity still fails as id-taken, never with a connection message', async () => {
    h.save.mockRejectedValue(new Error('publish-id-taken'))
    const err = await publishListing(request()).catch((e) => e)
    expect(err.failure).toBe('id-taken')
    expect(err.message).toBe(PUBLISH_ERROR_MESSAGES.other)
  })
})

// ── What the person reads, per cause (the owner's catalogue, 2026-11-02) ─────

const coded = (code: string, message = code) => Object.assign(new Error(message), { code })

describe('publishListing — a specific Spanish message for each cause', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('the catalogue is exactly the agreed wording', () => {
    expect(PUBLISH_ERROR_MESSAGES).toEqual({
      offline: 'No tienes conexión a internet. Conéctate y vuelve a intentarlo.',
      slow: 'La conexión está muy lenta. Busca mejor señal y vuelve a intentarlo.',
      server: 'Oqupa no responde en este momento. Vuelve a intentarlo en unos minutos.',
      session: 'Tu sesión se cerró. Vuelve a iniciar sesión y publica de nuevo.',
      'not-allowed': 'Tu cuenta no puede publicar en este momento. Escríbenos a admin@oqupa.com.',
      'photo-unreadable': 'No pudimos abrir una de tus fotos. Cámbiala por otra y vuelve a intentarlo.',
      'photo-refused': 'No pudimos subir tus fotos. Vuelve a intentarlo.',
      other: 'Algo salió mal. Verifica tus datos y vuelve a intentarlo.',
    })
  })

  it('no message mentions duplication any more', () => {
    for (const m of Object.values(PUBLISH_ERROR_MESSAGES)) expect(m).not.toMatch(/duplic/i)
  })

  type Case = [string, () => void, PublishError['failure']]
  const failUpload = (e: unknown) => () => { h.upload.mockRejectedValue(e) }
  const failSave = (e: unknown) => () => { h.save.mockRejectedValue(e) }
  const cases: Case[] = [
    ['offline: the upload fails while the browser is offline', () => {
      vi.stubGlobal('navigator', { onLine: false })
      h.upload.mockRejectedValue(new UploadError('network'))
    }, 'offline'],
    ['offline: the save fails while the browser is offline', () => {
      vi.stubGlobal('navigator', { onLine: false })
      h.save.mockRejectedValue(coded('unavailable'))
    }, 'offline'],
    ['slow: a step timed out', failUpload(new TimeoutError('photo upload', 30000)), 'slow'],
    ['slow: Firestore deadline-exceeded', failSave(coded('deadline-exceeded')), 'slow'],
    ['slow: a function deadline-exceeded', failUpload(coded('functions/deadline-exceeded')), 'slow'],
    ['slow: the PUT never reached the server while online', failUpload(new UploadError('network')), 'slow'],
    ['server: Firestore unavailable', failSave(coded('unavailable')), 'server'],
    ['server: function internal', failUpload(coded('functions/internal')), 'server'],
    ['server: function unavailable', failUpload(coded('functions/unavailable')), 'server'],
    ['server: resource-exhausted', failSave(coded('resource-exhausted')), 'server'],
    ['server: storage 5xx', failUpload(new UploadError('status', 503)), 'server'],
    ['session: function unauthenticated', failUpload(coded('functions/unauthenticated', 'Must be logged in')), 'session'],
    ['session: token expired', failSave(coded('auth/user-token-expired')), 'session'],
    ['session: Firestore unauthenticated', failSave(coded('unauthenticated')), 'session'],
    ['not-allowed: Firestore permission-denied, signed in', failSave(coded('permission-denied')), 'not-allowed'],
    ['not-allowed: function permission-denied that is not id-taken',
      failUpload(coded('functions/permission-denied', 'Cannot upload photos for another user')), 'not-allowed'],
    ['photo-unreadable: compression failed', failUpload(new PhotoUnreadableError(new Error('not an image'))), 'photo-unreadable'],
    ['photo-refused: storage 4xx', failUpload(new UploadError('status', 403)), 'photo-refused'],
    ['other: anything unrecognised', failSave(new Error('boom')), 'other'],
    ['other: invalid-argument', failUpload(coded('functions/invalid-argument')), 'other'],
  ]

  it.each(cases)('%s', async (_name, arrange, failure) => {
    arrange()
    const err = await publishListing(request()).catch((e) => e)
    expect(err).toBeInstanceOf(PublishError)
    expect(err.failure).toBe(failure)
    expect(err.kind).toBe('failed')
    expect(err.message).toBe(PUBLISH_ERROR_MESSAGES[failure as keyof typeof PUBLISH_ERROR_MESSAGES])
    expect(err.reason).toBeDefined()
  })

  it('session: permission-denied after the account signed out', async () => {
    h.save.mockRejectedValue(coded('permission-denied'))
    const err = await publishListing(request({ isSignedIn: () => false })).catch((e) => e)
    expect(err.failure).toBe('session')
    expect(err.message).toBe(PUBLISH_ERROR_MESSAGES.session)
  })

  it('session: any failure while signed out', async () => {
    h.save.mockRejectedValue(new Error('boom'))
    const err = await publishListing(request({ isSignedIn: () => false })).catch((e) => e)
    expect(err.failure).toBe('session')
  })

  it('the original error is kept', async () => {
    const original = new UploadError('status', 403)
    h.upload.mockRejectedValue(original)
    const err = await publishListing(request()).catch((e) => e)
    expect(err.reason).toBe(original)
  })
})
