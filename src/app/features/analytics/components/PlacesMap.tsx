import type { Places } from '../types'
import { fmt, moreDataText } from '../words'
import Section, { MoreData } from './Section'
import shapes from '../data/piura-districts.json'

const CAPTION =
  'Personas que vieron tus propiedades, por distrito. Nunca la ubicación exacta: solo el distrito, y las zonas con menos de 3 personas no se muestran.'

// Light → dark green (CSS tokens). The server never sends a place with fewer than 3 people.
const RAMP = [1, 2, 3, 4, 5].map((k) => `var(--color-map-${k})`)
const CUTS = [3, 6, 11, 21, 41]
const EMPTY = 'var(--color-map-empty)'
const shade = (n: number) => (n < 3 ? EMPTY : RAMP[CUTS.filter((c) => n >= c).length - 1] ?? EMPTY)

const DISTRICTS = shapes.districts as Record<string, { name: string; d: string }>

/** The district codes whose name matches one of the owner's listings, to outline them. */
function codesForNames(names: Array<string | null>): Set<string> {
  const key = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().trim()
  const wanted = new Set(names.filter(Boolean).map((n) => key(n as string)))
  return new Set(Object.entries(DISTRICTS).filter(([, v]) => wanted.has(key(v.name))).map(([code]) => code))
}

/** Dónde están quienes miran — Piura by district, plus people outside Piura by city. */
export default function PlacesMap({ places: given, listingDistricts }: { places: Places | undefined; listingDistricts: Array<string | null> }) {
  const places: Places = given ?? { status: 'not-recorded' }
  if (places.status !== 'ok') {
    return (
      <Section title="Dónde están quienes miran" subtitle={CAPTION} testId="analytics-places">
        <MoreData text={moreDataText('places', places)} />
      </Section>
    )
  }
  const mine = codesForNames(listingDistricts)
  const inPiura = Object.entries(places.districts).filter(([code]) => DISTRICTS[code]).sort((a, b) => b[1] - a[1])
  const piuraPeople = inPiura.reduce((s, [, n]) => s + n, 0)
  const top = inPiura.slice(0, 5)
  const topMax = top[0]?.[1] ?? 1
  const away = Object.entries(places.away).sort((a, b) => {
    if (a[0] === 'Otros lugares') return 1
    if (b[0] === 'Otros lugares') return -1
    return b[1] - a[1]
  })
  const awayPeople = away.reduce((s, [, n]) => s + n, 0)

  return (
    <Section title="Dónde están quienes miran" subtitle={CAPTION} testId="analytics-places">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <svg
            viewBox={shapes.viewBox}
            className="h-auto w-full max-w-[640px]"
            role="img"
            aria-label={`Mapa de Piura por distrito: personas que vieron tus propiedades en ${inPiura.length} distritos`}
          >
            {Object.entries(DISTRICTS).map(([code, { name, d }]) => {
              const n = places.districts[code] ?? 0
              return (
                <path
                  key={code}
                  d={d}
                  style={{ fill: shade(n), stroke: mine.has(code) ? 'var(--color-primary)' : 'var(--color-white, #fff)' }}
                  strokeWidth={mine.has(code) ? 2.2 : 0.7}
                  strokeLinejoin="round"
                >
                  <title>{n >= 3 ? `${name}: ${fmt(n)} personas` : `${name}: menos de 3 personas, no se muestra`}</title>
                </path>
              )
            })}
          </svg>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span>Personas:</span>
            {RAMP.map((bg, i) => (
              <span key={bg} className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: bg }} />
                {i < RAMP.length - 1 ? `${CUTS[i]}–${(CUTS[i + 1] ?? 0) - 1}` : `${CUTS[i]}+`}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: EMPTY }} />
              Menos de 3: no se muestra
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="h-3 w-3 rounded-sm border-2 border-primary" />
              Distritos de tus propiedades
            </span>
          </div>
        </div>
        <div>
          <p className="font-serif text-[22px] font-normal leading-tight text-text-primary">
            {piuraPeople
              ? `${fmt(piuraPeople)} ${piuraPeople === 1 ? 'persona' : 'personas'} en ${inPiura.length} ${inPiura.length === 1 ? 'distrito' : 'distritos'} de Piura`
              : 'Nadie en Piura con 3 o más personas por distrito todavía'}
          </p>
          <ul className="mt-3 space-y-2">
            {top.map(([code, n]) => (
              <li key={code} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-text-primary">{DISTRICTS[code]?.name ?? code}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <span className="block h-full rounded-full bg-secondary" style={{ width: `${(n / topMax) * 100}%` }} />
                </span>
                <span className="text-right font-bold">{fmt(n)}</span>
              </li>
            ))}
          </ul>
          {away.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">Fuera de Piura</p>
              <p className="mt-1 font-serif text-lg font-normal text-text-primary">
                {fmt(awayPeople)} {awayPeople === 1 ? 'persona' : 'personas'} desde fuera de Piura
              </p>
              <ul className="mt-2 divide-y divide-border text-sm">
                {away.map(([place, n]) => (
                  <li key={place} className="flex justify-between py-2">
                    <span>{place}</span>
                    <span className="font-bold">{fmt(n)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}
