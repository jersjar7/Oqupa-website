import type { ReactNode } from 'react'

/** The wizard's two buttons share this shape: big, bold, uppercase, tracked. */
export const WIZARD_BUTTON =
  'inline-flex h-14 items-center justify-center rounded-full px-6 font-sans text-base font-bold uppercase tracking-[1px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none'

interface WizardNavProps {
  onBack: () => void
  backDisabled?: boolean
  /** The last page's own action (PUBLICAR, GUARDAR CAMBIOS) in SIGUIENTE's place. */
  children?: ReactNode
}

/**
 * ATRÁS and SIGUIENTE at the foot of every wizard page (ADR-043, D1).
 * SIGUIENTE submits the page's form, so the page checks itself before moving
 * on; ATRÁS never checks anything and keeps what was typed.
 */
export default function WizardNav({ onBack, backDisabled = false, children }: WizardNavProps) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        className={`${WIZARD_BUTTON} flex-1 border-[1.5px] ${
          backDisabled ? 'border-black/20 text-black/20' : 'border-secondary text-secondary hover:border-secondary-hover hover:text-secondary-hover'
        }`}
      >
        Atrás
      </button>
      {children ?? (
        <button type="submit" className={`${WIZARD_BUTTON} flex-[2] bg-secondary text-white hover:bg-secondary-hover`}>
          Siguiente
        </button>
      )}
    </div>
  )
}
