// The sign-up pipeline's order and the entry screen's decisions, as pure
// functions so the tests pin them (docs/new-user-navigation-path.md, step 6;
// docs/new-user-path-step6-plan.md).
//
// Why phone before email: the email step sends the person out of the site to
// an inbox before they have done anything; the phone step keeps them here.
// Both stay mandatory — a listing cannot go live and a number cannot be
// revealed until both are done; only the order changed.

export type PipelineStep = 'name' | 'phone' | 'verify-code' | 'verify-email'

export interface PipelineAccountState {
  /** Google/Apple accounts arrive with this true; email/password after the link. */
  emailVerified: boolean
  hasName: boolean
  phoneVerified: boolean
}

export function pipelineStepsFor(s: PipelineAccountState): PipelineStep[] {
  const steps: PipelineStep[] = []
  if (!s.hasName) steps.push('name')
  if (!s.phoneVerified) steps.push('phone', 'verify-code')
  if (!s.emailVerified) steps.push('verify-email')
  return steps
}

export type EmailEntryOutcome = 'offer-create-or-recover' | 'too-many' | 'error'

/**
 * What the entry screen does after a failed email/password sign-in.
 * Production hides whether the email has an account at all (enumeration
 * protection), so a mismatch is where BOTH ways forward are offered.
 */
export function emailEntryOutcome(code: string | undefined): EmailEntryOutcome {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'offer-create-or-recover'
    case 'auth/too-many-requests':
      return 'too-many'
    default:
      return 'error'
  }
}
