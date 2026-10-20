import { useMemo, useState, type ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardSeries, SeriesListing } from '@/hooks/useDashboardSeries'
import {
  inRange,
  rangePoints,
  rangeStat,
  rankBy,
  shortDay,
  type DailySeries,
  type RangeKey,
  type SeriesKind,
  type Stat,
} from '../lib/series'
import { summarizeCloses } from '../lib/closes'

// Same brand pair as the rest of the page: warm for supply and money, cool for
// demand. The dashboard has no dark mode, like the rest of the site.
const SUPPLY = '#F47843'
const DEMAND = '#3A6A55'
const GRID = '#EFE8DF'
const AXIS = '#8E8E93'

type TabKey = 'resumen' | 'buscadores' | 'oferta' | 'cierres' | 'dinero' | 'publicidad'

const TABS: Array<{ key: TabKey; label: string; question: string }> = [
  { key: 'resumen', label: 'Resumen', question: '¿Cómo va Oqupa?' },
  { key: 'buscadores', label: 'Buscadores', question: '¿Llegan personas buscando, y escriben?' },
  { key: 'oferta', label: 'Oferta', question: '¿Qué se publica, dónde, y recibe contactos?' },
  { key: 'cierres', label: 'Cierres', question: '¿Se vende y se alquila gracias a Oqupa?' },
  { key: 'dinero', label: 'Dinero', question: '¿Alguien paga por un boost?' },
  { key: 'publicidad', label: 'Publicidad', question: '¿Lo que gastamos en anuncios trae gente?' },
]

const RANGES: Array<{ key: RangeKey; label: string; words: string }> = [
  { key: '7', label: '7 días', words: 'últimos 7 días' },
  { key: '30', label: '30 días', words: 'últimos 30 días' },
  { key: '90', label: '90 días', words: 'últimos 90 días' },
  { key: 'all', label: 'Todo', words: 'desde el inicio' },
]

const STORAGE_KEY = 'oqupa:numeros-view'

function loadView(): { tab: TabKey; range: RangeKey } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { tab?: TabKey; range?: RangeKey }
    return {
      tab: TABS.some((t) => t.key === saved.tab) ? (saved.tab as TabKey) : 'resumen',
      range: RANGES.some((r) => r.key === saved.range) ? (saved.range as RangeKey) : '30',
    }
  } catch {
    return { tab: 'resumen', range: '30' }
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

const num = (v: number | null, digits = 0) =>
  v === null ? '—' : v.toLocaleString('es-PE', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function Change({ stat, digits = 0, prefix = '' }: { stat: Stat; digits?: number; prefix?: string }) {
  if (stat.value === null || stat.previous === null) return null
  const diff = stat.value - stat.previous
  if (Math.abs(diff) < 1e-9) return <>igual que el periodo anterior</>
  return (
    <>
      <span className={`font-bold ${diff > 0 ? 'text-secondary' : 'text-error'}`}>
        {diff > 0 ? '↑' : '↓'} {prefix}
        {num(Math.abs(diff), digits)}
      </span>{' '}
      vs periodo anterior ({prefix}
      {num(stat.previous, digits)})
    </>
  )
}

// ─── Building blocks ────────────────────────────────────────────────────────

function Source({ estimated }: { estimated?: boolean }) {
  return (
    <span
      className={`ml-1.5 rounded px-1.5 py-px align-[1px] font-sans text-[10px] font-bold uppercase tracking-wide ${
        estimated ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
      }`}
    >
      {estimated ? 'estimado' : 'medido'}
    </span>
  )
}

interface GlanceItem {
  label: string
  value: string
  detail?: ReactNode
}

/** The one card per tab: the numbers to take in at a glance. */
function Glance({ items, footnote }: { items: GlanceItem[]; footnote?: ReactNode }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-border bg-white p-5 shadow-light sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <span className="font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {item.label}
            </span>
            <span className="font-serif text-[28px] leading-tight tabular-nums text-text-primary">{item.value}</span>
            {item.detail && <span className="font-sans text-xs text-text-secondary">{item.detail}</span>}
          </div>
        ))}
      </div>
      {footnote && <p className="mt-3 font-sans text-sm text-text-primary">{footnote}</p>}
    </>
  )
}

