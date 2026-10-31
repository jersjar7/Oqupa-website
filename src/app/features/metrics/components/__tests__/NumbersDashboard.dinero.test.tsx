// @vitest-environment jsdom
// Dinero shows refunds as their own number (audit 2026-10-31): revenue stays
// what was paid, and what went back is visible next to it.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NumbersDashboard from '../NumbersDashboard'
import type { DashboardSeries } from '@/hooks/useDashboardSeries'

vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> }
})

function data(series: Partial<DashboardSeries['series']>): DashboardSeries {
  const empty = {}
  return {
    today: '2026-10-31',
    generatedAt: new Date('2026-10-31T09:00:00Z'),
    series: {
      views: empty, verifiedNew: empty, activeListings: empty, spendUSD: empty, accountsNew: empty,
      contactsReal: empty, checkoutsStarted: empty, checkoutsPaid: empty, revenuePEN: empty, ...series,
    },
    analytics: null,
    listings: [],
    metaReported: null,
    since: { snapshots: null, contactLog: null, analytics: null },
  } as unknown as DashboardSeries
}

describe('Números — Dinero', () => {
  it('shows refunds beside revenue, in soles and how many', () => {
    render(<NumbersDashboard data={data({
      revenuePEN: { '2026-10-30': 39.8 },
      checkoutsPaid: { '2026-10-30': 2 },
      refundsPEN: { '2026-10-31': 9.9 },
      refundsCount: { '2026-10-31': 1 },
    })} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Dinero' }))
    fireEvent.click(screen.getByRole('button', { name: /todo/i }))
    // The glance card and the chart title both say Reembolsos.
    expect(screen.getAllByText('Reembolsos').length).toBe(2)
    expect(screen.getByText('S/ 9.90')).toBeTruthy()
    expect(screen.getByText(/^1 reembolso,/)).toBeTruthy()
  })

  it('a document built before refunds were counted shows zero, not an error', () => {
    render(<NumbersDashboard data={data({})} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Dinero' }))
    expect(screen.getAllByText('Reembolsos').length).toBeGreaterThan(0)
  })
})
