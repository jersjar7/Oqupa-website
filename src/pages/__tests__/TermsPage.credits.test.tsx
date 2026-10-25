// @vitest-environment jsdom
// The district outlines bundled in the app (map plan step 1) are CC BY-IGO 3.0
// and require credit to IGN Perú. Jerson chose Términos for it (2026-10-24);
// the app's "Términos" link opens this same page.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TermsPage from '../TermsPage'

describe('TermsPage — data credits', () => {
  it('credits IGN Perú for the district boundaries', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>)
    expect(screen.getByText(/Límites distritales: Instituto Geográfico Nacional \(IGN\), Perú, vía OCHA HDX\./)).toBeDefined()
    expect(screen.getByRole('heading', { name: /créditos/i })).toBeDefined()
  })
})
