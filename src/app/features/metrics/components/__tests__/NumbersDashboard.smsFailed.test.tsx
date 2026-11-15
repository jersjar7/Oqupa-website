// @vitest-environment jsdom
// Jerson 2026-11-09 (Javier waited since May for an SMS code): Resumen shows
// how many people a day could not get their code, so it is seen, not guessed.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NumbersDashboard from '../NumbersDashboard'
import type { DashboardSeries } from '@/hooks/useDashboardSeries'

vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> }
})

function data(series: Partial<DashboardSeries['series']>, phoneSince: string | null = null): DashboardSeries {
  const empty = {}
  return {
    today: '2026-11-10',
    generatedAt: new Date('2026-11-10T09:00:00Z'),
    series: {
      views: empty, verifiedNew: empty, activeListings: empty, spendUSD: empty, accountsNew: empty,
      contactsReal: empty, checkoutsStarted: empty, checkoutsPaid: empty, revenuePEN: empty, ...series,
    },
    analytics: null,
    listings: [],
    metaReported: null,
    since: { snapshots: null, contactLog: null, analytics: null, phoneStepFailures: phoneSince },
  } as unknown as DashboardSeries
}

describe('Números — Resumen: SMS codes that failed', () => {
  it('a chart titled for what it is, with when counting began', () => {
    render(<NumbersDashboard data={data({ smsFailedPeople: { '2026-11-09': 2 } }, '2026-11-09')} />)
    expect(screen.getByText('Personas a las que no les llegó el código SMS')).toBeTruthy()
    expect(screen.getByText(/sin el equipo\. Registro desde el/)).toBeTruthy()
  })

  it('the caption names only what is counted — wrong codes are not', () => {
    render(<NumbersDashboard data={data({ smsFailedPeople: { '2026-11-09': 2 } }, '2026-11-09')} />)
    expect(screen.getByText(/^Google no envió el código o tocaron «¿No te llegó\?»\./)).toBeTruthy()
    expect(screen.queryByText(/rechazado/)).toBeNull()
  })

  it('a document built before this was counted still renders', () => {
    render(<NumbersDashboard data={data({})} />)
    expect(screen.getByText('Personas a las que no les llegó el código SMS')).toBeTruthy()
  })
})
