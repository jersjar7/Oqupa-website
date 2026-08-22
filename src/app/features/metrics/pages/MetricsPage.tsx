import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Spinner } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { useNumbersData, type MetricsSnapshot } from '@/hooks/useNumbersData'

const COLORS = {
  primary: '#E0732A',
  secondary: '#3F6E54',
  views: '#3F6E54',
  clicks: '#E0732A',
}

const PIE_COLORS = ['#E0732A', '#3F6E54', '#A35E2A', '#6B7280', '#1F2937']

function formatPEN(amount: number): string {
  return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUSD(amount: number): string {
  return `$ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-PE')
}

interface TileProps {
  label: string
  value: string
  sublabel?: string
}

function Tile({ label, value, sublabel }: TileProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-light">
      <div className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-normal text-text-primary">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 font-sans text-xs text-text-tertiary">{sublabel}</div>
      )}
    </div>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-light">
      <h2 className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 font-sans text-xs text-text-tertiary">{subtitle}</p>
      )}
      <div className="mt-4 h-64 w-full">{children}</div>
    </div>
  )
}

function breakdownToBarData(map: Record<string, number>, topN?: number) {
  const entries = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  return topN ? entries.slice(0, topN) : entries
}

function buildTimeSeries(history: MetricsSnapshot[]) {
  return history.map((s) => ({
    date: s.date.slice(5),
    activeListings: s.listings.totalActive,
    totalListings: s.listings.totalAllTime,
    verifiedUsers: s.users.totalVerified,
    totalUsers: s.users.totalAllTime,
    totalViews: s.listings.totalViews,
    totalClicks: s.listings.totalContactClicks,
    lifetimeRevenue: s.payments.lifetimeRevenuePEN,
    newListingsThisWeek: s.listings.newThisWeek,
    newUsersThisWeek: s.users.newThisWeek,
    weekRevenue: s.payments.weekRevenuePEN,
    // null on pre-integration snapshots — recharts leaves a gap instead of a zero
    adSpend: s.metaAds ? s.metaAds.lifetime.spendUSD : null,
    adInstalls: s.metaAds ? s.metaAds.lifetime.installs : null,
  }))
}

export default function MetricsPage() {
  const { latest, history, isLoading, error } = useNumbersData()

  const subtitle = error
    ? 'No se pudieron cargar las métricas'
    : !latest
      ? 'Esperando el primer snapshot diario'
      : `Snapshot del ${latest.date} · Actualizado ${latest.generatedAt.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}`

  useSetPageMeta({ title: 'Números', subtitle, accessArea: 'metrics' })

  const series = useMemo(() => buildTimeSeries(history), [history])

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

  const opTypeData = breakdownToBarData(latest.listings.byOperationType)
  const propTypeData = breakdownToBarData(latest.listings.byPropertyType)
  const distritoData = breakdownToBarData(latest.listings.byDistrito, 10)

  const contactRate =
    latest.listings.totalViews > 0
      ? (latest.listings.totalContactClicks / latest.listings.totalViews) * 100
      : 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Tile
          label="Listados activos"
          value={formatNumber(latest.listings.totalActive)}
          sublabel={`${formatNumber(latest.listings.totalAllTime)} históricos`}
        />
        <Tile
          label="Usuarios verificados"
          value={formatNumber(latest.users.totalVerified)}
          sublabel={`${formatNumber(latest.users.totalAllTime)} cuentas creadas`}
        />
        <Tile
          label="Vistas a listados"
          value={formatNumber(latest.listings.totalViews)}
        />
        <Tile
          label="Clicks de contacto"
          value={formatNumber(latest.listings.totalContactClicks)}
          sublabel={`${contactRate.toFixed(1)}% tasa de contacto`}
        />
        <Tile
          label="Ingresos por boost"
          value={formatPEN(latest.payments.lifetimeRevenuePEN)}
          sublabel={`${latest.payments.succeededCount} pagos completados`}
        />
      </div>

      {/* Meta Ads — only rendered once the snapshot carries the block */}
      {latest.metaAds && (
        <>
          <h2 className="mt-12 font-sans text-sm font-medium uppercase tracking-wide text-text-secondary">
            Publicidad — Meta Ads
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Tile
              label="Inversión total"
              value={formatUSD(latest.metaAds.lifetime.spendUSD)}
              sublabel={`${formatUSD(latest.metaAds.last7d.spendUSD)} últimos 7 días`}
            />
            <Tile
              label="Impresiones"
              value={formatNumber(latest.metaAds.lifetime.impressions)}
              sublabel={`${formatNumber(latest.metaAds.last7d.impressions)} últimos 7 días`}
            />
            <Tile
              label="Alcance"
              value={formatNumber(latest.metaAds.lifetime.reach)}
              sublabel="personas únicas"
            />
            <Tile
              label="Clicks en anuncios"
              value={formatNumber(latest.metaAds.lifetime.clicks)}
              sublabel={`${formatNumber(latest.metaAds.last7d.clicks)} últimos 7 días`}
            />
            <Tile
              label="Instalaciones"
              value={formatNumber(latest.metaAds.lifetime.installs)}
              sublabel="atribuidas por Meta"
            />
          </div>
        </>
      )}

      {/* Time-series charts */}
      <h2 className="mt-12 font-sans text-sm font-medium uppercase tracking-wide text-text-secondary">
        Tendencias
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Listados activos"
          subtitle="Inventario disponible en el tiempo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="activeListings" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Activos" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Usuarios verificados"
          subtitle="Demanda verificada en el tiempo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="verifiedUsers" stroke={COLORS.secondary} strokeWidth={2} dot={false} name="Verificados" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Vistas y contactos"
          subtitle="Solo desde el primer snapshot — no hay reconstrucción histórica"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalViews" stroke={COLORS.views} strokeWidth={2} dot={false} name="Vistas" />
              <Line type="monotone" dataKey="totalClicks" stroke={COLORS.clicks} strokeWidth={2} dot={false} name="Contactos" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {series.filter((p) => p.adSpend !== null).length >= 2 && (
          <ChartCard
            title="Inversión en Meta Ads"
            subtitle="Gasto acumulado (USD) — desde la integración"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip formatter={(v) => formatUSD(Number(v) || 0)} />
                <Line type="monotone" dataKey="adSpend" stroke={COLORS.primary} strokeWidth={2} dot={false} name="USD" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard
          title="Ingresos por boost"
          subtitle="Acumulado en el tiempo (S/.)"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip formatter={(v) => formatPEN(Number(v) || 0)} />
              <Line type="monotone" dataKey="lifetimeRevenue" stroke={COLORS.primary} strokeWidth={2} dot={false} name="S/." />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Current-state breakdowns */}
      <h2 className="mt-12 font-sans text-sm font-medium uppercase tracking-wide text-text-secondary">
        Composición del inventario activo
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Por operación" subtitle="Venta vs Alquiler">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={opTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                {opTypeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por tipo de propiedad" subtitle="Apartamentos, casas, habitaciones...">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propTypeData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Por distrito (top 10)" subtitle="Dónde está concentrada la oferta">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distritoData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS.primary} />
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
