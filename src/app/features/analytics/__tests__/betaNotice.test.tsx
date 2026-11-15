// @vitest-environment jsdom
// Analítica is in beta (Jerson, weekly meeting 2026-11-14). The notice at the top of
// the page says exactly the words he approved on 2026-11-15, can be closed, and stays
// closed in that browser.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import BetaNotice, { BETA_NOTICE_KEY } from '../components/BetaNotice'

const P1 = 'En Oqupa queremos darte las mejores herramientas para el mercado inmobiliario de Piura. A medida que crecemos, Analítica te mostrará datos cada vez más útiles sobre tus propiedades, para ayudarte a anunciarlas mejor y para que quienes buscan encuentren la propiedad ideal para ellos.'
const P2 = 'Analítica está en beta: seguimos aprendiendo de ti y fortaleciendo los datos. Si tienes comentarios o ideas, escríbenos a admin@oqupa.com.'
const P3 = 'Nos alegra construir Oqupa para toda nuestra comunidad en Piura.'

describe('Analítica beta notice', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('says exactly the approved words, in three paragraphs', () => {
    const { container } = render(<BetaNotice />)
    const ps = Array.from(container.querySelectorAll('p')).map((p) => p.textContent)
    expect(ps).toEqual([P1, P2, P3])
  })

  it('shows the email address as visible text', () => {
    render(<BetaNotice />)
    expect(screen.getByText('admin@oqupa.com')).toBeTruthy()
  })

  it('is a white card, body in Gotham Book, kept out of the printed report', () => {
    render(<BetaNotice />)
    const card = screen.getByRole('region', { name: /analítica está en beta/i })
    const cls = card.className.split(/\s+/)
    expect(cls).toEqual(expect.arrayContaining(['bg-white', 'print:hidden']))
    for (const p of Array.from(card.querySelectorAll('p'))) {
      expect(p.className).not.toMatch(/font-serif|font-medium|font-bold/)
    }
  })

  it('closes with the "Cerrar" button and stays closed in this browser', () => {
    const { unmount } = render(<BetaNotice />)
    const close = screen.getByRole('button', { name: 'Cerrar' })
    expect(close.tagName).toBe('BUTTON')
    fireEvent.click(close)
    expect(screen.queryByText(P3)).toBeNull()
    expect(localStorage.getItem(BETA_NOTICE_KEY)).toBeTruthy()
    unmount()
    render(<BetaNotice />)
    expect(screen.queryByText(P3)).toBeNull()
  })

  it('still shows, and still closes, when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(<BetaNotice />)
    expect(screen.getByText(P3)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(P3)).toBeNull()
  })

  it('after closing, keyboard focus stays in place and a screen reader hears it closed', () => {
    render(<BetaNotice />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(document.activeElement?.textContent).toBe('Aviso cerrado')
  })
})
