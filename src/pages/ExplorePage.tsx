import { useState } from 'react'
import { useExploreListings } from '@/hooks/useExploreListings'
import { useMapFilters } from '@/hooks/useMapFilters'
import ExploreMap from '@/components/explore/ExploreMap'
import ExploreFilters from '@/components/explore/ExploreFilters'
import { SlidersHorizontal, X } from 'lucide-react'

export default function ExplorePage() {
  const { data: items = [], isLoading, error } = useExploreListings()
  const { filters, setFilters, filtered, total } = useMapFilters(items)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="fixed inset-0 top-[72px] flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-r border-border bg-cream p-5 md:block">
        <h2 className="mb-4 text-lg font-bold text-text-primary">Explorar</h2>
        <ExploreFilters
          filters={filters}
          setFilters={setFilters}
          resultCount={filtered.length}
          total={total}
        />
      </aside>

      {/* Map area */}
      <div className="relative flex-1">
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
        <ExploreMap items={filtered} />

        {/* Mobile filter button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-text-primary shadow-medium md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {filtered.length < total && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
              {filtered.length}
            </span>
          )}
        </button>
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
              resultCount={filtered.length}
              total={total}
            />
          </div>
        </>
      )}
    </div>
  )
}
