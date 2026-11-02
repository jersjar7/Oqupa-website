interface WizardStepperProps {
  label: string
  /** null: not given (an older listing); shown as —, and + gives `min`. */
  value: number | null
  min: number
  max: number
  onChange: (value: number) => void
  /** What the number reads as (0 dormitorios is "Monoambiente"). */
  display?: (value: number) => string
}

const STEP_BUTTON =
  'flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-secondary text-2xl font-medium leading-none text-secondary transition-colors hover:bg-secondary-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:border-border disabled:text-text-tertiary'

/** − value + for a count (ADR-043 D4). No box to type into, so no typing mistakes. */
export default function WizardStepper({ label, value, min, max, onChange, display }: WizardStepperProps) {
  const word = label.toLowerCase()
  const shown = value == null ? '—' : display ? display(value) : String(value)
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0 text-base text-text-primary">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Menos ${word}`}
          disabled={value == null || value <= min}
          onClick={() => value != null && onChange(Math.max(min, value - 1))}
          className={STEP_BUTTON}
        >
          <span aria-hidden="true">−</span>
        </button>
        <span
          data-testid={`stepper-${label}`}
          aria-live="polite"
          className={`min-w-[3rem] text-center font-serif font-normal text-text-primary ${shown.length > 3 ? 'text-base' : 'text-[22px]'}`}
        >
          {shown}
        </span>
        <button
          type="button"
          aria-label={`Más ${word}`}
          disabled={value != null && value >= max}
          onClick={() => onChange(value == null ? Math.max(min, 1) : Math.min(max, value + 1))}
          className={STEP_BUTTON}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}
