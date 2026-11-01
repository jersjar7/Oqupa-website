import { describe, it, expect } from 'vitest'
import { listingPageView, closedLabel, ownerOnlyNote } from '../listingVisibility'

/**
 * Who sees what on a listing's public page (2026-10-31, approved by Jerson).
 * A stranger with a direct link used to see a sold house as available, with a
 * working WhatsApp button; and an owner opening their own deactivated listing
 * was told it "no existe o ha sido eliminada".
 */
describe('listingPageView', () => {
  it('an active listing is open to everyone', () => {
    expect(listingPageView('active', false)).toBe('open')
    expect(listingPageView('active', true)).toBe('open')
  })

  it.each(['sold', 'rented'] as const)('a %s listing is shown closed to everyone', (status) => {
    expect(listingPageView(status, false)).toBe('closed')
    expect(listingPageView(status, true)).toBe('closed')
  })

  it.each(['draft', 'paymentPending', 'expired', 'deactivated'] as const)(
    'a %s listing is hidden from strangers but shown to its owner',
    (status) => {
      expect(listingPageView(status, false)).toBe('hidden')
      expect(listingPageView(status, true)).toBe('owner-only')
    },
  )

  it('an unknown status is hidden from strangers (fail closed)', () => {
    expect(listingPageView('something-new' as never, false)).toBe('hidden')
  })
})

describe('closedLabel', () => {
  it('uses the exact words', () => {
    expect(closedLabel('sold')).toBe('Vendido')
    expect(closedLabel('rented')).toBe('Alquilado')
    expect(closedLabel('active')).toBeNull()
  })
})

describe('ownerOnlyNote', () => {
  it('says what state it is in and that only the owner sees it', () => {
    expect(ownerOnlyNote('deactivated')).toBe('Esta publicación está desactivada. Solo tú puedes verla.')
    expect(ownerOnlyNote('draft')).toBe('Esta publicación es un borrador. Solo tú puedes verla.')
    expect(ownerOnlyNote('paymentPending')).toBe('Esta publicación tiene un pago pendiente. Solo tú puedes verla.')
    expect(ownerOnlyNote('expired')).toBe('Esta publicación no está visible. Solo tú puedes verla.')
  })
})
