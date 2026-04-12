import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Stripe publishable key loaded from environment variable
// Must be set in .env (production) and .env.development (staging)
// Example: VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Returns a singleton Stripe instance.
 * Logs a warning if the key is not configured (payments will not work).
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!stripePublishableKey) {
      console.warn(
        '[stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. ' +
        'Stripe payments will not work. ' +
        'Set it in .env or .env.development.'
      )
      stripePromise = Promise.resolve(null)
    } else {
      stripePromise = loadStripe(stripePublishableKey)
    }
  }
  return stripePromise
}
