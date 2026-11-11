import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import Spinner from '@/app/components/ui/Spinner'
import { useListingAnalytics, useOwnerAnalytics } from '../useOwnerAnalytics'
import { focusListingId, medianDays, portfolioRows, trendSeries } from '../selectors'
import type { PeriodKey } from '../types'
import { shortDay } from '../words'
import Cards from '../components/Cards'
import Trend from '../components/Trend'
import Funnel from '../components/Funnel'
import HeatMap from '../components/HeatMap'
import Sources from '../components/Sources'
import PlacesMap from '../components/PlacesMap'
import { VersusSimilar, ZonePrice } from '../components/Zone'
import Demand from '../components/Demand'
import Portfolio from '../components/Portfolio'

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: '90', label: '90 días' },
]

/**
 * Analítica for owners (ADR-058). Every section of the design is here; a
 * section the server could not fill says "Necesitamos más datos…".
 */
export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const state = useOwnerAnalytics(user?.id)
  const [period, setPeriod] = useState<PeriodKey>('30')
  const [scope, setScope] = useState<string>('all')

  const data = state.status === 'ready' ? state.data : null
  const focusId = data ? focusListingId(data, scope) : null
  const focus = useListingAnalytics(focusId)

  useSetPageMeta({
    title: 'Analítica',
    subtitle: data
      ? `${data.listings.length === 1 ? 'Tu propiedad' : `Tus ${data.listings.length} propiedades`} · últimos ${period} días`
      : undefined,
  })

  const view = useMemo(() => {
    if (!data) return null
    const many = scope === 'all' || !data.listings.some((l) => l.id === scope)
    const focusListing = data.listings.find((l) => l.id === focusId)
    const listingBlock = focus.data?.periods?.[period]
    const block = many ? data.periods[period] : listingBlock
    const series = many ? data.series : focus.data?.series
    return { many, focusListing, listingBlock, block, series }
  }, [data, scope, focusId, focus.data, period])

  if (state.status === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>
  }
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-serif text-[22px] text-text-primary">No pudimos abrir tu analítica.</p>
        <p className="mt-2 text-text-secondary">Vuelve a intentarlo en unos minutos.</p>
      </div>
    )
  }
  if (state.status === 'none' || !data || !view) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-serif text-[22px] text-text-primary">Cuando publiques una propiedad, aquí verás cómo le va.</p>
        <Link
          to="/app/listings/new"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-6 font-sans text-base font-bold uppercase tracking-[1px] text-white hover:bg-primary-hover"
        >
          Publicar
        </Link>
      </div>
    )
  }

  const { many, focusListing, listingBlock, block, series } = view
  const pageBlock = data.periods[period]
  const rows = portfolioRows(data, period, pageBlock)
  const saves = many ? data.listings.reduce((s, l) => s + l.saves, 0) : (focusListing?.saves ?? 0)
  const zoneDays = !many && listingBlock?.daysToClose?.status === 'ok' ? listingBlock.daysToClose.median : null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {block ? `Del ${shortDay(block.from)} al ${shortDay(block.to)}` : ''}
          {block && block.from === data.countingSince.counts ? ` · contamos desde el ${shortDay(block.from)}` : ''}
          {' · '}Se actualiza cada noche{state.refreshing ? ' · actualizando…' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="sr-only" htmlFor="analytics-scope">Propiedad</label>
          <select
            id="analytics-scope"
            value={many ? 'all' : scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-11 max-w-[16rem] truncate rounded-full border border-border bg-white px-4 text-sm text-text-primary"
          >
            <option value="all">Todas tus propiedades</option>
            {data.listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div role="group" aria-label="Periodo" className="inline-flex rounded-full border border-border bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={`h-9 rounded-full px-4 text-sm font-medium ${period === p.key ? 'bg-secondary text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 rounded-full border-[1.5px] border-secondary px-5 font-sans text-sm font-bold uppercase tracking-[1px] text-secondary hover:border-secondary-hover hover:text-secondary-hover"
          >
            Descargar reporte
          </button>
        </div>
      </div>

      {/* The report's own heading when printed */}
      <div className="hidden print:block">
        <p className="font-serif text-[28px]">Analítica — {many ? 'todas tus propiedades' : focusListing?.name}</p>
        <p className="text-sm">Datos de Oqupa · {block ? `del ${shortDay(block.from)} al ${shortDay(block.to)}` : ''}</p>
      </div>

      {!block || !series ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Spinner /></div>
      ) : (
        <>
          <Cards
            block={block}
            saves={saves}
            daysPublished={many ? medianDays(data.listings) : (focusListing?.daysPublished ?? null)}
            zoneDays={zoneDays}
            many={many}
            propertyType={focusListing?.propertyType}
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><Trend points={trendSeries(series, block)} marks={block.marks} /></div>
            <Funnel totals={block.totals} many={many} propertyType={focusListing?.propertyType} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><HeatMap heat={block.heat} /></div>
            <Sources sources={block.sources} />
          </div>

          <PlacesMap places={block.places} listingDistricts={(many ? data.listings : focusListing ? [focusListing] : []).map((l) => l.district)} />

          {many && focusListing && (
            <p className="text-sm text-text-secondary">
              Las comparaciones de abajo son de <strong className="font-medium text-text-primary">{focusListing.name}</strong>, la que más abrieron en 30 días.
              Elige otra arriba para verla.
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <ZonePrice zone={listingBlock?.zone} listing={focusListing} />
            <VersusSimilar
              compare={listingBlock?.compare}
              daysToClose={listingBlock?.daysToClose}
              contactRate={listingBlock?.contactRate}
              listing={focusListing}
            />
          </div>

          <Demand demand={block.demand} side={focusListing?.operationType === 'alquiler' ? 'alquiler' : 'venta'} />

          <Portfolio rows={rows} days={Number(period)} />

          <p className="pb-4 text-center font-serif text-xs font-light italic text-text-tertiary">
            Las visitas del equipo de Oqupa no cuentan en estos números.
          </p>
        </>
      )}
    </div>
  )
}
