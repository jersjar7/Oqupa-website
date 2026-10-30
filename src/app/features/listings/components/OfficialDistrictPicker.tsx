// Choose a district from the official list — the only way an owner corrects
// the district the pin gave (map plan step 1, ADR-031). No free text: one
// listing stored "CASTILLA" as its provincia, others "Piura" for Castilla.
// Same idea as the app's OfficialDistrictPicker.
import { useMemo, useState } from 'react'
import { PIURA_DISTRICTS, POPULAR_PIURA_DISTRICTS, type PeruDistrict } from '@/lib/map/piuraDistricts'
import { normalizePlaceName } from '@/lib/map/peruGeography'

interface OfficialDistrictPickerProps {
  onPick: (district: PeruDistrict) => void
  onClose: () => void
}

export default function OfficialDistrictPicker({ onPick, onClose }: OfficialDistrictPickerProps) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const q = normalizePlaceName(query)
    if (!q) return PIURA_DISTRICTS.filter((d) => POPULAR_PIURA_DISTRICTS.includes(d.distrito))
    return PIURA_DISTRICTS.filter(
      (d) => normalizePlaceName(d.distrito).includes(q) || normalizePlaceName(d.provincia).includes(q),
    )
  }, [query])

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div role="dialog" aria-label="Elige el distrito" className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[80vh] max-w-md flex-col rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 md:bottom-auto md:top-24 md:rounded-2xl">
        <label className="mb-1 text-sm font-medium uppercase text-text-primary" htmlFor="district-search">
          Busca tu distrito
        </label>
        <input
          id="district-search"
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: Castilla"
          className="mb-3 h-11 rounded-xl border border-border px-3 text-base outline-none focus:border-secondary"
        />
        <div className="flex flex-col overflow-y-auto">
          {matches.map((d) => (
            <button
              key={`${d.distrito}·${d.provincia}`}
              type="button"
              onClick={() => onPick(d)}
              className="flex h-12 items-center justify-between rounded-lg px-3 text-left hover:bg-background-secondary"
            >
              <span className="text-base text-text-primary">{d.distrito}</span>
              <span className="text-sm text-text-tertiary">{d.provincia}</span>
            </button>
          ))}
          {matches.length === 0 && <p className="px-3 py-4 text-sm text-text-secondary">No encontramos ese distrito.</p>}
        </div>
        <button type="button" onClick={onClose} className="mt-3 h-11 rounded-full text-sm font-medium text-text-secondary">
          Cancelar
        </button>
      </div>
    </>
  )
}
