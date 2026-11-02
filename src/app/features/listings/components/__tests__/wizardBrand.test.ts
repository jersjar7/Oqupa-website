import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ADR-043 step 3, bug 18 — brand rules inside the publishing wizard (root
// CLAUDE.md, ADR-038): on cream only green and ink pass as text colours, so
// no orange text; orange buttons keep white text but never at small sizes, so
// the wizard's small chips, badges and step circles are green, not orange.

const here = join(__dirname, '..')
const files = [
  ...readdirSync(here).filter((f) => /^(Wizard|SignHere|LocationPicker|OfficialDistrict|RevealField).*\.tsx$/.test(f)).map((f) => join(here, f)),
  ...readdirSync(join(here, 'photos')).filter((f) => f.endsWith('.tsx')).map((f) => join(here, 'photos', f)),
  join(here, '..', '..', '..', 'components', 'ui', 'InfoTip.tsx'),
]

// `text-primary` is the ORANGE token; `text-text-primary` is ink.
const ORANGE_TEXT = /(?<![\w-])(?:hover:|group-hover:|focus:)?text-primary\b/
const ORANGE_FILL = /(?<![\w-])bg-primary\b(?!\/)/

describe('the wizard follows the brand colour rules', () => {
  it('finds the wizard files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const file of files) {
    const name = file.startsWith(here) ? file.slice(here.length + 1) : 'ui/InfoTip.tsx'
    it(`${name}: no orange text`, () => {
      const lines = readFileSync(file, 'utf8').split('\n')
      const offending = lines.filter((l) => ORANGE_TEXT.test(l))
      expect(offending).toEqual([])
    })
    // Hostile review 2026-11-02: no stock black — the ink and border tokens.
    it(`${name}: no stock black`, () => {
      const lines = readFileSync(file, 'utf8').split('\n')
      expect(lines.filter((l) => /(?<![\w-])(?:bg|text|border|ring)-black\b/.test(l))).toEqual([])
    })
    it(`${name}: no small orange buttons, chips or badges`, () => {
      const lines = readFileSync(file, 'utf8').split('\n')
      const offending = lines.filter((l) => ORANGE_FILL.test(l))
      expect(offending).toEqual([])
    })
  }
})