function Section({ title, note, estimated, children }: {
  title: string
  note: ReactNode
  estimated?: boolean
  children: ReactNode
}) {
  return (
    <section className="border-t border-border pb-5 pt-4">
      <h3 className="font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {title}
        <Source estimated={estimated} />
      </h3>
      <p className="mb-2 mt-0.5 font-sans text-xs text-text-tertiary">{note}</p>
      {children}
    </section>
  )
}

function Trend({ series, kind = 'sum', color = DEMAND, range, today, prefix = '', digits }: {
  series: DailySeries
  kind?: SeriesKind
  color?: string
  range: RangeKey
  today: string
  prefix?: string
  digits?: number
}) {
  const { points, bucketDays } = useMemo(() => rangePoints(series, kind, range, today), [series, kind, range, today])
  const shown = digits ?? (kind === 'avg' || prefix ? 1 : 0)
  const data = points.map((p) => ({ day: shortDay(p.day), value: p.value }))
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" stroke={AXIS} fontSize={11} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} />
          <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={kind === 'avg' || Boolean(prefix)} width={48} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: `1px solid ${GRID}`, fontSize: 12 }}
            labelFormatter={(label) => (bucketDays === 7 ? `Semana al ${label}` : String(label))}
            formatter={(v) => [`${prefix}${num(Number(v), shown)}`, kind === 'avg' ? 'Por día' : 'Total']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.12}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Ranked({ rows, color = DEMAND, format = (v: number) => num(v) }: {
  rows: Array<[string, number]>
  color?: string
  format?: (v: number) => string
}) {
  if (rows.length === 0) return <p className="font-sans text-sm text-text-secondary">Nada en este periodo.</p>
  const max = Math.max(...rows.map((r) => r[1]))
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr_56px] items-center gap-3 font-sans text-[13px]">
          <span className="truncate">{label}</span>
          <span className="h-2 overflow-hidden rounded bg-background-secondary">
            <span className="block h-full rounded" style={{ width: `${Math.max(3, (value / max) * 100)}%`, background: color }} />
          </span>
          <span className="text-right font-medium tabular-nums">{format(value)}</span>
        </div>
      ))}
    </div>
  )
}

const Charts = ({ children }: { children: ReactNode }) => (
  <div className="mt-7 grid grid-cols-1 gap-x-10 lg:grid-cols-2">{children}</div>
)

const NoAnalytics = () => (
  <p className="font-sans text-sm text-text-secondary">Sin datos de Google Analytics en este entorno.</p>
)

// ─── Tabs ───────────────────────────────────────────────────────────────────

interface TabProps {
  data: DashboardSeries
  range: RangeKey
}

function useActiveListings(listings: SeriesListing[]) {
  return useMemo(() => {
    const active = listings.filter((l) => l.active)
    return { active, neverContacted: active.filter((l) => !l.contacted).length, neverViewed: active.filter((l) => !l.viewed).length }
  }, [listings])
}

function Resumen({ data, range }: TabProps) {
  const { series: s, analytics: ga, today } = data
  const { active, neverContacted } = useActiveListings(data.listings)
  const contacts = rangeStat(s.contactsReal, 'sum', range, today)
  const installs = ga ? rangeStat(ga.installs, 'sum', range, today) : null
  const web = ga ? rangeStat(ga.webUsers, 'avg', range, today) : null
  const accounts = rangeStat(s.accountsNew, 'sum', range, today)
  const listings = rangeStat(s.activeListings, 'level', range, today)
  const spend = rangeStat(s.spendUSD, 'sum', range, today)
  return (
    <>
      <Glance
        items={[
          { label: 'Contactos reales', value: num(contacts.value), detail: <Change stat={contacts} /> },
          { label: 'Instalaciones', value: num(installs?.value ?? null), detail: installs && <Change stat={installs} /> },
          { label: 'Visitantes web por día', value: num(web?.value ?? null, 1), detail: web && <Change stat={web} digits={1} /> },
          { label: 'Cuentas nuevas', value: num(accounts.value), detail: <Change stat={accounts} /> },
          { label: 'Listados activos', value: num(active.length), detail: <Change stat={listings} /> },
          { label: 'Gasto en Meta', value: `$${num(spend.value, 2)}`, detail: <Change stat={spend} digits={2} prefix="$" /> },
        ]}
        footnote={
          <>
            <b>Para mirar:</b> {neverContacted} de los {active.length} listados activos nunca recibieron un contacto.
          </>
        }
      />
      <Charts>
        <Section title="Contactos reales" note={`Números de WhatsApp desbloqueados por personas fuera del equipo. Registro desde el ${shortDay(data.since.contactLog ?? today)}.`}>
          <Trend series={s.contactsReal} range={range} today={today} />
        </Section>
        <Section title="Instalaciones" note="Primera apertura de la app, Android + iPhone, invitados incluidos.">
          {ga ? <Trend series={ga.installs} range={range} today={today} /> : <NoAnalytics />}
        </Section>
      </Charts>
    </>
  )
}

