import { getFunctions, httpsCallable } from 'firebase/functions'

/**
 * The contact follow-up cards (metrics plan A11b) — the website's half of the
 * app's contact_follow_up_service.dart. Talks to the `getDueFollowUp` and
 * `answerFollowUp` Cloud Functions (functions/lib/contact-follow-ups.js). The
 * collection behind them is server-only; the website never reads it.
 *
 * Neither callable enforces App Check (the app cannot send it — ADR-019), so
 * nothing extra is attached here.
 *
 * Nothing here may surface an error: the card is a courtesy question, so a
 * failed request simply means no card, and a lost answer is logged.
 */

/** 'wrote' — ¿Pudiste contactar al dueño? · 'reply' — ¿El dueño te respondió? · 'reason' — ¿Por qué? */
export type FollowUpCardName = 'wrote' | 'reply' | 'reason'

export type FollowUpAnswer =
  | 'yes'
  | 'not_yet'
  | 'not_interested'
  | 'dismissed'
  | 'found_other'
  | 'price'
  | 'not_convinced'
  | 'other'
  | 'skipped'

/** The server's ALLOWED_ANSWERS, in the same order. */
export const ALLOWED_FOLLOW_UP_ANSWERS: Record<FollowUpCardName, readonly FollowUpAnswer[]> = {
  wrote: ['yes', 'not_yet', 'dismissed'],
  reply: ['yes', 'not_yet', 'not_interested', 'dismissed'],
  reason: ['found_other', 'price', 'not_convinced', 'other', 'skipped'],
}

/** Who the revealed number reached. The card says "dueño" or "agente". */
export type FollowUpContactRole = 'owner' | 'agent'

/** One due card and the listing it is about — listing contents only. */
export interface DueFollowUpCard {
  /** 'reason' is never fetched: it only follows "Ya no me interesa". */
  card: 'wrote' | 'reply'
  listingId: string
  /** Stored value: casa, departamento, … */
  propertyType: string | null
  /** venta or alquiler. */
  operationType: string | null
  district: string | null
  priceAmount: number | null
  /** PEN or USD. */
  priceCurrency: string | null
  /** R2 key (or legacy URL) of the listing's first photo. */
  photoKey: string | null
  /** longTerm (/mes) or shortTerm (/noche); rentals only. */
  rentalDurationType: string | null
  contactRole: FollowUpContactRole
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)

/** Null when there is no card, or one this build does not know. */
export function parseDueFollowUpCard(data: unknown): DueFollowUpCard | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.card !== 'wrote' && d.card !== 'reply') return null
  const listingId = str(d.listingId)
  if (!listingId) return null
  const price = d.price && typeof d.price === 'object' ? (d.price as Record<string, unknown>) : {}
  return {
    card: d.card,
    listingId,
    propertyType: str(d.propertyType),
    operationType: str(d.operationType),
    district: str(d.district),
    priceAmount: typeof price.amount === 'number' ? price.amount : null,
    priceCurrency: str(price.currency),
    photoKey: str(d.photoKey),
    rentalDurationType: str(d.rentalDurationType),
    contactRole: d.contactRole === 'agent' ? 'agent' : 'owner',
  }
}

function callable<Req, Res>(name: string) {
  return httpsCallable<Req, Res>(getFunctions(undefined, 'southamerica-east1'), name)
}

export const contactFollowUpService = {
  /**
   * The one card to show now, or null. The server counts a returned card as
   * shown — call this only when the card can actually be shown.
   */
  async fetchDueCard(): Promise<DueFollowUpCard | null> {
    try {
      const result = await callable<Record<string, never>, unknown>('getDueFollowUp')({})
      return parseDueFollowUpCard(result.data)
    } catch (err) {
      console.warn('[contactFollowUp] could not fetch the due card', err)
      return null
    }
  },

  /** Never throws. An answer the card does not accept is not sent. */
  async answer(a: { listingId: string; card: FollowUpCardName; answer: FollowUpAnswer }): Promise<void> {
    if (!ALLOWED_FOLLOW_UP_ANSWERS[a.card]?.includes(a.answer)) return
    try {
      await callable<typeof a, { saved: boolean }>('answerFollowUp')({
        listingId: a.listingId,
        card: a.card,
        answer: a.answer,
      })
    } catch (err) {
      console.warn('[contactFollowUp] answer not saved', err)
    }
  },
}
