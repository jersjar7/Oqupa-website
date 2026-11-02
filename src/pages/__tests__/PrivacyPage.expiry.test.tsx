// @vitest-environment jsdom
// Listings never expire (ADR-014) and no expiry reminder is ever sent, so the
// privacy page must not list one among the push notifications.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '../PrivacyPage'

describe('PrivacyPage — no expiry', () => {
  it('never promises expiry reminders', () => {
    const { container } = render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
    expect(container.textContent).not.toMatch(/expiraci[oó]n de anuncios/i)
  })
})
