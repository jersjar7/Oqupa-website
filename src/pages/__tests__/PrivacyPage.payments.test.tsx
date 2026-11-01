// @vitest-environment jsdom
// The privacy page names everything we keep about a payment, in both places it
// talks about payments (ADR-037, 2026-10-31: the method — card, Link, Apple Pay
// or Google Pay — is recorded, never card details).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '../PrivacyPage'
import { privacyLastUpdated } from '@/lib/legalLastUpdated'

describe('PrivacyPage — payments', () => {
  it('the data list names the payment method we record', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
    const item = screen.getByText(/Metadatos de pagos:/).closest('li')!
    expect(item.textContent).toMatch(/el método de pago \(tarjeta, Link, Apple Pay o Google Pay\)/)
    expect(item.textContent).toMatch(/No almacenamos información de tarjetas de crédito/)
  })

  // Was pinned to "1 de noviembre de 2026"; the date now follows the page's
  // own git history so nobody has to remember it (Jerson, 2026-11-01).
  it('says when it was last updated, from git (Jerson, 2026-11-01)', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
    expect(screen.getByText(`Última actualización: ${privacyLastUpdated}`)).toBeDefined()
  })
})
