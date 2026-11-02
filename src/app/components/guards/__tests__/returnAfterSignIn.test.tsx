// @vitest-environment jsdom
// Hostile review of fix/wizard-bugs-web, #3: someone whose session ended in
// the publishing wizard is bounced to the sign-in page by the REAL guards;
// signing back in as the same account must bring them back to the wizard,
// with the draft. Only same-site /app/... paths are honoured (no open
// redirect), and a deliberate Salir does not set a way back.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))

import AuthGuard from '../AuthGuard'
import VerifiedGuard from '../VerifiedGuard'
import GuestGuard from '../GuestGuard'
import { useAuthStore } from '@/stores/authStore'
import { useListingFormStore } from '@/stores/listingFormStore'
import { watchDraftOwner } from '@/stores/draftOwnerWatch'
import { noteDeliberateSignOut, safeAppPath } from '@/lib/returnPath'
import { setReturnUrl } from '@/lib/utils'

function Where() {
  const l = useLocation()
  return <p data-testid="where">{l.pathname}</p>
}

function signIn(uid: string) {
  useAuthStore.setState({
    firebaseUser: { uid, emailVerified: true } as never,
    user: { id: uid, name: 'Ana', isPhoneVerified: true } as never,
    isLoading: false,
    isInitialized: true,
  })
}
function sessionEnds() {
  useAuthStore.setState({ firebaseUser: null, user: null, isLoading: false, isInitialized: true })
}

function renderApp(entry: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry as never]}>
      <Routes>
        <Route path="/app/login" element={<GuestGuard><p>login</p></GuestGuard>} />
        <Route path="/app/listings/new" element={<AuthGuard><VerifiedGuard><Where /></VerifiedGuard></AuthGuard>} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

const where = () => screen.queryByTestId('where')?.textContent ?? (screen.queryByText('login') ? 'login' : '?')

describe('signed out in the wizard, back in the wizard after signing in', () => {
  let stop = () => {}
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.useRealTimers()
    signIn('ana')
    stop = watchDraftOwner()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().adoptDraftFor('ana')
    useListingFormStore.getState().updateData({ description: 'Casa de Ana en Castilla' })
    useListingFormStore.getState().setStep(5)
  })
  afterEach(() => stop())

  it('the same account: back to /app/listings/new, draft intact', async () => {
    renderApp('/app/listings/new')
    expect(where()).toBe('/app/listings/new')
    await act(async () => sessionEnds())
    expect(where()).toBe('login')
    await act(async () => signIn('ana'))
    expect(where()).toBe('/app/listings/new')
    expect(useListingFormStore.getState().data.description).toBe('Casa de Ana en Castilla')
    expect(useListingFormStore.getState().step).toBe(5)
  })

  // Changed (second hostile review #3): this used to expect the other
  // account to be sent into the wizard too. The way back now belongs to the
  // account that was bounced; anyone else lands on their own panel.
  it('another account signs in: no way back for them, and no draft', async () => {
    renderApp('/app/listings/new')
    await act(async () => sessionEnds())
    await act(async () => signIn('beto'))
    expect(where()).toBe('/app')
    expect(useListingFormStore.getState().data.description).toBe('')
  })

  it('after a deliberate Salir there is no way back to set', async () => {
    renderApp('/app/listings/new')
    noteDeliberateSignOut()
    await act(async () => sessionEnds())
    await act(async () => signIn('ana'))
    expect(where()).toBe('/app')
  })

  it('a return path that is not ours is ignored', async () => {
    sessionEnds()
    renderApp({ pathname: '/app/login', state: { from: '//evil.example/app/x' } })
    await act(async () => signIn('ana'))
    expect(where()).toBe('/app')
  })
})

describe('second hostile review #3: the way back across tabs', () => {
  let stop = () => {}
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    signIn('ana')
    stop = watchDraftOwner()
  })
  afterEach(() => stop())

  it('Salir in ANOTHER tab: this tab stores no way back', async () => {
    renderApp('/app/listings/new')
    // The other tab signed out on purpose (shared storage), then Firebase
    // ended the session here too.
    localStorage.setItem('oqupa_signedOutOnPurposeAt', String(Date.now()))
    await act(async () => sessionEnds())
    await act(async () => signIn('ana'))
    expect(where()).toBe('/app')
  })

  it('Salir clears a way back already stored', async () => {
    renderApp('/app/listings/new')
    await act(async () => sessionEnds())
    expect(localStorage.getItem('oqupa_bouncedFrom')).not.toBeNull()
    noteDeliberateSignOut()
    expect(localStorage.getItem('oqupa_bouncedFrom')).toBeNull()
  })
})

describe('the way back is read once per sign-in (React renders twice in development)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionEnds()
  })

  it('in StrictMode, signing in still goes to the stored page', async () => {
    setReturnUrl('/app/listings/new')
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/app/login']}>
          <Routes>
            <Route path="/app/login" element={<GuestGuard><p>login</p></GuestGuard>} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )
    await act(async () => signIn('ana'))
    expect(where()).toBe('/app/listings/new')
  })
})

describe('safeAppPath (no open redirect)', () => {
  it('accepts same-site /app paths, from a router location or a string', () => {
    expect(safeAppPath({ pathname: '/app/listings/new', search: '', hash: '' })).toBe('/app/listings/new')
    expect(safeAppPath('/app/listings/abc/edit?x=1')).toBe('/app/listings/abc/edit?x=1')
    expect(safeAppPath('/app')).toBe('/app')
    expect(safeAppPath('/APP/listings/new')).toBe('/APP/listings/new')
  })
  it('refuses everything else', () => {
    for (const bad of [
      '//evil.example', 'https://evil.example/app', '/\\evil.example', '/explorar', '/application',
      '/app/login', '/app/register', '/app/verify', '/app/forgot-password', '/app/auth/x',
      // The router matches paths case-insensitively, so this check does too.
      '/app/LOGIN', '/APP/Login', '/app/Verify', '/App/Register',
      'javascript:alert(1)', '', null, undefined, 42, { pathname: '//evil.example' },
    ]) {
      expect(safeAppPath(bad), String(bad)).toBeNull()
    }
  })
})
