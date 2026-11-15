import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import Spinner from '@/app/components/ui/Spinner'
import { useListingAnalytics, useOwnerAnalytics } from '../useOwnerAnalytics'
import { focusListingId, medianDays, normalizeBlock, portfolioRows, trendSeries } from '../selectors'
import type { OwnerAnalytics, PeriodKey } from '../types'
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
import Section, { MoreData } from '../components/Section'

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: '90', label: '90 días' },
]

const NOT_READY = 'Todavía estamos preparando los números de esta propiedad. Vuelve en unos minutos.'
const NOT_READY_ALL = 'Todavía estamos preparando tus números. Vuelve en unos minutos.'

/** "11 nov a las 4:05 a. m." in Lima time, from the page's build time. */
function builtText(builtAt: OwnerAnalytics['builtAt']): string | null {
  const d = !builtAt ? null : builtAt instanceof Date ? builtAt : typeof builtAt.toDate === 'function' ? builtAt.toDate() : null
  if (!d) return null
  const day = shortDay(d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
  const time = d.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?a\.?\s?m\.?/i, ' a. m.').replace(/\s?p\.?\s?m\.?/i, ' p. m.')
  return `${day} a las ${time}`
}

/**
 * Names people can tell apart: an agent with three "Departamento en Castilla"
 * gets their facts line, and a number if even that repeats (break-it web 2 #2).
 */
function uniqueNames(listings: OwnerAnalytics['listings']): Record<string, string> {
  const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())
  const byName = count(listings.map((l) => l.name))
  const withSub = listings.map((l) => ((byName.get(l.name) ?? 0) > 1 && l.sub ? `${l.name} · ${l.sub}` : l.name))
  const bySub = count(withSub)
  const seen = new Map<string, number>()
  return Object.fromEntries(listings.map((l, k) => {
    const base = withSub[k] ?? l.name
    if ((bySub.get(base) ?? 0) < 2) return [l.id, base]
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    // The number first, so a cut-off label still shows which one it is (break-it web 3 #2).
    return [l.id, `${n}. ${base}`]
  }))
}

/**
 * Analítica for owners (ADR-058). Every section of the design is here; a
 * section the server could not fill says "Necesitamos más datos…".
 */
