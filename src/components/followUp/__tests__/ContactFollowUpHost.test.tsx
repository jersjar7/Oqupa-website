// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'

// The website's triggers for the A11b card — the web version of the app's
// ContactFollowUpListener: sign-in / page load, coming back to the Oqupa tab
// (visibility, focus, back from wa.me), and a page change while an ask is owed.

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ analytics: {} }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: { followUpShown: vi.fn(), followUpAnswered: vi.fn() } }))

const auth = vi.hoisted(() => ({
  state: {
    firebaseUser: null as null | { uid: string; emailVerified: boolean },
    user: null as null | { id: string; name?: string; isPhoneVerified?: boolean },
    isInitialized: true,
  },
}))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: <T,>(selector: (s: typeof auth.state) => T) => selector(auth.state),
}))

import ContactFollowUpHost from '../ContactFollowUpHost'
import type { ContactFollowUpCoordinator, FollowUpSession } from '@/lib/contactFollowUpCoordinator'
import type { DueFollowUpCard } from '@/services/contactFollowUpService'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

function fakeCoordinator() {
  return {
    canPresentNow: () => false,
    presentCard: null as null | ((c: DueFollowUpCard, s: FollowUpSession) => Promise<void>),
    hasOwedWork: false,
    signedIn: vi.fn(async () => {}),
    signedOut: vi.fn(),
    returned: vi.fn(async () => {}),
    left: vi.fn(),
    screenSettled: vi.fn(async () => {}),
  }
}

let coordinator: ReturnType<typeof fakeCoordinator>
let go: (path: string) => void

function Nav() {
  const navigate = useNavigate()
  go = (p) => navigate(p)
  return null
}

function mount(path = '/explorar') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
      <ContactFollowUpHost
        coordinator={coordinator as unknown as ContactFollowUpCoordinator}
        settleMs={10}
        pollMs={50}
      />
    </MemoryRouter>,
  )
}

const ready = () => {
  auth.state.firebaseUser = { uid: 'u1', emailVerified: true }
  auth.state.user = { id: 'u1', name: 'Ana', isPhoneVerified: true }
}

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  coordinator = fakeCoordinator()
  auth.state.firebaseUser = null
  auth.state.user = null
  auth.state.isInitialized = true
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('who', () => {
  it('a fully set-up account: asks on page load', async () => {
    ready()
    mount()
    await tick(20)
    expect(coordinator.signedIn).toHaveBeenCalledWith('u1')
  })

  it('an account still in the steps (no phone): never', async () => {
    ready()
    auth.state.user = { id: 'u1', name: 'Ana', isPhoneVerified: false }
    mount()
    await tick(20)
    expect(coordinator.signedIn).not.toHaveBeenCalled()
  })

  it('an unconfirmed email: never', async () => {
    ready()
    auth.state.firebaseUser = { uid: 'u1', emailVerified: false }
    mount()
    await tick(20)
    expect(coordinator.signedIn).not.toHaveBeenCalled()
  })

  it('a visitor: signed out', async () => {
    mount()
    await tick(20)
    expect(coordinator.signedIn).not.toHaveBeenCalled()
    expect(coordinator.signedOut).toHaveBeenCalled()
  })
})

describe('coming back to the tab', () => {
  it('hidden → left; visible → returned, after a moment', async () => {
    ready()
    mount()
    await tick(20)
    setVisibility('hidden')
    expect(coordinator.left).toHaveBeenCalled()
    setVisibility('visible')
    expect(coordinator.returned).not.toHaveBeenCalled()
    await tick(20)
    expect(coordinator.returned).toHaveBeenCalled()
  })

  it('window blur → left; focus → returned', async () => {
    ready()
    mount()
    await tick(20)
    window.dispatchEvent(new Event('blur'))
    expect(coordinator.left).toHaveBeenCalled()
    window.dispatchEvent(new Event('focus'))
    await tick(20)
    expect(coordinator.returned).toHaveBeenCalled()
  })

  it('back from wa.me (page restored): pagehide → left; pageshow → returned', async () => {
    ready()
    mount()
    await tick(20)
    window.dispatchEvent(new Event('pagehide'))
    expect(coordinator.left).toHaveBeenCalled()
    window.dispatchEvent(new Event('pageshow'))
    await tick(20)
    expect(coordinator.returned).toHaveBeenCalled()
  })
})

describe('the screen settling', () => {
  it('a page change makes the owed ask', async () => {
    ready()
    mount('/app/profile')
    await tick(20)
    act(() => go('/explorar'))
    await tick(20)
    expect(coordinator.screenSettled).toHaveBeenCalled()
  })

  it('while an ask is owed, it keeps checking; with nothing owed, it does not', async () => {
    ready()
    mount()
    await tick(20)
    coordinator.screenSettled.mockClear()
    await tick(200)
    expect(coordinator.screenSettled).not.toHaveBeenCalled()
    coordinator.hasOwedWork = true
    await tick(120)
    expect(coordinator.screenSettled).toHaveBeenCalled()
  })

  it('may present only on an ordinary page, with nothing else open, tab visible', async () => {
    ready()
    mount('/app/listings/new')
    await tick(20)
    expect(coordinator.canPresentNow()).toBe(false)
    act(() => go('/explorar'))
    await tick(20)
    expect(coordinator.canPresentNow()).toBe(true)
    const d = document.createElement('dialog')
    d.setAttribute('open', '')
    document.body.appendChild(d)
    expect(coordinator.canPresentNow()).toBe(false)
    d.remove()
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    expect(coordinator.canPresentNow()).toBe(false)
  })
})

describe('showing the card', () => {
  it('presentCard renders the card and resolves when it is closed', async () => {
    ready()
    mount()
    await tick(20)
    const session: FollowUpSession = { answer: vi.fn(async () => {}), stepShown: vi.fn() }
    let closed = false
    await act(async () => {
      void coordinator.presentCard!({
        card: 'wrote', listingId: 'L1', propertyType: 'casa', operationType: 'venta', district: 'Castilla',
        priceAmount: 100, priceCurrency: 'USD', photoKey: null, rentalDurationType: null, contactRole: 'owner',
      }, session).then(() => { closed = true })
    })
    expect(screen.getByText('¿Pudiste contactar al dueño?')).toBeTruthy()
    await act(async () => { screen.getByRole('button', { name: 'SÍ' }).click() })
    await tick(1)
    expect(closed).toBe(true)
    expect(screen.queryByText('¿Pudiste contactar al dueño?')).toBeNull()
  })

  it('unmounting unhooks the coordinator', async () => {
    ready()
    const { unmount } = mount()
    await tick(20)
    unmount()
    expect(coordinator.presentCard).toBeNull()
    expect(coordinator.canPresentNow()).toBe(false)
  })
})
