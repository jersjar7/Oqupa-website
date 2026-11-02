// @vitest-environment jsdom
// Signed in, the account's Guardados (users/{uid}/favorites — the app's store,
// ADR-046 #1) is read live. Once it has arrived:
// - a visitor's device saves move in (Guardados sin cuenta, 2026-10-25) —
//   only for a fully set-up account; before it arrives, nothing moves;
// - the website's old named lists move in, once per sign-in, never deleted.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import GuardadosInitializer from '../GuardadosInitializer'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

const auth = vi.hoisted(() => ({ firebaseUser: null as unknown, user: null as unknown }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: typeof auth) => unknown) => sel(auth) }))
const svc = vi.hoisted(() => ({
  emit: null as null | ((ids: string[]) => void),
  addMany: vi.fn(async () => {}),
  moveListsIn: vi.fn(async () => 0),
}))
vi.mock('@/services/favoritesService', () => ({
  favoritesService: {
    subscribe: (_uid: string, cb: (ids: string[]) => void) => { svc.emit = cb; return () => {} },
    addMany: svc.addMany,
    moveListsIn: svc.moveListsIn,
  },
}))

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  svc.moveListsIn.mockResolvedValue(0)
  useFavoritesStore.getState().reset()
  useDeviceSavesStore.setState({ ids: ['a', 'b'], nudgeOpen: false })
  auth.firebaseUser = { uid: 'u1', emailVerified: true }
  auth.user = { name: 'Ana', isPhoneVerified: true }
})

describe('GuardadosInitializer — device saves', () => {
  it('waits for Guardados to arrive, then moves the device saves in and clears them', async () => {
    render(<GuardadosInitializer />)
    expect(svc.addMany).not.toHaveBeenCalled()
    await act(async () => { svc.emit!(['a']) })
    expect(svc.addMany).toHaveBeenCalledWith('u1', ['b'])
    expect(useDeviceSavesStore.getState().ids).toEqual([])
  })
  it('a visitor: nothing moves', () => {
    auth.firebaseUser = null
    render(<GuardadosInitializer />)
    expect(svc.addMany).not.toHaveBeenCalled()
    expect(svc.moveListsIn).not.toHaveBeenCalled()
    expect(useDeviceSavesStore.getState().ids).toEqual(['a', 'b'])
  })
  it('an account still being set up: the device saves stay in the browser', async () => {
    auth.user = { name: 'Ana', isPhoneVerified: false }
    render(<GuardadosInitializer />)
    await act(async () => { svc.emit!([]) })
    expect(svc.addMany).not.toHaveBeenCalled()
    expect(useDeviceSavesStore.getState().ids).toEqual(['a', 'b'])
  })
})

describe('GuardadosInitializer — the old lists move in (ADR-046 #1)', () => {
  it('after Guardados arrives, once, told what is already saved', async () => {
    useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
    render(<GuardadosInitializer />)
    expect(svc.moveListsIn).not.toHaveBeenCalled()
    await act(async () => { svc.emit!(['x']) })
    expect(svc.moveListsIn).toHaveBeenCalledTimes(1)
    expect(svc.moveListsIn).toHaveBeenCalledWith('u1', new Set(['x']))
    // Later changes (a save, an un-save) do not run it again.
    await act(async () => { svc.emit!(['x', 'y']) })
    await act(async () => { svc.emit!([]) })
    expect(svc.moveListsIn).toHaveBeenCalledTimes(1)
  })
  it('a failed move is tried again at the next sign-in, and never breaks the page', async () => {
    useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
    svc.moveListsIn.mockRejectedValueOnce(new Error('offline'))
    const { unmount } = render(<GuardadosInitializer />)
    await act(async () => { svc.emit!([]) })
    unmount()
    useFavoritesStore.getState().reset()
    render(<GuardadosInitializer />)
    await act(async () => { svc.emit!([]) })
    expect(svc.moveListsIn).toHaveBeenCalledTimes(2)
  })
})
