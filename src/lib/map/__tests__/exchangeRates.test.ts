// Ported from the app's exchange_rate_service_test.dart (ADR-031 item 19,
// Jerson 2026-10-24): price sorts use the live soles-per-dollar rate, fetched
// once per visit in the background; if the fetch fails, the last rate saved in
// this browser; with nothing saved, the fixed default. Measured 2026-10-24: the
// real rate was 3.44, not the 3.75 used until then.
import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_PEN_PER_USD,
  parsePenPerUsd,
  resolvePenPerUsd,
  savedPenPerUsd,
  EXCHANGE_RATE_STORAGE_KEY,
} from '../exchangeRates'

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

describe('parsePenPerUsd', () => {
  it('reads rates.PEN from the service answer', () => {
    expect(parsePenPerUsd({ result: 'success', rates: { PEN: 3.443192, USD: 1 } })).toBeCloseTo(3.443192)
  })
  it('anything else is no rate', () => {
    expect(parsePenPerUsd({ rates: {} })).toBeNull()
    expect(parsePenPerUsd({ rates: { PEN: 'x' } })).toBeNull()
    expect(parsePenPerUsd(null)).toBeNull()
    expect(parsePenPerUsd('nope')).toBeNull()
  })
})

describe('resolvePenPerUsd', () => {
  it('uses the live rate and saves it for next time', async () => {
    const storage = memoryStorage()
    const rate = await resolvePenPerUsd({ fetchRate: async () => 3.44, storage })
    expect(rate).toBe(3.44)
    expect(savedPenPerUsd(storage)).toBe(3.44)
  })

  it('the service failing falls back to the last saved rate', async () => {
    const storage = memoryStorage({ [EXCHANGE_RATE_STORAGE_KEY]: '3.51' })
    const rate = await resolvePenPerUsd({ fetchRate: vi.fn().mockRejectedValue(new Error('offline')), storage })
    expect(rate).toBe(3.51)
  })

  it('nothing saved and no service: the fixed default', async () => {
    const rate = await resolvePenPerUsd({ fetchRate: async () => null, storage: memoryStorage() })
    expect(rate).toBe(DEFAULT_PEN_PER_USD)
    expect(DEFAULT_PEN_PER_USD).toBe(3.75)
  })

  it('an implausible answer is ignored, not used', async () => {
    const storage = memoryStorage({ [EXCHANGE_RATE_STORAGE_KEY]: '3.5' })
    expect(await resolvePenPerUsd({ fetchRate: async () => 350, storage })).toBe(3.5)
    expect(savedPenPerUsd(storage)).toBe(3.5)
  })

  it('a blocked storage never breaks it', async () => {
    const blocked = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }
    expect(await resolvePenPerUsd({ fetchRate: async () => 3.44, storage: blocked })).toBe(3.44)
    expect(await resolvePenPerUsd({ fetchRate: async () => null, storage: blocked })).toBe(DEFAULT_PEN_PER_USD)
  })
})
