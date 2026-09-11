// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// VITE_RECAPTCHA_SITE_KEY is not set in the test environment, which means
// the module-level constant resolves to an empty string. Both exported
// functions check for this and return early — the tests below verify that
// early-return behaviour.

import { loadRecaptchaScript, getRecaptchaToken } from '../recaptcha'

describe('loadRecaptchaScript — no site key in test environment', () => {
  it('resolves immediately when VITE_RECAPTCHA_SITE_KEY is absent', async () => {
    await expect(loadRecaptchaScript()).resolves.toBeUndefined()
  })

  it('does not inject a <script> tag into the DOM', async () => {
    const before = document.querySelectorAll('script[src*="recaptcha"]').length
    await loadRecaptchaScript()
    const after = document.querySelectorAll('script[src*="recaptcha"]').length
    expect(after).toBe(before)
  })

  it('is safe to call multiple times without throwing', async () => {
    await expect(Promise.all([loadRecaptchaScript(), loadRecaptchaScript()])).resolves.toBeDefined()
  })
})

describe('getRecaptchaToken — no site key in test environment', () => {
  it('returns an empty string when VITE_RECAPTCHA_SITE_KEY is absent', async () => {
    const token = await getRecaptchaToken('login')
    expect(token).toBe('')
  })

  it('does not throw for any action name', async () => {
    await expect(getRecaptchaToken('submit_listing')).resolves.toBe('')
    await expect(getRecaptchaToken('')).resolves.toBe('')
  })
})

// ── Tests with a site key via module reload ──────────────────────────────────
// When VITE_RECAPTCHA_SITE_KEY is set the module initialises RECAPTCHA_SITE_KEY
// to a non-empty string. vi.stubEnv + vi.resetModules let us hit those paths.

describe('loadRecaptchaScript — with site key', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key-123')
    // Remove injected recaptcha scripts from previous tests
    document.querySelectorAll('script[src*="recaptcha"]').forEach((s) => s.remove())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('injects a script tag when called with a site key set', async () => {
    const { loadRecaptchaScript: load } = await import('../recaptcha')

    let capturedScript: HTMLScriptElement | null = null
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      capturedScript = el as HTMLScriptElement
      // Simulate script load success
      setTimeout(() => capturedScript?.dispatchEvent(new Event('load')), 0)
      return el
    })

    await load()
    expect(capturedScript).not.toBeNull()
    expect((capturedScript as unknown as HTMLScriptElement).src).toContain('recaptcha')
  })

  it('rejects when the script fails to load', async () => {
    const { loadRecaptchaScript: load } = await import('../recaptcha')

    let capturedScript: HTMLScriptElement | null = null
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      capturedScript = el as HTMLScriptElement
      setTimeout(() => capturedScript?.dispatchEvent(new Event('error')), 0)
      return el
    })

    await expect(load()).rejects.toThrow('reCAPTCHA script failed to load')
  })

  it('resolves immediately on second call within same module instance (scriptLoaded=true)', async () => {
    // This test calls load() twice in the same module instance to verify the
    // scriptLoaded guard. We import once (beforeEach already reset modules).
    const { loadRecaptchaScript: load } = await import('../recaptcha')

    let appendCount = 0
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      appendCount++
      const script = el as HTMLScriptElement
      setTimeout(() => script.dispatchEvent(new Event('load')), 0)
      return el
    })

    await load()
    const countAfterFirst = appendCount
    await load() // scriptLoaded is true now — should resolve without appending
    expect(appendCount).toBe(countAfterFirst) // no new scripts added
  })
})

describe('timeout paths — fake timers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key-123')
    document.querySelectorAll('script[src*="recaptcha"]').forEach((s) => s.remove())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects with "script load timeout" when script never fires onload or onerror', async () => {
    const { loadRecaptchaScript: load } = await import('../recaptcha')

    // Intercept appendChild but do NOT dispatch 'load' or 'error' — let the timeout fire
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => el)

    let caughtError: Error | null = null
    load().catch((e: Error) => { caughtError = e })

    // Advance 5001ms past the 5000ms timeout
    await vi.advanceTimersByTimeAsync(5001)
    expect(caughtError?.message).toBe('reCAPTCHA script load timeout')
  })

  it('rejects with "reCAPTCHA token timeout" when execute never resolves', async () => {
    const { getRecaptchaToken: getToken } = await import('../recaptcha')

    // Let the script "load" so loadRecaptchaScript resolves immediately
    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      const script = el as HTMLScriptElement
      queueMicrotask(() => script.dispatchEvent(new Event('load')))
      return el
    })

    // Mock grecaptcha.enterprise.ready but never call the callback — token never resolves
    vi.stubGlobal('grecaptcha', {
      enterprise: {
        ready: vi.fn(), // never invokes callback
        execute: vi.fn(),
      },
    })

    let caughtError: Error | null = null
    getToken('submit').catch((e: Error) => { caughtError = e })

    // Flush microtasks (script onload), then advance past the 5000ms token timeout
    await vi.advanceTimersByTimeAsync(5001)
    expect(caughtError?.message).toBe('reCAPTCHA token timeout')
  })
})

describe('getRecaptchaToken — with site key', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key-123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('throws when grecaptcha.enterprise is not available after script loads', async () => {
    const { getRecaptchaToken: getToken } = await import('../recaptcha')

    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      const script = el as HTMLScriptElement
      setTimeout(() => script.dispatchEvent(new Event('load')), 0)
      return el
    })

    // No window.grecaptcha stub — should throw "failed to load"
    await expect(getToken('login')).rejects.toThrow('reCAPTCHA Enterprise failed to load')
  })

  it('calls grecaptcha.enterprise.ready and returns the token', async () => {
    const { getRecaptchaToken: getToken } = await import('../recaptcha')

    vi.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      const script = el as HTMLScriptElement
      setTimeout(() => script.dispatchEvent(new Event('load')), 0)
      return el
    })

    vi.stubGlobal('grecaptcha', {
      enterprise: {
        ready: (cb: () => void) => cb(),
        execute: vi.fn().mockResolvedValue('token-abc'),
      },
    })

    const token = await getToken('login')
    expect(token).toBe('token-abc')
  })
})
