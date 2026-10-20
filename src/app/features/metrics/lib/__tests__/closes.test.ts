import { describe, it, expect } from 'vitest'
import { summarizeCloses } from '../closes'
import type { CloseSurveyRow } from '@/hooks/useDashboardSeries'

const row = (day: string, viaOqupa: CloseSurveyRow['viaOqupa'], extra: Partial<CloseSurveyRow> = {}): CloseSurveyRow => ({
  day, outcome: 'sold', viaOqupa, channel: null, feedback: null, ...extra,
})

describe('summarizeCloses', () => {
  const TODAY = '2026-10-20'
  const rows = [
    row('2026-10-20', 'yes', { feedback: 'Muy rápido' }),
    row('2026-10-19', 'no', { channel: 'sign', outcome: 'rented' }),
    row('2026-10-18', 'no', { channel: 'sign' }),
    row('2026-10-18', 'no', { channel: 'agent', feedback: 'Más fotos' }),
    row('2026-10-17', 'skip'),
    row('2026-08-01', 'yes', { feedback: 'viejo' }),
  ]

  it('counts the answers in the range', () => {
    const s = summarizeCloses(rows, '7', TODAY)
    expect(s.answered).toBe(5)
    expect(s.viaOqupa).toEqual([['Sí', 1], ['No', 3], ['Prefiero no responder', 1]])
  })

  it('ranks where it happened when it was not Oqupa, with the approved labels', () => {
    expect(summarizeCloses(rows, '7', TODAY).channels).toEqual([['Cartel en la propiedad', 2], ['Agente inmobiliario', 1]])
  })

  it('lists the comments in the range, newest first, with what they answered', () => {
    expect(summarizeCloses(rows, '7', TODAY).comments).toEqual([
      { day: '2026-10-20', outcome: 'Vendido', answer: 'Gracias a Oqupa', text: 'Muy rápido' },
      { day: '2026-10-18', outcome: 'Vendido', answer: 'Agente inmobiliario', text: 'Más fotos' },
    ])
  })

  it('"Todo" includes everything', () => {
    expect(summarizeCloses(rows, 'all', TODAY).answered).toBe(6)
  })

  it('is empty, not broken, before anyone answers', () => {
    expect(summarizeCloses(undefined, '30', TODAY)).toEqual({ answered: 0, viaOqupa: [], channels: [], comments: [] })
  })
})
