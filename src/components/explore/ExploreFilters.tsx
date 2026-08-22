import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  RENTAL_DURATION_TYPE_LABELS,
  VENTA_PROPERTY_TYPES,
  ALQUILER_LONG_TERM_PROPERTY_TYPES,
  ALQUILER_SHORT_TERM_PROPERTY_TYPES,
  ALQUILER_ALL_PROPERTY_TYPES,
  isAlquilerOnlyType,
  type PropertyType,
  type RentalDurationType,
} from '@/types/enums'
import type { MapFilters } from '@/types/explore'

interface ExploreFiltersProps {
  filters: MapFilters
  setFilters: React.Dispatch<React.SetStateAction<MapFilters>>
  resultCount: number
  total: number
  layout?: 'horizontal' | 'vertical'
}

export default function ExploreFilters({
  filters,
  setFilters,
  resultCount,
  total,
  layout = 'horizontal',
}: ExploreFiltersProps) {
  const isVertical = layout === 'vertical'
  const isAlquiler = filters.operationType === 'alquiler'

  // Determine which property types to show based on filters
  const availablePropertyTypes = filters.operationType === 'venta'
    ? VENTA_PROPERTY_TYPES
    : isAlquiler
      ? (filters.rentalDurationType === 'shortTerm'
        ? ALQUILER_SHORT_TERM_PROPERTY_TYPES
        : filters.rentalDurationType === 'longTerm'
          ? ALQUILER_LONG_TERM_PROPERTY_TYPES
          : ALQUILER_ALL_PROPERTY_TYPES)
      : Object.keys(PROPERTY_TYPE_LABELS)

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
              setFilters((prev) => {
                const cleanedTypes = opt.value === 'venta'
                  ? prev.propertyTypes.filter((t) => !isAlquilerOnlyType(t as PropertyType))
                  : prev.propertyTypes
                return {
                  ...prev,
                  operationType: opt.value,
                  rentalDurationType: opt.value === 'alquiler' ? (prev.rentalDurationType ?? null) : null,
                  propertyTypes: cleanedTypes,
                }
              })
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

      {/* Rental duration (only when Alquiler is selected) */}
      {isAlquiler && (
        <>
          {!isVertical && <div className="h-5 w-px bg-border" />}
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, rentalDurationType: null }))
              }
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filters.rentalDurationType === null
                  ? 'bg-primary text-white'
                  : 'bg-background-secondary text-text-secondary hover:bg-border'
              }`}
            >
              Todos
            </button>
            {Object.entries(RENTAL_DURATION_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setFilters((prev) => {
                    const duration = value as RentalDurationType
                    const validTypes = duration === 'longTerm'
                      ? ALQUILER_LONG_TERM_PROPERTY_TYPES
                      : ALQUILER_SHORT_TERM_PROPERTY_TYPES
                    return {
                      ...prev,
                      rentalDurationType: duration,
                      propertyTypes: prev.propertyTypes.filter((t) => validTypes.includes(t as PropertyType)),
                    }
                  })
                }
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filters.rentalDurationType === value
                    ? 'bg-primary text-white'
                    : 'bg-background-secondary text-text-secondary hover:bg-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Divider (horizontal only) */}
      {!isVertical && <div className="h-5 w-px bg-border" />}

      {/* Property type */}
      <div className="flex flex-wrap gap-1.5">
        {availablePropertyTypes.map((value) => {
          const label = PROPERTY_TYPE_LABELS[value as keyof typeof PROPERTY_TYPE_LABELS]
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
        <span className="text-xs font-medium text-text-secondary">Precio:</span>
        <input
          type="text"
          inputMode="numeric"
          name="priceMin"
          autoComplete="off"
          placeholder="Mín"
          aria-label="Precio mínimo"
          value={filters.priceMin != null ? filters.priceMin.toLocaleString('en-US') : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setFilters((prev) => ({
              ...prev,
              priceMin: raw ? Number(raw) : null,
            }))
          }}
          className="w-28 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
        />
        <span className="text-text-tertiary">—</span>
        <input
          type="text"
          inputMode="numeric"
          name="priceMax"
          autoComplete="off"
          placeholder="Máx"
          aria-label="Precio máximo"
          value={filters.priceMax != null ? filters.priceMax.toLocaleString('en-US') : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setFilters((prev) => ({
              ...prev,
              priceMax: raw ? Number(raw) : null,
            }))
          }}
          className="w-28 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
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
