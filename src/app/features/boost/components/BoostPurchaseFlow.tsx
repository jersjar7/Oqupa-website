import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import BoostTierSelectionModal from './BoostTierSelectionModal'
import StripePaymentModal from './StripePaymentModal'
import { useCreateBoostPayment, usePollPaymentCompletion } from '@/hooks/useBoost'
import type { BoostTier } from '@/types/boost'

type FlowStep = 'closed' | 'tier-selection' | 'payment' | 'processing' | 'success' | 'error'

interface BoostPurchaseFlowProps {
  listingId: string
  /** Called when boost purchase completes successfully */
  onSuccess: () => void
  /** Render prop to trigger the flow */
  children: (openFlow: () => void) => React.ReactNode
}

/**
 * Orchestrates the entire boost purchase flow:
 * 1. Tier selection modal
 * 2. Cloud Function creates PaymentIntent
 * 3. Stripe Payment Element modal
 * 4. Poll for webhook confirmation
 * 5. Success/error feedback
 */
export default function BoostPurchaseFlow({
  listingId,
  onSuccess,
  children,
}: BoostPurchaseFlowProps) {
  const [step, setStep] = useState<FlowStep>('closed')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentId, setPaymentId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const createPayment = useCreateBoostPayment()
  const pollCompletion = usePollPaymentCompletion()
  const queryClient = useQueryClient()

  const openFlow = useCallback(() => setStep('tier-selection'), [])

  const handleTierConfirm = useCallback(async (tier: BoostTier) => {
    try {
      const result = await createPayment.mutateAsync({ listingId, boostTier: tier })
      setClientSecret(result.clientSecret)
      setPaymentId(result.paymentId)
      setStep('payment')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el pago'
      // Map Firebase Functions error codes to user-friendly Spanish messages
      const userMessage = mapErrorToSpanish(message)
      setErrorMessage(userMessage)
      setStep('error')
    }
  }, [listingId, createPayment])

  const handlePaymentSuccess = useCallback(async () => {
    setStep('processing')

    // Poll for webhook confirmation
    const confirmed = await pollCompletion.mutateAsync(paymentId)

    // Invalidate queries to refresh listing data
    queryClient.invalidateQueries({ queryKey: ['listings'] })
    queryClient.invalidateQueries({ queryKey: ['payments'] })

    if (confirmed) {
      setToastMessage('Tu publicación ha sido destacada exitosamente')
    } else {
      setToastMessage('Pago recibido. Tu publicación se destacará en unos momentos.')
    }
    setStep('closed')
    onSuccess()

    // Clear toast after 5 seconds
    setTimeout(() => setToastMessage(null), 5000)
  }, [paymentId, pollCompletion, queryClient, onSuccess])

  const handlePaymentCancel = useCallback(() => {
    setStep('tier-selection')
    setClientSecret('')
    setPaymentId('')
  }, [])

  const handlePaymentError = useCallback((message: string) => {
    setErrorMessage(message)
    setStep('error')
  }, [])

  const handleErrorClose = useCallback(() => {
    setStep('closed')
    setErrorMessage('')
    setClientSecret('')
    setPaymentId('')
  }, [])

  return (
    <>
      {children(openFlow)}

      {/* Step 1: Tier selection */}
      <BoostTierSelectionModal
        isOpen={step === 'tier-selection'}
        onClose={() => setStep('closed')}
        onConfirm={handleTierConfirm}
        isProcessing={createPayment.isPending}
      />

      {/* Step 2: Stripe Payment */}
      {clientSecret && (
        <StripePaymentModal
          isOpen={step === 'payment'}
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onError={handlePaymentError}
        />
      )}

      {/* Step 3: Processing (polling) */}
      {step === 'processing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <h3 className="mt-4 font-sans text-lg font-medium text-secondary">
              Procesando pago...
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Tu publicación será destacada en unos momentos
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Error state */}
      {step === 'error' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleErrorClose()
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
                <svg className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 font-sans text-lg font-medium text-text-primary">
                Error en el pago
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {errorMessage}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => setStep('tier-selection')}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
              >
                Reintentar
              </button>
              <button
                onClick={handleErrorClose}
                className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-black/5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-white shadow-lg">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toastMessage}
        </div>
      )}
    </>
  )
}

/** Maps Cloud Function error messages to user-friendly Spanish text */
function mapErrorToSpanish(message: string): string {
  if (message.includes('unauthenticated')) {
    return 'Debes iniciar sesión para destacar tu publicación'
  }
  if (message.includes('not-found')) {
    return 'Publicación no encontrada'
  }
  if (message.includes('permission-denied')) {
    return 'Solo puedes destacar tus propias publicaciones'
  }
  if (message.includes('failed-precondition')) {
    return 'La publicación debe estar activa para ser destacada'
  }
  if (message.includes('already-exists')) {
    return 'Esta publicación ya está destacada'
  }
  return 'Error al procesar el pago. Intenta de nuevo.'
}
