import { AnalyticsLogger } from '@/lib/analytics'
import {
  ALLOWED_FOLLOW_UP_ANSWERS,
  contactFollowUpService,
  type DueFollowUpCard,
  type FollowUpAnswer,
  type FollowUpCardName,
} from '@/services/contactFollowUpService'

/** What the card reports back while it is open. */
export interface FollowUpSession {
  /** Sends one answer to the server (and Analytics). Never throws. */
  answer(card: FollowUpCardName, answer: FollowUpAnswer): Promise<void>
  /** A further step of the same card appeared ("¿Por qué?"). */
  stepShown(card: FollowUpCardName): void
}

interface FollowUpService {
  fetchDueCard(): Promise<DueFollowUpCard | null>
  answer(a: { listingId: string; card: FollowUpCardName; answer: FollowUpAnswer }): Promise<void>
}

/**
 * Decides WHEN the contact follow-up card is asked for and shown (metrics
 * plan A11b) — the website's copy of the app's ContactFollowUpCoordinator.
 *
 * Jerson, 2026-10-31: the card appears when the person comes back to Oqupa
 * after being taken to the WhatsApp chat, showing the listing they contacted
 * even hours or days later. On the website WhatsApp opens in another tab (or
 * replaces this one, after the account steps), so "coming back" is the Oqupa
 * tab becoming visible / focused again, or the page loading again.
 *
 * WHY SO CAREFUL ABOUT ASKING. `getDueFollowUp` counts a returned card as
 * shown, and each card is shown at most twice. So:
 *   - never ask while the card could not be shown (`canPresentNow` false —
 *     another dialog, a payment, sign-in, a form); the ask is owed and made
 *     when the screen settles;
 *   - a card that arrives just as the screen became busy is kept and shown
 *     later, never thrown away and never fetched again;
 *   - one request and one card at a time;
 *   - never while a contact is being revealed, nor after the hand-off until
 *     the person has actually left for WhatsApp and come back: the server
 *     records the contact a moment before WhatsApp opens.
 */
export class ContactFollowUpCoordinator {
  private readonly service: FollowUpService
  private readonly now: () => number
  /** Ordinary returns (switching tabs) are spaced by this much. A hand-off lifts it once. */
  private readonly minimumGapMs: number

  /** True when a card could be shown over what is on screen right now. */
  canPresentNow: () => boolean = () => false

  /** Shows the card; resolves when it is closed. Set by the host. */
  presentCard: ((card: DueFollowUpCard, session: FollowUpSession) => Promise<void>) | null = null

  constructor(opts: { service?: FollowUpService; now?: () => number; minimumGapMs?: number } = {}) {
    this.service = opts.service ?? contactFollowUpService
    this.now = opts.now ?? Date.now
    this.minimumGapMs = opts.minimumGapMs ?? 60_000
  }

  private userId: string | null = null
  private generation = 0
  private fetching = false
  private showing = false
  private checkOwed = false
  private contactInProgress = false
  private handedOffSinceLastCheck = false
  /** Handed off to WhatsApp and not back yet: only a return may ask. */
  private awaitingReturn = false
  /** The page was hidden / lost focus since the hand-off. */
  private leftSinceHandOff = false
  private lastCheckAt: number | null = null
  private kept: DueFollowUpCard | null = null

  /** An ask is owed or a card is kept: the host should say when the screen settles. */
  get hasOwedWork(): boolean {
    return this.userId !== null && (this.checkOwed || this.kept !== null)
  }

  /** A fully set-up account, on page load or sign-in. A different person drops everything held for the last. */
  async signedIn(userId: string): Promise<void> {
    if (this.userId !== userId) {
      this.reset()
      this.userId = userId
    }
    await this.check(true)
  }

  signedOut(): void {
    this.reset()
  }

  /** The tab was hidden or lost focus. */
  left(): void {
    if (this.awaitingReturn) this.leftSinceHandOff = true
  }

