// @vitest-environment jsdom
// The legal pages speak plain Spanish (audit 2026-11-02, F.7): "destacado",
// "oportunidades", never "boost", "leads" or "token FCM".
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }))
import TermsPage from '../TermsPage'
import PrivacyPage from '../PrivacyPage'

describe('legal pages words', () => {
  it.each([['Términos', TermsPage], ['Privacidad', PrivacyPage]])('%s has no English jargon', (_n, Page) => {
    render(<MemoryRouter><Page /></MemoryRouter>)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\bboosts?\b/i)
    expect(text).not.toMatch(/\bleads?\b/i)
    expect(text).not.toMatch(/token FCM/)
  })
})
