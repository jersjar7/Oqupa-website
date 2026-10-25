import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useExploreListings } from '@/hooks/useExploreListings'
import { useMapFilters } from '@/hooks/useMapFilters'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useExploreInteraction } from '@/hooks/useExploreInteraction'
import { useIsDesktop } from '@/hooks/useMediaQuery'
// Mapbox is large: loaded only when the explore page is opened.
const ExploreMap = lazy(() => import('@/components/explore/ExploreMap'))
import ExploreFilters from '@/components/explore/ExploreFilters'
import MapListView from '@/components/explore/list/MapListView'
import ListToggleButton from '@/components/explore/list/ListToggleButton'
import { listingsInsideBounds } from '@/lib/map/listLogic'
import type { Bounds } from '@/lib/map/mapPoint'
import MobileListingSheet from '@/components/explore/MobileListingSheet'
import { thumbnail } from '@/lib/imageUrl'
import { getExploreEmptyMessage } from '@/lib/exploreEmptyState'
import { SlidersHorizontal, X, MapPin } from 'lucide-react'
import type { MapFilters } from '@/types/explore'

function PropertyCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-white">
      <div className="aspect-[4/3] w-full bg-background-secondary" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 rounded bg-background-secondary" />
        <div className="h-3 w-1/2 rounded bg-background-secondary" />
        <div className="h-3 w-1/3 rounded bg-background-secondary" />
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  useDocumentMeta({
    title: 'Explorar Propiedades - Oqupa',
    description:
      'Explora propiedades en venta y alquiler en Piura. Encuentra casas, departamentos, terrenos y mas en el mapa interactivo de Oqupa.',
    url: `${window.location.origin}/explorar`,
  })

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
  // Venta or Alquiler, never both — no "Todos" on the map (map plan step 4).
  const [filters, setFilters] = useState<MapFilters>({
    operationType: 'venta',
    rentalDurationType: null,
    propertyTypes: [],
    priceMin: null,
    priceMax: null,
  })
  const [mapBounds, setMapBounds] = useState<Bounds | null>(null)
  const {
    data: items,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    hitPageCeiling,
    refetch,
  } = useExploreListings(filters.operationType)
  const { filtered, visible, total } = useMapFilters(items, filters, mapBounds)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toastDismissed, setToastDismissed] = useState(false)
  const isVenta = filters.operationType !== 'alquiler'

  // The list (map plan steps 3–4): exactly what the map is showing. One seed
  // per visit — a stable order within the visit, fair turns at the top for
  // equally boosted listings across visits.
  const [listOpen, setListOpen] = useState(false)
  const [sessionSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [sheetHeight, setSheetHeight] = useState(0)

  // How many of the OTHER operation are in view — only asked when the list is
  // empty, for its "O mira las 4 en alquiler…" offer.
  const otherOperation = isVenta ? 'alquiler' : 'venta'
  const listEmpty = !isLoading && visible.length === 0
  const { data: otherItems } = useExploreListings(otherOperation, { enabled: listEmpty })
  const otherOperationCount = useMemo(
    () => (mapBounds && listEmpty ? listingsInsideBounds(otherItems, mapBounds).length : 0),
    [otherItems, mapBounds, listEmpty],
  )
  const switchOperation = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      operationType: prev.operationType === 'alquiler' ? 'venta' : 'alquiler',
      rentalDurationType: null,
      propertyTypes: [],
    }))
  }, [])

  const {
    hoveredId,
    selectedId,
    panelRef,
    handleMarkerHover,
    handleMarkerClick,
    handleDismiss,
  } = useExploreInteraction()

  // Find the selected item for mobile sheet
  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return filtered.find((i) => i.listing.id === selectedId) ?? null
  }, [filtered, selectedId])

  // Reset toast dismissal when results appear, so it shows again on next empty view
  useEffect(() => {
    if (visible.length > 0) setToastDismissed(false)
  }, [visible.length])

  const handleBoundsChanged = (bounds: Bounds) => {
    setMapBounds(bounds)
  }

  // Prefetch thumbnail images when listing data arrives
  useEffect(() => {
    if (!items?.length) return
    for (const item of items) {
      const ref = item.property.media.photoKeys?.[0] ?? item.property.media.propertyPhotoUrls[0]
      if (ref) {
        const img = new Image()
        img.src = thumbnail(ref)
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
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="loading-overlay"
                className="absolute inset-0 z-10 flex items-center justify-center bg-cream/80"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </motion.div>
            )}
          </AnimatePresence>
          {error && (
            <motion.div
              key="error-overlay"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cream/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-error">Error al cargar propiedades</p>
              <button
                onClick={() => refetch()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
              >
                Reintentar
              </button>
            </motion.div>
          )}
          <Suspense fallback={<div className="h-full w-full bg-cream" />}>
          <ExploreMap
            items={filtered}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={handleMarkerClick}
            onHover={handleMarkerHover}
            onBoundsChanged={handleBoundsChanged}
            initialCenter={initialCenter}
            showPreviewCard={isDesktop}
            isVenta={isVenta}
          />
          </Suspense>

          {/* Mobile empty area toast */}
          {!isLoading && visible.length === 0 && !toastDismissed && (
            <div className="absolute bottom-36 left-4 right-4 z-10 flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-medium backdrop-blur-sm md:hidden">
              <MapPin className="h-4 w-4 shrink-0 text-text-tertiary" />
              <p className="flex-1 text-xs text-text-secondary">
                {getExploreEmptyMessage(total, filtered.length)}
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
        <div
          ref={panelRef}
          className="hidden w-0 flex-[2] overflow-y-auto border-l border-border bg-cream p-4 md:block"
        >
          {/* The catalogue has outgrown load-everything, so the map is now
              genuinely showing a subset. Say so. A cap that stays quiet is the
              same bug this page just had — a partial map presented as the whole
              one. Cannot trigger at Piura's current size; the honest fix when
              it does is querying by map viewport. */}
          {hitPageCeiling && (
            <p className="mb-3 rounded-lg bg-accent/30 px-3 py-2 text-xs text-[#8A6400]">
              Mostrando las propiedades mas recientes. Usa los filtros o acerca
              el mapa para ver el resto.
            </p>
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <MapListView
              items={visible}
              isVenta={isVenta}
              sessionSeed={sessionSeed}
              otherOperationCount={otherOperationCount}
              onSwitchOperation={switchOperation}
              highlightedId={hoveredId ?? selectedId}
              layout="grid"
            />
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

      {/* Phone: the list of what the map shows, over the map (the map stays
          mounted, so VER MAPA returns to exactly the same view). */}
      {!isDesktop && listOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-20 overflow-y-auto bg-cream px-4 pb-40 pt-4">
          <MapListView
            items={visible}
            isVenta={isVenta}
            sessionSeed={sessionSeed}
            otherOperationCount={otherOperationCount}
            onSwitchOperation={switchOperation}
          />
        </div>
      )}

      {/* Phone: one button, "VER LISTA · 9 en venta" / "VER MAPA", just above
          the Filtros button; it slides up above a listing's card when one
          opens (ADR-031 item 5). */}
      {!isDesktop && !isLoading && (
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 transition-[bottom] duration-[250ms] ease-out md:hidden"
          style={{ bottom: !listOpen && sheetHeight > 0 ? sheetHeight + 12 : 84 }}
        >
          <ListToggleButton
            mode={listOpen ? 'list' : 'map'}
            count={visible.length}
            isVenta={isVenta}
            onClick={() => {
              handleDismiss()
              setListOpen((open) => !open)
            }}
          />
        </div>
      )}

      {/* Mobile bottom sheet */}
      {!isDesktop && (
        <MobileListingSheet item={selectedItem} onClose={handleDismiss} onHeightChange={setSheetHeight} />
      )}

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
                aria-label="Cerrar filtros"
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
