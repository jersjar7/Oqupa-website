// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

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
  // FunctionsError is a class-like used for error typing only; re-export as-is
  FunctionsError: class FunctionsError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

import { contactService, ContactDenied } from '../contactService'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('contactService', () => {
  beforeEach(() => {
    getFunctionsMock.mockReset().mockReturnValue({ __functions: true })
    httpsCallableMock.mockReset().mockReturnValue(callableFnMock)
    callableFnMock.mockReset()
  })

  // ── getListingContact — success ──────────────────────────────────────────

  describe('getListingContact — success', () => {
    it('returns contact data on success', async () => {
      const contactData = {
        phone: '+51987654321',
        displayName: 'Juan García',
        contactRole: 'owner' as const,
        counted: true,
      }
      callableFnMock.mockResolvedValue({ data: contactData })

      const result = await contactService.getListingContact('listing-abc')
      expect(result).toEqual(contactData)
    })

    it('passes the listingId to the callable', async () => {
      callableFnMock.mockResolvedValue({ data: { phone: '', displayName: null, contactRole: 'owner', counted: false } })
      await contactService.getListingContact('listing-xyz')
      expect(callableFnMock).toHaveBeenCalledWith({ listingId: 'listing-xyz' })
    })

    it('calls getFunctions with the correct region', async () => {
      callableFnMock.mockResolvedValue({ data: { phone: '', displayName: null, contactRole: 'owner', counted: false } })
      await contactService.getListingContact('listing-1')
      expect(getFunctionsMock).toHaveBeenCalledWith(undefined, 'southamerica-east1')
    })

    it('calls httpsCallable with the correct function name', async () => {
      callableFnMock.mockResolvedValue({ data: { phone: '', displayName: null, contactRole: 'owner', counted: false } })
      await contactService.getListingContact('listing-1')
      expect(httpsCallableMock).toHaveBeenCalledWith(
        expect.anything(),
        'getListingContact',
      )
    })

    it('returns null displayName when the server sends null', async () => {
      callableFnMock.mockResolvedValue({
        data: { phone: '+51999', displayName: null, contactRole: 'agent', counted: false },
      })
      const result = await contactService.getListingContact('listing-2')
      expect(result.displayName).toBeNull()
    })

    it('returns counted=false when the contact was not counted', async () => {
      callableFnMock.mockResolvedValue({
        data: { phone: '+51999', displayName: 'Agente', contactRole: 'agent', counted: false },
      })
      const result = await contactService.getListingContact('listing-3')
      expect(result.counted).toBe(false)
    })
  })

  // ── getListingContact — error mapping ────────────────────────────────────

  describe('getListingContact — error mapping', () => {
    it('throws ContactDenied("needs-login") for unauthenticated error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/unauthenticated' })
      await expect(contactService.getListingContact('listing-1')).rejects.toThrow(ContactDenied)
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'needs-login',
      })
    })

    it('throws ContactDenied("needs-phone-verification") for failed-precondition error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/failed-precondition' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'needs-phone-verification',
      })
    })

    it('throws ContactDenied("listing-has-no-contact") for not-found error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/not-found' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'listing-has-no-contact',
      })
    })

    it('throws ContactDenied("needs-email-verification") for permission-denied error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/permission-denied' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'needs-email-verification',
      })
    })

    it('throws ContactDenied("needs-phone-reverification") for aborted error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/aborted' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'needs-phone-reverification',
      })
    })

    it('throws ContactDenied("rate-limited") for resource-exhausted error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/resource-exhausted' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'rate-limited',
      })
    })

    it('throws ContactDenied("unavailable") for any other error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/internal' })
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'unavailable',
      })
    })

    it('throws ContactDenied("unavailable") when error has no code', async () => {
      callableFnMock.mockRejectedValue(new Error('network failure'))
      await expect(contactService.getListingContact('listing-1')).rejects.toMatchObject({
        reason: 'unavailable',
      })
    })

    it('ContactDenied has name "ContactDenied"', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/internal' })
      try {
        await contactService.getListingContact('listing-1')
        expect.fail('should have thrown')
      } catch (e) {
        expect((e as ContactDenied).name).toBe('ContactDenied')
      }
    })

    it('ContactDenied is instanceof Error', async () => {
      callableFnMock.mockRejectedValue({ code: 'functions/internal' })
      try {
        await contactService.getListingContact('listing-1')
        expect.fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e).toBeInstanceOf(ContactDenied)
      }
    })
  })
})
