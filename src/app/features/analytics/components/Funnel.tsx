import type { Block } from '../types'
import { funnelSteps } from '../selectors'
import { fmt, moreDataText, pronoun } from '../words'
import Section from './Section'

const COLORS = ['bg-secondary', 'bg-secondary/70', 'bg-accent', 'bg-primary', 'bg-primary-hover']

/** De verla a escribirte — each step's bar is its share of "Se mostraron" (square-root, so small steps stay visible). */
export default function Funnel({ totals, propertyType, many }: {
  totals: Block['totals']
  /** One listing: "La/Lo abrieron"; several: "Las abrieron". */
  propertyType?: string | null
  many: boolean
}) {
  const word = many ? 'Las' : pronoun(propertyType) === 'lo' ? 'Lo' : 'La'
  const steps = funnelSteps(totals).map((s) => ({ ...s, label: s.key === 'shown' ? (many ? 'Se mostraron' : 'Se mostró') : s.label.replace(/^La(s)? /, `${word} `) }))
  const top = Math.max(totals.shown, 1)
  return (
    <Section title="De verla a escribirte" testId="analytics-funnel">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-text-primary">{s.label}</span>
              <span className="font-bold text-text-primary">{s.value === null ? '—' : fmt(s.value)}</span>
            </div>
            {s.value === null ? (
              <p className="mt-1 font-serif text-xs font-light italic text-text-tertiary">
                {moreDataText('whatsapp', { status: 'not-recorded' })}
              </p>
            ) : (
              <>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${COLORS[i]}`}
                    style={{ width: `${s.value > 0 ? Math.min(100, Math.max(Math.sqrt(s.value / top) * 100, 3)) : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {i === 0
                    ? 'Cada vez que tu tarjeta estuvo 1 segundo en pantalla'
                    : s.ofPrevious === null
                      ? '—'
                      : s.key === 'seen' && s.ofPrevious > 100
                        ? 'Más veces de las que se mostró: muchas llegan por un enlace'
                        : `${s.ofPrevious}% de ${s.key === 'whatsapp' ? 'quienes pidieron tu número' : s.key === 'seen' ? `las veces que se ${many ? 'mostraron' : 'mostró'}` : `las veces que ${word.toLowerCase()} abrieron`}`}
                </p>
              </>
            )}
          </li>
        ))}
      </ol>
    </Section>
  )
}
