import { describe, it, expect } from 'vitest'
import { groupedAsTyped as rawGroupedAsTyped, formatLocaleNumberText, type BoxState, type BoxEdit, type DeleteHint, type GroupingMemory } from '../groupedNumber'
import { beforeEach } from 'vitest'

// One box's memory, as the hook keeps it; a new box for every test.
let memory: GroupingMemory = { typedWhole: null }
beforeEach(() => { memory = { typedWhole: null } })
const groupedAsTyped = (prev: BoxState, next: BoxEdit, hint: DeleteHint = null) => rawGroupedAsTyped(prev, next, hint, memory)
import { parseLocaleNumber } from '../localeNumber'

// ADR-061 — the price and area boxes show thousands with commas WHILE the
// person types (founder, 2026-11-13: "Commas as they type for consistency"),
// exactly as the app does. Every number the shared rule (ADR-043 step 3)
// reads must still read the same, typed or pasted.

const at = (text: string, caret = text.length): BoxState => ({ text, start: caret, end: caret })

/** Types `chars` one by one at the caret, as a keyboard does. */
function type(box: BoxState, chars: string): BoxState {
  for (const ch of chars) {
    const text = box.text.slice(0, box.start) + ch + box.text.slice(box.end)
    const r = groupedAsTyped(box, { text, caret: box.start + 1 })
    box = at(r.text, r.caret)
  }
  return box
}
function backspace(box: BoxState): BoxState {
  if (box.start !== box.end) {
    const r = groupedAsTyped(box, { text: box.text.slice(0, box.start) + box.text.slice(box.end), caret: box.start }, 'backward')
    return at(r.text, r.caret)
  }
  const r = groupedAsTyped(box, { text: box.text.slice(0, box.start - 1) + box.text.slice(box.start), caret: box.start - 1 }, 'backward')
  return at(r.text, r.caret)
}
function forwardDelete(box: BoxState): BoxState {
  const r = groupedAsTyped(box, { text: box.text.slice(0, box.start) + box.text.slice(box.start + 1), caret: box.start }, 'forward')
  return at(r.text, r.caret)
}
function paste(box: BoxState, chunk: string): BoxState {
  const text = box.text.slice(0, box.start) + chunk + box.text.slice(box.end)
  const r = groupedAsTyped(box, { text, caret: box.start + chunk.length })
  return at(r.text, r.caret)
}
const shown = (b: BoxState) => `${b.text.slice(0, b.start)}|${b.text.slice(b.start)}`
const empty = at('')

describe('commas appear as the digits are typed', () => {
  it('2 → 2, 25000 → 25,000, 250000 → 250,000, 1250000 → 1,250,000', () => {
    const seen: string[] = []
    let b = empty
    for (const d of '1250000') {
      b = type(b, d)
      seen.push(b.text)
    }
    expect(seen).toEqual(['1', '12', '125', '1,250', '12,500', '125,000', '1,250,000'])
    expect(type(empty, '2').text).toBe('2')
    expect(type(empty, '25000').text).toBe('25,000')
    expect(type(empty, '250000').text).toBe('250,000')
  })

  it('the caret stays after the digit just typed', () => {
    expect(shown(type(empty, '2500'))).toBe('2,500|')
    expect(shown(type(at('25,000', 3), '9'))).toBe('259|,000')
    expect(shown(type(at('1,500', 2), '7'))).toBe('17|,500')
    expect(shown(type(at('500', 0), '1'))).toBe('1|,500')
  })

  it('a leading zero goes away, the caret follows', () => {
    expect(shown(type(empty, '05'))).toBe('5|')
    expect(shown(type(empty, '0.5'))).toBe('0.5|')
  })
})

describe('deleting', () => {
  it('backspace at the end and in the middle', () => {
    expect(shown(backspace(at('1,250')))).toBe('125|')
    expect(shown(backspace(at('125,000')))).toBe('12,500|')
    expect(shown(backspace(at('1,250,000', 4)))).toBe('12|0,000')
  })

  it('deleting a comma deletes the digit before it', () => {
    expect(shown(backspace(at('1,500', 2)))).toBe('|500')
    expect(shown(backspace(at('12,500', 3)))).toBe('1|,500')
    expect(shown(backspace(at('1,250,000', 6)))).toBe('125|,000')
  })

  it('without being told which key, a comma deleted with the caret after it is a backspace', () => {
    const r = groupedAsTyped(at('1,500', 2), { text: '1500', caret: 1 })
    expect(r.text).toBe('500')
  })

  it('forward delete on a comma deletes the digit after it', () => {
    expect(shown(forwardDelete(at('1,500', 1)))).toBe('1|00')
  })

  it('deleting the decimal point joins the digits', () => {
    expect(backspace(at('1,500.5', 6)).text).toBe('15,005')
  })

  it('deleting everything leaves the box empty', () => {
    let b = at('1,500')
    for (let i = 0; i < 4; i++) b = backspace(b)
    expect(b.text).toBe('')
  })

  it('a selected part replaced by a digit', () => {
    expect(shown(type({ text: '1,234', start: 3, end: 5 }, '5'))).toBe('125|')
  })
})

