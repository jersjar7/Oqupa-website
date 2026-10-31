import { useEffect, useState, useCallback } from 'react'
import { Modal, Spinner } from '@/app/components/ui'
import { getStripe } from '@/lib/stripe'

interface StripePaymentModalProps {
  isOpen: boolean
  clientSecret: string
  onSuccess: () => void
  onCancel: () => void
  onError: (message: string) => void
  /**
   * The user left before paying. Fires with `onCancel`, but not while the
   * payment is being submitted or after the form failed to load.
   */
  onAbandon?: () => void
}

/**
 * Stripe Payment Element modal.
 * Mounts the Stripe Payment Element using the client secret from the PaymentIntent.
 * Uses Stripe.js directly (no React wrapper) for simplicity.
 */
export default function StripePaymentModal({
  isOpen,
  clientSecret,
  onSuccess,
  onCancel,
  onError,
  onAbandon,
}: StripePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)
  // True once the Payment Element holds a usable payment method: a card typed
  // in full, or a saved Link card the owner has confirmed with its code.
  const [paymentComplete, setPaymentComplete] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)

  // Store refs for Stripe instances
  const [stripeInstances, setStripeInstances] = useState<{
    stripe: import('@stripe/stripe-js').Stripe
    elements: import('@stripe/stripe-js').StripeElements
  } | null>(null)

  const initializeStripe = useCallback(async () => {
    if (!clientSecret || !isOpen) return

    setIsLoading(true)
    setMountError(null)

    try {
      const stripe = await getStripe()
      if (!stripe) {
        setMountError('Stripe no está configurado. Contacta al soporte.')
        setIsLoading(false)
        return
      }

      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#F47843',
            fontFamily: 'Gotham, -apple-system, BlinkMacSystemFont, sans-serif',
            borderRadius: '12px',
          },
        },
        locale: 'es',
      })

      // Mount Payment Element
      const paymentElement = elements.create('payment', {
        layout: 'tabs',
      })

      // Wait for container to exist
      const waitForContainer = () => {
        return new Promise<void>((resolve) => {
          const check = () => {
            const container = document.getElementById('stripe-payment-element')
            if (container) {
              resolve()
            } else {
              requestAnimationFrame(check)
            }
          }
          check()
        })
      }

      await waitForContainer()
      paymentElement.mount('#stripe-payment-element')

      paymentElement.on('ready', () => {
        setIsLoading(false)
        setStripeReady(true)
      })
      paymentElement.on('change', (event) => setPaymentComplete(event.complete))

      setStripeInstances({ stripe, elements })
    } catch (err) {
      console.error('[StripePaymentModal] Init error:', err)
      setMountError('Error al cargar el formulario de pago. Intenta de nuevo.')
      setIsLoading(false)
    }
  }, [clientSecret, isOpen])

  useEffect(() => {
    if (isOpen && clientSecret) {
      initializeStripe()
    }

    return () => {
      // Cleanup on close
      setStripeInstances(null)
      setStripeReady(false)
      setPaymentComplete(false)
      setIsLoading(true)
    }
  }, [isOpen, clientSecret, initializeStripe])

  const handleSubmit = async () => {
    if (!stripeInstances || isSubmitting || !paymentComplete) return

    setIsSubmitting(true)

    try {
      const { stripe, elements } = stripeInstances

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // Not actually used for redirect
        },
        redirect: 'if_required',
      })

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          onError(error.message ?? 'Error en el pago')
        } else {
          onError('Error inesperado al procesar el pago. Intenta de nuevo.')
        }
      } else {
        // Payment succeeded
        onSuccess()
      }
    } catch (err) {
      console.error('[StripePaymentModal] Submit error:', err)
      onError('Error al procesar el pago. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUserCancel = () => {
    if (!isSubmitting) onAbandon?.()
    onCancel()
  }

  return (
    <Modal isOpen={isOpen} onClose={mountError ? onCancel : handleUserCancel} title="Pago seguro">
      {mountError ? (
        <div className="py-6 text-center">
          <p className="text-error">{mountError}</p>
          <button
            onClick={onCancel}
            className="mt-4 text-sm text-secondary hover:text-secondary-hover"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {/* Stripe Payment Element container */}
          <div
            id="stripe-payment-element"
            className={isLoading ? 'invisible h-0' : 'min-h-[200px]'}
          />

          {stripeReady && (
            <div className="mt-6 space-y-3">
              {!paymentComplete && (
                <p className="text-center text-sm text-text-secondary">
                  Ingresa tu tarjeta o confirma la guardada para continuar.
                </p>
              )}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !paymentComplete}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="border-white border-t-transparent" />
                    <span>Procesando pago...</span>
                  </>
                ) : (
                  <span>Pagar ahora</span>
                )}
              </button>

              <button
                onClick={handleUserCancel}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-black/5 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Security note */}
          <p className="mt-4 text-center font-serif text-xs font-light text-text-tertiary">
            Pago procesado de forma segura por Stripe.
            Tus datos de pago nunca se almacenan en nuestros servidores.
          </p>
        </>
      )}
    </Modal>
  )
}
