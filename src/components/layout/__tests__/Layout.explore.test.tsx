// @vitest-environment jsdom
// Seen on Jerson's iPhone, 2026-10-25: a strip of the footer (green, with a
// second OQUPA logo) showed between the header and the map. On a phone the
// header is 64 px tall and the map started at 72 px; and the footer sat
// behind the full-screen map. The explore page now starts right under the
// header on every screen size, and has no footer.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from '../Layout'

vi.mock('@/components/layout/Header', () => ({ default: () => <header /> }))
vi.mock('@/components/layout/Footer', () => ({ default: () => <footer data-testid="footer" /> }))

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<p>page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('explore page layout', () => {
  it('no footer behind the full-screen map', () => {
    at('/explorar')
    expect(document.querySelector('[data-testid="footer"]')).toBeNull()
  })
  it('other pages keep their footer', () => {
    at('/privacy')
    expect(document.querySelector('[data-testid="footer"]')).not.toBeNull()
  })
  it('the map starts right under the header: 64 px on a phone, 72 px from 640 px wide', () => {
    const page = readFileSync(resolve(__dirname, '../../../pages/ExplorePage.tsx'), 'utf8')
    const header = readFileSync(resolve(__dirname, '../Header.tsx'), 'utf8')
    // Compact header: 12 px + logo + 12 px; the logo is h-10 (40) / sm:h-12 (48).
    expect(header).toContain("isScrolled ? 'h-10 sm:h-12'")
    expect(header).toContain("isScrolled ? 'shadow-light py-3'")
    expect(page).toContain('top-16 sm:top-[72px]')
    expect(page).not.toMatch(/(?<!sm:)top-\[72px\]/)
  })
})
