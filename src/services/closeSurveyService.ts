import { getFunctions, httpsCallable } from 'firebase/functions'

/**
 * The close survey — asked right after an owner marks a listing Vendido /
 * Alquilado (approved by Jerson 2026-10-20). Same keys, same order, as
 * functions/lib/close-survey.js and the app.
 *
 * Sent to the `submitCloseSurvey` Cloud Function rather than written to
 * Firestore: the comment is free text and listings are world-readable, so the
 * answers live in a collection no client can read or write.
 */
export const CLOSE_SURVEY_CHANNELS = [
  'facebook',
  'other_site',
  'agent',
  'sign',
  'acquaintance',
  'other',
] as const

export type CloseSurveyChannel = (typeof CLOSE_SURVEY_CHANNELS)[number]

/** Wording approved by Jerson 2026-10-20 — identical to the app. */
export const CLOSE_SURVEY_CHANNEL_LABELS: Record<CloseSurveyChannel, string> = {
  facebook: 'Facebook o Marketplace',
  other_site: 'Otra página de anuncios',
  agent: 'Agente inmobiliario',
  sign: 'Cartel en la propiedad',
  acquaintance: 'Familiar o conocido',
  other: 'Otro',
}

export interface CloseSurveyAnswers {
  listingId: string
  /** `skip` = Prefiero no responder. */
  viaOqupa: 'yes' | 'no' | 'skip'
  /** Only after `no`. */
  channel: CloseSurveyChannel | null
  /** Trimmed; null when left empty. */
  feedback: string | null
}

export const CLOSE_SURVEY_FEEDBACK_MAX = 1000

/** Never throws: the listing is already marked; a lost answer is not an error to show. */
export async function submitCloseSurvey(answers: CloseSurveyAnswers): Promise<void> {
  try {
    const callable = httpsCallable<CloseSurveyAnswers, { saved: boolean }>(
      getFunctions(undefined, 'southamerica-east1'),
      'submitCloseSurvey',
    )
    await callable(answers)
  } catch (err) {
    console.warn('[closeSurvey] answer not saved', err)
  }
}