function Buscadores({ data, range }: TabProps) {
  const { series: s, analytics: ga, today } = data
  const views = rangeStat(s.views, 'sum', range, today)
  const contacts = rangeStat(s.contactsReal, 'sum', range, today)
  const app = ga ? rangeStat(ga.appUsers, 'avg', range, today) : null
  const uninstalls = ga ? rangeStat(ga.uninstalls, 'sum', range, today) : null
  const per100 = views.value ? ((contacts.value ?? 0) / views.value) * 100 : null
  return (
    <>
      <Glance
        items={[
          { label: 'Vistas a listados', value: num(views.value), detail: <Change stat={views} /> },
          { label: 'Contactos reales', value: num(contacts.value), detail: <Change stat={contacts} /> },
          { label: 'Contactos por cada 100 vistas', value: num(per100, 1), detail: 'en el periodo' },
          { label: 'Usuarios de la app por día', value: num(app?.value ?? null, 1), detail: app && <Change stat={app} digits={1} /> },
          { label: 'Desinstalaciones (Android)', value: num(uninstalls?.value ?? null), detail: uninstalls && <Change stat={uninstalls} /> },
        ]}
      />
      <Charts>
        <Section title="Vistas a listados" note="App + web. La misma persona cuenta otra vez después de 1 hora.">
          <Trend series={s.views} range={range} today={today} />
        </Section>
        <Section title="Contactos reales" note="Sin las cuentas del equipo.">
          <Trend series={s.contactsReal} range={range} today={today} color={SUPPLY} />
        </Section>
        <Section title="Visitantes de la web por día" note="Personas distintas cada día en oqupa.com.">
          {ga ? <Trend series={ga.webUsers} kind="avg" range={range} today={today} /> : <NoAnalytics />}
        </Section>
        <Section title="Usuarios de la app por día" note="Android + iPhone.">
          {ga ? <Trend series={ga.appUsers} kind="avg" range={range} today={today} /> : <NoAnalytics />}
        </Section>
        <Section title="Desinstalaciones" note="Solo Android: iPhone no informa este dato.">
          {ga ? <Trend series={ga.uninstalls} range={range} today={today} color={SUPPLY} /> : <NoAnalytics />}
        </Section>
      </Charts>
    </>
  )
}

function Oferta({ data, range }: TabProps) {
  const { series: s, today } = data
  const { active, neverContacted, neverViewed } = useActiveListings(data.listings)
  const level = rangeStat(s.activeListings, 'level', range, today)
  const published = data.listings.filter((l) => inRange(l.day, range, today))
  const words = RANGES.find((r) => r.key === range)?.words ?? ''
  return (
    <>
      <Glance
        items={[
          { label: 'Listados activos hoy', value: num(active.length), detail: <Change stat={level} /> },
          { label: 'Publicados en el periodo', value: num(published.length), detail: words },
          {
            label: 'Activos nunca contactados',
            value: num(neverContacted),
            detail: active.length ? `${Math.round((neverContacted / active.length) * 100)} % de los activos` : undefined,
          },
          { label: 'Activos sin ninguna vista', value: num(neverViewed), detail: 'nadie los abrió' },
        ]}
      />
      <Charts>
        <Section title="Listados activos" note="Total al final de cada día o semana.">
          <Trend series={s.activeListings} kind="level" range={range} today={today} color={SUPPLY} />
        </Section>
        <Section title="Publicados por distrito" note={`Listados publicados, ${words}. Nombres unificados aunque estén escritos distinto.`}>
          <Ranked rows={rankBy(published, (l) => l.district)} color={SUPPLY} />
        </Section>
        <Section title="Publicados por tipo" note={words}>
          <Ranked rows={rankBy(published, (l) => l.type)} />
        </Section>
        <Section title="Venta o alquiler" note={words}>
          <Ranked
            rows={rankBy(published, (l) => (l.operation === 'venta' ? 'Venta' : l.operation === 'alquiler' ? 'Alquiler' : null))}
            color={SUPPLY}
          />
        </Section>
      </Charts>
    </>
  )
}

