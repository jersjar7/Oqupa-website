import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CardContent } from './MapPreviewCard'
import type { ListingWithProperty } from '@/types/explore'

interface HoverPreviewCardProps {
  item: ListingWithProperty | null
  onHover: (id: string | null) => void
}

/**
 * Hover preview card rendered outside the Google Maps overlay system.
 *
 * Uses position:fixed via a React portal to document.body so it never
 * competes with AdvancedMarker overlays for mouse events. The card is
 * positioned using getBoundingClientRect() from the marker DOM element
 * (found via data-marker-id attribute) and repositions on window resize.
 *
 * The card is interactive: hovering it keeps hoveredId alive (the 75ms
 * debounce in useExploreInteraction gives the cursor time to cross the
 * gap from the pill to the card), and clicking navigates to the property.
 */
export default function HoverPreviewCard({ item, onHover }: HoverPreviewCardProps) {
  const navigate = useNavigate()
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const markerId = item?.listing.id ?? null

  useLayoutEffect(() => {
    if (!markerId) {
      setPos(null)
      return
    }

    const updatePos = () => {
      const el = document.querySelector(`[data-marker-id="${markerId}"]`)
      if (!el) {
        setPos(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setPos({
        left: rect.left + rect.width / 2,
        top: rect.top,
      })
    }

    updatePos()
    window.addEventListener('resize', updatePos)
    return () => window.removeEventListener('resize', updatePos)
  }, [markerId])

  return createPortal(
    <AnimatePresence>
      {item && pos && (
        <motion.div
          key={item.listing.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top - 10,
            // Use framer-motion's x/y for the offset so they compose with
            // scale instead of being overwritten by it.
            x: '-50%',
            y: '-100%',
            transformOrigin: 'bottom center',
            zIndex: 9999,
          }}
          role="button"
          tabIndex={0}
          aria-label="Ver detalles de la propiedad"
          onMouseEnter={() => onHover(item.listing.id)}
          onMouseLeave={() => onHover(null)}
          onClick={() => navigate(`/property/${item.listing.id}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate(`/property/${item.listing.id}`)
            }
          }}
        >
          <CardContent item={item} />

          {/* Triangle pointer */}
          <div className="flex justify-center">
            <div
              className="h-0 w-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid white',
              }}
            />
          </div>

          {/* Invisible bridge connecting the card to the price bubble below */}
          <div style={{ height: 15, width: '100%' }} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
