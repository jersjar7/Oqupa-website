import type { Demand as DemandData } from '../types'
import { fmt, moreDataText } from '../words'
import Section, { MoreData } from './Section'

/** Qué buscan en tu zona — the most-searched price range and searchers per listing, by district. */
export default function Demand({ demand, side }: { demand: DemandData; side: 'venta' | 'alquiler' }) {
  const title = 'Qué buscan en tu zona'
  const subtitle = 'Personas buscando por cada propiedad publicada — donde hay más demanda que oferta, tu propiedad destaca más.'
  if (demand.status !== 'ok') {
    return (
      <Section title={title} subtitle={subtitle} testId="analytics-demand">
        <MoreData text={moreDataText('demand', demand)} />
      </Section>
    )
  }
  const rows = Object.entries(demand.perListing).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return (
    <Section
      title={title}
      subtitle={subtitle}
      testId="analytics-demand"
      aside={(
        <>Rango más buscado en {side}: <strong className="font-bold text-text-primary">S/ {fmt(demand.topRange[0])} – {fmt(demand.topRange[1])}{side === 'alquiler' ? ' al mes' : ''}</strong></>
      )}
    >
      <ul className="space-y-2">
        {rows.map(([district, n]) => (
          <li key={district} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate">{district}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-secondary" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="text-right font-bold">{fmt(Math.round(n * 10) / 10)}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
