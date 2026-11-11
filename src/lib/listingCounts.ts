// ADR-051 (Jerson, 2026-11-05): every listing has two numbers, counted the same
// way on the website and the app, guests included.
//   Apariciones ("shown") — a listing card at least half on screen for 1 s.
//   Vistas ("seen") — the listing opened on purpose and kept open 2 s.
//
// The browser groups what it counts and sends it to the one server counter
// (`recordListingCounts`) every few seconds. The server decides what counts
// (live listing, not the owner, not the team, repeats, caps); the browser only
// skips what the server would ignore anyway, to save requests. Sending never
// throws into the page.

import type { Via } from './arrival'

// ADR-058 adds a WhatsApp tap (after the contact gate) and, on a vista, how the
// person arrived. The server counts a tap only after that person's counted contact.
export type CountKind = 'shown' | 'seen' | 'whatsapp'
export interface CountEvent {
  listingId: string
  kind: CountKind
  via?: Via
}

const MAX_PER_MESSAGE = 50
const SEEN_REPEAT_MS = 60 * 60 * 1000
/** One retry for a failed message; after that it is dropped. */
const MAX_ATTEMPTS = 2

/** "2026-11-05" — the calendar day in Lima (UTC−5, no daylight saving). */
export function limaDayOf(ms: number): string {
  return new Date(ms - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

interface Options {
  send: (events: CountEvent[]) => Promise<void>
  now?: () => number
  flushMs?: number
}

export function createListingCountQueue({ send, now = Date.now, flushMs = 3000 }: Options) {
  let pending: Array<CountEvent & { attempts: number }> = []
  let timer: ReturnType<typeof setTimeout> | null = null
  const shownOn = new Map<string, string>() // listingId → Lima day it was sent
  const seenAt = new Map<string, number>() // listingId → when it was sent
  const tappedOn = new Map<string, string>() // listingId → Lima day a WhatsApp tap was sent

  function schedule() {
    if (timer !== null || pending.length === 0) return
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, flushMs)
  }

  async function flush(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    while (pending.length > 0) {
      const batch = pending.slice(0, MAX_PER_MESSAGE)
      pending = pending.slice(MAX_PER_MESSAGE)
      try {
        await send(batch.map(({ listingId, kind, via }) => (via ? { listingId, kind, via } : { listingId, kind })))
      } catch {
        const retry = batch
          .map((e) => ({ ...e, attempts: e.attempts + 1 }))
          .filter((e) => e.attempts < MAX_ATTEMPTS)
        pending = [...retry, ...pending]
        schedule()
        return
      }
    }
  }

  /** Queues one count. Returns false when the server would ignore it anyway. */
  function add(listingId: string, kind: CountKind, via?: Via): boolean {
    const t = now()
    if (kind === 'shown' || kind === 'whatsapp') {
      const day = limaDayOf(t)
      const seenDays = kind === 'shown' ? shownOn : tappedOn
      if (seenDays.get(listingId) === day) return false
      seenDays.set(listingId, day)
    } else {
      const last = seenAt.get(listingId)
      if (last !== undefined && t - last < SEEN_REPEAT_MS) return false
      seenAt.set(listingId, t)
    }
    // A vista says how the person arrived, when the listing page registered it.
    const arrived = kind === 'seen' ? via ?? arrivals.get(listingId) : undefined
    pending.push(arrived ? { listingId, kind, via: arrived, attempts: 0 } : { listingId, kind, attempts: 0 })
    schedule()
    return true
  }

  const arrivals = new Map<string, Via>()
  /** The listing page tells the queue how this person arrived at it (ADR-058 R1). */
  function arrivedVia(listingId: string, how: Via) {
    arrivals.set(listingId, how)
  }

  return { add, flush, arrivedVia }
}

/** The page-wide queue, sending through the server counter. */
let shared: ReturnType<typeof createListingCountQueue> | null = null

function sharedQueue() {
  if (!shared) {
    shared = createListingCountQueue({
      send: async (events) => {
        const { firestoreService } = await import('@/services/firestoreService')
        // A vista with no registered arrival was opened inside Oqupa (the map card, a list).
        await firestoreService.recordListingCounts(events.map((e) => (e.kind === 'seen' && !e.via ? { ...e, via: 'direct' as const } : e)))
      },
    })
    if (typeof document !== 'undefined') {
      // Send what is waiting before the tab is hidden or closed.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void shared?.flush()
      })
    }
  }
  return shared
}

export const listingCounts = {
  add: (listingId: string, kind: CountKind, via?: Via) => sharedQueue().add(listingId, kind, via),
  flush: () => sharedQueue().flush(),
  arrivedVia: (listingId: string, how: Via) => sharedQueue().arrivedVia(listingId, how),
}
