import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Receipt, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useUserBoostPayments, useRefundBoostPayment } from '@/hooks/useBoost'
import { Spinner } from '@/app/components/ui'
import type { Payment, PaymentDocStatus } from '@/types/boost'
import { PAYMENT_STATUS_LABELS, BOOST_TIER_LABELS } from '@/types/boost'

const STATUS_COLORS: Record<PaymentDocStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-600',
}

export default function PaymentHistoryPage() {
  const { user } = useAuthStore()
  const { data: payments, isLoading, error } = useUserBoostPayments(user?.id)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {/* Back to listings — the natural "where users came from" in the new
          sidebar structure (pagos was under principal, listings is the
          primary page). Topbar handles the page title. */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/listings"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:bg-black/5"
          aria-label="Volver a Mis Anuncios"
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
          <p className="text-error">Error al cargar tus pagos</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-secondary hover:text-secondary-hover"
          >
            Reintentar
          </button>
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
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
            Ir a mis publicaciones
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

  const isRefundEligible =
    payment.status === 'completed' &&
    payment.completedAt &&
    (Date.now() - payment.completedAt.getTime()) < 48 * 60 * 60 * 1000

  const handleRefund = async () => {
    setRefundError(null)
    try {
      await refundMutation.mutateAsync(payment.id)
      setShowRefundConfirm(false)
      toast.success('Reembolso procesado exitosamente')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el reembolso'
      const userMessage = mapRefundError(message)
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
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
          {PAYMENT_STATUS_LABELS[payment.status]}
        </span>
      </div>

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
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-secondary-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Solicitar reembolso
        </button>
      )}

      {/* Refund eligibility note */}
      {payment.status === 'completed' && !isRefundEligible && (
        <p className="mt-3 text-xs text-text-tertiary">
          El período de reembolso (48 horas) ha expirado
        </p>
      )}

      {/* Refund confirmation */}
      {showRefundConfirm && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            ¿Solicitar reembolso de S/. {payment.amount.toFixed(2)}?
          </p>
          <p className="mt-1 text-xs text-amber-700">
            El reembolso desactivará el destacado de tu publicación.
          </p>
          {refundError && (
            <p className="mt-2 text-xs font-medium text-error">{refundError}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleRefund}
              disabled={refundMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:bg-gray-300"
            >
              {refundMutation.isPending ? (
                <>
                  <Spinner size="sm" className="border-white border-t-transparent" />
                  Procesando...
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
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-black/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function mapRefundError(message: string): string {
  if (message.includes('unauthenticated')) {
    return 'Debes iniciar sesión para solicitar un reembolso'
  }
  if (message.includes('not-found')) {
    return 'Pago no encontrado'
  }
  if (message.includes('permission-denied')) {
    return 'Solo puedes solicitar reembolso de tus propios pagos'
  }
  if (message.includes('failed-precondition')) {
    return 'No se puede procesar el reembolso en este momento'
  }
  return 'Error al procesar el reembolso. Intenta de nuevo.'
}
