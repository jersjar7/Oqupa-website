import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Marks } from '../types'
import type { TrendPoint } from '../selectors'
import { fmt, moreDataText, shortDay } from '../words'
import Section from './Section'

const GREEN = '#3A6A55' // --color-secondary (recharts needs literal colours)
const ORANGE = '#F47843' // --color-primary
const GRID = '#E8E0D6' // --color-border
const AXIS = '#737373' // --color-ink-tertiary

const MARK_WORDS: Record<string, string> = {
  'price-down': 'Bajaste el precio',
  'price-up': 'Subiste el precio',
  photos: 'Fotos nuevas',
}

/** Se mostraron (left scale) and Las abrieron (right scale), per day, with change marks. */
export default function Trend({ points, marks }: { points: TrendPoint[]; marks: Marks }) {
  const markList = marks.list
  const last = points[points.length - 1]
  return (
    <Section
      title="Tendencia"
      testId="analytics-trend"
      aside={(
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 bg-secondary" />Se mostraron</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-0.5 w-4 bg-primary" />Las abrieron (escala derecha)</span>
        </span>
      )}
    >
      <div className="h-60 w-full" role="img" aria-label={`Se mostraron y las abrieron por día, del ${points[0] ? shortDay(points[0].day) : ''} al ${last ? shortDay(last.day) : ''}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="shown" allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <YAxis yAxisId="seen" orientation="right" allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              labelFormatter={(d) => shortDay(String(d))}
              formatter={(v, name) => [fmt(Number(v)), name === 'shown' ? 'Se mostraron' : 'Las abrieron']}
            />
            <Area yAxisId="shown" type="monotone" dataKey="shown" stroke={GREEN} strokeWidth={2} fill={GREEN} fillOpacity={0.08} isAnimationActive={false} />
            <Line yAxisId="seen" type="monotone" dataKey="seen" stroke={ORANGE} strokeWidth={2} dot={false} isAnimationActive={false} />
            {markList.map((m) => (
              <ReferenceLine
                key={`${m.day}-${m.kind}-${m.listingId}`}
                yAxisId="shown"
                x={m.day}
                stroke={AXIS}
                strokeDasharray="3 3"
                label={{ value: MARK_WORDS[m.kind] ?? '', position: 'insideTop', fill: AXIS, fontSize: 11 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!marks.photosSince && (
        <p className="mt-3 font-serif text-xs font-light italic text-text-tertiary">
          Las líneas punteadas marcan los días en que cambiaste el precio. {moreDataText('marks', { status: 'not-recorded' })}
        </p>
      )}
    </Section>
  )
}

