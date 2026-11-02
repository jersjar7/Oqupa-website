// @vitest-environment jsdom
// ADR-046 #1: the website reads and writes the app's Guardados store,
// users/{uid}/favorites, with exactly the app's document shape
// (favorites_firestore_datasource.dart): id "{uid}_{listingId}",
// { listingId, createdAt: Timestamp }.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fs = vi.hoisted(() => {
  const batches: { ops: unknown[][]; commit: ReturnType<typeof vi.fn> }[] = []
  return {
    batches,
    setDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    getDocs: vi.fn(async () => ({ docs: [] as unknown[] })),
    onSnapshot: vi.fn((..._a: unknown[]) => () => {}),
    writeBatch: vi.fn(() => {
      const b = { ops: [] as unknown[][], commit: vi.fn(async () => {}) }
      batches.push(b)
      return {
        set: (...a: unknown[]) => { b.ops.push(['set', ...a]) },
        update: (...a: unknown[]) => { b.ops.push(['update', ...a]) },
        commit: b.commit,
      }
    }),
  }
})
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  setDoc: fs.setDoc,
  deleteDoc: fs.deleteDoc,
  getDocs: fs.getDocs,
  onSnapshot: fs.onSnapshot,
  writeBatch: fs.writeBatch,
  serverTimestamp: () => 'SERVER_TS',
  arrayUnion: (...ids: string[]) => ({ arrayUnion: ids }),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import { favoritesService, favoriteDocId } from '../favoritesService'

beforeEach(() => {
  vi.clearAllMocks()
  fs.batches.length = 0
})

describe('favoritesService — the app’s shape', () => {
  it('a save is users/{uid}/favorites/{uid}_{listingId} with listingId and createdAt only', async () => {
    await favoritesService.add('u1', 'L1')
    expect(fs.setDoc).toHaveBeenCalledWith(
      { path: 'users/u1/favorites/u1_L1' },
      { listingId: 'L1', createdAt: 'SERVER_TS' },
    )
    expect(favoriteDocId('u1', 'L1')).toBe('u1_L1')
  })

  it('un-saving deletes that document', async () => {
    await favoritesService.remove('u1', 'L1')
    expect(fs.deleteDoc).toHaveBeenCalledWith({ path: 'users/u1/favorites/u1_L1' })
  })

  it('reads the listing ids, newest first, skipping documents the app could not read either', () => {
    const cb = vi.fn()
    favoritesService.subscribe('u1', cb, vi.fn())
    const [ref, onNext] = fs.onSnapshot.mock.calls[0] as unknown as [{ path: string }, (s: unknown) => void]
    expect(ref.path).toBe('users/u1/favorites')
    const ts = (ms: number) => ({ toMillis: () => ms })
    onNext({
      docs: [
        { data: () => ({ listingId: 'old', createdAt: ts(1) }) },
        { data: () => ({ listingId: 'new', createdAt: ts(3) }) },
        { data: () => ({ createdAt: ts(2) }) },
      ],
    })
    expect(cb).toHaveBeenCalledWith(['new', 'old'])
  })

  it('a failed read is reported', () => {
    const onError = vi.fn()
    favoritesService.subscribe('u1', vi.fn(), onError)
    const onErr = (fs.onSnapshot.mock.calls[0] as unknown[])[2] as (e: Error) => void
    onErr(new Error('permission-denied'))
    expect(onError).toHaveBeenCalled()
  })

  it('device saves move in one write, the app’s shape, no marker (they are new saves)', async () => {
    await favoritesService.addMany('u1', ['a', 'b'])
    expect(fs.batches).toHaveLength(1)
    expect(fs.batches[0]!.ops).toEqual([
      ['set', { path: 'users/u1/favorites/u1_a' }, { listingId: 'a', createdAt: 'SERVER_TS' }],
      ['set', { path: 'users/u1/favorites/u1_b' }, { listingId: 'b', createdAt: 'SERVER_TS' }],
    ])
    expect(fs.batches[0]!.commit).toHaveBeenCalled()
  })
})

describe('favoritesService.moveListsIn — the one-time move from the old named lists', () => {
  function listsAre(docs: { id: string; data: Record<string, unknown> }[]) {
    fs.getDocs.mockResolvedValueOnce({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) })
  }

  it('writes each save with the marker the owner notification skips, and marks the list in the same write', async () => {
    listsAre([{ id: 'guardados', data: { name: 'Guardados', listingIds: ['a', 'b'] } }])
    const moved = await favoritesService.moveListsIn('u1', new Set(['a']))
    expect(moved).toBe(1)
    expect(fs.batches).toHaveLength(1)
    expect(fs.batches[0]!.ops).toEqual([
      ['set', { path: 'users/u1/favorites/u1_b' }, { listingId: 'b', createdAt: 'SERVER_TS', migratedFrom: 'lists' }],
      ['update', { path: 'users/u1/lists/guardados' }, { migratedListingIds: { arrayUnion: ['a', 'b'] } }],
    ])
    expect(fs.batches[0]!.commit).toHaveBeenCalled()
  })

  it('never deletes the old lists', async () => {
    listsAre([{ id: 'guardados', data: { listingIds: ['a'] } }])
    await favoritesService.moveListsIn('u1', new Set())
    expect(fs.deleteDoc).not.toHaveBeenCalled()
  })

  it('already moved: no write at all', async () => {
    listsAre([{ id: 'guardados', data: { listingIds: ['a'], migratedListingIds: ['a'] } }])
    expect(await favoritesService.moveListsIn('u1', new Set())).toBe(0)
    expect(fs.batches).toHaveLength(0)
  })

  it('a big list is split into writes Firestore accepts (≤ 500 operations each)', async () => {
    const ids = Array.from({ length: 900 }, (_, i) => `l${i}`)
    listsAre([{ id: 'g', data: { listingIds: ids } }])
    expect(await favoritesService.moveListsIn('u1', new Set())).toBe(900)
    expect(fs.batches.length).toBeGreaterThan(1)
    for (const b of fs.batches) expect(b.ops.length).toBeLessThanOrEqual(500)
    // Every write that marks saves as moved also carries those saves.
    for (const b of fs.batches) {
      const written = b.ops.filter((o) => o[0] === 'set').map((o) => (o[2] as { listingId: string }).listingId)
      const marked = (b.ops.find((o) => o[0] === 'update')![2] as { migratedListingIds: { arrayUnion: string[] } }).migratedListingIds.arrayUnion
      expect(marked).toEqual(written)
    }
  })

  it('a failed write is thrown, so the next sign-in tries again', async () => {
    listsAre([{ id: 'g', data: { listingIds: ['a'] } }])
    fs.writeBatch.mockImplementationOnce(() => ({ set: () => {}, update: () => {}, commit: async () => { throw new Error('offline') } }) as never)
    await expect(favoritesService.moveListsIn('u1', new Set())).rejects.toThrow('offline')
  })
})