function Cierres({ data, range }: TabProps) {
  const closed = data.closed ?? { sold: 0, rented: 0 }
  const { answered, viaOqupa, channels, comments, commentsHidden } = summarizeCloses(data.closeSurveys, data.closeCounts, range, data.today)
  const yes = viaOqupa.find(([label]) => label === 'Sí')?.[1] ?? 0
  const words = RANGES.find((r) => r.key === range)?.words ?? ''
  return (
    <>
      <Glance
        items={[
          { label: 'Vendidos ahora', value: num(closed.sold), detail: 'al cierre de anoche' },
          { label: 'Alquilados ahora', value: num(closed.rented), detail: 'al cierre de anoche' },
          { label: 'Respuestas', value: num(answered), detail: words },
          {
            label: 'Gracias a Oqupa',
            value: num(yes),
            detail: answered ? `${Math.round((yes / answered) * 100)} % de las respuestas` : undefined,
          },
        ]}
        footnote="Se pregunta justo después de marcar Vendido o Alquilado, en la app y en la web. Un listado que vuelve a publicarse deja de contar como vendido o alquilado; su respuesta se queda."
      />
      <Charts>
        <Section title="¿Gracias a Oqupa?" note={words}>
          <Ranked rows={viaOqupa} color={SUPPLY} />
        </Section>
        <Section title="Dónde, si no fue Oqupa" note={words}>
          <Ranked rows={channels} />
        </Section>
      </Charts>
      <Section title="Comentarios" note={`Lo que nos dijeron, ${words}. Texto libre: puede incluir datos personales — no lo compartas fuera del equipo.`}>
        {comments.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary">Nada en este periodo.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c, i) => (
              <li key={i} className="rounded-xl border border-border bg-white p-4">
                <p className="font-serif text-xs font-light italic text-text-secondary">
                  {c.day} · {c.outcome} · {c.answer}
                </p>
                <p className="mt-1 whitespace-pre-line font-sans text-sm text-text-primary">{c.text}</p>
              </li>
            ))}
          </ul>
        )}
        {commentsHidden > 0 && (
          <p className="mt-3 font-serif text-xs font-light italic text-text-secondary">
            {commentsHidden} comentario{commentsHidden !== 1 ? 's' : ''} más no cabe{commentsHidden !== 1 ? 'n' : ''} en esta página. Pídeselos a Claude.
          </p>
        )}
      </Section>
    </>
  )
}

function Dinero({ data, range }: TabProps) {
  const { series: s, today } = data
  const revenue = rangeStat(s.revenuePEN, 'sum', range, today)
  const started = rangeStat(s.checkoutsStarted, 'sum', range, today)
  const paid = rangeStat(s.checkoutsPaid, 'sum', range, today)
  return (
    <>
      <Glance
        items={[
          { label: 'Ingresos por boost', value: `S/ ${num(revenue.value, 2)}`, detail: 'pagos completados, sin el equipo' },
          { label: 'Empezaron a pagar', value: num(started.value), detail: <Change stat={started} /> },
          { label: 'Terminaron de pagar', value: num(paid.value), detail: <Change stat={paid} /> },
        ]}
        footnote="Cuántos ven la oferta de boost y en qué paso abandonan el pago llega con el plan de métricas."
      />
      <Charts>
        <Section title="Pagos de boost abiertos" note="Personas fuera del equipo que empezaron a pagar.">
          <Trend series={s.checkoutsStarted} range={range} today={today} color={SUPPLY} />
        </Section>
        <Section title="Ingresos por boost" note="Soles cobrados, sin pagos del equipo.">
          <Trend series={s.revenuePEN} range={range} today={today} color={SUPPLY} prefix="S/ " digits={2} />
        </Section>
      </Charts>
    </>
  )
}

