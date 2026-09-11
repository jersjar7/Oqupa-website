// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const STORAGE_KEY = 'oqupa.clientId'

describe('getOrCreateClientId', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('generates a new id on first call and persists it', async () => {
    const { getOrCreateClientId } = await import('../clientId')
    const id = getOrCreateClientId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(id)
  })

  it('returns the same id on subsequent calls within the same tab', async () => {
    const { getOrCreateClientId } = await import('../clientId')
    const first = getOrCreateClientId()
    const second = getOrCreateClientId()
    expect(first).toBe(second)
  })

  it('rehydrates an existing id from localStorage across module reloads', async () => {
    const { getOrCreateClientId } = await import('../clientId')
    const first = getOrCreateClientId()

    vi.resetModules()
    const mod = await import('../clientId')
    expect(mod.getOrCreateClientId()).toBe(first)
  })

  it('falls back to in-memory id when localStorage throws', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })

    const { getOrCreateClientId } = await import('../clientId')
    const first = getOrCreateClientId()
    const second = getOrCreateClientId()
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(first).toBe(second)

    setItemSpy.mockRestore()
    getItemSpy.mockRestore()
  })

  it('generates a UUID-shaped id using getRandomValues when randomUUID is unavailable', async () => {
    // Stub crypto to remove randomUUID but keep getRandomValues
    vi.stubGlobal('crypto', {
      randomUUID: undefined,
      getRandomValues: (bytes: Uint8Array) => {
        for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256
        return bytes
      },
    })
    const { getOrCreateClientId } = await import('../clientId')
    const id = getOrCreateClientId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('generates a UUID using Math.random when crypto is fully unavailable', async () => {
    vi.stubGlobal('crypto', undefined)
    const { getOrCreateClientId } = await import('../clientId')
    const id = getOrCreateClientId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('uses in-memory fallback when localStorage is unavailable on the window object', async () => {
    // Stub localStorage to be null/falsy so the !window.localStorage branch fires (lines 29-30)
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      value: null,
      configurable: true,
      writable: true,
    })

    const { getOrCreateClientId } = await import('../clientId')
    const id = getOrCreateClientId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)

    // Calling again returns the same in-memory id
    const second = getOrCreateClientId()
    expect(second).toBe(id)

    // Restore localStorage
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage)
    }
  })
})
