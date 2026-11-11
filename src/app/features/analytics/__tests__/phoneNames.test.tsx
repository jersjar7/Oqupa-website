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
  // Round 2 #1: two listings with the same name differ only at the end of the
  // name (the facts are added to tell them apart), so the name is never clamped.
  // Round 2 #3: the computer table needs ~930 px, so cards are used below xl.
  it('Tu cartera card: the whole name shows, sparkline below with the note; cards until xl', () => {
    const src = read('Portfolio.tsx')
    expect(src).toContain('<ul className="space-y-3 xl:hidden">')
    expect(src).toContain('hidden overflow-x-auto xl:block')
    const phone = src.split('xl:hidden')[1] ?? ''
    const header = phone.slice(0, phone.indexOf('</Link>'))
    expect(header).not.toContain('line-clamp')
    expect(header).toContain('break-words')
    expect(header).not.toMatch(/block truncate font-bold/)
    expect(header).not.toContain('<Spark')
    expect(phone).toContain('<Spark')
  })

  it('Qué buscan: the district takes its own line on a phone and is cut only from sm up', () => {
    const src = read('Demand.tsx')
    expect(src).toMatch(/col-span-2 sm:col-span-1 sm:truncate/)
    expect(src).not.toMatch(/<span className="truncate">\{r\.district\}/)
    // A district with no listing keeps its bar on a phone: its words take their own line.
    expect(src).toMatch(/perListing === null \? 'col-span-2 sm:col-span-1 text-left sm:text-right'/)
  })
})

// Round 3 #2: a table column grows to fit text that cannot wrap, so a long
// repeated name widened the table past a 1280 px screen. In the table the name
// wraps inside a fixed width.
describe('Tu cartera table keeps its width', () => {
  it('the name cell wraps within 16rem instead of growing', () => {
    const table = read('Portfolio.tsx').split('xl:block')[1]?.split('xl:hidden')[0] ?? ''
    expect(table).toContain('max-w-[16rem]')
    expect(table).not.toMatch(/block truncate font-bold/)
  })
})
