// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  addDocMock, updateDocMock, deleteDocMock, onSnapshotMock,
  queryMock, collectionMock, docMock, whereMock, orderByMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn().mockResolvedValue({ id: 'new-link-id' }),
  updateDocMock: vi.fn().mockResolvedValue(undefined),
  deleteDocMock: vi.fn().mockResolvedValue(undefined),
  onSnapshotMock: vi.fn((..._args: unknown[]) => vi.fn()), // returns unsubscribe fn
  queryMock: vi.fn((...args: unknown[]): Record<string, unknown> => ({ __query: args })),
  collectionMock: vi.fn((..._args: unknown[]): Record<string, unknown> => ({ __col: 'contentLinks' })),
  docMock: vi.fn((...args: unknown[]) => ({ path: `${args[1]}/${args[2]}` })),
  whereMock: vi.fn((..._args: unknown[]) => ({ __where: true })),
  orderByMock: vi.fn((..._args: unknown[]) => ({ __orderBy: true })),
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: (...args: unknown[]) => collectionMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => ({ _server: true })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
}))

vi.mock('@/lib/firebase', () => ({ db: { __fakeDb: true } }))

import { contentLinkService } from '../contentLinkService'

// ── Helpers for snapshot simulation ──────────────────────────────────────────

function makeSnapshotDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function fireOnChange(docs: ReturnType<typeof makeSnapshotDoc>[]) {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1]
  const successCallback = call?.[1] as (snap: { docs: typeof docs }) => void
  successCallback?.({ docs })
}

