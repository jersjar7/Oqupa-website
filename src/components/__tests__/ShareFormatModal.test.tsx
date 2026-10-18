// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * Share events from the share modal (metrics plan A3), named as in the app:
 * share_listing for the link, share_listing_branded for an image card.
 *
 * Each fires once per share that actually left the page — through the system
 * share sheet, the clipboard, or a download — and never when the user cancels
 * or the share fails. `share_method` says how it went out.
 */

const { shareListingEventMock, shareBrandedEventMock, shareListingUtilMock, paintMock } = vi.hoisted(() => ({
  shareListingEventMock: vi.fn(),
  shareBrandedEventMock: vi.fn(),
  shareListingUtilMock: vi.fn(),
  paintMock: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: { shareListing: shareListingEventMock, shareListingBranded: shareBrandedEventMock },
}))
vi.mock('@/lib/shareUtils', () => ({ shareListing: shareListingUtilMock }))
vi.mock('@/lib/brandedCardPainter', () => ({ paintBrandedCard: paintMock }))
vi.mock('@/lib/brandedCardConfig', () => ({
  buildBrandedCardConfig: () => ({ operationLabel: 'Venta', locationText: 'Castilla' }),
}))
vi.mock('@/lib/imageUrl', () => ({ shareCard: (ref: string) => ref }))
// jsdom has no <dialog>.showModal; the modal's shell is not under test.
vi.mock('@/app/components/ui/Modal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}))

import ShareFormatModal from '../ShareFormatModal'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

const LISTING = {
  id: 'listing_1',
  price: { amount: 1200, currency: 'PEN' },
  media: { photoKeys: ['k1'] },
} as unknown as Listing

const PROPERTY = {
  propertyType: 'casa',
  operationType: 'venta',
  location: { distrito: 'Castilla', urbanizacion: '' },
  specs: {},
} as unknown as Property

function renderModal() {
  return render(<ShareFormatModal isOpen onClose={() => {}} listing={LISTING} property={PROPERTY} />)
}

const nav = navigator as unknown as Record<string, unknown>

function abortError() {
  const err = new Error('cancelled')
  err.name = 'AbortError'
  return err
}

beforeEach(() => {
  shareListingEventMock.mockReset()
  shareBrandedEventMock.mockReset()
  shareListingUtilMock.mockReset()
  paintMock.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  delete nav.share
  delete nav.canShare
})

describe('share link', () => {
  it.each([
    ['shared', 'native'],
    ['copied', 'clipboard'],
  ])('fires share_listing once when the link was %s', async (result, method) => {
    shareListingUtilMock.mockResolvedValue(result)
    renderModal()
    fireEvent.click(screen.getByText('Compartir enlace'))
    await waitFor(() => expect(shareListingEventMock).toHaveBeenCalledTimes(1))
    expect(shareListingEventMock).toHaveBeenCalledWith('listing_1', 'venta', method)
    expect(shareBrandedEventMock).not.toHaveBeenCalled()
  })

  it('does not fire when the share is cancelled or fails', async () => {
    shareListingUtilMock.mockResolvedValue('failed')
    renderModal()
    fireEvent.click(screen.getByText('Compartir enlace'))
    await waitFor(() => expect(shareListingUtilMock).toHaveBeenCalled())
    await Promise.resolve()
    expect(shareListingEventMock).not.toHaveBeenCalled()
  })
})

describe('share image', () => {
  it('fires share_listing_branded once, native, when the share sheet completes', async () => {
    nav.share = vi.fn().mockResolvedValue(undefined)
    nav.canShare = vi.fn(() => true)
    renderModal()
    fireEvent.click(screen.getByText('Historia'))
    await waitFor(() => expect(shareBrandedEventMock).toHaveBeenCalledTimes(1))
    expect(shareBrandedEventMock).toHaveBeenCalledWith('listing_1', 'venta', 'story', 'native')
    expect(shareListingEventMock).not.toHaveBeenCalled()
  })

  it('fires share_listing_branded once, download, when the image is downloaded', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderModal()
    fireEvent.click(screen.getByText('Cuadrada'))
    await waitFor(() => expect(shareBrandedEventMock).toHaveBeenCalledTimes(1))
    expect(shareBrandedEventMock).toHaveBeenCalledWith('listing_1', 'venta', 'square', 'download')
    expect(shareListingEventMock).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })

  it('does not fire when the user cancels the share sheet', async () => {
    nav.share = vi.fn().mockRejectedValue(abortError())
    nav.canShare = vi.fn(() => true)
    renderModal()
    fireEvent.click(screen.getByText('Historia'))
    await waitFor(() => expect(nav.share).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Historia').closest('button')).not.toHaveProperty('disabled', true))
    expect(shareBrandedEventMock).not.toHaveBeenCalled()
    expect(shareListingEventMock).not.toHaveBeenCalled()
  })

  it('does not fire when the card cannot be painted', async () => {
    paintMock.mockRejectedValue(new Error('canvas'))
    renderModal()
    fireEvent.click(screen.getByText('Historia'))
    await waitFor(() => expect(paintMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Historia').closest('button')).not.toHaveProperty('disabled', true))
    expect(shareBrandedEventMock).not.toHaveBeenCalled()
    expect(shareListingEventMock).not.toHaveBeenCalled()
  })
})
