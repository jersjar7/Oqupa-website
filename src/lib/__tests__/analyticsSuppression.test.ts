// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Team accounts never count in analytics (ADR-050, Jerson 2026-11-02).
// The switch every sender goes through.

const FLAG = 'oqupa:analytics-team-account'

async function freshModule() {
  vi.resetModules()
  return import('../analyticsSuppression')
}

beforeEach(() => {
  localStorage.clear()
})

describe('before sign-in state is known', () => {
  it('holds events, then sends them once a non-team (or no) account is known', async () => {
    const m = await freshModule()
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    expect(send).not.toHaveBeenCalled()
    m.applyAnalyticsAccount(null)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('drops held events when a team account turns out to be signed in', async () => {
    const m = await freshModule()
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    m.applyAnalyticsAccount('admin@oqupa.com')
    expect(send).not.toHaveBeenCalled()
    // and nothing later re-sends them
    m.applyAnalyticsAccount(null)
    expect(send).not.toHaveBeenCalled()
  })

  it('does not hold more than a bounded number of events', async () => {
    const m = await freshModule()
    const send = vi.fn()
    for (let i = 0; i < 1000; i++) m.whenAnalyticsAllowed(send)
    m.applyAnalyticsAccount(null)
    expect(send.mock.calls.length).toBeLessThanOrEqual(m.__testing.MAX_HELD)
    expect(send.mock.calls.length).toBeGreaterThan(0)
  })
})

describe('team account signed in', () => {
  it('drops every event and reports suppressed, matching the email case-insensitively', async () => {
    const m = await freshModule()
    m.applyAnalyticsAccount('JersonDevs@Gmail.com')
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    expect(send).not.toHaveBeenCalled()
    expect(m.isAnalyticsSuppressed()).toBe(true)
  })

  it('signing out re-enables sending for the next person', async () => {
    const m = await freshModule()
    m.applyAnalyticsAccount('sarahwalkerdev@gmail.com')
    m.applyAnalyticsAccount(null)
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(m.isAnalyticsSuppressed()).toBe(false)
  })

  it('a non-team account sends normally', async () => {
    const m = await freshModule()
    m.applyAnalyticsAccount('vecino@gmail.com')
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe('listeners', () => {
  it('are told when suppression turns on and off, not on repeats', async () => {
    const m = await freshModule()
    const listener = vi.fn()
    m.onAnalyticsSuppressionChange(listener)
    m.applyAnalyticsAccount(null)
    expect(listener).toHaveBeenLastCalledWith(false)
    m.applyAnalyticsAccount('admin@oqupa.com')
    expect(listener).toHaveBeenLastCalledWith(true)
    const calls = listener.mock.calls.length
    m.applyAnalyticsAccount('bbarba@oqupa.com')
    expect(listener.mock.calls.length).toBe(calls)
    m.applyAnalyticsAccount(null)
    expect(listener).toHaveBeenLastCalledWith(false)
  })

  it('can unsubscribe', async () => {
    const m = await freshModule()
    const listener = vi.fn()
    const off = m.onAnalyticsSuppressionChange(listener)
    off()
    m.applyAnalyticsAccount('admin@oqupa.com')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('the browser remembers a team account between visits', () => {
  it('a team sign-in is remembered, so the next page load is suppressed from the start', async () => {
    let m = await freshModule()
    m.applyAnalyticsAccount('admin@oqupa.com')
    expect(localStorage.getItem(FLAG)).toBe('1')

    m = await freshModule()
    expect(m.isAnalyticsSuppressed()).toBe(true)
    const send = vi.fn()
    m.whenAnalyticsAllowed(send)
    expect(send).not.toHaveBeenCalled()
  })

  it('signing out forgets it', async () => {
    let m = await freshModule()
    m.applyAnalyticsAccount('admin@oqupa.com')
    m.applyAnalyticsAccount(null)
    expect(localStorage.getItem(FLAG)).toBeNull()
    m = await freshModule()
    expect(m.isAnalyticsSuppressed()).toBe(false)
  })

  it('works when storage is unavailable', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const m = await freshModule()
    expect(() => m.applyAnalyticsAccount('admin@oqupa.com')).not.toThrow()
    expect(m.isAnalyticsSuppressed()).toBe(true)
    get.mockRestore()
    set.mockRestore()
  })
})

describe('a failing sender', () => {
  it('never breaks the others', async () => {
    const m = await freshModule()
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    m.whenAnalyticsAllowed(bad)
    m.whenAnalyticsAllowed(good)
    expect(() => m.applyAnalyticsAccount(null)).not.toThrow()
    expect(good).toHaveBeenCalled()
  })
})
