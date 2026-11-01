import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// WHEN the website asks for, and shows, the A11b follow-up card. Mirrors the
// app's contact_follow_up_coordinator_test.dart. getDueFollowUp counts a
// returned card as shown (each card at most twice), so the rules are about
// never asking when the card could not be shown, and never losing one.

const { shownMock, answeredMock } = vi.hoisted(() => ({
  shownMock: vi.fn(),
  answeredMock: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    followUpShown: (...a: unknown[]) => shownMock(...a),
    followUpAnswered: (...a: unknown[]) => answeredMock(...a),
  },
}))

import { ContactFollowUpCoordinator, type FollowUpSession } from '../contactFollowUpCoordinator'
import type { DueFollowUpCard } from '@/services/contactFollowUpService'

const card = (listingId = 'L1', over: Partial<DueFollowUpCard> = {}): DueFollowUpCard => ({
  card: 'wrote',
  listingId,
  propertyType: 'casa',
  operationType: 'venta',
  district: 'Castilla',
  priceAmount: 100000,
  priceCurrency: 'USD',
  photoKey: null,
  rentalDurationType: null,
  contactRole: 'owner',
  ...over,
})

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

let clock: number
let fetchDueCard: Mock<() => Promise<DueFollowUpCard | null>>
let answer: Mock<(a: { listingId: string; card: string; answer: string }) => Promise<void>>
let presented: { card: DueFollowUpCard; session: FollowUpSession; close: () => void }[]
let calm: boolean

function make() {
  const c = new ContactFollowUpCoordinator({
    service: { fetchDueCard, answer },
    now: () => clock,
  })
  c.canPresentNow = () => calm
  c.presentCard = (cardShown, session) => {
    const d = deferred<void>()
    presented.push({ card: cardShown, session, close: () => d.resolve() })
    return d.promise
  }
  return c
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  clock = 1_000_000
  fetchDueCard = vi.fn(async (): Promise<DueFollowUpCard | null> => card())
  answer = vi.fn(async () => {})
  presented = []
  calm = true
  shownMock.mockReset()
  answeredMock.mockReset()
})

describe('signed in only', () => {
  it('on page load / sign-in it asks once and shows the card', async () => {
    const c = make()
    await c.signedIn('u1')
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    expect(presented).toHaveLength(1)
    expect(presented[0]!.card.listingId).toBe('L1')
  })

  it('nobody signed in: coming back to the tab never asks', async () => {
    const c = make()
    c.left()
    await c.returned()
    await c.screenSettled()
    expect(fetchDueCard).not.toHaveBeenCalled()
  })

  it('signing out while the request is out drops the card', async () => {
    const d = deferred<DueFollowUpCard | null>()
    fetchDueCard.mockReturnValueOnce(d.promise)
    const c = make()
    const pending = c.signedIn('u1')
    c.signedOut()
    d.resolve(card())
    await pending
    expect(presented).toHaveLength(0)
    await c.screenSettled()
    expect(presented).toHaveLength(0)
  })

  it('a different person signing in drops what was held for the last', async () => {
    calm = false
    const c = make()
    await c.signedIn('u1') // owed, not asked
    await c.signedIn('u2')
    calm = true
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
  })
})

describe('ordinary returns', () => {
  it('are spaced at least a minute apart', async () => {
    const c = make()
    await c.signedIn('u1')
    presented[0]!.close()
    await flush()
    clock += 30_000
    c.left()
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    clock += 31_000
    c.left()
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(2)
  })

  it('visibility and focus firing together make one request', async () => {
    const d = deferred<DueFollowUpCard | null>()
    fetchDueCard.mockReturnValueOnce(d.promise)
    const c = make()
    const first = c.signedIn('u1')
    void c.returned()
    void c.returned()
    d.resolve(null)
    await first
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
  })
})

