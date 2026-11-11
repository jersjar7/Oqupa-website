import type { Demand as DemandData } from '../types'
import { fmt, moreDataText } from '../words'
import Section, { MoreData } from './Section'

/** Qué buscan en tu zona — the most-searched price range and searchers per listing, by district. */
export default function Demand({ demand: given, side }: { demand: DemandData | undefined; side: 'venta' | 'alquiler' }) {
  const demand: DemandData = given ?? { status: 'not-recorded' }
  const title = 'Qué buscan en tu zona'
  const subtitle = 'Personas buscando por cada propiedad publicada — donde hay más demanda que oferta, tu propiedad destaca más.'
  if (demand.status !== 'ok') {
    return (
      <Section title={title} subtitle={subtitle} testId="analytics-demand">
        <MoreData text={moreDataText('demand', demand)} />
      </Section>
    )
  }
  const rows = demand.districts
  const max = Math.max(1, ...rows.map((r) => r.perListing ?? 0))
  const range = demand.topRange
  return (
    <Section
      title={title}
      subtitle={subtitle}
      testId="analytics-demand"
      aside={range ? (
        <>Rango más buscado en {side}: <strong className="font-bold text-text-primary">
          {range[1] === null ? `desde S/ ${fmt(range[0])}` : `S/ ${fmt(range[0])} – ${fmt(range[1])}`}{side === 'alquiler' ? ' al mes' : ''}
        </strong></>
      ) : undefined}
    >
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.district} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate">{r.district}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <span className={`block h-full rounded-full ${r.perListing === null ? 'bg-primary' : 'bg-secondary'}`} style={{ width: `${r.perListing === null ? 100 : (r.perListing / max) * 100}%` }} />
            </span>
            <span className="text-right font-bold">
              {r.perListing === null ? `${fmt(r.searches)} búsquedas · ninguna propiedad` : fmt(r.perListing)}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
