import { useCallback, useEffect, useRef } from 'react'
import { listingCounts } from '@/lib/listingCounts'
import { useAuthStore } from '@/stores/authStore'

// ADR-051 on the website. The server ignores the owner too; skipping here only
// saves the request.

const SHOWN_AFTER_MS = 1000
const SEEN_AFTER_MS = 2000
const HALF = 0.5

const tabVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

/**
 * Aparición: attach the returned ref to a listing card (a list card, or the
 * selected pin's card). Counts once the card has been at least half on screen
 * for 1 full second, in a visible tab. Never for a map pin.
 */
export function useCountShownWhenVisible(listingId: string, ownerId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  const isOwner = !!userId && userId === ownerId
  const cleanupRef = useRef<(() => void) | null>(null)

  const ref = useCallback(
    (el: Element | null) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      if (!el || isOwner || typeof IntersectionObserver === 'undefined') return

      let timer: ReturnType<typeof setTimeout> | null = null
      let done = false
      const stop = () => {
        if (timer !== null) clearTimeout(timer)
        timer = null
      }
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1]
          if (!entry || done) return
          if (entry.isIntersecting && entry.intersectionRatio >= HALF) {
            if (timer === null) {
              timer = setTimeout(() => {
                timer = null
                if (done || !tabVisible()) return
                done = true
                listingCounts.add(listingId, 'shown')
                observer.disconnect()
              }, SHOWN_AFTER_MS)
            }
          } else {
            stop()
          }
        },
        { threshold: [0, HALF, 1] },
      )
      observer.observe(el)
      cleanupRef.current = () => {
        stop()
        observer.disconnect()
      }
    },
    [listingId, isOwner],
  )

  useEffect(() => () => cleanupRef.current?.(), [])
  return ref
}

/**
 * Vista: call while a listing is open on purpose (the selected pin's card, or
 * the listing's own page). Counts once it has stayed open 2 seconds. Waits
 * until the owner is known, so the owner is never counted.
 */
export function useCountSeenWhileOpen(listingId: string | undefined, ownerId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id)
  const isOwner = !!userId && userId === ownerId

  useEffect(() => {
    if (!listingId || !ownerId || isOwner) return
    const timer = setTimeout(() => {
      if (tabVisible()) listingCounts.add(listingId, 'seen')
    }, SEEN_AFTER_MS)
    return () => clearTimeout(timer)
  }, [listingId, ownerId, isOwner])
}
