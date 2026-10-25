// Computer: the filters float on the map instead of taking a full row above it
// (UX review 2026-10-25): Venta / Alquiler, and Filtros, which opens the rest —
// rental period, type and price — in a small panel. The count is already the
// list's own heading ("11 en venta aquí"), so it is not repeated here.
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { OPERATION_TYPE_LABELS, isAlquilerOnlyType, type PropertyType } from '@/types/enums'
import { activeFilterCount } from '@/lib/map/filterCount'
import ExploreFilters from './ExploreFilters'
import type { MapFilters } from '@/types/explore'

interface MapFilterBarProps {
  filters: MapFilters
  setFilters: React.Dispatch<React.SetStateAction<MapFilters>>
}

export default function MapFilterBar({ filters, setFilters }: MapFilterBarProps) {
  const [open, setOpen] = useState(false)
  const active = activeFilterCount(filters)
  return (
    <div className="relative flex items-start gap-2">
      <div className="flex rounded-full bg-white p-1 shadow-medium">
        {(Object.entries(OPERATION_TYPE_LABELS) as ['venta' | 'alquiler', string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                operationType: value,
                rentalDurationType: value === 'alquiler' ? (prev.rentalDurationType ?? null) : null,
                propertyTypes: value === 'venta' ? prev.propertyTypes.filter((t) => !isAlquilerOnlyType(t as PropertyType)) : prev.propertyTypes,
              }))
            }
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filters.operationType === value ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={active > 0 ? `Filtros, ${active} activos` : 'Filtros'}
        className="flex h-[38px] items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-text-primary shadow-medium hover:bg-background-secondary"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filtros
        {active > 0 && <span className="rounded-full bg-primary px-1.5 py-px text-xs font-bold text-white">{active}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Filtros" className="absolute left-0 top-12 z-30 w-[360px] rounded-2xl bg-cream p-5 shadow-large">
          <ExploreFilters filters={filters} setFilters={setFilters} resultCount={0} total={0} layout="vertical" showOperation={false} showCount={false} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-5 w-full rounded-full bg-primary py-2.5 font-sans text-sm font-bold uppercase tracking-[1px] text-white hover:bg-primary-hover"
          >
            Listo
          </button>
        </div>
      )}
    </div>
  )
}
