import { getFunctions, httpsCallable } from 'firebase/functions'

/**
 * Tells the team a phone-step attempt failed: Google's reason and the step,
 * never the number (Jerson 2026-11-09, after Javier waited since May for a
 * code Google kept refusing). The server emails admin@ on the second failure
 * of the day. Never throws — reporting must not get in the person's way.
 */
export async function reportPhoneStepFailure({ code, step }: { code: string; step: 'send' | 'verify' | 'no-code' }) {
  try {
    await httpsCallable(getFunctions(undefined, 'southamerica-east1'), 'reportPhoneStepFailure')({
      code: code || 'unknown',
      step,
      platform: 'web',
    })
  } catch {
    // Intentionally ignored — see above.
  }
}
