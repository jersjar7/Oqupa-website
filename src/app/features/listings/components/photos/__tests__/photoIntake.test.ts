// @vitest-environment jsdom
// Hostile review #7: photos the browser has to decode (HEIC, unknown types)
// are checked one at a time — 25 full-size iPhone photos decoded at once can
// exhaust a phone's memory.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { sortChosenPhotos } from '../photoIntake'

afterEach(() => vi.unstubAllGlobals())

describe('sortChosenPhotos', () => {
  it('decodes one photo at a time', async () => {
    let inFlight = 0
    let most = 0
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      inFlight++
      most = Math.max(most, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return { close() {} }
    }))
    const files = Array.from({ length: 6 }, (_, i) => new File(['x'], `IMG_${i}.HEIC`, { type: 'image/heic' }))
    const { usable, unusable } = await sortChosenPhotos(files)
    expect(usable).toHaveLength(6)
    expect(unusable).toBe(0)
    expect(most).toBe(1)
  })

  it('keeps the order and counts the ones that fail', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async (f: File) => {
      if (f.name.startsWith('bad')) throw new Error('decode')
      return { close() {} }
    }))
    const mk = (n: string, type: string) => new File(['x'], n, { type })
    const { usable, unusable } = await sortChosenPhotos([
      mk('a.jpg', 'image/jpeg'), mk('bad.heic', 'image/heic'), mk('c.heic', 'image/heic'),
    ])
    expect(usable.map((f) => f.name)).toEqual(['a.jpg', 'c.heic'])
    expect(unusable).toBe(1)
  })
})
