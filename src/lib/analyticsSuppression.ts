/**
 * Team accounts never count in analytics.
 *
 *   "Please do not include in our analytics anything done with my admin
 *    account so we do not fake numbers. Make this a rule for any of our
 *    Equipo board emails."  — Jerson, 2026-11-02 (ADR-050)
 *
 * The ONE switch every analytics sender on the website goes through: Firebase
 * / GA4 (lib/analytics.ts), the Meta pixel and the TikTok pixel. While a team
 * account (people.ts → isTeamEmail) is signed in, nothing is sent. Signing out
 * turns sending back on for whoever uses the browser next.
 *
 * THREE STATES
 *   pending — the page has just loaded and Firebase has not yet said who is
 *             signed in. Events are HELD (bounded) instead of sent, so a team
 *             account's first page view is not counted in the gap.
 *   on      — no account, or a non-team account: send.
 *   off     — a team account: drop.
 *
 * The browser remembers that the last account signed in here was a team one
 * (localStorage), so the next page load starts in `off` rather than `pending`.
 * That matters for the two things that fire on their own the moment they load
 * — GA4's automatic page_view and the pixels' first PageView — which cannot be
 * held, only not started. Remembering is a convenience: if storage is blocked
 * the page still works and the account check still applies once sign-in is
 * known.
 */
import { isTeamEmail } from '@/app/features/access/people'

type State = 'pending' | 'on' | 'off'

const FLAG_KEY = 'oqupa:analytics-team-account'
/** Held events while sign-in is unknown. A guard, not a buffer to rely on. */
const MAX_HELD = 100

function readFlag(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

function writeFlag(team: boolean): void {
  try {
    if (team) localStorage.setItem(FLAG_KEY, '1')
    else localStorage.removeItem(FLAG_KEY)
  } catch {
    /* storage blocked — the in-memory state still applies */
  }
}

let state: State = readFlag() ? 'off' : 'pending'
let held: Array<() => void> = []
const listeners = new Set<(suppressed: boolean) => void>()

function run(fn: () => void): void {
  try {
    fn()
  } catch {
    /* measurement must never break the page, or the next sender */
  }
}

/** True while a team account is signed in (or remembered on this browser). */
export function isAnalyticsSuppressed(): boolean {
  return state === 'off'
}

/** True once sign-in is known (or remembered) — the pixels wait for this. */
export function isAnalyticsDecided(): boolean {
  return state !== 'pending'
}

/**
 * Run `send` now, hold it until sign-in is known, or drop it — depending on
 * who is signed in. Every analytics event on the website goes through here.
 */
export function whenAnalyticsAllowed(send: () => void): void {
  if (state === 'on') run(send)
  else if (state === 'pending' && held.length < MAX_HELD) held.push(send)
}

/** Called whenever Firebase says who is signed in (null = nobody). */
export function applyAnalyticsAccount(email: string | null | undefined): void {
  setAnalyticsSuppressed(isTeamEmail(email))
}

export function setAnalyticsSuppressed(suppressed: boolean): void {
  const next: State = suppressed ? 'off' : 'on'
  writeFlag(suppressed)
  const wasPending = state === 'pending'
  const changed = state !== next
  state = next

  const queue = held
  held = []
  if (next === 'on') queue.forEach(run)

  if (changed || wasPending) {
    listeners.forEach((l) => run(() => l(suppressed)))
  }
}

/** Told `true` when sending stops and `false` when it (re)starts. */
export function onAnalyticsSuppressionChange(listener: (suppressed: boolean) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const __testing = { MAX_HELD, FLAG_KEY }
