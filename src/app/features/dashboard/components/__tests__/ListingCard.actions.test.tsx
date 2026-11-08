// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

/**
 * One main button and "⋯" (Jerson 2026-11-08: "I love your propuesta"). The
 * card used to show up to six buttons of different sizes in loose rows. Now it
 * matches the app's owner card: the main action changes with the listing
 * (Destacar → Editar once boosted → Volver a publicar when off or closed) and
 * everything else is in the "⋯" menu, Eliminar last.
 */

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkListingClosed: () => ({ mutate: vi.fn(), isPending: false }),
  useSetRealtorHelp: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="share" /> : null),
}))
vi.mock('@/app/features/boost/components/BoostStatusBadge', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({
  default: ({ children }: { children: (open: () => void) => React.ReactNode }) => <>{children(() => {})}</>,
}))
vi.mock('../CloseSurveyModal', () => ({ default: () => null }))
vi.mock('@/app/components/ui', () => ({
  Button: ({ children, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className, onClick }: { children: React.ReactNode; to: string; className?: string; onClick?: () => void }) => (
    <a href={to} className={className} onClick={onClick}>{children}</a>
  ),
}))

import ListingCard from '../ListingCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

const DAY = 24 * 60 * 60 * 1000

function setup(listing: Partial<Listing> = {}) {
  const l = {
    id: 'L1', propertyId: 'P1', status: 'active', viewCount: 0, isBoosted: false,
    price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
    ...listing,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={l} property={property} />)
}

const more = () => screen.getByRole('button', { name: 'Más opciones' })
const menu = () => screen.getByTestId('listing-actions-menu')
/** The menu's entries, in order, by their visible words. */
const menuEntries = () =>
  Array.from(menu().querySelectorAll('a, button')).map((el) => el.textContent?.trim())
const open = () => fireEvent.click(more())

