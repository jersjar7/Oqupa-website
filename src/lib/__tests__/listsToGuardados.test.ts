// ADR-046 #1: one Guardados store for the app and the website — the app's
// users/{uid}/favorites. The website's old named lists (users/{uid}/lists)
// move in on sign-in. The plan decides, per list, which saves still need to
// move. It never loses a save, never moves one twice, and never brings back a
// save the person removed after it moved.
import { describe, it, expect } from 'vitest'
import { planListsMove } from '../listsToGuardados'

describe('planListsMove', () => {
  it('nothing in the lists: nothing to do', () => {
    expect(planListsMove([], new Set())).toEqual([])
    expect(planListsMove([{ id: 'g', listingIds: [], movedListingIds: [] }], new Set())).toEqual([])
  })

  it('every listing in every list moves, once, even when two lists hold the same one', () => {
    const plan = planListsMove(
      [
        { id: 'g', listingIds: ['a', 'b'], movedListingIds: [] },
        { id: 'playa', listingIds: ['b', 'c'], movedListingIds: [] },
      ],
      new Set(),
    )
    expect(plan).toEqual([
      { listId: 'g', write: ['a', 'b'], mark: ['a', 'b'] },
      { listId: 'playa', write: ['c'], mark: ['b', 'c'] },
    ])
  })

  it('a listing already in Guardados (saved on the app) is not written again, only marked', () => {
    const plan = planListsMove([{ id: 'g', listingIds: ['a', 'b'], movedListingIds: [] }], new Set(['a']))
    expect(plan).toEqual([{ listId: 'g', write: ['b'], mark: ['a', 'b'] }])
  })

  it('already moved: nothing to do — a save removed after the move does not come back', () => {
    const plan = planListsMove([{ id: 'g', listingIds: ['a', 'b'], movedListingIds: ['a', 'b'] }], new Set(['b']))
    expect(plan).toEqual([])
  })

  it('a listing added to a list after the move (an old open tab) still moves', () => {
    const plan = planListsMove([{ id: 'g', listingIds: ['a', 'n'], movedListingIds: ['a'] }], new Set())
    expect(plan).toEqual([{ listId: 'g', write: ['n'], mark: ['n'] }])
  })

  it('ignores values that cannot be a listing id', () => {
    const plan = planListsMove(
      [{ id: 'g', listingIds: ['a', '', 'x/y', 7 as unknown as string], movedListingIds: [] }],
      new Set(),
    )
    expect(plan).toEqual([{ listId: 'g', write: ['a'], mark: ['a'] }])
  })
})