function Publicidad({ data, range }: TabProps) {
  const { series: s, analytics: ga, today } = data
  const spend = rangeStat(s.spendUSD, 'sum', range, today)
  const metaInstalls = ga ? rangeStat(ga.metaInstalls, 'sum', range, today) : null
  const contacts = rangeStat(s.contactsReal, 'sum', range, today)
  const perInstall = metaInstalls?.value ? (spend.value ?? 0) / metaInstalls.value : null
  const perContact = contacts.value ? (spend.value ?? 0) / contacts.value : null
  const sources = useMemo(() => {
    if (!ga) return []
    const totals = new Map<string, number>()
    for (const [day, bySource] of Object.entries(ga.installsBySource)) {
      if (!inRange(day, range, today)) continue
      for (const [source, n] of Object.entries(bySource)) totals.set(source, (totals.get(source) ?? 0) + n)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [ga, range, today])
  const metaCount = data.metaReported?.installs
  const ourCount = ga ? rangeStat(ga.metaInstalls, 'sum', 'all', today).value : null
  return (
    <>
      <Glance
        items={[
          { label: 'Gasto en Meta', value: `$${num(spend.value, 2)}`, detail: <Change stat={spend} digits={2} prefix="$" /> },
          { label: 'Instalaciones desde Meta', value: num(metaInstalls?.value ?? null), detail: 'Facebook + Instagram, según nuestra analítica' },
          { label: 'Costo por instalación', value: perInstall === null ? '—' : `$${num(perInstall, 2)}`, detail: 'gasto ÷ instalaciones desde Meta' },
          {
            label: 'Costo por contacto real',
            value: perContact === null ? '—' : `$${num(perContact)}`,
            detail: <>supone que el anuncio trajo a esa persona <Source estimated /></>,
          },
        ]}
        footnote={
          metaCount !== undefined && ourCount !== null
            ? `Meta reporta ${num(metaCount)} instalaciones en total; nuestra analítica cuenta ${num(ourCount)} que llegaron desde Facebook o Instagram.`
            : undefined
        }
      />
      <Charts>
        <Section title="Gasto en Meta" note="Dólares por día o semana.">
          <Trend series={s.spendUSD} range={range} today={today} color={SUPPLY} prefix="$" digits={2} />
        </Section>
        <Section title="Instalaciones desde Meta" note="Primera apertura con origen Facebook o Instagram.">
          {ga ? <Trend series={ga.metaInstalls} range={range} today={today} /> : <NoAnalytics />}
        </Section>
        <Section title="De dónde llegan las instalaciones" note={RANGES.find((r) => r.key === range)?.words ?? ''}>
          {ga ? <Ranked rows={sources} /> : <NoAnalytics />}
        </Section>
      </Charts>
    </>
  )
}

const PANELS: Record<TabKey, (props: TabProps) => ReactNode> = {
  resumen: Resumen,
  buscadores: Buscadores,
  oferta: Oferta,
  cierres: Cierres,
  dinero: Dinero,
  publicidad: Publicidad,
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function NumbersDashboard({ data }: { data: DashboardSeries }) {
  const [{ tab, range }, setView] = useState(loadView)
  const update = (next: Partial<{ tab: TabKey; range: RangeKey }>) =>
    setView((prev) => {
      const view = { ...prev, ...next }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(view))
      } catch {
        // Private mode: the choice just isn't remembered.
      }
      return view
    })
  const current = TABS.find((t) => t.key === tab) ?? TABS[0]!
  const Panel = PANELS[current.key]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-0 z-10 -mx-1 mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-1">
        <div role="tablist" aria-label="Secciones de Números" className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => update({ tab: t.key })}
              className={`whitespace-nowrap border-b-2 px-3 py-3.5 font-sans text-xs font-bold uppercase tracking-[1px] transition-colors ${
                tab === t.key ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Periodo" className="my-1.5 flex rounded-full border border-border bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => update({ range: r.key })}
              className={`rounded-full px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                range === r.key ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="mb-4 font-serif text-xl font-normal text-text-primary">{current.question}</h2>
      <Panel data={data} range={range} />

      <p className="mt-8 font-sans text-xs text-text-tertiary">
        Sin las cuentas del equipo. Fuentes: analítica de la app y la web
        {data.since.analytics ? ` (desde el ${shortDay(data.since.analytics)})` : ''}, registro de contactos del servidor
        {data.since.contactLog ? ` (desde el ${shortDay(data.since.contactLog)})` : ''}, resumen diario
        {data.since.snapshots ? ` (desde el ${shortDay(data.since.snapshots)})` : ''}, pagos y Meta Ads. Actualizado cada
        noche; última vez el {shortDay(data.today)}.
      </p>
    </div>
  )
}
