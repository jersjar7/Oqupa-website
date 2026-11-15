import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createListingCountQueue, limaDayOf, type CountEvent } from '../listingCounts'

// ADR-051: the website groups what it counts and sends it to the one server
// counter (recordListingCounts) every few seconds. The server decides what
// counts; the browser only avoids sending what the server would ignore anyway
// (the same card again today, the same listing opened again within the hour).

const NOW = new Date('2026-11-05T15:00:00Z').getTime() // 10:00 Lima
const HOUR = 60 * 60 * 1000

function setup(opts: { send?: (e: CountEvent[]) => Promise<void> } = {}) {
  let clock = NOW
  const sent: CountEvent[][] = []
  const send = vi.fn(opts.send ?? (async (events: CountEvent[]) => { sent.push(events) }))
  const queue = createListingCountQueue({ send, now: () => clock, flushMs: 3000 })
  return { queue, send, sent, tick: (ms: number) => { clock += ms; vi.advanceTimersByTime(ms) } }
}

describe('limaDayOf', () => {
  it('uses Lima time, not UTC', () => {
    expect(limaDayOf(new Date('2026-11-06T04:30:00Z').getTime())).toBe('2026-11-05') // 23:30 Lima
    expect(limaDayOf(new Date('2026-11-06T05:30:00Z').getTime())).toBe('2026-11-06') // 00:30 Lima
  })
})

describe('createListingCountQueue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends nothing straight away; groups what arrives within a few seconds into one message', async () => {
    const { queue, send, sent, tick } = setup()
    queue.add('L1', 'shown')
    queue.add('L2', 'shown')
    queue.add('L1', 'seen')
    expect(send).not.toHaveBeenCalled()
    tick(3000)
    await vi.runAllTimersAsync()
    expect(send).toHaveBeenCalledTimes(1)
    expect(sent[0]).toEqual([
      { listingId: 'L1', kind: 'shown' },
      { listingId: 'L2', kind: 'shown' },
      { listingId: 'L1', kind: 'seen' },
    ])
  })

  it('the same card shown again the same Lima day is not sent again', async () => {
    const { queue, sent, tick } = setup()
    queue.add('L1', 'shown')
    tick(3000)
    await vi.runAllTimersAsync()
    expect(queue.add('L1', 'shown')).toBe(false)
    tick(3000)
    await vi.runAllTimersAsync()
    expect(sent.flat()).toHaveLength(1)
  })

  it('the next Lima day it is sent again', async () => {
    const { queue, sent, tick } = setup()
    queue.add('L1', 'shown')
    tick(3000)
    await vi.runAllTimersAsync()
    tick(15 * HOUR) // past midnight in Lima
    expect(queue.add('L1', 'shown')).toBe(true)
    tick(3000)
    await vi.runAllTimersAsync()
    expect(sent.flat()).toHaveLength(2)
  })

  it('the same listing opened again within the hour is not sent; after the hour it is', async () => {
    const { queue, tick } = setup()
    expect(queue.add('L1', 'seen')).toBe(true)
    tick(30 * 60 * 1000)
    expect(queue.add('L1', 'seen')).toBe(false)
    tick(31 * 60 * 1000)
    expect(queue.add('L1', 'seen')).toBe(true)
  })

  it('never sends more than 50 in one message; the rest follow', async () => {
    const { queue, sent, tick } = setup()
    for (let i = 0; i < 120; i++) queue.add(`L${i}`, 'shown')
    tick(3000)
    await vi.runAllTimersAsync()
    expect(sent.length).toBe(3)
    expect(sent.every((m) => m.length <= 50)).toBe(true)
    expect(sent.flat()).toHaveLength(120)
  })

  it('flush() sends at once (the page is being hidden or closed)', async () => {
    const { queue, send } = setup()
    queue.add('L1', 'seen')
    await queue.flush()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('a failed send never throws to the page, and is tried once more', async () => {
    let calls = 0
    const { queue, tick } = setup({
      send: async () => {
        calls++
        if (calls === 1) throw new Error('offline')
      },
    })
    queue.add('L1', 'shown')
    tick(3000)
    await vi.runAllTimersAsync()
    tick(3000)
    await vi.runAllTimersAsync()
    expect(calls).toBe(2)
  })

  it('a message that keeps failing is dropped, not retried forever', async () => {
    let calls = 0
    const { queue, tick } = setup({ send: async () => { calls++; throw new Error('down') } })
    queue.add('L1', 'shown')
    for (let i = 0; i < 10; i++) {
      tick(3000)
      await vi.runAllTimersAsync()
    }
    expect(calls).toBe(2)
  })

  it('an empty queue sends nothing', async () => {
    const { send, tick } = setup()
    tick(10000)
    await vi.runAllTimersAsync()
    expect(send).not.toHaveBeenCalled()
  })
})

describe('ADR-058: arrival and WhatsApp taps', () => {
  it('a vista carries how the person arrived; a tap is sent once a day per listing', async () => {
    const sent: unknown[] = []
    let t = Date.parse('2026-11-05T15:00:00Z')
    const q = createListingCountQueue({ send: async (e) => { sent.push(...e) }, now: () => t })
    q.add('L1', 'seen', 'whatsapp')
    q.add('L1', 'whatsapp')
    q.add('L1', 'whatsapp')
    q.add('L2', 'shown', 'facebook') // via only travels on a vista
    await q.flush()
    expect(sent).toEqual([
      { listingId: 'L1', kind: 'seen', via: 'whatsapp' },
      { listingId: 'L1', kind: 'whatsapp' },
      { listingId: 'L2', kind: 'shown' },
    ])
    t += 24 * 60 * 60 * 1000
    q.add('L1', 'whatsapp')
    await q.flush()
    expect(sent).toHaveLength(4)
  })
})

