import type { Compare, ContactRate, DaysToClose, OwnerListing, Zone as ZoneData } from '../types'
import { fmt, moreDataText, pronoun, TYPE_PLURAL, TYPE_SINGULAR } from '../words'
import Section, { MoreData } from './Section'

const kLabel = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : fmt(n))

/** Tu precio frente a la zona — price per m² of similar listings, the median, and yours. */
export function ZonePrice({ zone, listing }: { zone: ZoneData | undefined; listing: OwnerListing | undefined }) {
  const title = 'Tu precio frente a la zona'
  if (!zone || !listing) {
    return <Section title={title} testId="analytics-zone"><MoreData text="Elige una propiedad para compararla con la zona." /></Section>
  }
  if (zone.status !== 'ok') {
    return (
      <Section title={title} testId="analytics-zone" subtitle={listing.name}>
        <MoreData text={moreDataText('zone', zone, listing.district)} />
      </Section>
    )
  }
  const type = listing.propertyType ?? ''
  const side = listing.operationType === 'alquiler' ? 'en alquiler' : 'en venta'
  const maxCount = Math.max(1, ...zone.bins.map((b) => b.count))
  const mineBin = zone.bins.findIndex((b, i) => zone.mine >= b.from && (i === zone.bins.length - 1 || zone.mine < (zone.bins[i + 1]?.from ?? Infinity)))
  const medianBin = zone.bins.findIndex((b, i) => zone.median >= b.from && (i === zone.bins.length - 1 || zone.median < (zone.bins[i + 1]?.from ?? Infinity)))
  const gap = zone.pct === 0 ? 'igual a la mediana' : `${Math.abs(zone.pct)}% ${zone.pct > 0 ? 'sobre' : 'bajo'} la mediana`
  return (
    <Section
      title={title}
      testId="analytics-zone"
      subtitle={(
        <>
          {capitalize(TYPE_PLURAL[type] ?? 'propiedades')} {side} en {zone.district}, precio por m². Tu {TYPE_SINGULAR[type] ?? 'propiedad'}:{' '}
          <strong className="font-medium text-text-primary">S/ {fmt(zone.mine)} por m²</strong>, {gap}.
        </>
      )}
    >
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label={`Precio por m² de ${zone.n} propiedades parecidas; mediana S/ ${fmt(zone.median)}`}>
        {zone.bins.map(({ from, count }, i) => (
          <div key={from} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] text-text-secondary">{count || ''}</span>
            <div
              className={`w-full rounded-t-md ${i === mineBin ? 'bg-primary' : i === medianBin ? 'bg-secondary' : 'bg-secondary-pale'}`}
              style={{ height: `${Math.max((count / maxCount) * 100, i === mineBin ? 4 : 0)}%` }}
            />
            <span className="text-[11px] text-text-tertiary">{kLabel(from)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-primary" />Tu {TYPE_SINGULAR[type] ?? 'propiedad'}</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-secondary" />Mediana S/ {fmt(zone.median)}</span>
        <span>{zone.n} propiedades parecidas activas · dólares a S/ {zone.usdRate}</span>
      </div>
    </Section>
  )
}

/** Frente a similares + Días publicado + Pidieron tu número, for one listing. */
export function VersusSimilar({
  compare, daysToClose, contactRate, listing,
}: {
  compare: Compare | undefined
  daysToClose: DaysToClose | undefined
  contactRate: ContactRate | undefined
  listing: OwnerListing | undefined
}) {
  const title = 'Frente a similares'
  if (!listing || !compare || !daysToClose || !contactRate) {
    return <Section title={title} testId="analytics-compare"><MoreData text="Elige una propiedad para compararla con similares." /></Section>
  }
  const type = listing.propertyType ?? ''
  const opened = pronoun(type) === 'lo' ? 'Lo abrieron' : 'La abrieron'
  return (
    <Section title={title} testId="analytics-compare" subtitle={listing.name}>
      {compare.status === 'ok' ? (
        <>
          <p className="font-serif text-[22px] font-normal leading-snug text-text-primary sm:text-[26px]">
            {opened} más veces que a <span className="text-primary-hover">{compare.tenths} de cada 10</span>{' '}
            {TYPE_PLURAL[type] ?? 'propiedades'} en {compare.district}
          </p>
          <div className="mt-3 grid grid-cols-10 gap-1.5" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`h-6 rounded-md ${i < compare.tenths ? 'bg-primary' : 'bg-surface-muted'}`} />
            ))}
          </div>
        </>
      ) : (
        <MoreData text={moreDataText('compare', compare, listing.district)} />
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-muted p-4">
          <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">Días publicado</p>
          <p className="mt-1 font-serif text-[26px] font-normal text-text-primary">{listing.daysPublished === null ? '—' : fmt(listing.daysPublished)}</p>
          {daysToClose.status === 'ok' ? (
            <p className="text-sm text-text-secondary">
              similares se {listing.operationType === 'alquiler' ? 'alquilan' : 'venden'} en {fmt(daysToClose.median)} días (mediana{daysToClose.area === 'province' ? ', en la provincia' : ''})
            </p>
          ) : (
            <p className="mt-1 font-serif text-xs font-light italic text-text-secondary">{moreDataText('daysToClose', daysToClose)}</p>
          )}
        </div>
        <div className="rounded-xl bg-surface-muted p-4">
          <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">Pidieron tu número</p>
          {contactRate.status === 'ok' ? (
            <>
              <p className="mt-1 font-serif text-[26px] font-normal text-text-primary">{contactRate.mine}%</p>
              <p className="text-sm text-text-secondary">de quienes {pronoun(type)} abren · zona {contactRate.zone}%</p>
            </>
          ) : (
            <p className="mt-2 font-serif text-xs font-light italic text-text-secondary">{moreDataText('contactRate', contactRate, listing.district)}</p>
          )}
        </div>
      </div>
    </Section>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
