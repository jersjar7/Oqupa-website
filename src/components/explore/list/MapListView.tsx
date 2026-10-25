// The list of what the map shows (map plan steps 3–4, ADR-031). The header is
// the count and the sort button — nothing else (Jerson: no filler text).
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { emptyListOtherOperation, emptyListTitle, LIST_SORTS, listHeader, sortListingsForList, type ListSort } from '@/lib/map/listLogic'
import { penPerUsdForThisVisit, penPerUsdRightNow } from '@/lib/map/exchangeRates'
import ListingListCard from './ListingListCard'
import type { ListingWithProperty } from '@/types/explore'
import { pointerWords, usePointerKind } from '@/lib/pointerWords'

interface MapListViewProps {
  items: ListingWithProperty[]
  isVenta: boolean
  /** Chosen once per visit (ExplorePage): stable order within a visit, fair
   *  turns at the top for equally boosted listings across visits. */
  sessionSeed: number
  otherOperationCount: number
  onSwitchOperation: () => void
  highlightedId?: string | null
  /** The card under the pointer (computer), so the map can show which pin it
   *  is; null when the pointer leaves. */
  onCardHover?: (id: string | null) => void
  /** 'grid' for the computer-size side panel. */
  layout?: 'column' | 'grid'
}

export default function MapListView({
  items, isVenta, sessionSeed, otherOperationCount, onSwitchOperation, highlightedId, onCardHover, layout = 'column',
}: MapListViewProps) {
  const [sort, setSort] = useState<ListSort>('recomendados')
  const [sheetOpen, setSheetOpen] = useState(false)
  const pointer = usePointerKind()
  // Soles per dollar for the price sorts: the saved/default rate at once, the
  // live one as soon as this visit's single fetch answers (ADR-031 item 19).
  const [penPerUsd, setPenPerUsd] = useState(penPerUsdRightNow)
  useEffect(() => {
    let alive = true
    penPerUsdForThisVisit().then((r) => alive && setPenPerUsd(r))
    return () => {
      alive = false
    }
  }, [])
  const sorted = useMemo(
    () => sortListingsForList(items, sort, sessionSeed, penPerUsd),
    [items, sort, sessionSeed, penPerUsd],
  )
  const sortLabel = LIST_SORTS.find((s) => s.id === sort)!.label
  const offer = emptyListOtherOperation(otherOperationCount, !isVenta)

  return (
    <div>
      <div data-testid="map-list-header" className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-text-primary">{listHeader(items.length, isVenta)}</h2>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-secondary bg-white px-3 text-[13px] font-bold text-secondary"
        >
          {sortLabel}
          <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h3 className="font-serif text-2xl text-text-primary">{emptyListTitle(isVenta)}</h3>
          <p className="text-[15px] leading-relaxed text-text-secondary">{pointerWords(pointer).emptyListZoomOutHint}</p>
          {offer && (
            <button type="button" onClick={onSwitchOperation} className="text-[15px] font-medium text-secondary underline underline-offset-2">
              {offer}
            </button>
          )}
        </div>
      ) : (
        <div className={layout === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3' : 'flex flex-col gap-3'}>
          {sorted.map((item) => (
            <div
              key={item.listing.id}
              data-listing-id={item.listing.id}
              onMouseEnter={onCardHover ? () => onCardHover(item.listing.id) : undefined}
              onMouseLeave={onCardHover ? () => onCardHover(null) : undefined}
            >
              <ListingListCard item={item} isHighlighted={highlightedId === item.listing.id} />
            </div>
          ))}
        </div>
      )}

      {/* At the top level of the page, so the phone's VER MAPA | Filtros bar
          cannot cover its last choice (2026-10-25). */}
      {sheetOpen && createPortal(
        <div>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setSheetOpen(false)} />
          <div role="dialog" aria-label="Ordenar" className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-md rounded-t-2xl bg-white px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-5 md:bottom-auto md:top-1/3 md:rounded-2xl">
            <p className="mb-2 text-lg font-bold text-text-primary">Ordenar</p>
            <div className="flex flex-col gap-1">
              {LIST_SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSort(s.id)
                    setSheetOpen(false)
                  }}
                  className={`flex h-14 items-center justify-between rounded-xl px-3.5 text-left text-[17px] text-text-primary ${s.id === sort ? 'bg-[#EEF4F1]' : ''}`}
                >
                  <span>{s.label}</span>
                  {s.id === sort && <span className="font-bold text-secondary">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
