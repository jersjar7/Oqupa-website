import { useState } from 'react'
import { AMENITIES_SHOWN_FIRST, amenitySuggestions, customAmenityError } from '@/lib/amenities'

interface WizardAmenitiesProps {
  chosen: string[]
  isShortStay: boolean
  onChange: (chosen: string[]) => void
}

function chipClass(on: boolean) {
  return `inline-flex min-h-12 items-center rounded-full border-[1.5px] px-4 text-base transition-colors ${
    on ? 'border-secondary bg-secondary font-medium text-white' : 'border-border bg-white text-text-secondary hover:border-secondary/40'
  }`
}

/** "¿Qué tiene?" (ADR-043 D12): the app's chips, its "Más (N)" and its typed extra. */
export default function WizardAmenities({ chosen, isShortStay, onChange }: WizardAmenitiesProps) {
  const [showAll, setShowAll] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  const suggestions = amenitySuggestions(isShortStay)
  const first = suggestions.slice(0, AMENITIES_SHOWN_FIRST)
  const rest = suggestions.slice(AMENITIES_SHOWN_FIRST)
  // Chosen ones stay in view when the list is folded.
  const restShown = showAll ? rest : rest.filter((a) => chosen.includes(a))
  const hidden = rest.length - restShown.length
  const custom = chosen.filter((a) => !suggestions.includes(a))

  const toggle = (a: string) => onChange(chosen.includes(a) ? chosen.filter((x) => x !== a) : [...chosen, a])

  function add() {
    const problem = customAmenityError(typed, chosen)
    setError(problem)
    if (problem) return
    onChange([...chosen, typed.trim()])
    setTyped('')
  }

  const chip = (a: string) => (
    <button key={a} type="button" aria-pressed={chosen.includes(a)} onClick={() => toggle(a)} className={chipClass(chosen.includes(a))}>
      {a}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {first.map(chip)}
        {restShown.map(chip)}
        {rest.length > 0 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className={chipClass(false)}>
            {showAll ? 'Menos' : `Más (${hidden})`}
          </button>
        )}
        {custom.map(chip)}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={typed}
          placeholder="Agregar otra (máx. 3 palabras)"
          aria-label="Agregar otra (máx. 3 palabras)"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className={`min-h-12 w-full rounded-xl border bg-white px-4 text-base text-text-primary placeholder:text-text-tertiary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 ${
            error ? 'border-error' : 'border-border'
          }`}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Agregar"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-secondary text-2xl text-secondary hover:bg-secondary-pale"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  )
}
