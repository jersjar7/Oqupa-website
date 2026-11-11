// @vitest-environment jsdom
// At 390 px the "Cuándo miran" grid once needed 420 px. Its card grew to fit,
// the page column grew with it, and "Desde dónde llegan" beside it ran off the
// screen with its percentages hidden. A card may never be wider than its column,
// and the grid itself must fit inside a phone card (390 − 32 gutter − 40 padding).
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Section from '../components/Section'
import HeatMap from '../components/HeatMap'

const PHONE_CARD_INNER = 390 - 32 - 40

describe('Analítica fits a phone', () => {
  it('a card can shrink to its column (min-width 0)', () => {
    const { container } = render(<Section title="X">y</Section>)
    expect(container.querySelector('section')!.className.split(/\s+/)).toContain('min-w-0')
  })

  it('the time grid asks for no more than a phone card holds', () => {
    const cells = Array(84).fill(1)
    const { container } = render(<HeatMap heat={{ status: 'ok', n: 84, cells, best: { day: 0, slot: 10 } }} />)
    const table = container.querySelector('table')!
    const m = /min-w-\[(\d+)px\]/.exec(table.className)
    const min = m ? Number(m[1]) : 0
    expect(min).toBeLessThanOrEqual(PHONE_CARD_INNER)
  })
})
