// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Re-import the module fresh for each test group to reset module-level state.
// Vitest's module isolation requires resetModules() before each dynamic import.

describe('getCapturedErrors (empty buffer)', () => {
  it('returns an empty string when no errors have been captured', async () => {
    vi.resetModules()
    const { getCapturedErrors } = await import('../errorBuffer')
    expect(getCapturedErrors()).toBe('')
  })
})

describe('initErrorBuffer + getCapturedErrors', () => {
  let origConsoleError: typeof console.error

  beforeEach(() => {
    origConsoleError = console.error
  })

  afterEach(() => {
    console.error = origConsoleError
    vi.unstubAllGlobals()
  })

  it('getCapturedErrors returns formatted lines after init captures a console.error', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    console.error('Something went wrong')

    const output = getCapturedErrors()
    expect(output).toContain('console.error')
    expect(output).toContain('Something went wrong')
  })

  it('captures multiple console.error calls and joins them with blank lines', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    console.error('First error')
    console.error('Second error')

    const output = getCapturedErrors()
    expect(output).toContain('First error')
    expect(output).toContain('Second error')
    // Two entries are joined by double-newline
    expect(output.split('\n\n').length).toBeGreaterThanOrEqual(2)
  })

  it('each captured entry line starts with a bracketed ISO timestamp', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    console.error('ts test')

    const lines = getCapturedErrors().split('\n\n')
    expect(lines[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T/)
  })

  it('captures a window "error" event', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    const event = new ErrorEvent('error', {
      message: 'Uncaught ReferenceError',
      filename: 'app.js',
      lineno: 42,
      colno: 7,
    })
    window.dispatchEvent(event)

    const output = getCapturedErrors()
    expect(output).toContain('Uncaught ReferenceError')
    expect(output).toContain('app.js')
  })

  it('captures a window "error" event without filename gracefully', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    const event = new ErrorEvent('error', { message: 'Script error' })
    window.dispatchEvent(event)

    const output = getCapturedErrors()
    expect(output).toContain('Script error')
    // No location suffix expected when filename is empty
    expect(output).not.toContain('undefined')
  })

  it('captures an unhandledrejection event with an Error reason', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new TypeError('fetch failed'),
    })
    window.dispatchEvent(rejectionEvent)

    const output = getCapturedErrors()
    expect(output).toContain('unhandledrejection')
    expect(output).toContain('TypeError')
    expect(output).toContain('fetch failed')
  })

  it('captures an unhandledrejection event with a plain-string reason', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: 'network timeout',
    })
    window.dispatchEvent(rejectionEvent)

    const output = getCapturedErrors()
    expect(output).toContain('network timeout')
  })

  it('truncates message to 1500 chars', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    console.error('X'.repeat(2000))

    const output = getCapturedErrors()
    // The message portion must be at most 1500 chars
    const messageStart = output.indexOf('console.error: ') + 'console.error: '.length
    const message = output.slice(messageStart)
    expect(message.length).toBeLessThanOrEqual(1500)
  })

  it('is idempotent — calling initErrorBuffer twice does not double-register listeners', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()
    initErrorBuffer() // second call should be a no-op

    console.error('once')

    // If listeners were duplicated, the message would appear twice in the buffer.
    const output = getCapturedErrors()
    const occurrences = (output.match(/once/g) ?? []).length
    expect(occurrences).toBe(1)
  })

  it('still calls the original console.error through the wrapped version', async () => {
    vi.resetModules()
    const { initErrorBuffer } = await import('../errorBuffer')

    const spy = vi.fn()
    console.error = spy

    initErrorBuffer()
    console.error('pass-through test')

    expect(spy).toHaveBeenCalledWith('pass-through test')
  })
})

describe('ring buffer cap at 20 entries', () => {
  let origConsoleError: typeof console.error

  beforeEach(() => {
    origConsoleError = console.error
  })

  afterEach(() => {
    console.error = origConsoleError
  })

  it('keeps only the last 20 entries when more than 20 are captured', async () => {
    vi.resetModules()
    const { initErrorBuffer, getCapturedErrors } = await import('../errorBuffer')
    initErrorBuffer()

    // Use a unique prefix to avoid confusion with messages from other test groups.
    const PREFIX = 'ringtest'
    // Log 25 distinct messages with this prefix
    for (let i = 1; i <= 25; i++) {
      console.error(`${PREFIX}-${i}`)
    }

    const output = getCapturedErrors()
    // The last 20 with this prefix must all be present (messages 6–25)
    for (let i = 6; i <= 25; i++) {
      expect(output).toContain(`${PREFIX}-${i}`)
    }

    // Count how many entries appear: the total buffer may hold up to 20 entries.
    // We only verify that none of the first 5 ring-test entries are still present
    // by checking the buffer has at most 20 ring-test entries total.
    const matchCount = (output.match(new RegExp(`${PREFIX}-`, 'g')) ?? []).length
    expect(matchCount).toBeLessThanOrEqual(20)
  })
})
