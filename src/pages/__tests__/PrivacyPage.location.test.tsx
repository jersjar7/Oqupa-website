// @vitest-environment jsdom
// Analítica (ADR-058 R2, R6) counts the district of people who view a listing
// and turns map searches into districts. Jerson approved the policy wording on
// 2026-11-14 ("Policy approved"); the page must say it and never claim location
// is not used for analytics.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '../PrivacyPage'

function pageText() {
  const { container } = render(<MemoryRouter><PrivacyPage /></MemoryRouter>)
  return (container.textContent ?? '').replace(/\s+/g, ' ')
}

describe('PrivacyPage — location for Analítica', () => {
  it('no longer says location is never used for analytics', () => {
    expect(pageText()).not.toMatch(/no se utiliza con fines analíticos/i)
  })

  it('says which district viewers are in is counted, only with permission already given and when not signed in', () => {
    const text = pageText()
    expect(text).toMatch(/en qué distrito están quienes miran un anuncio/)
    expect(text).toMatch(/solo si ya diste permiso de ubicación \(nunca te lo pedimos para esto\)/)
    expect(text).toMatch(/solo si no has iniciado sesión/)
    expect(text).toMatch(/solo guardamos el distrito, nunca tu ubicación exacta/)
    expect(text).toMatch(/si lo miraron 3 personas o más/)
  })

  it('says map-search points are turned into districts and not kept', () => {
    expect(pageText()).toMatch(/los convertimos en distritos para saber qué zonas se buscan más, y no guardamos esos puntos/)
  })

  it('still says location is not tracked continuously nor shared', () => {
    expect(pageText()).toMatch(/no se rastrea de forma continua ni en segundo plano, y no se comparte con terceros/)
  })
})
