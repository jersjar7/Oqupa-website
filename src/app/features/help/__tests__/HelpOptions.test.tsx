// @vitest-environment jsdom
// ADR-046 #16: the same help as the app — WhatsApp (the app's number), correo
// (admin@oqupa.com) and "Reportar un problema".
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HelpOptions, { SUPPORT_WHATSAPP_URL } from '../HelpOptions'

describe('HelpOptions', () => {
  it('offers WhatsApp, correo and Reportar un problema', () => {
    render(<MemoryRouter><HelpOptions /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toBe(SUPPORT_WHATSAPP_URL)
    expect(SUPPORT_WHATSAPP_URL).toBe(
      `https://wa.me/51936287377?text=${encodeURIComponent('Hola, necesito ayuda con Oqupa')}`,
    )
    // The address is shown as text: mailto links are unreliable.
    expect(screen.getByText('admin@oqupa.com')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Reportar un problema/ }).getAttribute('href')).toBe('/reportar')
  })
})
