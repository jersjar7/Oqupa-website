import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS } from '@/types/enums'
import type { MapFilters } from '@/types/explore'

interface ExploreFiltersProps {
  filters: MapFilters
  setFilters: React.Dispatch<React.SetStateAction<MapFilters>>
  resultCount: number
  total: number
  layout?: 'horizontal' | 'vertical'
}

const PROPERTY_TYPES = Object.entries(PROPERTY_TYPE_LABELS) as [string, string][]

export default function ExploreFilters({
  filters,
  setFilters,
  resultCount,
  total,
  layout = 'horizontal',
}: ExploreFiltersProps) {
  const isVertical = layout === 'vertical'

  return (
    <div className={isVertical ? 'space-y-5' : 'flex flex-wrap items-center gap-3'}>
      {/* Operation type */}
      <div className="flex gap-1.5">
        {[
          { value: null, label: 'Todos' },
          ...Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => ({
            value: value as 'venta' | 'alquiler',
            label,
          })),
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() =>
              setFilters((prev) => ({ ...prev, operationType: opt.value }))
            }
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filters.operationType === opt.value
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-text-secondary hover:bg-border'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Divider (horizontal only) */}
      {!isVertical && <div className="h-5 w-px bg-border" />}

      {/* Property type */}
      <div className="flex flex-wrap gap-1.5">
        {PROPERTY_TYPES.map(([value, label]) => {
          const isActive = filters.propertyTypes.includes(value)
          return (
            <button
              key={value}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  propertyTypes: isActive
                    ? prev.propertyTypes.filter((t) => t !== value)
                    : [...prev.propertyTypes, value],
                }))
              }
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-white'
                  : 'bg-background-secondary text-text-secondary hover:bg-border'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Divider (horizontal only) */}
      {!isVertical && <div className="h-5 w-px bg-border" />}

      {/* Price range */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Mín"
          value={filters.priceMin ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              priceMin: e.target.value ? Number(e.target.value) : null,
            }))
          }
          className="w-24 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
        <span className="text-text-tertiary">—</span>
        <input
          type="number"
          placeholder="Máx"
          value={filters.priceMax ?? ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              priceMax: e.target.value ? Number(e.target.value) : null,
            }))
          }
          className="w-24 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
      </div>

      {/* Result count */}
      {!isVertical && <div className="h-5 w-px bg-border" />}
      <p className="text-sm text-text-secondary">
        <span className="font-bold text-text-primary">{resultCount}</span>
        {' '}de {total} propiedades
      </p>
    </div>
  )
}
