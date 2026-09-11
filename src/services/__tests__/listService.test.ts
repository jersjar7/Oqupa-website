// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  addDocMock, updateDocMock, deleteDocMock, onSnapshotMock,
  queryMock, collectionMock, docMock, orderByMock,
  arrayUnionMock, arrayRemoveMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn().mockResolvedValue({ id: 'new-list-id' }),
  updateDocMock: vi.fn().mockResolvedValue(undefined),
  deleteDocMock: vi.fn().mockResolvedValue(undefined),
  onSnapshotMock: vi.fn(() => vi.fn()),
  queryMock: vi.fn((...args: unknown[]) => ({ __query: args })),
  collectionMock: vi.fn(() => ({ __col: 'lists' })),
  docMock: vi.fn((_db: unknown, ...parts: string[]) => ({ path: parts.join('/') })),
  orderByMock: vi.fn(() => ({ __orderBy: true })),
  arrayUnionMock: vi.fn((val: unknown) => ({ __arrayUnion: val })),
  arrayRemoveMock: vi.fn((val: unknown) => ({ __arrayRemove: val })),
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
  arrayUnion: (...args: unknown[]) => arrayUnionMock(...args),
  arrayRemove: (...args: unknown[]) => arrayRemoveMock(...args),
}))

vi.mock('@/lib/firebase', () => ({ db: { __fakeDb: true } }))

