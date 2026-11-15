// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomTabs from '../BottomTabs'
import type { Capabilities } from '../capabilities'

const owner: Capabilities = { isAdmin: false, isRealtor: false, isMetricsViewer: false, isTeamMember: false, isMarketingMember: false }

// "Mis propiedades" wrapped onto two lines on phones and pushed its icon up out of line.
describe('BottomTabs — every label on one line', () => {
  it('never wraps a label', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /mis propiedades/i })
    expect(link.className).toContain('whitespace-nowrap')
  })

  it('gives a long label the room it needs and shares the rest', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: /navegación móvil/i })
    expect(nav.style.gridTemplateColumns).toContain('minmax(min-content, 1fr)')
  })
})
