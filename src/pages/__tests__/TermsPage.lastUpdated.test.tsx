// @vitest-environment jsdom
// The terms page's date follows its own git history (Jerson, 2026-11-01).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TermsPage from '../TermsPage'
import { termsLastUpdated } from '@/lib/legalLastUpdated'

describe('TermsPage — last updated', () => {
  it('says when it was last updated, from git', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>)
    expect(screen.getByText(`Última actualización: ${termsLastUpdated}`)).toBeDefined()
  })
})
