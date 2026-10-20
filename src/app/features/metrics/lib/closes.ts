import type { CloseSurveyRow } from '@/hooks/useDashboardSeries'
import { CLOSE_SURVEY_CHANNEL_LABELS, type CloseSurveyChannel } from '@/services/closeSurveyService'
import { inRange, rankBy, type RangeKey } from './series'

const ANSWER_LABELS = { yes: 'Sí', no: 'No', skip: 'Prefiero no responder' } as const

export interface CloseComment {
  day: string | null
  outcome: string
  /** "Gracias a Oqupa", the place it happened, or the bare answer. */
  answer: string
  text: string
}

const channelLabel = (channel: string | null) =>
  channel ? (CLOSE_SURVEY_CHANNEL_LABELS[channel as CloseSurveyChannel] ?? channel) : null

/** The close-survey answers for one range of the Números page. */
export function summarizeCloses(rows: CloseSurveyRow[] | undefined, range: RangeKey, today: string) {
  const inPeriod = (rows ?? []).filter((r) => inRange(r.day, range, today))
  const viaOqupa = (['yes', 'no', 'skip'] as const)
    .map((key): [string, number] => [ANSWER_LABELS[key], inPeriod.filter((r) => r.viaOqupa === key).length])
    .filter(([, n]) => n > 0)
  const channels = rankBy(
    inPeriod.filter((r) => r.viaOqupa === 'no'),
    (r) => channelLabel(r.channel),
  )
  const comments: CloseComment[] = inPeriod
    .filter((r) => r.feedback)
    .map((r) => ({
      day: r.day,
      outcome: r.outcome === 'rented' ? 'Alquilado' : 'Vendido',
      answer:
        r.viaOqupa === 'yes'
          ? 'Gracias a Oqupa'
          : r.viaOqupa === 'no'
            ? (channelLabel(r.channel) ?? 'No fue Oqupa')
            : 'Prefirió no responder',
      text: r.feedback as string,
    }))
  return { answered: inPeriod.length, viaOqupa, channels, comments }
}
