import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { act } from '@testing-library/react'

// ── Firebase mocks ──────────────────────────────────────────────────────────

let authStateCallback: ((user: unknown) => void) | null = null
let authStateReadyResolve: (() => void) | null = null

const mockAuth = {
  currentUser: null as unknown,
  authStateReady: vi.fn(() => new Promise<void>((resolve) => {
    authStateReadyResolve = resolve
  })),
}

const mockOnAuthStateChanged = vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
  authStateCallback = cb
  return vi.fn() // unsubscribe
})

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args as [unknown, (user: unknown) => void]),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, _collection: string, id: string) => ({ path: `users/${id}` })),
  getDoc: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  db: {},
}))

// ── BroadcastChannel mock ───────────────────────────────────────────────────

const channelMessages: { type: string }[] = []
let channelMessageHandler: ((event: { data: unknown }) => void) | null = null

class MockBroadcastChannel {
  name: string
  constructor(name: string) {
    this.name = name
  }
  postMessage(data: unknown) {
    channelMessages.push(data as { type: string })
  }
  addEventListener(_event: string, handler: (event: { data: unknown }) => void) {
    channelMessageHandler = handler
  }
  removeEventListener() {}
  close() {}
}

// Must be set before importing the store
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)

// ── Import store after mocks ────────────────────────────────────────────────

// Dynamic import so mocks are in place first
const { useAuthStore } = await import('../authStore')
const { getDoc } = await import('firebase/firestore')

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFirebaseUser(uid: string) {
  return { uid, email: `${uid}@test.com` }
}

function makeFirestoreDoc(exists: boolean, data?: Record<string, unknown>) {
  return {
    exists: () => exists,
    data: () => data ?? {},
  }
}

// Resolves authStateReady and flushes microtasks
async function resolveAuthStateReady() {
  await act(async () => {
    authStateReadyResolve?.()
    await new Promise((r) => setTimeout(r, 0))
  })
}