import { listService } from '../listService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshotDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function fireOnChange(docs: ReturnType<typeof makeSnapshotDoc>[]) {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1]
  const successCallback = call?.[1] as (snap: { docs: typeof docs }) => void
  successCallback?.({ docs })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('listService', () => {
  beforeEach(() => {
    addDocMock.mockReset().mockResolvedValue({ id: 'new-list-id' })
    updateDocMock.mockReset().mockResolvedValue(undefined)
    deleteDocMock.mockReset().mockResolvedValue(undefined)
    onSnapshotMock.mockReset().mockReturnValue(vi.fn())
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
    arrayUnionMock.mockReset().mockImplementation((val: unknown) => ({ __arrayUnion: val }))
    arrayRemoveMock.mockReset().mockImplementation((val: unknown) => ({ __arrayRemove: val }))
  })

  // ── subscribe ───────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const unsubFn = vi.fn()
      onSnapshotMock.mockReturnValue(unsubFn)
      const unsub = listService.subscribe('uid-123', vi.fn())
      expect(unsub).toBe(unsubFn)
    })

    it('orders lists by createdAt ascending', () => {
      listService.subscribe('uid-123', vi.fn())
      expect(orderByMock).toHaveBeenCalledWith('createdAt', 'asc')
    })

    it('passes the uid to the collection path', () => {
      listService.subscribe('uid-abc', vi.fn())
      expect(collectionMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-abc',
        'lists',
      )
    })

    it('maps Firestore docs to UserList objects and calls callback', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-1', {
          name: 'Favoritos',
          listingIds: ['listing-a', 'listing-b'],
          isDefault: true,
          createdAt: { toDate: () => new Date('2026-09-01') },
        }),
      ])

      expect(callback).toHaveBeenCalledOnce()
      const lists = callback.mock.calls[0][0]
      expect(lists).toHaveLength(1)
      expect(lists[0].id).toBe('list-1')
      expect(lists[0].name).toBe('Favoritos')
      expect(lists[0].listingIds).toEqual(['listing-a', 'listing-b'])
      expect(lists[0].isDefault).toBe(true)
    })

    it('converts Firestore Timestamp createdAt to a Date', () => {
      const expectedDate = new Date('2026-08-15T10:00:00Z')
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-2', {
          name: 'Mi lista',
          listingIds: [],
          isDefault: false,
          createdAt: { toDate: () => expectedDate },
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists[0].createdAt).toEqual(expectedDate)
    })

    it('falls back to new Date() when createdAt is missing', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-3', {
          name: 'Sin fecha',
          listingIds: [],
          isDefault: false,
          createdAt: null,
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists[0].createdAt).toBeInstanceOf(Date)
    })

    it('falls back to "Lista" when name is missing', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-4', {
          listingIds: [],
          isDefault: false,
          createdAt: null,
          // name intentionally omitted
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists[0].name).toBe('Lista')
    })

    it('falls back to empty array when listingIds is missing', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-5', {
          name: 'Mi lista',
          isDefault: false,
          createdAt: null,
          // listingIds intentionally omitted
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists[0].listingIds).toEqual([])
    })

    it('falls back to false for isDefault when missing', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-6', {
          name: 'Mi lista',
          listingIds: [],
          createdAt: null,
          // isDefault intentionally omitted
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists[0].isDefault).toBe(false)
    })

    it('maps multiple docs correctly', () => {
      const callback = vi.fn()
      listService.subscribe('uid-123', callback)

      fireOnChange([
        makeSnapshotDoc('list-a', {
          name: 'Lista A',
          listingIds: [],
          isDefault: true,
          createdAt: null,
        }),
        makeSnapshotDoc('list-b', {
          name: 'Lista B',
          listingIds: ['p1'],
          isDefault: false,
          createdAt: null,
        }),
      ])

      const lists = callback.mock.calls[0][0]
      expect(lists).toHaveLength(2)
      expect(lists[0].id).toBe('list-a')
      expect(lists[1].id).toBe('list-b')
    })
  })

  // ── createList ──────────────────────────────────────────────────────────

  describe('createList', () => {
    it('calls addDoc with name, empty listingIds, serverTimestamp, and isDefault=false by default', async () => {
      await listService.createList('uid-123', 'Mis favoritos')
      expect(addDocMock).toHaveBeenCalledOnce()
      const payload = addDocMock.mock.calls[0][1]
      expect(payload.name).toBe('Mis favoritos')
      expect(payload.listingIds).toEqual([])
      expect(payload.isDefault).toBe(false)
      expect(payload.createdAt).toEqual({ _server: true })
    })

    it('creates with isDefault=true when specified', async () => {
      await listService.createList('uid-123', 'Default list', true)
      const payload = addDocMock.mock.calls[0][1]
      expect(payload.isDefault).toBe(true)
    })

    it('returns the new document id', async () => {
      addDocMock.mockResolvedValue({ id: 'created-list-id' })
      const id = await listService.createList('uid-123', 'Nueva lista')
      expect(id).toBe('created-list-id')
    })

    it('passes the uid-scoped collection reference', async () => {
      await listService.createList('uid-xyz', 'Lista')
      expect(collectionMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-xyz',
        'lists',
      )
    })
  })

  // ── deleteList ──────────────────────────────────────────────────────────

  describe('deleteList', () => {
    it('calls deleteDoc for the given uid and listId', async () => {
      await listService.deleteList('uid-123', 'list-to-delete')
      expect(deleteDocMock).toHaveBeenCalledOnce()
    })

    it('builds the correct doc reference path', async () => {
      await listService.deleteList('uid-abc', 'list-xyz')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-abc',
        'lists',
        'list-xyz',
      )
    })
  })

  // ── renameList ──────────────────────────────────────────────────────────

  describe('renameList', () => {
    it('calls updateDoc with the new name', async () => {
      await listService.renameList('uid-123', 'list-1', 'Nuevo nombre')
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(updateDocMock.mock.calls[0][1]).toEqual({ name: 'Nuevo nombre' })
    })

    it('builds the correct doc reference path', async () => {
      await listService.renameList('uid-abc', 'list-xyz', 'New name')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-abc',
        'lists',
        'list-xyz',
      )
    })
  })

  // ── addListing ──────────────────────────────────────────────────────────

  describe('addListing', () => {
    it('calls updateDoc with arrayUnion for the listingId', async () => {
      await listService.addListing('uid-123', 'list-1', 'listing-abc')
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(arrayUnionMock).toHaveBeenCalledWith('listing-abc')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.listingIds).toEqual({ __arrayUnion: 'listing-abc' })
    })

    it('builds the correct doc reference path', async () => {
      await listService.addListing('uid-abc', 'list-xyz', 'listing-123')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-abc',
        'lists',
        'list-xyz',
      )
    })
  })

  // ── removeListing ───────────────────────────────────────────────────────

  describe('removeListing', () => {
    it('calls updateDoc with arrayRemove for the listingId', async () => {
      await listService.removeListing('uid-123', 'list-1', 'listing-abc')
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(arrayRemoveMock).toHaveBeenCalledWith('listing-abc')
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.listingIds).toEqual({ __arrayRemove: 'listing-abc' })
    })

    it('builds the correct doc reference path', async () => {
      await listService.removeListing('uid-abc', 'list-xyz', 'listing-789')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'uid-abc',
        'lists',
        'list-xyz',
      )
    })
  })
})
