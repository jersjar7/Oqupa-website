import { describe, it, expect, vi } from 'vitest'

// Mock @stripe/stripe-js to avoid loading the Stripe SDK in tests.
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(null),
}))

// VITE_STRIPE_PUBLISHABLE_KEY is not set in the test environment, so
// getStripe() takes the no-key path: logs a warning and resolves to null.
import { getStripe } from '../stripe'

describe('getStripe', () => {
  it('returns a Promise', () => {
    const result = getStripe()
    expect(result).toBeInstanceOf(Promise)
  })

  it('resolves to null when VITE_STRIPE_PUBLISHABLE_KEY is not set', async () => {
    const stripe = await getStripe()
    expect(stripe).toBeNull()
  })

  it('returns the same Promise on subsequent calls (singleton)', () => {
    const first = getStripe()
    const second = getStripe()
    expect(first).toBe(second)
  })
})
