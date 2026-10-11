import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

// ── Production-mode: key is set (line 24) ────────────────────────────────────
//
// VITE_STRIPE_PUBLISHABLE_KEY is a module-level constant. To exercise line 24
// (stripePromise = loadStripe(stripePublishableKey)) the key must be set when
// the module first loads. Use vi.stubEnv + vi.resetModules + dynamic import.

describe('getStripe — with publishable key set (line 24)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_example_key_123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('calls loadStripe with the publishable key when it is set (line 24)', async () => {
    const { getStripe: getStripeWithKey } = await import('../stripe')
    const stripeMod = await import('@stripe/stripe-js')
    const loadStripeSpy = vi.mocked(stripeMod.loadStripe)

    const result = getStripeWithKey()

    expect(result).toBeInstanceOf(Promise)
    expect(loadStripeSpy).toHaveBeenCalledWith('pk_test_example_key_123')
  })

  it('returns the same Promise on subsequent calls when key is set (singleton guard)', async () => {
    const { getStripe: getStripeWithKey } = await import('../stripe')

    const first = getStripeWithKey()
    const second = getStripeWithKey()

    expect(first).toBe(second)
  })
})
