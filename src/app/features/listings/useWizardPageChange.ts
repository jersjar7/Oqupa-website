import { useEffect, useRef, type RefObject } from 'react'

/**
 * Each new wizard page starts at its top (hostile review 2026-11-02): the
 * dashboard scrolls inside its <main>, so both it and the window go to 0.
 * Not on the first render — opening the page is not a page change.
 */
export function useScrollTopOnPageChange(step: number, anchor: RefObject<HTMLElement | null>): void {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const main = anchor.current?.closest('main')
    try {
      main?.scrollTo?.({ top: 0 })
      window.scrollTo?.({ top: 0 })
    } catch {
      // Older browsers: nothing to do.
    }
  }, [step, anchor])
}

/**
 * After SIGUIENTE refuses a page, the first message on it gets the focus, so
 * a screen reader says it and a phone scrolls to it (hostile review). Error
 * messages carry `data-wizard-error`; a box marked aria-invalid is focused itself.
 */
export function focusFirstError(): void {
  setTimeout(() => {
    // The first in page order: a box marked invalid, or a message.
    const el = document.querySelector<HTMLElement>(
      '[data-wizard-error], input[aria-invalid="true"], textarea[aria-invalid="true"]',
    )
    if (!el) return
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus()
    el.scrollIntoView?.({ block: 'center' })
  }, 0)
}
