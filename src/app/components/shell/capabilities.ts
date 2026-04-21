/**
 * Derives the authenticated user's capabilities from the authStore user + admin email allowlist.
 * Separate from the "view-as" concept (see ViewAsContext) — capabilities are what the user
 * TRULY has; view-as is what they're CURRENTLY rendering.
 */
import type { User } from '@/types/user'
import { isAdminEmail } from '@/app/components/guards/AdminGuard'

export type Capabilities = {
  isAdmin: boolean
  isRealtor: boolean
  // everyone is implicitly a property owner
}

export function capabilitiesFor(user: User | null | undefined): Capabilities {
  return {
    isAdmin: isAdminEmail(user?.email),
    isRealtor: !!user?.isVerifiedRealtor,
  }
}

/** View-as affects which sections render. Admins can "view as" other roles for debugging. */
export type ViewAs = 'self' | 'asRealtor' | 'asOwner'

/** What the user effectively has access to given their caps + current view-as. */
export function effectiveCapabilities(caps: Capabilities, viewAs: ViewAs): Capabilities {
  return {
    isAdmin: caps.isAdmin && viewAs === 'self',
    isRealtor: caps.isRealtor || viewAs === 'asRealtor',
  }
}
