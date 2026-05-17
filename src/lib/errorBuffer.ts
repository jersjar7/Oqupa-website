// Global client-side error ring buffer.
//
// Captures recent uncaught errors, unhandled promise rejections, and
// console.error calls so the /reportar bug form can auto-attach diagnostics
// without asking the user to open DevTools. In-memory only, last N entries.

interface CapturedError {
  time: string
  kind: 'error' | 'unhandledrejection' | 'console.error'
  message: string
}

const MAX_ENTRIES = 20
const MAX_MESSAGE_LEN = 1500
const buffer: CapturedError[] = []
let initialized = false

function push(kind: CapturedError['kind'], message: string) {
  buffer.push({
    time: new Date().toISOString(),
    kind,
    message: message.slice(0, MAX_MESSAGE_LEN),
  })
  if (buffer.length > MAX_ENTRIES) buffer.shift()
}

function describe(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ''}`
  }
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function initErrorBuffer(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('error', (event) => {
    const where = event.filename
      ? ` (${event.filename}:${event.lineno}:${event.colno})`
      : ''
    push('error', `${event.message}${where}`)
  })

  window.addEventListener('unhandledrejection', (event) => {
    push('unhandledrejection', describe(event.reason))
  })

  // Wrap console.error additively — keep the original behavior intact.
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    try {
      push('console.error', args.map(describe).join(' '))
    } catch {
      // Capturing must never break the app.
    }
    original(...args)
  }
}

export function getCapturedErrors(): string {
  if (buffer.length === 0) return ''
  return buffer
    .map((e) => `[${e.time}] ${e.kind}: ${e.message}`)
    .join('\n\n')
}
