/**
 * Derives the authenticated user's capabilities from the authStore user + admin email allowlist.
 * Separate from the "view-as" concept (see ViewAsContext) — capabilities are what the user
 * TRULY has; view-as is what they're CURRENTLY rendering.
 */
import type { User } from '@/types/user'
import { isAdminEmail } from '@/app/components/guards/AdminGuard'
import { isMetricsAllowedEmail } from '@/app/components/guards/MetricsGuard'

export type Capabilities = {
  isAdmin: boolean
  isRealtor: boolean
  isMetricsViewer: boolean
  // everyone is implicitly a property owner
}

export function capabilitiesFor(user: User | null | undefined): Capabilities {
  return {
    isAdmin: isAdminEmail(user?.email),
    isRealtor: !!user?.isVerifiedRealtor,
    isMetricsViewer: isMetricsAllowedEmail(user?.email),
  }
}

/** View-as affects which sections render. Admins can "view as" other roles for debugging. */
export type ViewAs = 'self' | 'asRealtor' | 'asOwner'

/**
 * What the user effectively has access to (UI-rendering-wise) given their
 * caps + current view-as. NB: view-as is purely visual — real permissions
 * are enforced by route guards + Firestore rules, which always consult the
 * RAW user record, never this effective value.
 *
 * Semantics:
 *   - 'self':       render everything the user actually has
 *   - 'asRealtor':  hide admin chrome; show realtor chrome (always, even if
 *                   the real user isn't a realtor — that's the whole point
 *                   of debug view-as; route guards still block them)
 *   - 'asOwner':    hide both admin AND realtor chrome → render pure owner
 */
export function effectiveCapabilities(caps: Capabilities, viewAs: ViewAs): Capabilities {
  return {
    isAdmin:   caps.isAdmin && viewAs === 'self',
    isRealtor: viewAs === 'asOwner' ? false : (caps.isRealtor || viewAs === 'asRealtor'),
    // Metrics access stays tied to the real user — view-as is just chrome
    // simulation, but the metrics tab leaks aggregate revenue numbers we
    // don't want to render for someone who shouldn't see them.
    isMetricsViewer: caps.isMetricsViewer && viewAs === 'self',
  }
}
