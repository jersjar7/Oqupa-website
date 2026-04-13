import { useState, useCallback, useEffect, useRef } from 'react'

export interface ExploreInteraction {
  hoveredId: string | null
  selectedId: string | null
  panelRef: React.RefObject<HTMLDivElement | null>
  handleMarkerHover: (id: string | null) => void
  handleMarkerClick: (id: string | null) => void
  handleDismiss: () => void
}

/**
 * Centralized interaction state for the explore page.
 * Manages hover, selection, scroll-to-card, and Escape key dismiss.
 */
export function useExploreInteraction(): ExploreInteraction {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced hover handler — 75ms delay on null to prevent flicker between markers
  const handleMarkerHover = useCallback((id: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (id !== null) {
      setHoveredId(id)
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(null)
      }, 75)
    }
  }, [])

  // Click handler — sets selectedId and scrolls panel card into view
  const handleMarkerClick = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id && panelRef.current) {
      const card = panelRef.current.querySelector(`[data-listing-id="${id}"]`)
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  const handleDismiss = useCallback(() => {
    setHoveredId(null)
    setSelectedId(null)
  }, [])

  // Escape key listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleDismiss])

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  return {
    hoveredId,
    selectedId,
    panelRef,
    handleMarkerHover,
    handleMarkerClick,
    handleDismiss,
  }
}
