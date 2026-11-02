import { Sparkles } from 'lucide-react'
import { Modal, Spinner } from '@/app/components/ui'
import { useBoostTiers } from '@/hooks/useBoost'
import { DEFAULT_BOOST_TIERS, ON_SALE_BOOST_TIER } from '@/types/boost'
import type { BoostTier } from '@/types/boost'

interface BoostTierSelectionModalProps {
  isOpen: boolean
  /** Receives the tier on offer at closing, for `boost_checkout_abandoned`. */
  onClose: (highlightedTier: BoostTier) => void
  onConfirm: (tier: BoostTier) => void
  isProcessing: boolean
  /** A sentence shown above the offer, e.g. why an older choice was refused. */
  notice?: string
}

/**
 * One boost only — 30 days at S/ 29.90 (ADR-042, ADR-043 D16/D17). A single
 * confirmation, not a choice: no tier cards and no "most popular" / "best
 * value" badges (with one option they were untrue). Kept quiet: no nudges.
 */
export default function BoostTierSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  notice,
}: BoostTierSelectionModalProps) {
  const { data: tiers, isLoading: isLoadingTiers } = useBoostTiers()
  const offer =
    tiers?.find((t) => t.tier === ON_SALE_BOOST_TIER) ??
    DEFAULT_BOOST_TIERS.find((t) => t.tier === ON_SALE_BOOST_TIER)!

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(offer.tier)}>
      <div className="text-center">
        <h2 className="font-serif text-[28px] font-normal text-secondary">
          Destaca tu publicación
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Aparece primero en búsquedas y destaca en el mapa
        </p>
      </div>

      {notice && (
        <p role="alert" className="mt-6 rounded-xl bg-cream-strong px-4 py-3 text-center text-sm text-text-primary">
          {notice}
        </p>
      )}

      {/* The one boost */}
      <div className="mt-6 rounded-xl border border-border bg-white px-4 py-5 text-center">
        {isLoadingTiers ? (
          <div className="flex justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <p className="font-serif text-[22px] font-normal text-secondary">
            {`${offer.displayName} · S/ ${offer.feeInSoles.toFixed(2)}`}
          </p>
        )}
      </div>

      {/* Benefits */}
      <div className="mt-6 space-y-2">
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-boost" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Aparece primero en los resultados de búsqueda</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-boost" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Insignia &quot;Destacado&quot; visible para todos</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-boost" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Mayor visibilidad en el mapa</span>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={() => onConfirm(offer.tier)}
        disabled={isProcessing || isLoadingTiers}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-boost px-6 py-4 font-sans text-base font-bold uppercase tracking-[1px] text-ink transition-colors hover:bg-boost-hover disabled:bg-separator disabled:text-text-secondary"
      >
        {isProcessing ? (
          <>
            <Spinner size="sm" className="border-white border-t-transparent" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span>CONFIRMAR Y PAGAR</span>
          </>
        )}
      </button>

      {/* Terms */}
      <p className="mt-3 text-center font-serif text-xs font-light text-text-tertiary">
        Al continuar, aceptas los Términos de Servicio y la Política de Reembolso de Oqupa.
        Reembolsos disponibles dentro de 48 horas.
      </p>
    </Modal>
  )
}
