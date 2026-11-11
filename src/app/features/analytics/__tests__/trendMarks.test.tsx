// @vitest-environment jsdom
// Break-it rounds 2–3: words drawn on the chart overlapped on phones and were
// cut at its edges. The dotted lines carry no words; the list under the chart
// always says what each one is, for one listing and for many.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Trend from '../components/Trend'

const points = Array.from({ length: 30 }, (_, i) => ({ day: `2026-10-${String(i + 1).padStart(2, '0')}`, shown: 10, seen: 2 }))
const marks = {
  status: 'ok' as const,
  list: [{ day: '2026-10-06', kind: 'price-down' as const, listingId: 'L1' }, { day: '2026-10-16', kind: 'price-up' as const, listingId: 'L1' }],
  pricesSince: '2026-05-01',
  photosSince: '2026-05-01',
}

describe('Tendencia change marks', () => {
  it('one listing, two changes far apart: the list names both', () => {
    render(<Trend points={points} marks={marks} many={false} propertyType="casa" listingNames={{ L1: 'Casa en Piura' }} />)
    expect(screen.getByText(/6 oct: bajaste el precio/)).toBeTruthy()
    expect(screen.getByText(/16 oct: subiste el precio/)).toBeTruthy()
  })
  it('one change only: still named in the list', () => {
    render(<Trend points={points} marks={{ ...marks, list: [marks.list[0]!] }} many={false} propertyType="casa" listingNames={{ L1: 'Casa en Piura' }} />)
    expect(screen.getByText(/6 oct: bajaste el precio/)).toBeTruthy()
  })
})
