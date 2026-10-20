import type { CloseCounts, CloseSurveyRow } from '@/hooks/useDashboardSeries'
import { CLOSE_SURVEY_CHANNEL_LABELS, type CloseSurveyChannel } from '@/services/closeSurveyService'
import { inRange, type RangeKey } from './series'

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

/** Totals from the rows — only for documents built before closeCounts existed. */
function countsFromRows(rows: CloseSurveyRow[]): CloseCounts {
  const counts: CloseCounts = {}
  for (const r of rows) {
    if (!r.day || !r.viaOqupa) continue
    const d = (counts[r.day] ??= { yes: 0, no: 0, skip: 0, channels: {} })
    d[r.viaOqupa] += 1
    if (r.viaOqupa === 'no' && r.channel) d.channels[r.channel] = (d.channels[r.channel] ?? 0) + 1
  }
  return counts
}

/**
 * The close-survey answers for one range of the Números page. Totals come from
 * `counts` (every answer); comments come from the rows, which are capped.
 */
export function summarizeCloses(
  rows: CloseSurveyRow[] | undefined,
  counts: CloseCounts | undefined,
  range: RangeKey,
  today: string,
) {
  const all = rows ?? []
  const days = Object.entries(counts ?? countsFromRows(all)).filter(([day]) => inRange(day, range, today))

  const totals = { yes: 0, no: 0, skip: 0 }
  const byChannel: Record<string, number> = {}
  for (const [, d] of days) {
    totals.yes += d.yes
    totals.no += d.no
    totals.skip += d.skip
    for (const [ch, n] of Object.entries(d.channels)) byChannel[ch] = (byChannel[ch] ?? 0) + n
  }
  const viaOqupa = (['yes', 'no', 'skip'] as const)
    .map((key): [string, number] => [ANSWER_LABELS[key], totals[key]])
    .filter(([, n]) => n > 0)
  const channels = Object.entries(byChannel)
    .map(([ch, n]): [string, number] => [channelLabel(ch) ?? ch, n])
    .sort((a, b) => b[1] - a[1])

  const inPeriod = all.filter((r) => inRange(r.day, range, today))
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
  const commentsHidden = inPeriod.filter((r) => r.feedbackOmitted).length

  return { answered: totals.yes + totals.no + totals.skip, viaOqupa, channels, comments, commentsHidden }
}
