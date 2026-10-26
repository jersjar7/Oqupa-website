// @vitest-environment jsdom
// On sign-in, a visitor's device saves move into Guardados — but only after
// the account's lists have arrived: before that, "no lists" would create a
// second Guardados (Guardados sin cuenta, 2026-10-25).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import ListStoreInitializer from '../ListStoreInitializer'
import { useListStore } from '@/stores/listStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

const auth = vi.hoisted(() => ({ firebaseUser: null as unknown, user: null as unknown }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: typeof auth) => unknown) => sel(auth) }))
const svc = vi.hoisted(() => ({
  emit: null as null | ((lists: unknown[]) => void),
  ensureDefaultList: vi.fn(async () => 'guardados'),
  addListings: vi.fn(async () => {}),
}))
vi.mock('@/services/listService', () => ({
  listService: {
    subscribe: (_uid: string, cb: (lists: unknown[]) => void) => { svc.emit = cb; return () => {} },
    ensureDefaultList: svc.ensureDefaultList,
    addListings: svc.addListings,
  },
}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  useListStore.getState().reset()
  useDeviceSavesStore.setState({ ids: ['a', 'b'], nudgeOpen: false })
  auth.firebaseUser = { uid: 'u1', emailVerified: true }
  auth.user = { name: 'Ana', isPhoneVerified: true }
})

describe('ListStoreInitializer', () => {
  it('waits for the lists, then moves the device saves into the default list and clears them', async () => {
    render(<ListStoreInitializer />)
    expect(svc.addListings).not.toHaveBeenCalled()
    await act(async () => {
      svc.emit!([{ id: 'g', name: 'Guardados', listingIds: [], isDefault: true, createdAt: new Date() }])
    })
    expect(svc.ensureDefaultList).not.toHaveBeenCalled()
    expect(svc.addListings).toHaveBeenCalledWith('u1', 'g', ['a', 'b'])
    expect(useDeviceSavesStore.getState().ids).toEqual([])
  })
  it('a visitor: nothing moves', () => {
    auth.firebaseUser = null
    render(<ListStoreInitializer />)
    expect(svc.addListings).not.toHaveBeenCalled()
    expect(useDeviceSavesStore.getState().ids).toEqual(['a', 'b'])
  })
  it('an account still being set up: the saves stay in the browser', async () => {
    auth.user = { name: 'Ana', isPhoneVerified: false }
    render(<ListStoreInitializer />)
    await act(async () => { svc.emit!([]) })
    expect(svc.addListings).not.toHaveBeenCalled()
    expect(useDeviceSavesStore.getState().ids).toEqual(['a', 'b'])
  })
})
