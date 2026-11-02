/** Raised when an awaited step takes longer than it is allowed to. */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms} ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Rejects with TimeoutError if `promise` has not settled within `ms`.
 * `onTimeout` runs first, so the caller can cancel the work (abort an upload).
 * The timer is always cleared, so nothing is left running after it settles.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation',
  onTimeout?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new TimeoutError(label, ms))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