// Fires the onAuthStateChanged callback and flushes microtasks
async function fireAuthStateChanged(user: unknown) {
  await act(async () => {
    authStateCallback?.(user)
    await new Promise((r) => setTimeout(r, 0))
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.getState().reset()
    authStateCallback = null
    authStateReadyResolve = null
    channelMessages.length = 0
    channelMessageHandler = null
    mockOnAuthStateChanged.mockClear()
    mockAuth.authStateReady.mockClear()
    mockAuth.currentUser = null
    mockAuth.authStateReady.mockImplementation(() => new Promise<void>((resolve) => {
      authStateReadyResolve = resolve
    }))
    ;(getDoc as Mock).mockReset()
  })

  // ── Initialization ──────────────────────────────────────────────────────

  describe('initialize', () => {
    it('starts in uninitialized state after reset', () => {
      const state = useAuthStore.getState()
      // After reset: isLoading=false, isInitialized=false
      // GuestGuard/AuthGuard check !isInitialized to show spinner
      expect(state.isInitialized).toBe(false)
      expect(state.firebaseUser).toBeNull()
      expect(state.user).toBeNull()
    })

    it('waits for authStateReady before subscribing to onAuthStateChanged', () => {
      useAuthStore.getState().initialize()

      // authStateReady called, but onAuthStateChanged NOT yet called
      expect(mockAuth.authStateReady).toHaveBeenCalledOnce()
      expect(mockOnAuthStateChanged).not.toHaveBeenCalled()
    })

    it('subscribes to onAuthStateChanged only after authStateReady resolves', async () => {
      useAuthStore.getState().initialize()

      expect(mockOnAuthStateChanged).not.toHaveBeenCalled()

      await resolveAuthStateReady()

      expect(mockOnAuthStateChanged).toHaveBeenCalledOnce()
    })

    it('prevents double-initialization', async () => {
      useAuthStore.getState().initialize()
      await resolveAuthStateReady()

      // Second call should be a no-op
      useAuthStore.getState().initialize()

      expect(mockOnAuthStateChanged).toHaveBeenCalledOnce()
    })
  })

  // ── authStateReady gate (core fix for cross-tab persistence) ────────────

  describe('authStateReady gate', () => {
    it('does NOT fire onAuthStateChanged with null before IndexedDB loads', async () => {
      useAuthStore.getState().initialize()

      // Before authStateReady resolves, state should still be uninitialized
      const stateBefore = useAuthStore.getState()
      expect(stateBefore.isInitialized).toBe(false)
      expect(stateBefore.firebaseUser).toBeNull()

      // onAuthStateChanged hasn't been called, so no premature null
      expect(authStateCallback).toBeNull()
    })

    it('first callback after authStateReady has the correct persisted user', async () => {
      const mockUser = makeFirebaseUser('persisted-uid')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, {
          email: 'persisted@test.com',
          isPhoneVerified: true,
          isActive: true,
        })
      )

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()

      // Simulate Firebase calling back with persisted user (not null)
      await fireAuthStateChanged(mockUser)

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBe(mockUser)
      expect(state.user?.email).toBe('persisted@test.com')
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })
  })

  // ── Authenticated user flow ─────────────────────────────────────────────

  describe('authenticated user', () => {
    it('loads Firestore user doc when firebase user exists', async () => {
      const fbUser = makeFirebaseUser('uid-123')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, {
          email: 'user@test.com',
          name: 'Test User',
          isPhoneVerified: true,
          isActive: true,
        })
      )

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBe(fbUser)
      expect(state.user).not.toBeNull()
      expect(state.user?.id).toBe('uid-123')
      expect(state.user?.name).toBe('Test User')
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('handles missing Firestore doc (mid-registration)', async () => {
      const fbUser = makeFirebaseUser('new-uid')
      ;(getDoc as Mock).mockResolvedValueOnce(makeFirestoreDoc(false))

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBe(fbUser)
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })

    it('handles Firestore fetch error gracefully', async () => {
      const fbUser = makeFirebaseUser('error-uid')
      ;(getDoc as Mock).mockRejectedValueOnce(new Error('Network error'))

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })
  })

  // ── Unauthenticated user flow ───────────────────────────────────────────

  describe('unauthenticated user', () => {
    it('sets null state when no user is signed in', async () => {
      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(null)

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(true)
    })
  })

  // ── BroadcastChannel cross-tab sync ─────────────────────────────────────

  describe('BroadcastChannel cross-tab sync', () => {
    it('posts logout message when user signs out', async () => {
      useAuthStore.getState().initialize()
      await resolveAuthStateReady()

      // User signs out -> callback fires with null
      await fireAuthStateChanged(null)

      expect(channelMessages).toContainEqual({ type: 'logout' })
    })

    it('does NOT post logout message when user signs in', async () => {
      const fbUser = makeFirebaseUser('uid-123')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, { email: 'test@test.com', isActive: true })
      )

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      expect(channelMessages).not.toContainEqual({ type: 'logout' })
    })

    it('clears state when receiving logout message from another tab', async () => {
      const fbUser = makeFirebaseUser('uid-123')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, { email: 'test@test.com', isActive: true })
      )

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      // Verify user is signed in
      expect(useAuthStore.getState().firebaseUser).toBe(fbUser)

      // Simulate logout message from another tab
      mockAuth.currentUser = null
      // authStateReady for the channel handler needs to resolve immediately
      mockAuth.authStateReady.mockResolvedValueOnce(undefined)

      await act(async () => {
        channelMessageHandler?.({ data: { type: 'logout' } })
        await new Promise((r) => setTimeout(r, 0))
      })

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isInitialized).toBe(true)
    })

    it('ignores logout message if user is still signed in locally', async () => {
      const fbUser = makeFirebaseUser('uid-123')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, { email: 'test@test.com', isActive: true })
      )

      useAuthStore.getState().initialize()
      await resolveAuthStateReady()
      await fireAuthStateChanged(fbUser)

      // Simulate logout message, but auth.currentUser still exists
      mockAuth.currentUser = fbUser
      mockAuth.authStateReady.mockResolvedValueOnce(undefined)

      await act(async () => {
        channelMessageHandler?.({ data: { type: 'logout' } })
        await new Promise((r) => setTimeout(r, 0))
      })

      // User should still be signed in
      expect(useAuthStore.getState().firebaseUser).toBe(fbUser)
    })

    it('ignores non-logout messages from BroadcastChannel', async () => {
      useAuthStore.getState().initialize()
      await resolveAuthStateReady()

      // Set up a known state
      await fireAuthStateChanged(null)
      const stateBefore = { ...useAuthStore.getState() }

      await act(async () => {
        channelMessageHandler?.({ data: { type: 'unknown-event' } })
        await new Promise((r) => setTimeout(r, 0))
      })

      const stateAfter = useAuthStore.getState()
      expect(stateAfter.firebaseUser).toBe(stateBefore.firebaseUser)
      expect(stateAfter.isInitialized).toBe(stateBefore.isInitialized)
    })
  })

  // ── Reset ───────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all state and unsubscribes', async () => {
      useAuthStore.getState().initialize()
      await resolveAuthStateReady()

      const fbUser = makeFirebaseUser('uid-123')
      ;(getDoc as Mock).mockResolvedValueOnce(
        makeFirestoreDoc(true, { email: 'test@test.com', isActive: true })
      )
      await fireAuthStateChanged(fbUser)

      // Verify user is set
      expect(useAuthStore.getState().firebaseUser).toBe(fbUser)

      useAuthStore.getState().reset()

      const state = useAuthStore.getState()
      expect(state.firebaseUser).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isInitialized).toBe(false)
      expect(state._unsubscribe).toBeNull()
    })
  })
})
