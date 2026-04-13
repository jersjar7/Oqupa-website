import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import BoostTierSelectionModal from './BoostTierSelectionModal'
import StripePaymentModal from './StripePaymentModal'
import { useCreateBoostPayment, useBoostTiers, usePollPaymentCompletion } from '@/hooks/useBoost'
import type { BoostTier } from '@/types/boost'

type FlowStep = 'closed' | 'tier-selection' | 'payment' | 'processing' | 'success' | 'error'

interface BoostPurchaseFlowProps {
  listingId: string
  /** Called when boost purchase completes successfully */
  onSuccess: (data: { tier: BoostTier; durationDays: number }) => void
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
  const [selectedTier, setSelectedTier] = useState<BoostTier | null>(null)
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const createPayment = useCreateBoostPayment()
  const pollCompletion = usePollPaymentCompletion()
  const { data: tiers } = useBoostTiers()
  const queryClient = useQueryClient()

  const openFlow = useCallback(() => setStep('tier-selection'), [])

  const handleTierConfirm = useCallback(async (tier: BoostTier) => {
    setSelectedTier(tier)
    try {
      const result = await createPayment.mutateAsync({ listingId, boostTier: tier })
      setClientSecret(result.clientSecret)
      setPaymentId(result.paymentId)
      setStep('payment')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el pago'
      const userMessage = mapErrorToSpanish(message)
      setErrorMessage(userMessage)
      setStep('error')
      toast.error(userMessage)
    }
  }, [listingId, createPayment])

  const handleSuccessClose = useCallback(() => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current)
      autoCloseTimer.current = null
    }
    setStep('closed')
    setSelectedTier(null)
    setClientSecret('')
    setPaymentId('')
  }, [])

  const handlePaymentSuccess = useCallback(async () => {
    setStep('processing')

    // Poll for webhook confirmation
    await pollCompletion.mutateAsync(paymentId)

    // Invalidate queries to refresh listing data
    queryClient.invalidateQueries({ queryKey: ['listings'] })
    queryClient.invalidateQueries({ queryKey: ['payments'] })

    // Find the tier config for the summary
    const tierConfig = tiers?.find((t) => t.tier === selectedTier)
    const durationDays = tierConfig?.durationDays ?? 7

    // Notify parent for optimistic update
    onSuccess({ tier: selectedTier!, durationDays })

    // Show success step
    setStep('success')

    // Auto-close after 4 seconds
    autoCloseTimer.current = setTimeout(() => {
      handleSuccessClose()
    }, 4000)
  }, [paymentId, pollCompletion, queryClient, onSuccess, tiers, selectedTier, handleSuccessClose])

  const handlePaymentCancel = useCallback(() => {
    setStep('tier-selection')
    setClientSecret('')
    setPaymentId('')
  }, [])

  const handlePaymentError = useCallback((message: string) => {
    setErrorMessage(message)
    setStep('error')
    toast.error(message)
  }, [])

  // Clean up auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current)
    }
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
            <h3 className="mt-4 font-sans text-lg font-medium text-text-primary">
              Tu pago fue exitoso
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Activando tu destacado...
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success confirmation */}
      {step === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 font-sans text-lg font-medium text-text-primary">
                Tu publicación ahora está destacada
              </h3>
              {(() => {
                const tierConfig = tiers?.find((t) => t.tier === selectedTier)
                if (!tierConfig) return null
                return (
                  <p className="mt-2 text-sm text-text-secondary">
                    Plan de {tierConfig.displayName} · S/ {tierConfig.feeInSoles.toFixed(2)}
                  </p>
                )
              })()}
            </div>
            <button
              onClick={handleSuccessClose}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Error state */}
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
