import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * True on the listing page the wizard lands on right after publishing
 * (ADR-043), so it can offer to share the new listing once.
 *
 * The flag rides on the navigation state, and is removed straight away:
 * browsers keep navigation state across a refresh, and a refresh must not
 * offer the share prompt again.
 */
export function useJustPublished(): { justPublished: boolean; dismiss: () => void } {
  const location = useLocation()
  const navigate = useNavigate()
  const flagged = Boolean((location.state as { justPublished?: boolean } | null)?.justPublished)
  const [justPublished, setJustPublished] = useState(flagged)

  useEffect(() => {
    if (flagged) {
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { justPublished, dismiss: () => setJustPublished(false) }
}
