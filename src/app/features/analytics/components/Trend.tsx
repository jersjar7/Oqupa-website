import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Marks } from '../types'
import type { TrendPoint } from '../selectors'
import { fmt, moreDataText, pronoun, shortDay } from '../words'
import { token } from '../tokens'
import Section from './Section'

const MARK_WORDS: Record<string, string> = {
  'price-down': 'Bajaste el precio',
  'price-up': 'Subiste el precio',
  photos: 'Fotos nuevas',
}
const LISTED_MARKS = 6

/** Se mostró/mostraron (left scale) and La/Lo/Las abrieron (right scale), per day, with change marks. */
export default function Trend({
  points, marks, many, propertyType, listingNames, fixedWidth,
}: {
  points: TrendPoint[]
  marks: Marks | undefined
  many: boolean
  propertyType?: string | null
  /** id → name, to say which listing a mark belongs to on the all-listings view. */
  listingNames: Record<string, string>
  /** On paper: a fixed width instead of measuring the screen. */
  fixedWidth?: number
}) {
  const shownWord = many ? 'Se mostraron' : 'Se mostró'
  const seenWord = `${many ? 'Las' : pronoun(propertyType) === 'lo' ? 'Lo' : 'La'} abrieron`
  const green = token('secondary')
  const orange = token('primary')
  const grid = token('border')
  const axis = token('ink-tertiary')

  // One mark per day and kind, whatever the number of listings it touched.
  const byDay = new Map<string, { day: string; kind: string; ids: string[] }>()
  for (const m of marks?.list ?? []) {
    const key = `${m.day}|${m.kind}`
    const hit = byDay.get(key)
    if (hit) hit.ids.push(m.listingId)
    else byDay.set(key, { day: m.day, kind: m.kind, ids: [m.listingId] })
  }
  const markList = [...byDay.values()]
  const last = points[points.length - 1]

  return (
    <Section
      title="Tendencia"
      testId="analytics-trend"
      aside={(
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 bg-secondary" />{shownWord}</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 bg-primary" />{seenWord} (escala derecha)</span>
        </span>
      )}
    >
      <div className="h-60 w-full" role="img" aria-label={`${shownWord} y ${seenWord.toLowerCase()} por día, del ${points[0] ? shortDay(points[0].day) : ''} al ${last ? shortDay(last.day) : ''}`}>
        <ResponsiveContainer width={fixedWidth ?? '100%'} height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="shown" allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <YAxis yAxisId="seen" orientation="right" allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              labelFormatter={(d) => shortDay(String(d))}
              formatter={(v, name) => [fmt(Number(v)), name === 'shown' ? shownWord : seenWord]}
            />
            <Area yAxisId="shown" type="monotone" dataKey="shown" stroke={green} strokeWidth={2} fill={green} fillOpacity={0.08} isAnimationActive={false} />
            <Line yAxisId="seen" type="monotone" dataKey="seen" stroke={orange} strokeWidth={2} dot={false} isAnimationActive={false} />
            {markList.map((m) => (
              <ReferenceLine
                key={`${m.day}-${m.kind}`}
                yAxisId="shown"
                x={m.day}
                stroke={axis}
                strokeDasharray="3 3"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* The same numbers for screen readers (break-it web 3 #3). */}
      <table className="sr-only">
        <caption>{shownWord} y {seenWord.toLowerCase()} por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">{shownWord}</th><th scope="col">{seenWord}</th></tr></thead>
        <tbody>
          {points.map((p) => <tr key={p.day}><th scope="row">{shortDay(p.day)}</th><td>{p.shown}</td><td>{p.seen}</td></tr>)}
        </tbody>
      </table>
      {/* Lines only on the chart (words there overlapped on phones); this list names each one. */}
      {markList.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-text-secondary">
          {markList.slice(-LISTED_MARKS).map((m) => (
            <li key={`${m.day}-${m.kind}`}>
              {shortDay(m.day)}: {(MARK_WORDS[m.kind] ?? '').toLowerCase()}
              {many ? ` — ${m.ids.map((id) => listingNames[id] ?? 'una propiedad').join(', ')}` : ''}
            </li>
          ))}
          {markList.length > LISTED_MARKS && <li>y {markList.length - LISTED_MARKS} cambios anteriores</li>}
        </ul>
      )}
      {!marks?.photosSince && (
        <p className="mt-3 font-serif text-xs font-light italic text-text-tertiary">
          Las líneas punteadas marcan los días en que cambiaste el precio. {moreDataText('marks', { status: 'not-recorded' })}
        </p>
      )}
    </Section>
  )
}