describe('decimals', () => {
  it('a point and up to two digits stay decimals', () => {
    expect(type(empty, '1500.5').text).toBe('1,500.5')
    expect(type(empty, '1500.50').text).toBe('1,500.50')
    expect(shown(type(empty, '1500.'))).toBe('1,500.|')
  })

  it('a typed comma after the digits is the decimal point, shown as a point', () => {
    expect(shown(type(empty, '120,'))).toBe('120.|')
    expect(type(empty, '120,5').text).toBe('120.5')
  })

  it('a second decimal point, or one with nothing before it, is refused', () => {
    expect(shown(type(at('1.5'), '.'))).toBe('1.5|')
    expect(shown(type(at('1.5'), ','))).toBe('1.5|')
    expect(type(empty, '.').text).toBe('')
    expect(type(empty, ',').text).toBe('')
  })

  it('three digits after a separator are thousands, as the shared rule reads them', () => {
    expect(type(empty, '1.500').text).toBe('1,500')
    expect(type(empty, '250.000').text).toBe('250,000')
    expect(type(empty, '1,500').text).toBe('1,500')
    expect(type(empty, '1.500.000').text).toBe('1,500,000')
    expect(type(empty, '1,500,000').text).toBe('1,500,000')
    expect(type(empty, '1.500,25').text).toBe('1,500.25')
    expect(type(empty, '1,500.5').text).toBe('1,500.5')
  })
})

it('very long numbers stop at 12 digits', () => {
  expect(type(empty, '12345678901234').text).toBe('123,456,789,012')
})

describe('pasting reads as the shared rule reads, then shows commas', () => {
  const pasted: Record<string, string> = {
    '250000': '250,000',
    '250,000': '250,000',
    '250.000': '250,000',
    '1.500,50': '1,500.50',
    '1,500.5': '1,500.5',
    '120,5': '120.5',
    '1.500.000': '1,500,000',
    'S/. 800': '800',
    'S/ 1,500': '1,500',
  }
  for (const [raw, want] of Object.entries(pasted)) {
    it(`"${raw}" shows "${want}" and reads the same`, () => {
      const b = paste(empty, raw)
      expect(b.text).toBe(want)
      expect(b.start).toBe(want.length)
      expect(parseLocaleNumber(b.text)).toBe(parseLocaleNumber(raw))
    })
  }

  it('a paste that cannot be read is kept, for the form to explain', () => {
    expect(paste(empty, '2,500,7').text).toBe('2,500,7')
    expect(paste(empty, '1.5.0').text).toBe('1.5.0')
    expect(paste(empty, 'abc').text).toBe('abc')
  })

  it('pasted over everything', () => {
    expect(paste({ text: '1,234', start: 0, end: 5 }, '250.000').text).toBe('250,000')
  })
})

it('what is shown always reads as the number typed', () => {
  for (const raw of ['1', '999', '1000', '25000', '250000', '1250000', '999999999', '120.5', '120.75', '1500.0', '0.5']) {
    expect(parseLocaleNumber(type(empty, raw).text)).toBe(Number(raw))
  }
})

describe('formatLocaleNumberText (a saved number, or leaving the box)', () => {
  it('shows commas and a point', () => {
    expect(formatLocaleNumberText('250000')).toBe('250,000')
    expect(formatLocaleNumberText('1500,5')).toBe('1,500.5')
    expect(formatLocaleNumberText('1.500')).toBe('1,500')
    expect(formatLocaleNumberText('1.5.0')).toBeNull()
    expect(formatLocaleNumberText('')).toBeNull()
  })
})

// Hostile review, 2026-11-13.
describe('review: changing the first digit', () => {
  it('deleting the 1 of 1,000,000 keeps the zeros, so 2 can go in', () => {
    let b = backspace(at('1,000,000', 1))
    expect(shown(b)).toBe('|000000')
    b = type(b, '2')
    expect(shown(b)).toBe('2|,000,000')
  })
  it('1,050: delete the 1, type 2', () => {
    expect(type(backspace(at('1,050', 1)), '2').text).toBe('2,050')
  })
  it('leading zeros typed on purpose still go', () => {
    expect(type(empty, '007').text).toBe('7')
  })
})

describe('review: a third decimal digit never makes a number 1000 times bigger unless the shared rule reads it so', () => {
  it('after a long whole part it is refused', () => {
    expect(type(empty, '1500.555').text).toBe('1,500.55')
    expect(type(empty, '1234.567').text).toBe('1,234.56')
  })
  it('after a 0 it is refused', () => {
    expect(type(empty, '0.500').text).toBe('0.50')
    expect(type(empty, '0,500').text).toBe('0.50')
  })
  it('typed into the middle of the decimals it is refused', () => {
    expect(shown(type(at('12.34', 3), '5'))).toBe('12.|34')
  })
  it('thousands typed by hand with separators all the way still work', () => {
    expect(type(empty, '1.500.000').text).toBe('1,500,000')
    expect(type(empty, '1,500,000').text).toBe('1,500,000')
    expect(type(empty, '12.345.678').text).toBe('12,345,678')
  })
  it('a pasted "1.500" then ".000" typed is 1,500,000', () => {
    expect(type(paste(empty, '1.500'), '.000').text).toBe('1,500,000')
  })
  it('the memory goes when the digits change', () => {
    let b = type(empty, '1.500')
    for (let i = 0; i < 5; i++) b = backspace(b)
    expect(type(b, '1500.000').text).toBe('1,500.00')
  })
})
