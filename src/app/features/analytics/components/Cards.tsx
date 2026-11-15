import type { Block } from '../types'
import { changeText, fmt, openRate, pronoun } from '../words'

interface CardData {
  label: string
  value: string
  change: ReturnType<typeof changeText>
  note: string
  dot: string
}

function Card({ c }: { c: CardData }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-light">
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">{c.label}</p>
        <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.dot }} />
      </div>
      <p className="mt-2 font-serif text-[28px] font-normal leading-none text-text-primary">{c.value}</p>
      <p className="mt-2 text-sm text-text-secondary">
        {c.change && (
          <span className={`mr-1 font-medium ${c.change.up === false ? 'text-error-strong' : 'text-secondary'}`}>
            <span aria-hidden="true">{c.change.text}</span>
            <span className="sr-only">{c.change.text.replace('▲', 'sube').replace('▼', 'baja')}</span>
          </span>
        )}
        {c.note}
      </p>
    </div>
  )
}

/**
 * The six cards. Each change is against the period before, or absent when that
 * period started before counting began (the server sends previous = null).
 */
export default function Cards({
  block, saves, daysPublished, zoneDays, many, propertyType,
}: {
  block: Block
  /** Saves still standing (all time). */
  saves: number
  /** One listing: its days; several: the median over the active ones. */
  daysPublished: number | null
  /** Median days similar listings took to close, when the server had enough (one listing only). */
  zoneDays: number | null
  many: boolean
  propertyType?: string | null
}) {
  const t = block.totals
  const it = many ? 'Las' : pronoun(propertyType) === 'lo' ? 'Lo' : 'La'
  const p = block.previous
  // Vistas are not a subset of apariciones — a shared link opens a listing nobody
  // saw in a list — so more than 100% means "mostly arrives by link", not a rate (break-it web #4).
  const rawRate = openRate(t)
  const byLink = rawRate !== null && rawRate > 100
  const rate = byLink ? null : rawRate
  const prevRaw = p ? openRate(p) : null
  const prevRate = prevRaw !== null && prevRaw <= 100 ? prevRaw : null
  const rateChange = rate !== null && prevRate !== null
    ? (() => {
        const pts = Math.round((rate - prevRate) * 10) / 10
        if (pts === 0) return { text: 'igual', up: null }
        return { text: `${pts > 0 ? '▲' : '▼'} ${Math.abs(pts)} pts`, up: pts > 0 }
      })()
    : null

  const daysNote = (() => {
    if (daysPublished === null) return many ? 'ninguna activa' : 'no está activa'
    if (many) return 'mediana de tus propiedades activas'
    if (zoneDays === null) return 'días desde que la publicaste'
    const diff = zoneDays - daysPublished
    if (diff === 0) return 'igual que la zona'
    return diff > 0 ? `${diff} menos que la zona` : `${-diff} más que la zona`
  })()

  const cards: CardData[] = [
    { label: many ? 'Se mostraron' : 'Se mostró', value: fmt(t.shown), change: changeText(t.shown, p?.shown), note: 'veces', dot: 'var(--color-secondary)' },
    { label: `${it} abrieron`, value: fmt(t.seen), change: changeText(t.seen, p?.seen), note: 'veces', dot: 'var(--color-primary)' },
    { label: 'Pidieron tu número', value: fmt(t.contacts), change: changeText(t.contacts, p?.contacts), note: t.contacts === 1 ? 'persona' : 'personas', dot: 'var(--color-accent)' },
    { label: 'Guardados', value: fmt(saves), change: null, note: 'en total, hoy', dot: 'var(--color-secondary)' },
    { label: `${it} abren`, value: rate === null ? '—' : `${rate}%`, change: rateChange, note: byLink ? 'la mayoría llega por un enlace' : `de quienes ${it.toLowerCase()} ven`, dot: 'var(--color-primary)' },
    { label: 'Días publicado', value: daysPublished === null ? '—' : fmt(daysPublished), change: null, note: daysNote, dot: 'var(--color-accent)' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" data-testid="analytics-cards">
      {cards.map((c) => <Card key={c.label} c={c} />)}
    </div>
  )
}
