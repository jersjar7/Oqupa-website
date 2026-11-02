// @vitest-environment jsdom
// ADR-046 #5: the listing page offers "Reportar anuncio" with the app's six
// reasons; the outcome is said truthfully.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { reportMock } = vi.hoisted(() => ({ reportMock: vi.fn() }))
vi.mock('@/services/reportService', () => ({
  reportService: { reportListing: reportMock },
}))
vi.mock('@/app/components/ui', () => ({
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))

import ReportListing from '../ReportListing'

describe('ReportListing', () => {
  beforeEach(() => {
    reportMock.mockReset()
    localStorage.clear()
  })

  it('opens the six reasons and sends the chosen one', async () => {
    reportMock.mockResolvedValue(undefined)
    render(<ReportListing listingId="L1" ownerUserId="O1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reportar anuncio' }))
    expect(screen.getAllByRole('button', { name: /Información incorrecta|Fotos inapropiadas|Spam o publicidad|Propiedad no existe|Precio engañoso|Otro/ })).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Precio engañoso' }))
    await waitFor(() => expect(screen.getByText('Gracias por tu reporte. Revisaremos este anuncio.')).toBeTruthy())
    expect(reportMock).toHaveBeenCalledWith({ listingId: 'L1', ownerUserId: 'O1', reason: 'Precio engañoso' })
  })

  it('a failed send says so, never thanks', async () => {
    reportMock.mockImplementation(() => Promise.reject(Object.assign(new Error('rechazado'), { code: 'permission-denied' })))
    render(<ReportListing listingId="L1" ownerUserId="O1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reportar anuncio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }))
    await waitFor(() =>
      expect(screen.getByText('No pudimos enviar tu reporte. Revisa tu conexión e inténtalo de nuevo.')).toBeTruthy(),
    )
    expect(screen.queryByText(/Gracias por tu reporte/)).toBeNull()
  })

  // Review 2026-11-02: once reported on this device, the listing says so and
  // the action is off.
  it('after a report, this device shows "Ya reportaste este anuncio. Gracias." and the action is off', async () => {
    reportMock.mockResolvedValue(undefined)
    const { unmount } = render(<ReportListing listingId="L1" ownerUserId="O1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reportar anuncio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }))
    await waitFor(() => expect(screen.getByText('Gracias por tu reporte. Revisaremos este anuncio.')).toBeTruthy())
    unmount()
    render(<ReportListing listingId="L1" ownerUserId="O1" />)
    expect(screen.getByText('Ya reportaste este anuncio. Gracias.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reportar anuncio' })).toBeNull()
  })

  it('another listing can still be reported', async () => {
    reportMock.mockResolvedValue(undefined)
    localStorage.setItem('oqupa_reported_listings_v1', JSON.stringify(['L1']))
    render(<ReportListing listingId="L2" ownerUserId="O1" />)
    expect(screen.getByRole('button', { name: 'Reportar anuncio' })).toBeTruthy()
  })

  it('a failed send does not mark it reported', async () => {
    reportMock.mockImplementation(async () => { throw new Error('x') })
    render(<ReportListing listingId="L1" ownerUserId="O1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Reportar anuncio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Otro' }))
    await waitFor(() => expect(screen.getByText(/No pudimos enviar tu reporte/)).toBeTruthy())
    expect(localStorage.getItem('oqupa_reported_listings_v1')).toBeNull()
  })
})