describe('ListingCard — one main button and ⋯', () => {
  it('active, not boosted: DESTACAR is the main button, the rest waits in ⋯', () => {
    setup()
    expect(screen.getByRole('button', { name: /^Destacar$/ })).toBeTruthy()
    for (const hidden of [/^Editar$/, /^Compartir$/, /^Desactivar$/, /Marcar como vendido/]) {
      expect(screen.queryByRole('button', { name: hidden })).toBeNull()
      expect(screen.queryByRole('link', { name: hidden })).toBeNull()
    }
    expect(screen.queryByTestId('listing-actions-menu')).toBeNull()
  })

  // ADR-042: boosts are available, not promoted — a plain green outline as in
  // the app, never the big yellow "Destacar mi propiedad".
  it('Destacar is a green outline button, not the yellow fill', () => {
    setup()
    const boost = screen.getByRole('button', { name: /^Destacar$/ })
    expect(boost.className).toMatch(/\bborder-secondary\b/)
    expect(boost.className).not.toMatch(/\bbg-boost\b/)
    expect(screen.queryByText(/Destacar mi propiedad/i)).toBeNull()
  })

  it('active: ⋯ holds Ver publicación, Editar, Compartir, Desactivar, Marcar como vendido — in that order', () => {
    setup()
    expect(more().getAttribute('aria-expanded')).toBe('false')
    open()
    expect(more().getAttribute('aria-expanded')).toBe('true')
    expect(menuEntries()).toEqual(['Ver publicación', 'Editar', 'Compartir', 'Desactivar', 'Marcar como vendido'])
    expect(within(menu()).getByRole('link', { name: 'Ver publicación' }).getAttribute('href')).toBe('/property/L1')
    expect(within(menu()).getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe('/app/listings/L1/edit')
  })

  it('a rental reads Marcar como alquilado in ⋯', () => {
    render(
      <ListingCard
        listing={{ id: 'L1', propertyId: 'P1', status: 'active', viewCount: 0, isBoosted: false, price: { amount: 1, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0 } as unknown as Listing}
        property={{ operationType: 'alquiler', propertyType: 'casa', location: { distrito: 'Piura' }, specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] } } as unknown as Property}
      />,
    )
    open()
    expect(menuEntries()).toContain('Marcar como alquilado')
    expect(menuEntries()).not.toContain('Marcar como vendido')
  })

  it('boosted: EDITAR becomes the main button and is not repeated in ⋯', () => {
    setup({ isBoosted: true, boostedUntil: new Date(Date.now() + 10 * DAY) })
    expect(screen.queryByRole('button', { name: /^Destacar$/ })).toBeNull()
    const edit = screen.getByRole('link', { name: 'Editar' })
    expect(edit.getAttribute('href')).toBe('/app/listings/L1/edit')
    open()
    expect(menuEntries()).toEqual(['Ver publicación', 'Compartir', 'Desactivar', 'Marcar como vendido'])
  })

  it.each(['deactivated', 'expired', 'sold', 'rented'])(
    '%s: VOLVER A PUBLICAR is the main button; ⋯ holds Ver publicación, Editar and Eliminar last',
    (status) => {
      setup({ status: status as Listing['status'] })
      expect(screen.getByRole('button', { name: /Volver a publicar/ })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^Destacar$/ })).toBeNull()
      open()
      expect(menuEntries()).toEqual(['Ver publicación', 'Editar', 'Eliminar'])
    },
  )

  it('choosing an entry closes the menu', () => {
    setup()
    open()
    fireEvent.click(within(menu()).getByRole('button', { name: 'Compartir' }))
    expect(screen.getByTestId('share')).toBeTruthy()
    expect(screen.queryByTestId('listing-actions-menu')).toBeNull()
  })

  it('Escape closes the menu and gives focus back to ⋯', () => {
    setup()
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('listing-actions-menu')).toBeNull()
    expect(document.activeElement).toBe(more())
  })

  it('a click outside closes the menu', () => {
    setup()
    open()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByTestId('listing-actions-menu')).toBeNull()
  })

  // Seen on the phone 2026-11-08: near the bottom of the screen the menu
  // went under the tab bar. With no room below, it opens upward.
  it('near the bottom of the screen the menu opens upward', () => {
    setup()
    more().getBoundingClientRect = () => ({ top: 700, bottom: 748, left: 0, right: 48, width: 48, height: 48, x: 0, y: 700, toJSON: () => ({}) })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
    open()
    expect(menu().dataset.placement).toBe('up')
  })

  it('with room below, the menu opens downward', () => {
    setup()
    more().getBoundingClientRect = () => ({ top: 200, bottom: 248, left: 0, right: 48, width: 48, height: 48, x: 0, y: 200, toJSON: () => ({}) })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
    open()
    expect(menu().dataset.placement).toBe('down')
  })

  // Seen on the computer 2026-11-08: the card clipped the menu, hiding
  // "Marcar como vendido". The card must not cut off what overflows it.
  it('the card does not clip the menu', () => {
    setup()
    const card = more().closest('[data-testid="owner-listing-card"]') as HTMLElement
    expect(card.className).not.toMatch(/\boverflow-hidden\b/)
  })

  // The mock's button: small, solid green, white words.
  it('SÍ, ACTIVAR is the solid green button', () => {
    setup()
    const on = screen.getByRole('button', { name: 'Sí, activar' })
    expect(on.className).toMatch(/\bbg-secondary\b/)
    expect(on.className).toMatch(/\btext-white\b/)
  })

  it('a second press on ⋯ closes it', () => {
    setup()
    open()
    open()
    expect(screen.queryByTestId('listing-actions-menu')).toBeNull()
  })
})

describe('ListingCard — agents live in ⋯, as in the app', () => {
  it('interested agents: an orange dot on ⋯ and "Ver agentes interesados (2)" inside', () => {
    setup({ wantsRealtorHelp: true, currentClaimsCount: 2 })
    expect(screen.getByTestId('interested-agents-dot')).toBeTruthy()
    open()
    const link = within(menu()).getByRole('link', { name: 'Ver agentes interesados (2)' })
    expect(link.getAttribute('href')).toBe('/app/listings/L1/agents')
  })

  it('help on, nobody interested yet: the entry is there, no dot', () => {
    setup({ wantsRealtorHelp: true, currentClaimsCount: 0 })
    expect(screen.queryByTestId('interested-agents-dot')).toBeNull()
    open()
    expect(within(menu()).getByRole('link', { name: 'Ver agentes interesados (0)' })).toBeTruthy()
  })

  it('no help and no agent: no agents entry', () => {
    setup()
    open()
    expect(menuEntries().some((t) => t?.startsWith('Ver agentes'))).toBe(false)
  })

  // The app's AYUDA DE AGENTES box: shown on the card, explained, one button.
  it('help off: the explanation and SÍ, ACTIVAR are on the card without a click', () => {
    setup()
    expect(screen.getByText('AYUDA DE AGENTES')).toBeTruthy()
    expect(screen.getByText(/Agentes verificados por Oqupa podrán ofrecerte ayuda para vender tu propiedad/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sí, activar' })).toBeTruthy()
  })
})