export default function AnalyticsPage() {
  const { user } = useAuthStore()
  const state = useOwnerAnalytics(user?.id)
  const [period, setPeriod] = useState<PeriodKey>('30')
  const [scope, setScope] = useState<string>('all')
  // On paper the chart is drawn at a fixed width, so it is never cut at the edge (break-it web 3 #6).
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    const before = () => setPrinting(true)
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null
  const focusId = data ? focusListingId(data, data.listings.length === 1 && data.listings[0] ? data.listings[0].id : scope) : null
  const focus = useListingAnalytics(focusId)

  // An owner with one listing is spoken to about that listing (break-it web 3 #1).
  const effectiveScope = data && data.listings.length === 1 && data.listings[0] ? data.listings[0].id : scope
  const many = !data || effectiveScope === 'all' || !data.listings.some((l) => l.id === effectiveScope)
  const focusListing = data?.listings.find((l) => l.id === focusId)

  const listingNames = useMemo(() => uniqueNames(data?.listings ?? []), [data])

  useSetPageMeta({
    title: 'Analítica',
    subtitle: data
      ? `${many ? (data.listings.length === 1 ? 'Tu propiedad' : `Tus ${data.listings.length} propiedades`) : (focusId ? listingNames[focusId] : '') ?? ''} · últimos ${period} días`
      : undefined,
  })


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
  if (state.status === 'none' || !data || data.listings.length === 0) {
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

  const pageBlock = data.periods?.[period]
  const listingBlock = normalizeBlock(focus.data?.periods?.[period])
  const block = many ? normalizeBlock(pageBlock) : listingBlock
  const series = many ? data.series : focus.data?.series
  const listingWaiting = !many && focus.loading
  const listingMissing = !many && !focus.loading && !listingBlock
  const normalPage = normalizeBlock(pageBlock)
  const rows = normalPage
    ? portfolioRows(data, period, normalPage).filter((r) => many || r.listing.id === focusId)
    : []
  const saves = many ? data.listings.reduce((s, l) => s + (l.saves ?? 0), 0) : (focusListing?.saves ?? 0)
  const zoneDays = !many && listingBlock?.daysToClose?.status === 'ok' ? listingBlock.daysToClose.median : null
  const built = builtText(data.builtAt)
  const side: 'venta' | 'alquiler' = focusListing?.operationType === 'alquiler' ? 'alquiler' : 'venta'

  // The per-listing comparisons: the listing's own record, or a word on why it is not here yet.
  const comparisons = focus.loading
    ? (
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Tu precio frente a la zona" testId="analytics-zone"><div className="flex justify-center py-6"><Spinner /></div></Section>
        <Section title="Frente a similares" testId="analytics-compare"><div className="flex justify-center py-6"><Spinner /></div></Section>
      </div>
    )
    : !listingBlock
      ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Tu precio frente a la zona" testId="analytics-zone"><MoreData text={NOT_READY} /></Section>
          <Section title="Frente a similares" testId="analytics-compare"><MoreData text={NOT_READY} /></Section>
        </div>
      )
      : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ZonePrice zone={listingBlock.zone} listing={focusListing} />
          <VersusSimilar
            compare={listingBlock.compare}
            daysToClose={listingBlock.daysToClose}
            contactRate={listingBlock.contactRate}
            listing={focusListing}
          />
        </div>
      )

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {block ? `Del ${shortDay(block.from)} al ${shortDay(block.to)}` : ''}
          {block && block.from === data.countingSince?.counts ? ` · contamos desde el ${shortDay(block.from)}` : ''}
          {built ? ` · actualizado el ${built}` : ''}
          {state.refreshing ? ' · actualizando…' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {data.listings.length > 1 && <label className="sr-only" htmlFor="analytics-scope">Propiedad</label>}
          {data.listings.length > 1 && <select
            id="analytics-scope"
            value={many ? 'all' : scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-11 w-full max-w-full truncate rounded-full sm:w-auto sm:max-w-[26rem] border border-border bg-white px-4 text-sm text-text-primary"
          >
            <option value="all">Todas tus propiedades</option>
            {data.listings.map((l) => <option key={l.id} value={l.id}>{listingNames[l.id] ?? l.name}</option>)}
          </select>}
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
        <p className="font-serif text-[28px]">Analítica — {many ? 'todas tus propiedades' : (focusId ? listingNames[focusId] : '')}</p>
        <p className="text-sm">
          Datos de Oqupa · {block ? `del ${shortDay(block.from)} al ${shortDay(block.to)}` : ''}
          {' · '}reporte del {shortDay(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))}
        </p>
      </div>

      {listingWaiting ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Spinner /></div>
      ) : listingMissing || !block ? (
        <Section title={many ? 'Analítica' : (focusId ? listingNames[focusId] ?? 'Analítica' : 'Analítica')}><MoreData text={many ? NOT_READY_ALL : NOT_READY} /></Section>
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

          <div className="grid gap-5 lg:grid-cols-3 print:block print:space-y-5">
            <div className="min-w-0 lg:col-span-2">
              <Trend
                points={trendSeries(series, block)}
                marks={block.marks}
                many={many}
                propertyType={focusListing?.propertyType}
                listingNames={listingNames}
                fixedWidth={printing ? 640 : undefined}
              />
            </div>
            <Funnel totals={block.totals} many={many} propertyType={focusListing?.propertyType} whatsappFrom={block.whatsappFrom} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2"><HeatMap heat={block.heat} /></div>
            <Sources sources={block.sources} />
          </div>

          <PlacesMap places={block.places} listingDistricts={(many ? data.listings : focusListing ? [focusListing] : []).map((l) => l.district)} />

          {many && focusListing && (
            <p className="text-sm text-text-secondary">
              Las comparaciones de abajo son de <strong className="font-medium text-text-primary">{listingNames[focusListing.id] ?? focusListing.name}</strong>, la que más abrieron en 30 días.
              Elige otra arriba para verla.
            </p>
          )}
          {comparisons}

          {focus.loading
            ? <Section title="Qué buscan en tu zona" testId="analytics-demand"><div className="flex justify-center py-6"><Spinner /></div></Section>
            : <Demand demand={listingBlock?.demand} side={side} />}

          <Portfolio rows={rows} days={Number(period)} names={listingNames} />

          <p className="pb-4 text-center font-serif text-xs font-light italic text-text-tertiary">
            Las visitas del equipo de Oqupa no cuentan en estos números.
          </p>
        </>
      )}
    </div>
  )
}
