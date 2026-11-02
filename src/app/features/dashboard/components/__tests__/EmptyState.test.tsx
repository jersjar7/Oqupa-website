// @vitest-environment jsdom
// Never imply scale Oqupa does not have (marketing constraints; audit
// 2026-11-02): no "miles de personas".
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EmptyState from '../EmptyState'

describe('EmptyState', () => {
  it('invites to publish without claiming scale', () => {
    render(<MemoryRouter><EmptyState /></MemoryRouter>)
    expect(screen.getByText('Publica gratis tu propiedad en el mapa de Piura.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/miles/)
    expect(screen.getByRole('heading', { name: 'No tienes publicaciones' }).className).toMatch(/font-serif/)
  })
})