function fireOnError(error: Error) {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1]
  const errorCallback = call?.[2] as (err: Error) => void
  errorCallback?.(error)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('contentLinkService', () => {
  beforeEach(() => {
    addDocMock.mockReset().mockResolvedValue({ id: 'new-id' })
    updateDocMock.mockReset().mockResolvedValue(undefined)
    deleteDocMock.mockReset().mockResolvedValue(undefined)
    onSnapshotMock.mockReset().mockReturnValue(vi.fn())
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    whereMock.mockReset().mockReturnValue({ __where: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
  })

  // ── subscribeToMonth ────────────────────────────────────────────────────

  describe('subscribeToMonth', () => {
    it('calls onSnapshot and returns an unsubscribe function', () => {
      const unsubFn = vi.fn()
      onSnapshotMock.mockReturnValue(unsubFn)
      const unsub = contentLinkService.subscribeToMonth(
        '2026-09-01', '2026-09-30', vi.fn(), vi.fn()
      )
      expect(onSnapshotMock).toHaveBeenCalledOnce()
      expect(unsub).toBe(unsubFn)
    })

    it('maps Firestore docs to ContentLink objects and calls onChange', () => {
      const onChange = vi.fn()
      contentLinkService.subscribeToMonth('2026-09-01', '2026-09-30', onChange, vi.fn())

      fireOnChange([
        makeSnapshotDoc('link-1', {
          date: '2026-09-10',
          label: 'Reel Instagram',
          url: 'https://instagram.com/reel/1',
          createdAt: { toDate: () => new Date('2026-09-01') },
          createdByEmail: 'user@oqupa.com',
        }),
      ])

      expect(onChange).toHaveBeenCalledOnce()
      const links = onChange.mock.calls[0]![0]
      expect(links).toHaveLength(1)
      expect(links[0]!.id).toBe('link-1')
      expect(links[0]!.date).toBe('2026-09-10')
      expect(links[0]!.label).toBe('Reel Instagram')
      expect(links[0]!.url).toBe('https://instagram.com/reel/1')
      expect(links[0]!.createdByEmail).toBe('user@oqupa.com')
    })

    it('calls onError when Firestore fires an error', () => {
      const onError = vi.fn()
      contentLinkService.subscribeToMonth('2026-09-01', '2026-09-30', vi.fn(), onError)
      const error = new Error('permission-denied')
      fireOnError(error)
      expect(onError).toHaveBeenCalledWith(error)
    })

    it('queries with date range and ascending order', () => {
      contentLinkService.subscribeToMonth('2026-09-01', '2026-09-30', vi.fn(), vi.fn())
      expect(whereMock).toHaveBeenCalledWith('date', '>=', '2026-09-01')
      expect(whereMock).toHaveBeenCalledWith('date', '<=', '2026-09-30')
      expect(orderByMock).toHaveBeenCalledWith('date', 'asc')
    })
  })

  // ── subscribeToShelf ────────────────────────────────────────────────────

  describe('subscribeToShelf', () => {
    it('queries for date == null', () => {
      contentLinkService.subscribeToShelf(vi.fn(), vi.fn())
      expect(whereMock).toHaveBeenCalledWith('date', '==', null)
    })

    it('maps shelf docs with null date correctly', () => {
      const onChange = vi.fn()
      contentLinkService.subscribeToShelf(onChange, vi.fn())

      fireOnChange([
        makeSnapshotDoc('shelf-link-1', {
          date: null,
          url: 'https://example.com',
          createdAt: null,
          createdByEmail: 'creator@oqupa.com',
        }),
      ])

      expect(onChange).toHaveBeenCalledOnce()
      const links = onChange.mock.calls[0]![0]
      expect(links[0]!.date).toBeNull()
    })

    it('returns the unsubscribe function', () => {
      const unsubFn = vi.fn()
      onSnapshotMock.mockReturnValue(unsubFn)
      const unsub = contentLinkService.subscribeToShelf(vi.fn(), vi.fn())
      expect(unsub).toBe(unsubFn)
    })
  })

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls addDoc with the given params and serverTimestamp', async () => {
      await contentLinkService.create({
        date: '2026-09-15',
        label: 'TikTok video',
        url: 'https://tiktok.com/v/1',
        createdByEmail: 'editor@oqupa.com',
      })
      expect(addDocMock).toHaveBeenCalledOnce()
      const payload = addDocMock.mock.calls[0]![1]
      expect(payload.date).toBe('2026-09-15')
      expect(payload.label).toBe('TikTok video')
      expect(payload.url).toBe('https://tiktok.com/v/1')
      expect(payload.createdByEmail).toBe('editor@oqupa.com')
      expect(payload.createdAt).toEqual({ _server: true })
    })

    it('creates with null date for shelf items', async () => {
      await contentLinkService.create({
        date: null,
        label: 'Draft video',
        url: 'https://example.com',
        createdByEmail: 'editor@oqupa.com',
      })
      const payload = addDocMock.mock.calls[0]![1]
      expect(payload.date).toBeNull()
    })
  })

  // ── setDate ─────────────────────────────────────────────────────────────

  describe('setDate', () => {
    it('calls updateDoc with the new date', async () => {
      await contentLinkService.setDate('link-1', '2026-10-01')
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(updateDocMock.mock.calls[0]![1]).toEqual({ date: '2026-10-01' })
    })

    it('calls updateDoc with null to move to shelf', async () => {
      await contentLinkService.setDate('link-1', null)
      expect(updateDocMock.mock.calls[0]![1]).toEqual({ date: null })
    })
  })

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('calls updateDoc with label and url', async () => {
      await contentLinkService.update('link-1', { label: 'New Label', url: 'https://new-url.com' })
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(updateDocMock.mock.calls[0]![1]).toEqual({ label: 'New Label', url: 'https://new-url.com' })
    })
  })

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('calls deleteDoc with the link reference', async () => {
      await contentLinkService.remove('link-1')
      expect(deleteDocMock).toHaveBeenCalledOnce()
    })
  })

  // ── docToLink conversion (via subscribeToShelf) ─────────────────────────

  describe('docToLink date handling', () => {
    function getConvertedLink(data: Record<string, unknown>) {
      const onChange = vi.fn()
      contentLinkService.subscribeToShelf(onChange, vi.fn())
      fireOnChange([makeSnapshotDoc('test-id', data)])
      return onChange.mock.calls[0]![0][0] as { date: string | null; label?: string; createdAt: Date; url: string; createdByEmail: string }
    }

    it('uses the string date value as-is', () => {
      const link = getConvertedLink({ date: '2026-09-20', url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.date).toBe('2026-09-20')
    })

    it('treats empty string date as null', () => {
      const link = getConvertedLink({ date: '', url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.date).toBeNull()
    })

    it('treats missing date as null', () => {
      const link = getConvertedLink({ url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.date).toBeNull()
    })

    it('treats null date as null', () => {
      const link = getConvertedLink({ date: null, url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.date).toBeNull()
    })

    it('preserves label when present', () => {
      const link = getConvertedLink({ date: null, label: 'My Label', url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.label).toBe('My Label')
    })

    it('sets label to undefined when not present in doc', () => {
      const link = getConvertedLink({ date: null, url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.label).toBeUndefined()
    })

    it('converts Firestore Timestamp createdAt to Date', () => {
      const expectedDate = new Date('2026-09-01T10:00:00Z')
      const link = getConvertedLink({
        date: null,
        url: 'https://x.com',
        createdAt: { toDate: () => expectedDate },
        createdByEmail: '',
      })
      expect(link.createdAt).toEqual(expectedDate)
    })

    it('falls back to a Date object when createdAt is missing', () => {
      const link = getConvertedLink({ date: null, url: 'https://x.com', createdAt: null, createdByEmail: '' })
      expect(link.createdAt).toBeInstanceOf(Date)
    })

    it('defaults url to empty string when missing', () => {
      const link = getConvertedLink({ date: null, createdAt: null, createdByEmail: '' })
      expect(link.url).toBe('')
    })

    it('passes a Date object through toDate unchanged (instanceof Date branch, line 29)', () => {
      // Exercises line 29: `if (value instanceof Date) return value`
      const dateObj = new Date('2026-09-15T08:00:00Z')
      const link = getConvertedLink({
        date: null,
        url: 'https://x.com',
        createdAt: dateObj, // already a Date — not a Firestore Timestamp
        createdByEmail: '',
      })
      expect(link.createdAt).toBe(dateObj)
    })

    it('returns null from toDate when object has no toDate method (line 31 false branch)', () => {
      // Exercises line 31: `typeof ts.toDate === 'function' ? ts.toDate() : null`
      // When the object exists but has no toDate(), toDate() returns null → ?? new Date() fires
      const link = getConvertedLink({
        date: null,
        url: 'https://x.com',
        createdAt: { notATimestamp: true }, // object without toDate()
        createdByEmail: '',
      })
      // toDate() returned null, so the ?? new Date() fallback fires
      expect(link.createdAt).toBeInstanceOf(Date)
    })

    it('defaults createdByEmail to empty string when missing (line 47 ?? "" branch)', () => {
      const link = getConvertedLink({ date: null, url: 'https://x.com', createdAt: null })
      // createdByEmail omitted — String(undefined ?? '') → ''
      expect(link.createdByEmail).toBe('')
    })
  })
})
