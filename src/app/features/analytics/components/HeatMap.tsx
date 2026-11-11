import type { Heat } from '../types'
import { bestTimeText, DAY_SHORT, moreDataText, slotText } from '../words'
import Section, { MoreData } from './Section'

/** Cuándo miran tus propiedades — 7 days × 12 two-hour slots, Lima time. */
export default function HeatMap({ heat: given }: { heat: Heat | undefined }) {
  const heat: Heat = given ?? { status: 'too-few', n: 0, min: 20 }
  if (heat.status !== 'ok' || !Array.isArray(heat.cells) || heat.cells.length !== 84) {
    return (
      <Section title="Cuándo miran tus propiedades" testId="analytics-heat">
        <MoreData text={moreDataText('heat', heat.status === 'ok' ? { status: 'too-few', n: heat.n, min: 20 } : heat)} />
      </Section>
    )
  }
  const max = Math.max(1, ...heat.cells)
  const rows = Array.from({ length: 7 }, (_, d) => heat.cells.slice(d * 12, d * 12 + 12))
  return (
    <Section
      title="Cuándo miran tus propiedades"
      testId="analytics-heat"
      subtitle={<>Más interés <strong className="font-medium text-text-primary">{bestTimeText(heat.best)}</strong> — buen momento para compartir tu anuncio.</>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1" aria-label="Vistas por día de la semana y hora">
          <tbody>
            {rows.map((row, d) => (
              <tr key={DAY_SHORT[d]}>
                <th scope="row" className="w-10 pr-1 text-left text-xs font-normal text-text-secondary">{DAY_SHORT[d]}</th>
                {row.map((n, s) => (
                  <td
                    key={s}
                    title={`${DAY_SHORT[d]} ${slotText(s)}: ${n} ${n === 1 ? 'vista' : 'vistas'}`}
                    className="h-7 rounded-md"
                    style={{ background: n ? `color-mix(in srgb, var(--color-secondary) ${Math.round(12 + (n / max) * 85)}%, transparent)` : 'var(--color-surface-muted)' }}
                  >
                    <span className="sr-only">{n}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {Array.from({ length: 12 }, (_, s) => (
                <td key={s} className="text-left text-[11px] text-text-tertiary">{s % 2 === 0 ? `${s * 2} h` : ''}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  )
}
