import { Link } from 'react-router-dom'
import type { PortfolioRow } from '../selectors'
import { fmt, noteText } from '../words'
import { imageUrl } from '@/lib/imageUrl'
import Section from './Section'

function Spark({ values, warn }: { values: number[]; warn: boolean }) {
  const max = Math.max(1, ...values)
  const w = 120
  const h = 28
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${values.length > 1 ? ((i / (values.length - 1)) * w).toFixed(1) : 0} ${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-28" aria-hidden="true">
      <path d={d} fill="none" style={{ stroke: warn ? 'var(--color-primary-hover)' : 'var(--color-secondary)' }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const TONE = {
  ok: 'bg-secondary-pale text-secondary-hover',
  warn: 'bg-cream-strong text-ink',
  neutral: 'bg-surface-muted text-text-secondary',
}

function Thumb({ photoKey }: { photoKey?: string | null }) {
  if (!photoKey) return <span aria-hidden="true" className="h-11 w-11 shrink-0 rounded-xl bg-surface-strong" />
  return <img src={imageUrl.thumbnail(photoKey)} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" loading="lazy" />
}

/** Tu cartera — one row per listing, sorted by vistas; a phone gets cards. */
export default function Portfolio({ rows, days, names = {} }: { rows: PortfolioRow[]; days: number; names?: Record<string, string> }) {
  const attention = rows.filter((r) => noteText(r.listing.note, r.listing.propertyType).tone === 'warn').length
  return (
    <Section
      title="Tu cartera"
      testId="analytics-portfolio"
      aside={attention ? `${attention} con algo que revisar` : undefined}
    >
      {/* Computer: a table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">
              <th className="py-2 pr-3 font-medium">Propiedad</th>
              <th className="px-3 py-2 text-right font-medium">Se mostró</th>
              <th className="px-3 py-2 text-right font-medium">La abrieron</th>
              <th className="px-3 py-2 text-right font-medium">Contactos</th>
              <th className="px-3 py-2 font-medium">{days} días</th>
              <th className="py-2 pl-3 font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const note = noteText(r.listing.note, r.listing.propertyType)
              return (
                <tr key={r.listing.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-3">
                    <Link to={`/property/${r.listing.id}`} className="flex items-center gap-3 hover:underline">
                      <Thumb photoKey={r.listing.photoKey} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-text-primary">{names[r.listing.id] ?? r.listing.name}</span>
                        <span className="block truncate text-xs text-text-secondary">{r.listing.sub}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(r.shown)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(r.seen)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(r.contacts)}</td>
                  <td className="px-3 py-3"><Spark values={r.spark} warn={note.tone === 'warn'} /></td>
                  <td className="py-3 pl-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${TONE[note.tone]}`}>{note.text}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const note = noteText(r.listing.note, r.listing.propertyType)
          return (
            <li key={r.listing.id} className="rounded-xl border border-border p-3">
              <Link to={`/property/${r.listing.id}`} className="flex items-center gap-3">
                <Thumb photoKey={r.listing.photoKey} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-text-primary">{names[r.listing.id] ?? r.listing.name}</span>
                  <span className="block truncate text-xs text-text-secondary">{r.listing.sub}</span>
                </span>
                <Spark values={r.spark} warn={note.tone === 'warn'} />
              </Link>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><dt className="text-[11px] uppercase tracking-wide text-text-secondary">Se mostró</dt><dd className="font-bold">{fmt(r.shown)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-text-secondary">La abrieron</dt><dd className="font-bold">{fmt(r.seen)}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-wide text-text-secondary">Contactos</dt><dd className="font-bold">{fmt(r.contacts)}</dd></div>
              </dl>
              <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${TONE[note.tone]}`}>{note.text}</span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
