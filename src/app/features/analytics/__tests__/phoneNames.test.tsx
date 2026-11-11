// @vitest-environment jsdom
// Seen on a 390 px phone with real-looking data: Tu cartera cut every name to
// "Casa en Piu…" (the sparkline took the row), and Qué buscan cut
// "Veintiséis de Octubre" to "Veintiséis de …". On a phone a name gets its own
// line and may wrap; it is never cut to one line.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (f: string) => readFileSync(join(__dirname, '../components', f), 'utf8')

describe('names are never cut on a phone', () => {
  it('Tu cartera phone card: name wraps to two lines, sparkline below with the note', () => {
    const phone = read('Portfolio.tsx').split('md:hidden')[1] ?? ''
    const header = phone.slice(0, phone.indexOf('</Link>'))
    expect(header).toContain('line-clamp-2')
    expect(header).not.toMatch(/block truncate font-bold/)
    expect(header).not.toContain('<Spark')
    expect(phone).toContain('<Spark')
  })

  it('Qué buscan: the district takes its own line on a phone and is cut only from sm up', () => {
    const src = read('Demand.tsx')
    expect(src).toMatch(/col-span-2 sm:col-span-1 sm:truncate/)
    expect(src).not.toMatch(/<span className="truncate">\{r\.district\}/)
  })
})
