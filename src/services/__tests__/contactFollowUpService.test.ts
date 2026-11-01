import { describe, it, expect, vi, beforeEach } from 'vitest'

// The website's half of the A11b follow-up card talks to the same two
// callables as the app (functions/lib/contact-follow-ups.js). These pin the
// wire format: names, region, the answers spelled as the server expects, and
// that nothing here ever throws.

const { getFunctionsMock, httpsCallableMock, callableFnMock } = vi.hoisted(() => {
  const callableFnMock = vi.fn()
  return {
    callableFnMock,
    httpsCallableMock: vi.fn((..._args: unknown[]) => callableFnMock),
    getFunctionsMock: vi.fn((..._args: unknown[]) => ({ __functions: true })),
  }
})

vi.mock('firebase/functions', () => ({
  getFunctions: (...args: unknown[]) => getFunctionsMock(...args),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}))

import {
  ALLOWED_FOLLOW_UP_ANSWERS,
  contactFollowUpService,
  parseDueFollowUpCard,
} from '../contactFollowUpService'

const SERVER_CARD = {
  card: 'wrote',
  listingId: 'L1',
  propertyType: 'casa',
  operationType: 'alquiler',
  district: 'Castilla',
  price: { amount: 1700, currency: 'PEN' },
  photoKey: 'property-photos/p1/1-0.webp',
  rentalDurationType: 'shortTerm',
  contactRole: 'agent',
  contactedAt: '2026-10-30T10:00:00.000Z',
  wroteAnsweredAt: null,
}

describe('parseDueFollowUpCard', () => {
  it('reads every field the card shows', () => {
    expect(parseDueFollowUpCard(SERVER_CARD)).toEqual({
      card: 'wrote',
      listingId: 'L1',
      propertyType: 'casa',
      operationType: 'alquiler',
      district: 'Castilla',
      priceAmount: 1700,
      priceCurrency: 'PEN',
      photoKey: 'property-photos/p1/1-0.webp',
      rentalDurationType: 'shortTerm',
      contactRole: 'agent',
    })
  })

  it('no card, or one this build does not know, is null', () => {
    expect(parseDueFollowUpCard({ card: null })).toBeNull()
    expect(parseDueFollowUpCard({})).toBeNull()
    expect(parseDueFollowUpCard(null)).toBeNull()
    expect(parseDueFollowUpCard({ card: 'survey', listingId: 'L1' })).toBeNull()
    // 'reason' is never fetched: it only follows "Ya no me interesa".
    expect(parseDueFollowUpCard({ card: 'reason', listingId: 'L1' })).toBeNull()
    expect(parseDueFollowUpCard({ card: 'wrote', listingId: '' })).toBeNull()
  })

  it('missing listing details are null; anything but agent is the owner', () => {
    expect(parseDueFollowUpCard({ card: 'reply', listingId: 'L2', contactRole: 'someone' })).toEqual({
      card: 'reply',
      listingId: 'L2',
      propertyType: null,
      operationType: null,
      district: null,
      priceAmount: null,
      priceCurrency: null,
      photoKey: null,
      rentalDurationType: null,
      contactRole: 'owner',
    })
  })
})

describe('ALLOWED_FOLLOW_UP_ANSWERS', () => {
  it('matches the server list for each card, in order', () => {
    expect(ALLOWED_FOLLOW_UP_ANSWERS).toEqual({
      wrote: ['yes', 'not_yet', 'dismissed'],
      reply: ['yes', 'not_yet', 'not_interested', 'dismissed'],
      reason: ['found_other', 'price', 'not_convinced', 'other', 'skipped'],
    })
  })
})

describe('contactFollowUpService', () => {
  beforeEach(() => {
    callableFnMock.mockReset()
    httpsCallableMock.mockClear()
    getFunctionsMock.mockClear()
  })

  it('fetchDueCard calls getDueFollowUp in southamerica-east1 and parses it', async () => {
    callableFnMock.mockResolvedValue({ data: SERVER_CARD })
    const card = await contactFollowUpService.fetchDueCard()
    expect(getFunctionsMock).toHaveBeenCalledWith(undefined, 'southamerica-east1')
    expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'getDueFollowUp')
    expect(callableFnMock).toHaveBeenCalledWith({})
    expect(card?.listingId).toBe('L1')
  })

  it('fetchDueCard: no card is null', async () => {
    callableFnMock.mockResolvedValue({ data: { card: null } })
    expect(await contactFollowUpService.fetchDueCard()).toBeNull()
  })

  it('fetchDueCard never throws — a failed request is simply no card', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    callableFnMock.mockRejectedValue(new Error('internal'))
    await expect(contactFollowUpService.fetchDueCard()).resolves.toBeNull()
    warn.mockRestore()
  })

  it('answer sends listingId, card and answer to answerFollowUp', async () => {
    callableFnMock.mockResolvedValue({ data: { saved: true } })
    await contactFollowUpService.answer({ listingId: 'L1', card: 'reply', answer: 'not_interested' })
    expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'answerFollowUp')
    expect(callableFnMock).toHaveBeenCalledWith({ listingId: 'L1', card: 'reply', answer: 'not_interested' })
  })

  it('answer never throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    callableFnMock.mockRejectedValue(new Error('failed-precondition'))
    await expect(
      contactFollowUpService.answer({ listingId: 'L1', card: 'wrote', answer: 'yes' }),
    ).resolves.toBeUndefined()
    warn.mockRestore()
  })

  it('an answer the card does not accept is not sent', async () => {
    await contactFollowUpService.answer({ listingId: 'L1', card: 'wrote', answer: 'price' })
    expect(callableFnMock).not.toHaveBeenCalled()
  })
})
