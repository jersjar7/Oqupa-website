// @vitest-environment jsdom
// The door on the website: "Anuncia tu propiedad" as the primary header CTA,
// for visitors and signed-in people alike, on every page variant.
// docs/new-user-navigation-path.md, step 4. Brand rule (2026-08-25):
// *anunciar* on the public site, *publicar* inside the product.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockAuth = {
  firebaseUser: null as { uid: string } | null,
  user: null as { name?: string } | null,
  isInitialized: true,
}
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mockAuth }))
vi.mock('@/services/authService', () => ({ authService: { logout: vi.fn() } }))
vi.mock('@/hooks/useMobileMenu', () => ({
  useMobileMenu: () => ({ isOpen: false, toggle: vi.fn(), close: vi.fn(), menuRef: { current: null }, toggleRef: { current: null } }),
}))
vi.mock('@/assets/images/Oqupa_FullLogo_multicolor.webp', () => ({ default: 'logo.webp' }))

const { default: Header } = await import('@/components/layout/Header')

function renderHeader(variant: 'full' | 'minimal') {
  return render(
    <MemoryRouter initialEntries={['/property/abc']}>
      <Header variant={variant} />
    </MemoryRouter>,
  )
}

describe('Header — the publish door', () => {
  beforeEach(() => { mockAuth.firebaseUser = null; mockAuth.user = null })

  it('a visitor sees "Anuncia tu propiedad" that leads to creating an account', () => {
    renderHeader('full')
    const cta = screen.getAllByRole('link', { name: /Anuncia tu propiedad/i })[0]
    expect(cta?.getAttribute('href')).toBe('/app/login')
    expect(screen.queryByText(/Publica Gratis/i)).toBeNull()
  })

  it('a signed-in person is taken straight to the wizard', () => {
    mockAuth.firebaseUser = { uid: 'u1' }; mockAuth.user = { name: 'Ana' }
    renderHeader('full')
    const cta = screen.getAllByRole('link', { name: /Anuncia tu propiedad/i })[0]
    expect(cta?.getAttribute('href')).toBe('/app/listings/new')
  })

  it('the door is on the minimal header (property pages) and NOT hidden on phones', () => {
    // Hostile review 2026-08-26: "hidden sm:inline-flex" rendered the button
    // and then hid it exactly where it matters most — a property page on a
    // phone, where the ads land. jsdom cannot apply Tailwind, so pin the
    // class list itself.
    renderHeader('minimal')
    const cta = screen.getAllByRole('link', { name: /Anuncia tu propiedad/i })[0]
    expect(cta).toBeTruthy()
    expect(cta?.className).not.toMatch(/\bhidden\b/)
    expect(cta?.className).toMatch(/whitespace-nowrap/)
    // ...and the sign-in pill is the one that waits for wider screens there.
    const signIn = screen.getByRole('link', { name: /Iniciar sesión/i })
    expect(signIn.parentElement?.className).toMatch(/\bhidden\b.*sm:flex/)
  })

  it('renders for a visitor before the auth store has initialised (no pop-in)', () => {
    mockAuth.isInitialized = false
    renderHeader('minimal')
    expect(screen.getAllByRole('link', { name: /Anuncia tu propiedad/i }).length).toBeGreaterThan(0)
    mockAuth.isInitialized = true
  })
})
