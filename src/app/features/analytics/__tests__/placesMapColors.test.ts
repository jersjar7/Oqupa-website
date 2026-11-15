// Tailwind 4 writes a theme colour into the built stylesheet only when it finds
// its name spelled out in the source. The map once built the names on the fly
// (`--color-map-${k}`), so staging's stylesheet had none of them and every
// district with people was drawn black. Each name must appear written out.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, '../components/PlacesMap.tsx'), 'utf8')
const css = readFileSync(join(__dirname, '../../../../index.css'), 'utf8')

describe('Dónde están quienes miran — map colours reach the stylesheet', () => {
  for (const name of ['map-1', 'map-2', 'map-3', 'map-4', 'map-5', 'map-empty']) {
    it(`--color-${name} is defined and written out in the map`, () => {
      expect(css).toContain(`--color-${name}:`)
      expect(source).toContain(`var(--color-${name})`)
    })
  }
})
