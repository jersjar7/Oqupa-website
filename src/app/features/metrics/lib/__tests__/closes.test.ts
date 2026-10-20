import { describe, it, expect } from 'vitest'
import { summarizeCloses } from '../closes'
import type { CloseSurveyRow, CloseCounts } from '@/hooks/useDashboardSeries'

const row = (day: string, viaOqupa: CloseSurveyRow['viaOqupa'], extra: Partial<CloseSurveyRow> = {}): CloseSurveyRow => ({
  day, outcome: 'sold', viaOqupa, channel: null, feedback: null, ...extra,
})

const TODAY = '2026-10-20'

describe('summarizeCloses', () => {
  const counts: CloseCounts = {
    '2026-10-20': { yes: 1, no: 0, skip: 0, channels: {} },
    '2026-10-19': { yes: 0, no: 1, skip: 0, channels: { sign: 1 } },
    '2026-10-18': { yes: 0, no: 2, skip: 0, channels: { sign: 1, agent: 1 } },
    '2026-10-17': { yes: 0, no: 0, skip: 1, channels: {} },
    '2026-08-01': { yes: 1, no: 0, skip: 0, channels: {} },
  }
  const rows = [
    row('2026-10-20', 'yes', { feedback: 'Muy rápido' }),
    row('2026-10-18', 'no', { channel: 'agent', feedback: 'Más fotos' }),
    row('2026-10-18', 'no', { channel: 'sign', feedbackOmitted: true }),
    row('2026-08-01', 'yes', { feedback: 'viejo' }),
  ]

  it('counts the answers in the range from the totals, not the rows', () => {
    const s = summarizeCloses(rows, counts, '7', TODAY)
    expect(s.answered).toBe(5)
    expect(s.viaOqupa).toEqual([['Sí', 1], ['No', 3], ['Prefiero no responder', 1]])
  })

  it('ranks where it happened when it was not Oqupa, with the approved labels', () => {
    expect(summarizeCloses(rows, counts, '7', TODAY).channels).toEqual([['Cartel en la propiedad', 2], ['Agente inmobiliario', 1]])
  })

  it('lists the comments in the range, newest first, and says how many could not be shown', () => {
    const s = summarizeCloses(rows, counts, '7', TODAY)
    expect(s.comments).toEqual([
      { day: '2026-10-20', outcome: 'Vendido', answer: 'Gracias a Oqupa', text: 'Muy rápido' },
      { day: '2026-10-18', outcome: 'Vendido', answer: 'Agente inmobiliario', text: 'Más fotos' },
    ])
    expect(s.commentsHidden).toBe(1)
  })

  it('"Todo" includes everything', () => {
    expect(summarizeCloses(rows, counts, 'all', TODAY).answered).toBe(6)
  })

  it('falls back to the rows on a document built before the totals existed', () => {
    const s = summarizeCloses([row('2026-10-20', 'yes'), row('2026-10-19', 'no', { channel: 'sign' })], undefined, '7', TODAY)
    expect(s.answered).toBe(2)
    expect(s.channels).toEqual([['Cartel en la propiedad', 1]])
  })

  it('is empty, not broken, before anyone answers', () => {
    expect(summarizeCloses(undefined, undefined, '30', TODAY)).toEqual({ answered: 0, viaOqupa: [], channels: [], comments: [], commentsHidden: 0 })
  })
})
