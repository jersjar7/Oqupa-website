import { AnalyticsLogger, type ContactTapAuthState } from '@/lib/analytics'
import { peekReturnUrl, RETURN_URL_TTL_MS } from '@/lib/utils'
import { wantsAutoContact } from './contactGate'

// The contact sign-up funnel (metrics plan A10): every step between a tap on
// "contact" and the seller's number, so the team can see where people give up
// (decision D5). Firebase only — nothing here reaches Meta or TikTok, and no
// event carries anything about the person.
//
// Recording a step must never change what happens next: every function here
// swallows its own errors, and none of them consumes the stored errand.

/** `contact_gate_step.step` values. Spelled exactly as in the app
 *  (oqupa/lib/utils/analytics_logger.dart, ContactGateStep). */
export const CONTACT_GATE_STEPS = {
  /** The account gate opened after a contact refusal. */
  gateShown: 'gate_shown',
  /** Visitor pressed CREA TU CUENTA. */
  gateCreateAccount: 'gate_create_account',
  /** Visitor pressed Ya tengo cuenta. */
  gateHaveAccount: 'gate_have_account',
  /** Signed-in person pressed VERIFICAR NÚMERO / VERIFICAR CUENTA. */
  gateVerify: 'gate_verify',
  /** Ahora no, or the gate was closed any other way. */
  gateDismissed: 'gate_dismissed',
  /** The person has an account session, while on their way to contact. */
  signedIn: 'signed_in',
  /** The first SMS code was sent (not resends), while on their way to contact. */
  phoneCodeSent: 'phone_code_sent',
  /** The phone was linked, while on their way to contact. */
  phoneVerified: 'phone_verified',
  /** The email was confirmed, while on their way to contact. */
  emailVerified: 'email_verified',
  /** Back on the listing; the automatic contact retry starts. */
  returned: 'returned',
} as const

export type ContactGateStep = (typeof CONTACT_GATE_STEPS)[keyof typeof CONTACT_GATE_STEPS]

/** Who is tapping: `verified` means email AND phone, as the server requires. */
export function contactAuthState(
  firebaseUser: { emailVerified?: boolean } | null | undefined,
  user: { isPhoneVerified?: boolean } | null | undefined,
): ContactTapAuthState {
  if (!firebaseUser) return 'guest'
  return firebaseUser.emailVerified && user?.isPhoneVerified ? 'verified' : 'unverified'
}

/** A pending "contact this seller" errand, identified by when it was stored. */
export interface ContactErrand {
  at: number
}

/** The pending contact errand, read without consuming it; null when the
 *  stored return address is missing, expired, or not a contact (Publicar). */
export function pendingContactErrand(): ContactErrand | null {
  try {
    const stored = peekReturnUrl()
    if (!stored) return null
    const hashAt = stored.url.indexOf('#')
    return hashAt >= 0 && wantsAutoContact(stored.url.slice(hashAt)) ? { at: stored.at } : null
  } catch {
    return null
  }
}

/** A real tap on the contact button — never the automatic retry. */
export function logContactTapped(listingId: string, authState: ContactTapAuthState): void {
  try {
    AnalyticsLogger.contactTapped(listingId, authState)
  } catch {
    /* analytics must never break the button */
  }
}

/** A refusal of getListingContact: the server's raw code, `unknown` without one. */
export function logContactRevealFailed(listingId: string, error: unknown): void {
  try {
    const code =
      error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : 'unknown'
    AnalyticsLogger.contactRevealFailed(listingId, code)
  } catch {
    /* analytics must never break the button */
  }
}

/** A gate step: logged every time, because each one is a deliberate action. */
export function logContactGateStep(step: ContactGateStep): void {
  try {
    AnalyticsLogger.contactGateStep(step)
  } catch {
    /* analytics must never break the gate */
  }
}

const MILESTONE_KEY_PREFIX = 'oqupa_contactFunnel:'

/** Removes milestone records of errands that can no longer be pending
 *  (older than the return address can live). */
function pruneMilestoneRecords(now: number): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key?.startsWith(MILESTONE_KEY_PREFIX)) continue
    const at = Number(key.slice(MILESTONE_KEY_PREFIX.length).split(':')[0])
    if (!Number.isFinite(at) || now - at > RETURN_URL_TTL_MS) localStorage.removeItem(key)
  }
}

/**
 * A pipeline milestone: logged only while a contact errand is pending, and at
 * most once per errand — a resend, a re-render or a second tab (the email
 * link opened elsewhere) must not count the same person twice, so the record
 * lives in localStorage, shared by every tab. Pass an errand captured earlier
 * when the step's success may already have sent the person back and
 * consumed it.
 */
export function logContactMilestone(step: ContactGateStep, errand?: ContactErrand | null): void {
  try {
    const current = errand === undefined ? pendingContactErrand() : errand
    // A captured errand outlives nothing: past the return address's own life
    // it can no longer be pending (a tab left open on the pipeline).
    if (!current || Date.now() - current.at > RETURN_URL_TTL_MS) return
    const key = `${MILESTONE_KEY_PREFIX}${current.at}:${step}`
    if (localStorage.getItem(key)) return
    pruneMilestoneRecords(Date.now())
    localStorage.setItem(key, '1')
    AnalyticsLogger.contactGateStep(step)
  } catch {
    /* analytics must never break the pipeline */
  }
}
