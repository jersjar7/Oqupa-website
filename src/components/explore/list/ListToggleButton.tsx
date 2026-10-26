// "VER LISTA · 9 en venta" on the map; "VER MAPA" in the list (map plan
// steps 3–4, ADR-031). One button in one place, labelled in words.
import { listButtonLabel, LIST_BACK_TO_MAP_LABEL } from '@/lib/map/listLogic'

interface ListToggleButtonProps {
  mode: 'map' | 'list'
  count: number
  isVenta: boolean
  onClick: () => void
  className?: string
  style?: React.CSSProperties
}

export default function ListToggleButton({ mode, count, isVenta, onClick, className = '', style }: ListToggleButtonProps) {
  const label = mode === 'map' ? listButtonLabel(count, isVenta) : LIST_BACK_TO_MAP_LABEL
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`flex h-12 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#1F2937] px-5 font-sans text-sm font-bold tracking-[0.5px] text-white shadow-large ${className}`}
    >
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
      {label}
    </button>
  )
}
