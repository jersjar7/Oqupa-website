// The phone's listing card at the bottom of the map. Since the UX review of
// 2026-10-25 it is the slim card (small photo, price, type, details, place)
// instead of a half-screen photo and a VER DETALLES button: the whole card
// opens the listing. No dark layer over the map, so the map stays usable —
// tapping another pin opens that one, tapping the map closes the card, and a
// swipe down closes it too.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CompactListingCard from './CompactListingCard'
import type { ListingWithProperty } from '@/types/explore'

interface MobileListingSheetProps {
  item: ListingWithProperty | null
  onClose: () => void
  /** The sheet's height while open (0 when closed), so the VER LISTA button
   *  can slide up above it (map plan step 4). */
  onHeightChange?: (height: number) => void
}

export default function MobileListingSheet({ item, onClose, onHeightChange }: MobileListingSheetProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!onHeightChange) return
    const el = containerRef.current
    if (!item || !el) {
      onHeightChange(0)
      return
    }
    const report = () => onHeightChange(el.getBoundingClientRect().height)
    report()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => ro.disconnect()
  }, [item, onHeightChange])

  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [item, onClose])

  return (
    <AnimatePresence>
      {item && (
        // Kept above the browser's bottom bar and the iPhone's home line.
        <motion.div
          ref={containerRef}
          key={`sheet-${item.listing.id}`}
          role="dialog"
          aria-label="Detalle de la propiedad"
          className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] outline-none"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 60) onClose()
          }}
        >
          <div
            role="link"
            tabIndex={0}
            aria-label="Ver detalles de la propiedad"
            className="cursor-pointer"
            onClick={() => navigate(`/property/${item.listing.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/property/${item.listing.id}`)
              }
            }}
          >
            <CompactListingCard item={item} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
