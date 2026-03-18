import { useEffect, useRef, useCallback } from 'react'

/**
 * Calls onLoadMore when a sentinel element scrolls into view.
 * Returns a ref to attach to the sentinel element.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  enabled: boolean,
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && enabled) {
        onLoadMore()
      }
    },
    [onLoadMore, enabled],
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    })
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [handleIntersect])

  return sentinelRef
}
