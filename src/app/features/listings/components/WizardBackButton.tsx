import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { useListingFormStore } from '@/stores/listingFormStore'

interface GuardState {
  wizardGuard?: boolean
}

/**
 * The browser's back button inside the publishing wizard (ADR-043 step 3,
 * bug 3): back moves one page; from page 1 it leaves the wizard, as before.
 *
 * How: while the wizard is past page 1, one extra history entry (same address,
 * marked `wizardGuard`) sits on top of the wizard's own. Back pops that entry
 * instead of leaving; seeing the pop, this goes one page back and, if still
 * past page 1, puts the extra entry back. On page 1 there is no extra entry,
 * so back leaves. While publishing, back is held on the page.
 *
 * Renders nothing. Must be inside a router.
 *
 * `forEdit`: on the edit page it waits until the page has loaded ITS listing
 * (edit mode, same id) and never acts on a leftover create draft; on the
 * create page it ignores an edit in progress (hostile review #4).
 */
export default function WizardBackButton({ forEdit = false }: { forEdit?: boolean }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const navigate = useNavigate()
  const { id } = useParams()
  const engaged = useListingFormStore((s) =>
    forEdit ? s.isEditMode && s.editListingId === id : !s.isEditMode,
  )
  const step = useListingFormStore((s) => s.step)
  // -1 only when the person went back (ATRÁS); reset() moves forward to 1.
  const direction = useListingFormStore((s) => s.direction)
  const onGuard = (location.state as GuardState | null)?.wizardGuard === true

  const lastKey = useRef<string | null>(null)
  // The entry a guard was already pushed from since arriving on it
  // (StrictMode runs effects twice; one press must not push two entries).
  const pushedFrom = useRef<string | null>(null)

  useEffect(() => {
    if (!engaged) return
    const firstRun = lastKey.current === null
    const arrived = lastKey.current !== location.key
    lastKey.current = location.key
    if (arrived) pushedFrom.current = null

    const pushGuard = () => {
      if (pushedFrom.current === location.key) return
      pushedFrom.current = location.key
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { state: { wizardGuard: true } satisfies GuardState },
      )
    }

    const store = useListingFormStore.getState()

    // The person pressed back and the extra entry is gone.
    if (!firstRun && arrived && navigationType === 'POP' && !onGuard && store.step > 1) {
      if (!store.navigationLocked) store.prevStep()
      if (useListingFormStore.getState().step > 1) pushGuard()
      return
    }

    if (step > 1 && !onGuard) {
      pushGuard()
    } else if (step === 1 && onGuard && !firstRun && direction === -1) {
      // ATRÁS reached page 1 while the extra entry is on top: drop it, so one
      // back press leaves. Only ATRÁS: the draft being cleared after
      // publishing also lands on 1, while the router is already on its way to
      // the new listing — going back then returned to the wizard (D13).
      navigate(-1)
    }
  }, [engaged, location.key, location.pathname, location.search, location.hash, navigationType, onGuard, step, direction, navigate])

  return null
}