  /** The tab is visible / focused again. */
  async returned(): Promise<void> {
    if (this.awaitingReturn) {
      // Still on the Oqupa tab right after the hand-off — WhatsApp has not
      // taken over yet. Not a return.
      if (!this.leftSinceHandOff) return
      this.awaitingReturn = false
      this.leftSinceHandOff = false
    }
    await this.check(this.handedOffSinceLastCheck)
  }

  /** The page changed, or a dialog closed: make an owed ask, or show a kept card, if now calm. */
  async screenSettled(): Promise<void> {
    if (this.kept !== null || this.checkOwed) await this.check(true)
  }

  /** The WhatsApp button was pressed; the number is being asked for. */
  contactStarted(): void {
    this.contactInProgress = true
  }

  /** WhatsApp is being opened with the number: the next return asks, however soon — and nothing asks before it. */
  contactHandedOff(): void {
    this.contactInProgress = false
    this.handedOffSinceLastCheck = true
    this.awaitingReturn = true
    this.leftSinceHandOff = false
  }

  /** The contact ended without WhatsApp (refused, failed, the account gate opened). */
  contactEndedWithoutHandOff(): void {
    this.contactInProgress = false
  }

  private reset() {
    this.generation++
    this.userId = null
    this.kept = null
    this.checkOwed = false
    this.lastCheckAt = null
    this.handedOffSinceLastCheck = false
    this.awaitingReturn = false
    this.leftSinceHandOff = false
  }

  private busy(): boolean {
    return this.contactInProgress || this.awaitingReturn || !this.canPresentNow()
  }

  private async check(ignoreGap: boolean): Promise<void> {
    if (this.userId === null || this.fetching || this.showing) return
    if (this.busy()) {
      this.checkOwed = true
      return
    }

    const kept = this.kept
    if (kept) {
      this.kept = null
      this.present(kept)
      return
    }

    const now = this.now()
    if (!ignoreGap && this.lastCheckAt !== null && now - this.lastCheckAt < this.minimumGapMs) return

    this.checkOwed = false
    this.handedOffSinceLastCheck = false
    this.lastCheckAt = now
    this.fetching = true
    const generation = this.generation
    let card: DueFollowUpCard | null = null
    try {
      card = await this.service.fetchDueCard()
    } finally {
      this.fetching = false
    }
    // Signed out, or someone else signed in, while the request was out.
    if (generation !== this.generation || card === null) return

    if (this.busy()) {
      this.kept = card // already counted as shown by the server: keep it
      return
    }
    this.present(card)
  }

  private present(card: DueFollowUpCard) {
    const present = this.presentCard
    if (!present) {
      this.kept = card
      return
    }
    this.showing = true
    const session = new Session(card, this.service)
    session.stepShown(card.card)
    present(card, session)
      .catch(() => {})
      .finally(() => {
        this.showing = false
      })
  }
}

class Session implements FollowUpSession {
  private readonly card: DueFollowUpCard
  private readonly service: FollowUpService

  constructor(card: DueFollowUpCard, service: FollowUpService) {
    this.card = card
    this.service = service
  }

  async answer(card: FollowUpCardName, answer: FollowUpAnswer): Promise<void> {
    if (!ALLOWED_FOLLOW_UP_ANSWERS[card].includes(answer)) return
    AnalyticsLogger.followUpAnswered({
      card,
      answer,
      contactRole: this.card.contactRole,
      listingId: this.card.listingId,
    })
    await this.service.answer({ listingId: this.card.listingId, card, answer })
  }

  stepShown(card: FollowUpCardName): void {
    AnalyticsLogger.followUpShown({
      card,
      contactRole: this.card.contactRole,
      listingId: this.card.listingId,
    })
  }
}

/** The one the website uses: the WhatsApp button reports to it, the host shows its cards. */
export const contactFollowUpCoordinator = new ContactFollowUpCoordinator()
