// Phone: one bar at the bottom of the map instead of two stacked buttons (UX
// review 2026-10-25): "VER LISTA · 9 en venta" (or "VER MAPA") and Filtros side
// by side in one dark pill. Filtros shows how many filters are on.
import { SlidersHorizontal } from 'lucide-react'
import { listButtonLabel, LIST_BACK_TO_MAP_LABEL } from '@/lib/map/listLogic'

interface PhoneMapBarProps {
  mode: 'map' | 'list'
  count: number
  isVenta: boolean
  activeFilters: number
  onToggleList: () => void
  onOpenFilters: () => void
}

export default function PhoneMapBar({ mode, count, isVenta, activeFilters, onToggleList, onOpenFilters }: PhoneMapBarProps) {
  return (
    <div data-testid="phone-map-bar" className="flex h-12 items-center whitespace-nowrap rounded-full bg-[#1F2937] font-sans text-sm font-bold tracking-[0.5px] text-white shadow-large">
      <button type="button" onClick={onToggleList} className="flex h-full items-center gap-2.5 pl-5 pr-4">
        {mode === 'map' ? (
          <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
            <rect x="0" y="0" width="18" height="2.5" rx="1" fill="#fff" />
            <rect x="0" y="5.5" width="18" height="2.5" rx="1" fill="#fff" />
            <rect x="0" y="11" width="18" height="2.5" rx="1" fill="#fff" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M1 3 L6 1 L12 3 L17 1 V15 L12 17 L6 15 L1 17 Z" fill="none" stroke="#fff" strokeWidth="1.8" />
          </svg>
        )}
        {mode === 'map' ? listButtonLabel(count, isVenta) : LIST_BACK_TO_MAP_LABEL}
      </button>
      <span className="h-6 w-px bg-white/25" aria-hidden="true" />
      <button type="button" onClick={onOpenFilters} aria-label={activeFilters > 0 ? `Filtros, ${activeFilters} activos` : 'Filtros'} className="flex h-full items-center gap-2 pl-4 pr-5">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filtros
        {activeFilters > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-px text-xs text-white">{activeFilters}</span>
        )}
      </button>
    </div>
  )
}
