// @vitest-environment jsdom
// Punto de control: three numbers month by month, and whether each is growing,
// for the founder's decision on 28 Feb 2027.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import NumbersDashboard from '../NumbersDashboard'
import type { DashboardSeries } from '@/hooks/useDashboardSeries'
import type { Checkpoint } from '../../lib/checkpoint'

vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> }
})

// Production's real numbers for Aug–Oct 2026, read 2026-11-01.
const CHECKPOINT: Checkpoint = {
  checkpointDay: '2027-02-28',
  currentMonth: '2026-11',
  months: [
    { month: '2026-08', complete: true, activeListings: 52, newListings: 5, contacts: 0, returning: null },
    { month: '2026-09', complete: true, activeListings: 72, newListings: 21, contacts: 1, returning: 67 },
    { month: '2026-10', complete: true, activeListings: 91, newListings: 21, contacts: 5, returning: 78 },
    { month: '2026-11', complete: false, activeListings: null, newListings: 0, contacts: 0, returning: 0 },
  ],
  since: { activeListings: '2026-05-12', newListings: '2026-04-15', contacts: '2026-08-08', returning: '2026-09' },
}

function data(checkpoint?: Checkpoint): DashboardSeries {
  const empty = {}
  return {
    today: '2026-11-01',
    generatedAt: new Date('2026-11-01T09:00:00Z'),
    series: {
      views: empty, verifiedNew: empty, activeListings: empty, spendUSD: empty, accountsNew: empty,
      contactsReal: empty, checkoutsStarted: empty, checkoutsPaid: empty, revenuePEN: empty,
    },
    analytics: null,
    listings: [],
    metaReported: null,
    since: { snapshots: null, contactLog: null, analytics: null },
    checkpoint,
  } as unknown as DashboardSeries
}

function openTab(d: DashboardSeries) {
  render(<NumbersDashboard data={d} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Punto de control' }))
}

describe('Números — Punto de control', () => {
  beforeEach(() => localStorage.clear())

  it('says when the checkpoint is', () => {
    openTab(data(CHECKPOINT))
    expect(screen.getByText(/28 de febrero de 2027/)).toBeTruthy()
  })

  it('shows each number for the last complete month and how it changed from the month before', () => {
    openTab(data(CHECKPOINT))
    const card = screen.getByRole('region', { name: 'Último mes completo' })
    expect(within(card).getByText('91')).toBeTruthy()
    expect(within(card).getByText('▲ 26 %')).toBeTruthy() // 72 → 91
    expect(within(card).getByText('▲ 400 %')).toBeTruthy() // 1 → 5
    expect(within(card).getByText('▲ 16 %')).toBeTruthy() // 67 → 78
    expect(within(card).getAllByText(/vs septiembre 2026/).length).toBe(3)
  })

  it('lists every month, says "Sin datos" before a number starts, and never compares the month in progress', () => {
    openTab(data(CHECKPOINT))
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    // Header + 4 months, newest first.
    expect(rows).toHaveLength(5)
    expect(within(rows[1]!).getByText(/noviembre 2026/)).toBeTruthy()
    expect(within(rows[1]!).getByText(/en curso/)).toBeTruthy()
    expect(within(rows[1]!).queryByText(/[▲▼]/)).toBeNull()
    const august = rows[4]!
    expect(within(august).getByText('Sin datos')).toBeTruthy()
    // New listings ride beside the active count.
    expect(within(rows[2]!).getByText(/21 nuevas/)).toBeTruthy()
  })

  it('explains each number and when its data starts, in one sentence', () => {
    openTab(data(CHECKPOINT))
    expect(screen.getByText(/desde el 8 ago 2026/i)).toBeTruthy()
    expect(screen.getByText(/desde septiembre 2026/i)).toBeTruthy()
    expect(screen.getByText(/una sola vez/i)).toBeTruthy()
  })

  it('hides the 7 / 30 / 90 days switch — this tab is by month', () => {
    openTab(data(CHECKPOINT))
    expect(screen.queryByRole('group', { name: 'Periodo' })).toBeNull()
  })

  it('without Analytics (staging) shows "Sin datos" for people who came back', () => {
    const noGa: Checkpoint = {
      ...CHECKPOINT,
      months: CHECKPOINT.months.map((m) => ({ ...m, returning: null })),
      since: { ...CHECKPOINT.since, returning: null },
    }
    openTab(data(noGa))
    const card = screen.getByRole('region', { name: 'Último mes completo' })
    expect(within(card).getByText('Sin datos')).toBeTruthy()
  })

  it('a document built before the checkpoint existed says so instead of breaking', () => {
    openTab(data(undefined))
    expect(screen.getByText(/aparece después de la actualización de esta noche/i)).toBeTruthy()
  })
})
