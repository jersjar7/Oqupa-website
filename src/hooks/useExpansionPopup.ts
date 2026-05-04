import { useCallback, useEffect, useState } from 'react'

const COLLAPSED_KEY = 'oqupa_popup_collapsed'
const SHOW_DELAY_MS = 5000
const SUCCESS_DISPLAY_MS = 3000

export function useExpansionPopup() {
  const [isReady, setIsReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(() => !localStorage.getItem(COLLAPSED_KEY))

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const collapse = useCallback(() => {
    setIsExpanded(false)
    localStorage.setItem(COLLAPSED_KEY, 'true')
  }, [])

  const expand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const markJoined = useCallback(() => {
    // Show success message for 3 seconds, then smoothly collapse
    setTimeout(() => {
      setIsExpanded(false)
      localStorage.setItem(COLLAPSED_KEY, 'true')
    }, SUCCESS_DISPLAY_MS)
  }, [])

  return { isReady, isExpanded, collapse, expand, markJoined }
}
