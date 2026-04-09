import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useExploreListings } from '@/hooks/useExploreListings'
import { useMapFilters } from '@/hooks/useMapFilters'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import ExploreMap from '@/components/explore/ExploreMap'
import ExploreFilters from '@/components/explore/ExploreFilters'
import PropertyCard from '@/components/explore/PropertyCard'
import { SlidersHorizontal, X, MapPin } from 'lucide-react'
import type { MapFilters } from '@/types/explore'

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()

  // Read post-publish focus coordinates from navigation state (once)
  const initialCenter = useMemo(() => {
    const state = location.state as { focusLat?: number; focusLng?: number } | null
    if (state?.focusLat != null && state?.focusLng != null) {
      // Clear state so refreshing/returning doesn't re-focus
      navigate(location.pathname, { replace: true, state: {} })
      return { lat: state.focusLat, lng: state.focusLng }
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [filters, setFilters] = useState<MapFilters>({
    operationType: null,
    rentalDurationType: null,
    propertyTypes: [],
    priceMin: null,
    priceMax: null,
  })
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null)
  const {
    data: items,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExploreListings(filters.operationType)
  const { filtered, visible, total } = useMapFilters(items, filters, mapBounds)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toastDismissed, setToastDismissed] = useState(false)

  // Reset toast dismissal when results appear, so it shows again on next empty view
  useEffect(() => {
    if (visible.length > 0) setToastDismissed(false)
  }, [visible.length])

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const handleBoundsChanged = useCallback((bounds: google.maps.LatLngBoundsLiteral) => {
    setMapBounds(bounds)
  }, [])

  // Prefetch thumbnail images when listing data arrives
  useEffect(() => {
    if (!items?.length) return
    for (const item of items) {
      const url = item.property.media.thumbnailPhotoUrls?.[0] ?? item.property.media.propertyPhotoUrls[0]
      if (url) {
        const img = new Image()
        img.src = url
      }
    }
  }, [items])

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage && !isFetchingNextPage,
  )

  return (
    <div className="fixed inset-0 top-[72px] flex flex-col">
      {/* Desktop filter bar */}
      <div className="hidden border-b border-border bg-cream px-5 py-3 md:block">
        <ExploreFilters
          filters={filters}
          setFilters={setFilters}
          resultCount={visible.length}
          total={total}
          layout="horizontal"
        />
      </div>

      {/* Main content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1 md:flex-[3]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/80">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/80">
              <p className="text-sm text-error">Error al cargar propiedades</p>
            </div>
          )}
          <ExploreMap
            items={filtered}
            selectedId={selectedId}
            onSelect={handleSelect}
            onBoundsChanged={handleBoundsChanged}
            initialCenter={initialCenter}
          />

          {/* Mobile empty area toast */}
          {!isLoading && visible.length === 0 && !toastDismissed && (
            <div className="absolute bottom-20 left-4 right-4 z-10 flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-medium backdrop-blur-sm md:hidden">
              <MapPin className="h-4 w-4 shrink-0 text-text-tertiary" />
              <p className="flex-1 text-xs text-text-secondary">
                {filtered.length > 0
                  ? 'No hay propiedades aqui. Aleja el mapa o navega a otra zona.'
                  : 'No hay propiedades con estos filtros.'}
              </p>
              <button
                onClick={() => setToastDismissed(true)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-black/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mobile filter button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-text-primary shadow-medium md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {visible.length < total && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                {visible.length}
              </span>
            )}
          </button>
        </div>

        {/* Desktop property cards panel */}
        <div className="hidden w-0 flex-[2] overflow-y-auto border-l border-border bg-cream p-4 md:block">
          {visible.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <MapPin className="h-8 w-8 text-text-tertiary/40" />
              <p className="text-sm text-text-tertiary">
                {filtered.length > 0
                  ? 'No hay propiedades en esta zona del mapa. Aleja el zoom o navega a otra ubicacion para ver las propiedades disponibles.'
                  : 'No se encontraron propiedades con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visible.map((item) => (
                <PropertyCard
                  key={item.listing.id}
                  item={item}
                  isSelected={selectedId === item.listing.id}
                  onClick={() => handleSelect(
                    selectedId === item.listing.id ? null : item.listing.id
                  )}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator for next page */}
          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {/* End of results */}
          {!hasNextPage && visible.length > 0 && !isLoading && (
            <p className="py-4 text-center text-xs text-text-tertiary">
              Has visto todas las propiedades
            </p>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-large md:hidden">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Filtros</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
            <ExploreFilters
              filters={filters}
              setFilters={setFilters}
              resultCount={visible.length}
              total={total}
              layout="vertical"
            />
          </div>
        </>
      )}
    </div>
  )
}
