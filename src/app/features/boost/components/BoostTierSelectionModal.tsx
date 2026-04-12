import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal, Spinner } from '@/app/components/ui'
import { useBoostTiers } from '@/hooks/useBoost'
import type { BoostTier, BoostTierConfiguration } from '@/types/boost'

interface BoostTierSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (tier: BoostTier) => void
  isProcessing: boolean
}

export default function BoostTierSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
}: BoostTierSelectionModalProps) {
  const { data: tiers, isLoading: isLoadingTiers } = useBoostTiers()
  const [selectedTier, setSelectedTier] = useState<BoostTier>('fifteenDays')

  const selectedConfig = tiers?.find((t) => t.tier === selectedTier)

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        <h2 className="font-sans text-[28px] font-medium text-secondary">
          Destaca tu publicación
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Aparece primero en búsquedas y destaca en el mapa
        </p>
      </div>

      {/* Tier cards */}
      <div className="mt-6 space-y-3">
        {isLoadingTiers ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          tiers?.map((tier) => (
            <TierCard
              key={tier.tier}
              config={tier}
              isSelected={selectedTier === tier.tier}
              onSelect={() => setSelectedTier(tier.tier)}
            />
          ))
        )}
      </div>

      {/* Benefits */}
      <div className="mt-6 space-y-2">
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Aparece primero en los resultados de búsqueda</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Insignia &quot;Destacado&quot; visible para todos</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Mayor visibilidad en el mapa</span>
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={() => onConfirm(selectedTier)}
        disabled={isProcessing || isLoadingTiers}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isProcessing ? (
          <>
            <Spinner size="sm" className="border-white border-t-transparent" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            <span>
              Confirmar y Pagar
              {selectedConfig ? ` — S/. ${selectedConfig.feeInSoles.toFixed(2)}` : ''}
            </span>
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

function TierCard({
  config,
  isSelected,
  onSelect,
}: {
  config: BoostTierConfiguration
  isSelected: boolean
  onSelect: () => void
}) {
  const isPopular = config.tier === 'fifteenDays'
  const isBestValue = config.tier === 'thirtyDays'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
        isSelected
          ? 'border-amber-500 bg-amber-50'
          : 'border-border bg-white hover:border-gray-300'
      }`}
    >
      {/* Radio indicator */}
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? 'border-amber-500' : 'border-gray-400'
        }`}
      >
        {isSelected && (
          <div className="h-3 w-3 rounded-full bg-amber-500" />
        )}
      </div>

      {/* Tier info */}
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-text-primary">
            {config.displayName}
          </span>
          {isPopular && (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-600">
              MAS POPULAR
            </span>
          )}
          {isBestValue && (
            <span className="rounded bg-secondary/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-secondary">
              MEJOR VALOR
            </span>
          )}
        </div>
        <span className="text-[11px] text-text-tertiary">
          S/. {(config.feeInSoles / config.durationDays).toFixed(2)}/dia
        </span>
      </div>

      {/* Price */}
      <span className="text-lg font-bold text-secondary">
        S/. {config.feeInSoles.toFixed(2)}
      </span>
    </button>
  )
}