describe('the WhatsApp hand-off', () => {
  it('nothing asks while the number is being fetched', async () => {
    fetchDueCard.mockResolvedValue(null)
    const c = make()
    await c.signedIn('u1')
    clock += 120_000
    c.contactStarted()
    c.left()
    await c.returned()
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
  })

  it('the first return after it asks, however soon', async () => {
    fetchDueCard.mockResolvedValueOnce(null)
    const c = make()
    await c.signedIn('u1')
    c.contactStarted()
    c.contactHandedOff()
    // Still on the Oqupa tab: WhatsApp has not taken over yet — never ask here.
    await c.screenSettled()
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    // WhatsApp took the screen; they come back 5 seconds later.
    c.left()
    clock += 5_000
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(2)
    expect(presented).toHaveLength(1)
  })

  it('lifts the minute only once', async () => {
    fetchDueCard.mockResolvedValue(null)
    const c = make()
    await c.signedIn('u1')
    c.contactStarted()
    c.contactHandedOff()
    c.left()
    await c.returned()
    clock += 5_000
    c.left()
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(2)
  })

  it('a contact that ended without WhatsApp makes the owed ask when the screen settles', async () => {
    fetchDueCard.mockResolvedValueOnce(null)
    const c = make()
    await c.signedIn('u1')
    c.contactStarted()
    c.left()
    await c.returned() // owed: a contact was in progress
    c.contactEndedWithoutHandOff()
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(2)
  })
})

describe('never over something else', () => {
  it('does not ask while the screen is busy; asks once it settles', async () => {
    calm = false
    const c = make()
    await c.signedIn('u1')
    expect(fetchDueCard).not.toHaveBeenCalled()
    await c.screenSettled()
    expect(fetchDueCard).not.toHaveBeenCalled()
    calm = true
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    expect(presented).toHaveLength(1)
  })

  it('a card that arrives as the screen became busy is kept and shown later, never fetched again', async () => {
    const d = deferred<DueFollowUpCard | null>()
    fetchDueCard.mockReturnValueOnce(d.promise)
    const c = make()
    const pending = c.signedIn('u1')
    calm = false // a dialog opened while the request was out
    d.resolve(card('L9'))
    await pending
    expect(presented).toHaveLength(0)
    expect(c.hasOwedWork).toBe(true)
    calm = true
    await c.screenSettled()
    expect(presented).toHaveLength(1)
    expect(presented[0]!.card.listingId).toBe('L9')
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
  })

  it('one card at a time: while it is open, nothing else is asked', async () => {
    const c = make()
    await c.signedIn('u1')
    clock += 120_000
    c.left()
    await c.returned()
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    presented[0]!.close()
    await flush()
    clock += 120_000
    c.left()
    await c.returned()
    expect(fetchDueCard).toHaveBeenCalledTimes(2)
  })

  it('with nothing owed, a settled screen asks nothing', async () => {
    fetchDueCard.mockResolvedValue(null)
    const c = make()
    await c.signedIn('u1')
    await c.screenSettled()
    await c.screenSettled()
    expect(fetchDueCard).toHaveBeenCalledTimes(1)
    expect(c.hasOwedWork).toBe(false)
  })
})

describe('the session', () => {
  it('logs follow_up_shown when the card appears, and each further step', async () => {
    const c = make()
    await c.signedIn('u1')
    expect(shownMock).toHaveBeenCalledWith({ card: 'wrote', contactRole: 'owner', listingId: 'L1' })
    presented[0]!.session.stepShown('reason')
    expect(shownMock).toHaveBeenLastCalledWith({ card: 'reason', contactRole: 'owner', listingId: 'L1' })
  })

  it('an answer goes to the server and to follow_up_answered, spelled the same', async () => {
    fetchDueCard.mockResolvedValue(card('L1', { card: 'reply', contactRole: 'agent' }))
    const c = make()
    await c.signedIn('u1')
    await presented[0]!.session.answer('reply', 'not_interested')
    expect(answer).toHaveBeenCalledWith({ listingId: 'L1', card: 'reply', answer: 'not_interested' })
    expect(answeredMock).toHaveBeenCalledWith({
      card: 'reply',
      answer: 'not_interested',
      contactRole: 'agent',
      listingId: 'L1',
    })
  })

  it('an answer the card does not accept is neither sent nor logged', async () => {
    const c = make()
    await c.signedIn('u1')
    await presented[0]!.session.answer('wrote', 'not_interested')
    expect(answer).not.toHaveBeenCalled()
    expect(answeredMock).not.toHaveBeenCalled()
  })
})
