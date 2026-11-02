// @vitest-environment jsdom
// ADR-046 #6: after the gate, the number is shown with LLAMAR and COPIAR next
// to WhatsApp — people without WhatsApp could not reach the seller at all.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

import RevealedContact from '../RevealedContact'

describe('RevealedContact', () => {
  beforeEach(() => {
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it('shows the number with LLAMAR as a tel: link', () => {
    render(<RevealedContact phone="+51912345678" />)
    expect(screen.getByText('+51 912 345 678')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Llamar' }).getAttribute('href')).toBe('tel:+51912345678')
  })

  it('COPIAR copies the number and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<RevealedContact phone="+51912345678" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('+51912345678'))
    expect(toastMock.success).toHaveBeenCalledWith('Número copiado')
  })

  it('a refused copy says what to do', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<RevealedContact phone="+51912345678" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('No se pudo copiar. Mantén presionado el número para copiarlo.'))
  })
})
