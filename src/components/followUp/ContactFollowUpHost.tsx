// Shows the contact follow-up card (metrics plan A11b) when a signed-in person
// comes back to the Oqupa tab, or opens the site signed in — the website's
// copy of the app's ContactFollowUpListener (Jerson, 2026-10-31).
//
// On the website WhatsApp opens in a new tab (or, after the account steps,
// replaces this one). "Coming back" is therefore:
//   - the tab becoming visible again (visibilitychange), or the window
//     getting focus back (a separate WhatsApp window);
//   - the page being shown again from the browser's back button (pageshow);
//   - the page loading again, which is a sign-in for the coordinator.
// Each one waits a moment, so the card lands on a settled page.
//
// Signed in here means fully set up — confirmed email, name, verified phone
// (the VerifiedGuard rule). Someone still in the account steps cannot have
// contacted anyone, and must not be interrupted.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { isAccountReady } from '@/lib/accountReady'
import { isFollowUpRoute, isScreenClearForFollowUp } from '@/lib/followUpScreen'
import {
  contactFollowUpCoordinator,
  type ContactFollowUpCoordinator,
  type FollowUpSession,
} from '@/lib/contactFollowUpCoordinator'
import type { DueFollowUpCard } from '@/services/contactFollowUpService'
import ContactFollowUpCard from './ContactFollowUpCard'

interface Shown {
  card: DueFollowUpCard
  session: FollowUpSession
  done: () => void
  key: number
}

interface ContactFollowUpHostProps {
  coordinator?: ContactFollowUpCoordinator
  /** The pause after a return or a page change. */
  settleMs?: number
  /** While an ask is owed, how often to look whether the screen is clear yet. */
  pollMs?: number
}

export default function ContactFollowUpHost({
  coordinator = contactFollowUpCoordinator,
  settleMs = 600,
  pollMs = 1500,
}: ContactFollowUpHostProps) {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const { pathname } = useLocation()
  const [shown, setShown] = useState<Shown | null>(null)

  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const mounted = useRef(true)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  /** Never straight from an event: a moment later, once the page has settled. */
  const afterSettling = useCallback(
    (action: () => unknown) => {
      const t = setTimeout(() => {
        timers.current.delete(t)
        if (mounted.current) void action()
      }, settleMs)
      timers.current.add(t)
    },
    [settleMs],
  )

  // Hook the coordinator up to this page.
  useEffect(() => {
    mounted.current = true
    const pending = timers.current
    let counter = 0
    coordinator.canPresentNow = () =>
      mounted.current &&
      document.visibilityState === 'visible' &&
      isFollowUpRoute(pathRef.current) &&
      isScreenClearForFollowUp(document)
    coordinator.presentCard = (card, session) =>
      new Promise<void>((resolve) => {
        counter += 1
        setShown({
          card,
          session,
          key: counter,
          done: () => {
            setShown(null)
            resolve()
          },
        })
      })
    return () => {
      mounted.current = false
      for (const t of pending) clearTimeout(t)
      pending.clear()
      coordinator.canPresentNow = () => false
      coordinator.presentCard = null
    }
  }, [coordinator])

  // Who is signed in.
  const readyUid = isAccountReady(firebaseUser, user) ? firebaseUser!.uid : null
  useEffect(() => {
    if (!isInitialized) return
    if (readyUid) afterSettling(() => coordinator.signedIn(readyUid))
    else coordinator.signedOut()
  }, [readyUid, isInitialized, coordinator, afterSettling])

  // Leaving and coming back to the tab.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') coordinator.left()
      else afterSettling(() => coordinator.returned())
    }
    const onLeave = () => coordinator.left()
    const onBack = () => afterSettling(() => coordinator.returned())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onLeave)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('focus', onBack)
    window.addEventListener('pageshow', onBack)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onLeave)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('focus', onBack)
      window.removeEventListener('pageshow', onBack)
    }
  }, [coordinator, afterSettling])

  // A page change: make an owed ask, or show a kept card, if the page is calm.
  useEffect(() => {
    afterSettling(() => coordinator.screenSettled())
  }, [pathname, coordinator, afterSettling])

  // A dialog closing changes no route, so while something is owed, look again
  // now and then. Costs nothing otherwise: screenSettled is a no-op.
  useEffect(() => {
    const id = setInterval(() => {
      if (coordinator.hasOwedWork) void coordinator.screenSettled()
    }, pollMs)
    return () => clearInterval(id)
  }, [coordinator, pollMs])

  if (!shown) return null
  return <ContactFollowUpCard key={shown.key} card={shown.card} session={shown.session} onDone={shown.done} />
}
