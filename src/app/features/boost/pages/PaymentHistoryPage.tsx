import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Receipt, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useUserBoostPayments, useRefundBoostPayment } from '@/hooks/useBoost'
import { Spinner } from '@/app/components/ui'
import type { Payment } from '@/types/boost'
import { BOOST_TIER_LABELS } from '@/types/boost'
import { paymentStatusDisplay, isRefundEligible as refundEligible, refundErrorMessage, type StatusTone } from '../lib/paymentDisplay'
import { AnalyticsLogger } from '@/lib/analytics'

// Brand tokens only (audit A6): every chip text passes 4.5:1 on its tint.
const TONE_COLORS: Record<StatusTone, string> = {
  pending: 'bg-accent/40 text-ink',
  success: 'bg-success/10 text-success',
  danger: 'bg-error/10 text-error-strong',
  muted: 'bg-surface-muted text-text-secondary',
  info: 'bg-primary/10 text-ink',
}

export default function PaymentHistoryPage() {
  const { user } = useAuthStore()
  const { data: payments, isLoading, error, refetch } = useUserBoostPayments(user?.id)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Back to listings — the natural "where users came from" in the new
          sidebar structure (pagos was under principal, listings is the
          primary page). Topbar handles the page title. */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/listings"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:bg-black/5"
          aria-label="Volver a Mis propiedades"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="mt-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="mt-12 text-center">
          <p className="text-error-strong">No pudimos cargar tus pagos. Revisa tu internet y vuelve a intentarlo.</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 min-h-11 rounded-full border-[1.5px] border-secondary px-6 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary hover:text-secondary-hover"
          >
            Reintentar
          </button>
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
            <Receipt className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="mt-4 font-sans text-lg font-medium text-text-primary">
            Sin pagos
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Aún no has realizado pagos para destacar publicaciones
          </p>
          <Link
            to="/app/listings"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
          >
            Ir a Mis propiedades
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {payments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  )
}

function PaymentCard({ payment }: { payment: Payment }) {
  const refundMutation = useRefundBoostPayment()
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  const isRefundEligible = refundEligible(payment)
  const status = paymentStatusDisplay(payment)

  const handleRefund = async () => {
    setRefundError(null)
    void AnalyticsLogger.boostRefund('requested', payment.boostTier)
    try {
      await refundMutation.mutateAsync(payment.id)
      setShowRefundConfirm(false)
      void AnalyticsLogger.boostRefund('succeeded', payment.boostTier)
      // The app's words (property_owner_card.dart).
      toast.success('Reembolso procesado. Se quitaron de tu destacado los días de esta compra.')
    } catch (err: unknown) {
      const code = String((err as { code?: string } | null)?.code ?? 'unknown')
      void AnalyticsLogger.boostRefund('failed', payment.boostTier, code)
      const userMessage = refundErrorMessage(err)
      setRefundError(userMessage)
      toast.error(userMessage)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-light">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-text-primary">
            S/. {payment.amount.toFixed(2)}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary">
            {payment.description}
          </p>
          {payment.boostTier && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              Plan: {BOOST_TIER_LABELS[payment.boostTier]}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE_COLORS[status.tone]}`}>
          {status.label}
        </span>
      </div>
      {status.detail && (
        <p className="mt-1 text-xs text-text-secondary">{status.detail}</p>
      )}

      {/* Reference — the Terms ask for it when writing to us (as the app) */}
      <p className="mt-2 select-all text-xs text-text-tertiary">Referencia: {payment.id}</p>

      {/* Date */}
      <p className="mt-3 font-serif text-xs font-light italic text-text-tertiary">
        {payment.createdAt.toLocaleDateString('es-PE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>

      {/* Refund button */}
      {isRefundEligible && !showRefundConfirm && (
        <button
          onClick={() => setShowRefundConfirm(true)}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-secondary px-4 font-sans text-xs font-bold uppercase tracking-[1px] text-secondary hover:text-secondary-hover"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Solicitar reembolso
        </button>
      )}

      {/* Refund eligibility note */}
      {payment.status === 'completed' && !payment.partiallyRefunded && !isRefundEligible && (
        <p className="mt-3 text-xs text-text-tertiary">
          El período de reembolso (48 horas) ha expirado
        </p>
      )}

      {/* Refund confirmation */}
      {showRefundConfirm && (
        <div className="mt-3 rounded-lg border border-boost/40 bg-boost/10 p-3">
          <p className="text-sm font-medium text-ink">
            ¿Solicitar reembolso de S/. {payment.amount.toFixed(2)}?
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Se quitarán de tu destacado los días de esta compra y se reembolsará el pago a tu método de pago original. Este proceso puede tomar unos minutos.
          </p>
          {refundError && (
            <p className="mt-2 text-xs font-medium text-error">{refundError}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleRefund}
              disabled={refundMutation.isPending}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-full bg-boost px-4 font-sans text-xs font-bold uppercase tracking-[1px] text-ink transition-colors hover:bg-boost-hover disabled:bg-separator"
            >
              {refundMutation.isPending ? (
                <>
                  <Spinner size="sm" className="border-white border-t-transparent" />
                  Procesando reembolso…
                </>
              ) : (
                'Confirmar reembolso'
              )}
            </button>
            <button
              onClick={() => {
                setShowRefundConfirm(false)
                setRefundError(null)
              }}
              className="min-h-11 flex-1 rounded-full border-[1.5px] border-separator px-4 font-sans text-xs font-bold uppercase tracking-[1px] text-text-secondary hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
