// A phone number held by an abandoned email sign-up — the email sign-up fix,
// step 4 (docs/email-signup-fix-plan.md, approved 2026-10-21).
//
// A number can belong to one account only. When someone verifies a number that
// sits on an account whose email was never confirmed (it could never publish or
// contact), Firebase refuses the link but hands back a proof that the person
// owns the number. The releasePhoneFromUnfinishedAccount function checks that
// proof and moves the number to them; a FINISHED account's number is never
// taken. Without this the person met "Este número ya está asociado a otra
// cuenta" with no way forward — the trap Apple's hidden email and a second
// Gmail both lead into.
//
// Failures are re-expressed as the auth codes the phone step already explains
// (authErrors.ts), so the person always reads a sentence, never a blank.

export type PhoneProof = { temporaryProof: string; phoneNumber: string }

const COLLISION_CODES = new Set([
  'auth/credential-already-in-use',
  'auth/account-exists-with-different-credential',
])

function codeOf(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : undefined
}

/** The proof Firebase attaches to a phone collision, or null. */
export function phoneProofFromError(err: unknown): PhoneProof | null {
  if (!err || typeof err !== 'object') return null
  if (!COLLISION_CODES.has(codeOf(err) ?? '')) return null
  const data = (err as { customData?: Record<string, unknown> }).customData ?? {}
  const { temporaryProof, phoneNumber } = data
  if (typeof temporaryProof !== 'string' || !temporaryProof) return null
  if (typeof phoneNumber !== 'string' || !phoneNumber) return null
  return { temporaryProof, phoneNumber }
}

export interface ReleaseDeps {
  callRelease: (proof: PhoneProof) => Promise<unknown>
  refreshSession: () => Promise<void>
}

/**
 * Turns a phone collision into a moved number, or throws an error whose code
 * the phone step can explain. Resolves only when the number is now on the
 * caller's account (the server also marks the profile phone-verified).
 */
export async function releaseCollidedPhone(err: unknown, deps: ReleaseDeps): Promise<void> {
  const proof = phoneProofFromError(err)
  if (!proof) throw err

  try {
    await deps.callRelease(proof)
  } catch (releaseErr) {
    const code = codeOf(releaseErr)
    const reason = (releaseErr as { details?: { reason?: unknown } } | null)?.details?.reason
    if (code === 'functions/failed-precondition' && (reason === 'held-by-active-account' || reason === 'caller-has-phone')) {
      throw { code: 'auth/credential-already-in-use' }
    }
    if (code === 'functions/permission-denied') {
      throw { code: 'auth/invalid-verification-id' }
    }
    throw releaseErr
  }

  // The number is on the account now; a token that carries it lets the rules
  // see it immediately. A failed refresh catches up on its own, so it must not
  // send a person who now owns the number back to the SMS step.
  try {
    await deps.refreshSession()
  } catch {
    // Intentionally ignored — see above.
  }
}
