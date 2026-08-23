import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { InfoTip, Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useNumbersData, type MetricsSnapshot } from '@/hooks/useNumbersData'

// Brand tokens (mirrors src/index.css). Two series max on any chart: warm
// primary for the "supply / money" side, cool secondary for the "demand" side.
const COLORS = {
  primary: '#F47843',
  secondary: '#3A6A55',
  grid: '#EFE8DF',
  axis: '#8E8E93',
}

const SPARKLINE_DAYS = 30

// ─── Formatting ─────────────────────────────────────────────────────────────

function formatPEN(amount: number): string {
  return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUSD(amount: number): string {
  return `$ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-PE')
}

function formatPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

function titleCase(s: string): string {
  return s.replace(/\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}

// ─── Small building blocks ──────────────────────────────────────────────────

interface SparkPoint {
  date: string
  value: number | null
}

/** A 30-day trend strip inside a tile. No axes, no tooltip — the tile's number
 *  is the value; the strip only shows direction. */
function Sparkline({ data, color }: { data: SparkPoint[]; color: string }) {
  const hasTwoPoints = data.filter((d) => d.value !== null).length >= 2
  if (!hasTwoPoints) return <div className="h-9" aria-hidden="true" />
  return (
    <div className="h-9 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <Line
            type="stepAfter"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface KpiTileProps {
  label: string
  value: string
  /** Week-over-week change, shown as the first thing under the number. */
  delta?: string
  /** Supporting detail in muted ink. */
  secondary?: string
  spark?: SparkPoint[]
  sparkColor?: string
  /** Plain-language explanation of how to read this number. */
  help?: string
}

function KpiTile({ label, value, delta, secondary, spark, sparkColor, help }: KpiTileProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-light">
      <div className="flex items-center font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {label}
        {help && <InfoTip text={help} />}
      </div>
      <div className="mt-2 font-sans text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </div>
      {delta && (
        <div className="mt-1 font-sans text-sm font-medium text-secondary">{delta}</div>
      )}
      {secondary && (
        <div className="mt-0.5 font-sans text-xs text-text-tertiary">{secondary}</div>
      )}
      {spark && (
        <div className="mt-auto pt-3">
          <Sparkline data={spark} color={sparkColor ?? COLORS.primary} />
        </div>
      )}
    </div>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  heightClass?: string
  /** Plain-language explanation of how to read this chart. */
  help?: string
  children: React.ReactNode
}

function ChartCard({ title, subtitle, heightClass = 'h-64', help, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-light">
      <h2 className="flex items-center font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        {title}
        {help && <InfoTip text={help} />}
      </h2>
      {subtitle && (
        <p className="mt-0.5 font-sans text-xs text-text-tertiary">{subtitle}</p>
      )}
      <div className={`mt-4 w-full ${heightClass}`}>{children}</div>
    </div>
  )
}

/** Part-to-whole for two or three values. A donut with two slices is the
 *  classic dashboard mistake — a labelled bar is read in one glance. */
function ProportionBar({ map }: { map: Record<string, number> }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <p className="text-sm text-text-tertiary">Sin datos</p>
  const palette = [COLORS.primary, COLORS.secondary, '#A35E2A']
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-background-secondary">
        {entries.map(([name, v], i) => (
          <div
            key={name}
            style={{ width: `${(v / total) * 100}%`, backgroundColor: palette[i % palette.length] }}
            className={i > 0 ? 'ml-0.5' : ''}
            title={`${titleCase(name)}: ${formatNumber(v)}`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {entries.map(([name, v], i) => (
          <li key={name} className="flex items-center justify-between font-sans text-sm">
            <span className="flex items-center gap-2 text-text-primary">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              {titleCase(name)}
            </span>
            <span className="tabular-nums text-text-secondary">
              {formatNumber(v)} · {formatPct(v / total, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Data shaping ───────────────────────────────────────────────────────────

function breakdownToBarData(map: Record<string, number>, topN?: number) {
  const entries = Object.entries(map)
    .map(([name, value]) => ({ name: titleCase(name), value }))
    .sort((a, b) => b.value - a.value)
  if (!topN || entries.length <= topN) return entries
  const head = entries.slice(0, topN)
  const rest = entries.slice(topN).reduce((s, e) => s + e.value, 0)
  return [...head, { name: 'Otros', value: rest }]
}

function contactRateOf(s: MetricsSnapshot): number {
  return s.listings.totalViews > 0
    ? s.listings.totalContactClicks / s.listings.totalViews
    : 0
}

function buildSeries(history: MetricsSnapshot[]) {
  return history.map((s) => ({
    date: s.date.slice(5),
    activeListings: s.listings.totalActive,
    verifiedUsers: s.users.totalVerified,
    totalViews: s.listings.totalViews,
    totalClicks: s.listings.totalContactClicks,
    contactRate: contactRateOf(s),
    lifetimeRevenue: s.payments.lifetimeRevenuePEN,
    // null on pre-integration snapshots — the sparkline leaves a gap, not a zero
    adSpend: s.metaAds ? s.metaAds.lifetime.spendUSD : null,
  }))
}

type SeriesRow = ReturnType<typeof buildSeries>[number]

function sparkOf(series: SeriesRow[], key: keyof SeriesRow): SparkPoint[] {
  return series.slice(-SPARKLINE_DAYS).map((r) => ({
    date: r.date,
    value: r[key] === null ? null : Number(r[key]),
  }))
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const { latest, history, isLoading, error } = useNumbersData()

  const subtitle = error
    ? 'No se pudieron cargar las métricas'
    : !latest
      ? 'Esperando el primer snapshot diario'
      : `Snapshot del ${latest.date} · Actualizado ${latest.generatedAt.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}`

  useSetPageMeta({ title: 'Números', subtitle, accessArea: 'metrics' })

  const series = useMemo(() => buildSeries(history), [history])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">Cargando métricas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="font-serif text-2xl text-text-primary">No se pudieron cargar las métricas</h2>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="font-serif text-2xl text-text-primary">Aún no hay datos</h2>
        <p className="text-sm text-text-secondary">
          El primer snapshot diario aparecerá después de la próxima ejecución programada (03:30 Lima).
        </p>
      </div>
    )
  }

  const propTypeData = breakdownToBarData(latest.listings.byPropertyType)
  const distritoData = breakdownToBarData(latest.listings.byDistrito, 8)
  const contactRate = contactRateOf(latest)
  const ads = latest.metaAds ?? null
  const cpi = ads && ads.lifetime.installs > 0 ? ads.lifetime.spendUSD / ads.lifetime.installs : null
  const ctr = ads && ads.lifetime.impressions > 0 ? ads.lifetime.clicks / ads.lifetime.impressions : null

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Hero KPIs: the four numbers that say how Oqupa is doing ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label="Listados activos"
          help="Propiedades publicadas y visibles en el mapa ahora mismo. El «+N esta semana» cuenta las publicadas desde el lunes. La línea muestra los últimos 30 días."
          value={formatNumber(latest.listings.totalActive)}
          delta={`+${formatNumber(latest.listings.newThisWeek)} esta semana`}
          secondary={`${formatNumber(latest.listings.totalAllTime)} publicados en total`}
          spark={sparkOf(series, 'activeListings')}
          sparkColor={COLORS.primary}
        />
        <KpiTile
          label="Usuarios verificados"
          help="Cuentas que completaron la verificación de teléfono y por eso pueden publicar y contactar. «Cuentas creadas» incluye también las que no terminaron de verificarse."
          value={formatNumber(latest.users.totalVerified)}
          delta={`+${formatNumber(latest.users.newThisWeek)} esta semana`}
          secondary={`${formatNumber(latest.users.totalAllTime)} cuentas creadas`}
          spark={sparkOf(series, 'verifiedUsers')}
          sparkColor={COLORS.secondary}
        />
        <KpiTile
          label="Tasa de contacto"
          help="De todas las vistas a listados, qué porcentaje terminó en un click de contacto (WhatsApp o llamada). Mide si los listados convencen una vez que alguien los abre."
          value={formatPct(contactRate)}
          secondary={`${formatNumber(latest.listings.totalContactClicks)} contactos · ${formatNumber(latest.listings.totalViews)} vistas`}
          spark={sparkOf(series, 'contactRate')}
          sparkColor={COLORS.secondary}
        />
        <KpiTile
          label="Ingresos por boost"
          help="Total cobrado por boosts de visibilidad (pagos completados), en soles. El «+» es lo cobrado desde el lunes."
          value={formatPEN(latest.payments.lifetimeRevenuePEN)}
          delta={`+${formatPEN(latest.payments.weekRevenuePEN)} esta semana`}
          secondary={`${formatNumber(latest.payments.succeededCount)} pagos completados`}
          spark={sparkOf(series, 'lifetimeRevenue')}
          sparkColor={COLORS.primary}
        />
      </div>

      {/* ── Meta Ads: efficiency first, raw counts as support ── */}
      {ads && (
        <>
          <h2 className="mt-10 font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Publicidad — Meta Ads
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              label="Inversión total"
              help="Lo que Oqupa ha pagado a Meta por anuncios desde el inicio de la campaña, en dólares. Debajo, lo gastado en los últimos 7 días."
              value={`${formatUSD(ads.lifetime.spendUSD)} USD`}
              secondary={`${formatUSD(ads.last7d.spendUSD)} en los últimos 7 días`}
              spark={sparkOf(series, 'adSpend')}
              sparkColor={COLORS.primary}
            />
            <KpiTile
              label="Costo por instalación"
              help="Inversión total dividida entre las instalaciones que Meta atribuye a los anuncios. Más bajo es mejor: sirve para comparar campañas y creativos entre sí."
              value={cpi === null ? '—' : `${formatUSD(cpi)} USD`}
              secondary={`${formatNumber(ads.lifetime.installs)} instalaciones atribuidas por Meta`}
            />
            <KpiTile
              label="CTR"
              help="Click-through rate: de cada 100 veces que se mostró el anuncio, cuántas generaron un click. Mide si el anuncio llama la atención."
              value={ctr === null ? '—' : formatPct(ctr, 2)}
              secondary={`${formatNumber(ads.lifetime.clicks)} clicks · ${formatNumber(ads.lifetime.impressions)} impresiones`}
            />
            <KpiTile
              label="Alcance"
              help="Personas distintas que vieron el anuncio al menos una vez. «Impresiones» cuenta cada vez que se mostró; alcance cuenta personas."
              value={formatNumber(ads.lifetime.reach)}
              secondary="personas únicas que vieron el anuncio"
            />
          </div>
        </>
      )}

      {/* ── The one chart that matters: is interest turning into contact? ── */}
      <h2 className="mt-10 font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        Tendencia
      </h2>
      <div className="mt-3">
        <ChartCard
          title="Vistas y contactos"
          help="Acumulado diario de vistas a listados (verde) y clicks de contacto (naranja). La distancia entre las dos líneas es la brecha entre interés y acción. Los datos empiezan el día del primer snapshot."
          subtitle="Acumulado diario desde el primer snapshot — no hay reconstrucción histórica"
          heightClass="h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis dataKey="date" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={{ stroke: COLORS.grid }} minTickGap={24} />
              <YAxis stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, fontSize: 12 }}
                formatter={(v, name) => [formatNumber(Number(v) || 0), name]}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line type="stepAfter" dataKey="totalViews" stroke={COLORS.secondary} strokeWidth={2} dot={false} name="Vistas" isAnimationActive={false} />
              <Line type="stepAfter" dataKey="totalClicks" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Contactos" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Composition of active inventory ── */}
      <h2 className="mt-10 font-sans text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        Composición del inventario activo
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Por operación" subtitle="Venta vs alquiler" heightClass="h-auto" help="Cómo se reparte el inventario activo entre venta y alquiler.">
          <ProportionBar map={latest.listings.byOperationType} />
        </ChartCard>

        <ChartCard title="Por tipo de propiedad" subtitle="Casas, departamentos, terrenos…" help="Cuántos listados activos hay por tipo de propiedad.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propTypeData} layout="vertical" margin={{ left: 8, right: 24 }} barCategoryGap={6}>
              <CartesianGrid stroke={COLORS.grid} horizontal={false} />
              <XAxis type="number" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} width={96} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, fontSize: 12 }} cursor={{ fill: COLORS.grid }} />
              <Bar dataKey="value" name="Listados" fill={COLORS.secondary} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por distrito" subtitle="Dónde está concentrada la oferta (top 8)" help="Dónde están los listados activos. Los distritos fuera del top 8 se agrupan en «Otros».">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distritoData} layout="vertical" margin={{ left: 8, right: 24 }} barCategoryGap={6}>
              <CartesianGrid stroke={COLORS.grid} horizontal={false} />
              <XAxis type="number" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} width={96} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${COLORS.grid}`, fontSize: 12 }} cursor={{ fill: COLORS.grid }} />
              <Bar dataKey="value" name="Listados" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="mt-12 text-center font-sans text-xs text-text-tertiary">
        Snapshot generado cada día a las 03:30 hora Lima por el Cloud Function <code>snapshotPlatformMetrics</code>.
        Datos exclusivamente agregados — no se exponen registros individuales.
      </p>
    </div>
  )
}
