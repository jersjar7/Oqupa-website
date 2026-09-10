import { describe, it, expect, vi } from 'vitest'

// listService is Firebase-backed; mock it so the module can be imported
// without initialising Firebase. The pure-function exports are what we test.
vi.mock('@/services/listService', () => ({
  listService: {
    subscribe: vi.fn(() => () => {}),
  },
}))

import { isSavedInAnyList, getListsContaining } from '../listStore'
import type { UserList } from '@/types/userList'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function list(id: string, listingIds: string[]): UserList {
  return {
    id,
    name: `List ${id}`,
    listingIds,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserList
}

const favs = list('favs', ['listing-a', 'listing-b'])
const work = list('work', ['listing-c'])
const empty = list('empty', [])

// ---------------------------------------------------------------------------
// isSavedInAnyList
// ---------------------------------------------------------------------------
describe('isSavedInAnyList', () => {
  it('returns true when the listing is in one of the lists', () => {
    expect(isSavedInAnyList([favs, work], 'listing-a')).toBe(true)
  })

  it('returns true when the listing is in the second list', () => {
    expect(isSavedInAnyList([favs, work], 'listing-c')).toBe(true)
  })

  it('returns false when the listing is in none of the lists', () => {
    expect(isSavedInAnyList([favs, work], 'listing-z')).toBe(false)
  })

  it('returns false for an empty lists array', () => {
    expect(isSavedInAnyList([], 'listing-a')).toBe(false)
  })

  it('returns false when all lists are empty', () => {
    expect(isSavedInAnyList([empty], 'listing-a')).toBe(false)
  })

  it('handles multiple lists each containing the same id', () => {
    const dup = list('dup', ['listing-a'])
    expect(isSavedInAnyList([favs, dup], 'listing-a')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getListsContaining
// ---------------------------------------------------------------------------
describe('getListsContaining', () => {
  it('returns the list that contains the listing id', () => {
    const result = getListsContaining([favs, work], 'listing-a')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('favs')
  })

  it('returns multiple lists when both contain the id', () => {
    const dup = list('dup', ['listing-a'])
    const result = getListsContaining([favs, dup], 'listing-a')
    expect(result).toHaveLength(2)
  })

  it('returns an empty array when no list contains the id', () => {
    expect(getListsContaining([favs, work], 'listing-z')).toHaveLength(0)
  })

  it('returns an empty array for an empty lists input', () => {
    expect(getListsContaining([], 'listing-a')).toHaveLength(0)
  })

  it('does not include lists that do not contain the id', () => {
    const result = getListsContaining([favs, work], 'listing-b')
    expect(result.every((l) => l.id !== 'work')).toBe(true)
  })

  it('returns all lists when each list contains the id', () => {
    const a = list('a', ['listing-x'])
    const b = list('b', ['listing-x'])
    const result = getListsContaining([a, b], 'listing-x')
    expect(result).toHaveLength(2)
  })
})
