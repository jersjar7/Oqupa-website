// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DestacadoBadge from '../DestacadoBadge'
import PhotoOverlayBadge from '../PhotoOverlayBadge'
import Button from '../Button'
import { LISTING_STATUS_TONE } from '@/lib/listingStatusTone'

/**
 * Shared brand spec with the app (brand audit 2026-10-31). These pin the
 * decisions, not the pixels: Destacado is ink on amber and says DESTACADO;
 * Desactivado is neutral, never red; status labels are Gotham Medium
 * uppercase; button labels are tracked.
 */

describe('DestacadoBadge', () => {
  it('says DESTACADO, uppercase, in ink on the boost amber — never white', () => {
    render(<DestacadoBadge />)
    const badge = screen.getByText('DESTACADO')
    expect(badge.className).toMatch(/\bbg-boost\b/)
    expect(badge.className).toMatch(/\btext-ink\b/)
    expect(badge.className).toMatch(/\buppercase\b/)
    expect(badge.className).not.toMatch(/text-white/)
    expect(badge.className).not.toMatch(/amber-\d/)
  })

  it('is solid amber, not a pale chip, at both sizes', () => {
    const { container } = render(<><DestacadoBadge size="sm" /><DestacadoBadge withStar /></>)
    for (const el of container.querySelectorAll('span')) {
      expect(el.className).not.toMatch(/bg-boost\//)
    }
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
})

describe('listing status badge', () => {
  it('Activo has the green dot', () => {
    expect(LISTING_STATUS_TONE.active).toBe('success')
  })

  it('Desactivado, Vendido and Alquilado are neutral — no red dot', () => {
    expect(LISTING_STATUS_TONE.deactivated).toBe('neutral')
    expect(LISTING_STATUS_TONE.sold).toBe('neutral')
    expect(LISTING_STATUS_TONE.rented).toBe('neutral')
    expect(Object.values(LISTING_STATUS_TONE)).not.toContain('error')
  })

  it('the label is Gotham Medium, uppercase; a neutral dot is grey, not red', () => {
    render(<PhotoOverlayBadge tone="neutral">Desactivado</PhotoOverlayBadge>)
    const badge = screen.getByText('Desactivado')
    expect(badge.className).toMatch(/\bfont-sans\b/)
    expect(badge.className).toMatch(/\bfont-medium\b/)
    expect(badge.className).toMatch(/\buppercase\b/)
    const dot = badge.querySelector('span')!
    expect(dot.className).not.toMatch(/bg-error|red-/)
  })

  // One look on both platforms (feature audit 2026-11-02): the app's pill —
  // white over the photo, ink label, 10.5 px, a 6 px dot. The website drew a
  // black 60 % pill with white text, a different component to the eye.
  it('is the app pill: white, ink label, 10.5 px, 6 px dot', () => {
    render(<PhotoOverlayBadge tone="success">Activo</PhotoOverlayBadge>)
    const badge = screen.getByText('Activo')
    expect(badge.className).toMatch(/\bbg-white\/90\b/)
    expect(badge.className).toMatch(/\btext-text-primary\b/)
    expect(badge.className).toMatch(/text-\[10\.5px\]/)
    expect(badge.className).not.toMatch(/bg-black|text-white/)
    const dot = badge.querySelector('span')!
    expect(dot.className).toMatch(/\bh-1\.5\b/)
    expect(dot.className).toMatch(/\bw-1\.5\b/)
    expect(dot.className).toMatch(/\bbg-success\b/)
  })

  it('a closed status reads grey, label and dot, as on the app', () => {
    render(<PhotoOverlayBadge tone="neutral">Vendido</PhotoOverlayBadge>)
    const badge = screen.getByText('Vendido')
    expect(badge.className).toMatch(/\btext-text-tertiary\b/)
    expect(badge.className).not.toMatch(/\btext-text-primary\b/)
    expect(badge.querySelector('span')!.className).toMatch(/\bbg-text-tertiary\b/)
  })
})

describe('Button labels', () => {
  it('primary and danger labels are tracked 1 px (deck: tracked uppercase)', () => {
    render(<><Button>Guardar</Button><Button variant="danger">Eliminar</Button></>)
    expect(screen.getByRole('button', { name: 'Guardar' }).className).toMatch(/tracking-\[1px\]/)
    expect(screen.getByRole('button', { name: 'Eliminar' }).className).toMatch(/tracking-\[1px\]/)
  })

  it('danger uses the alert-red token, not hard-coded hex', () => {
    render(<Button variant="danger">Eliminar</Button>)
    const cls = screen.getByRole('button', { name: 'Eliminar' }).className
    expect(cls).toMatch(/\btext-error\b/)
    expect(cls).not.toMatch(/#E63946/i)
  })
})
