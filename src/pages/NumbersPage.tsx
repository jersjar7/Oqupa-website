import { useEffect, useMemo } from 'react'
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
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useNumbersData, type MetricsSnapshot } from '@/hooks/useNumbersData'

// Brand-aligned chart palette (cream-on-dark dashboard feel)
const COLORS = {
  primary: '#E0732A',      // Oqupa orange
  secondary: '#3F6E54',    // Oqupa green
  tertiary: '#A35E2A',
  neutral: '#6B7280',
  views: '#3F6E54',
  clicks: '#E0732A',
}

const PIE_COLORS = ['#E0732A', '#3F6E54', '#A35E2A', '#6B7280', '#1F2937']

function setRobotsNoIndex() {
  let el = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', 'robots')
    document.head.appendChild(el)
  }
  el.setAttribute('content', 'noindex, nofollow')
  return () => {
    // Reset to a sensible default on unmount (the rest of the site is indexable)
    el?.setAttribute('content', 'index, follow')
  }
}

function formatPEN(amount: number): string {
  return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  }))
}

export default function NumbersPage() {
  useDocumentMeta({ title: 'Números — Oqupa' })

  useEffect(() => {
    return setRobotsNoIndex()
  }, [])

  const { latest, history, isLoading, error } = useNumbersData()

  const series = useMemo(() => buildTimeSeries(history), [history])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-text-secondary">Cargando métricas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 pt-20 text-center">
        <h1 className="font-serif text-2xl text-text-primary">No se pudieron cargar las métricas</h1>
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 pt-20 text-center">
        <h1 className="font-serif text-2xl text-text-primary">Aún no hay datos</h1>
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
    <div className="min-h-screen bg-background pb-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[28px] font-normal text-text-primary">
            Números de Oqupa
          </h1>
          <p className="font-sans text-sm text-text-secondary">
            Snapshot del {latest.date} · Actualizado {latest.generatedAt.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        {/* Tiles */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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

        {/* Footer note */}
        <p className="mt-12 text-center font-sans text-xs text-text-tertiary">
          Snapshot generado cada día a las 03:30 hora Lima por el Cloud Function <code>snapshotPlatformMetrics</code>.
          Datos exclusivamente agregados — no se exponen registros individuales.
        </p>
      </div>
    </div>
  )
}
