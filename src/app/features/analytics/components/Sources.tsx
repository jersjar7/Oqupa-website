import type { Sources as SourcesData } from '../types'
import { moreDataText, SOURCE_LABELS } from '../words'
import Section, { MoreData } from './Section'

const VIA_ORDER = ['direct', 'whatsapp', 'facebook', 'google', 'other']

/** Desde dónde llegan — by arrival once it is recorded; App vs Web until then. */
export default function Sources({ sources }: { sources: SourcesData }) {
  if (sources.status !== 'ok') {
    return (
      <Section title="Desde dónde llegan" testId="analytics-sources">
        <MoreData text={moreDataText('sources', sources)} />
      </Section>
    )
  }
  const total = Object.values(sources.parts).reduce((s, n) => s + n, 0) || 1
  const keys = sources.kind === 'via'
    ? [...VIA_ORDER.filter((k) => sources.parts[k]), ...Object.keys(sources.parts).filter((k) => !VIA_ORDER.includes(k))]
    : ['app', 'web']
  const rows = keys.map((k) => ({ key: k, label: SOURCE_LABELS[k] ?? 'Otros', pct: Math.round(((sources.parts[k] || 0) / total) * 100) }))
  const topPct = Math.max(1, ...rows.map((r) => r.pct))
  return (
    <Section title="Desde dónde llegan" testId="analytics-sources">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="text-text-primary">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.pct / topPct) * 100}%` }} />
            </span>
            <span className="text-right font-bold text-text-primary">{r.pct}%</span>
          </li>
        ))}
      </ul>
      {sources.kind === 'platform' && (
        <p className="mt-4 font-serif text-xs font-light italic text-text-tertiary">
          {moreDataText('sources', { status: 'not-recorded' })} Mientras tanto, cuántas vistas llegaron por la app y por la web.
        </p>
      )}
    </Section>
  )
}
