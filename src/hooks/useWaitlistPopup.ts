import { useCallback, useEffect, useState } from 'react'

const JOINED_KEY = 'oqupa_waitlist_joined'
const COLLAPSED_KEY = 'oqupa_popup_collapsed'
const SHOW_DELAY_MS = 5000

export function useWaitlistPopup() {
  const [isReady, setIsReady] = useState(false)
  const [isExpanded, setIsExpanded] = useState(() => !localStorage.getItem(COLLAPSED_KEY))

  useEffect(() => {
    // Never show if user already joined the waitlist
    if (localStorage.getItem(JOINED_KEY)) return

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
    setIsReady(false)
    localStorage.setItem(JOINED_KEY, 'true')
  }, [])

  const hide = useCallback(() => {
    setIsExpanded(false)
  }, [])

  return { isReady, isExpanded, collapse, expand, markJoined, hide }
}
