// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

vi.mock('@/components/ShareFormatModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>formato</div> : null),
}))

import PublishedSharePrompt from '../PublishedSharePrompt'
import { useJustPublished } from '@/hooks/useJustPublished'

beforeAll(() => {
  // jsdom has no <dialog> methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false }
})

function Probe() {
  const { justPublished } = useJustPublished()
  const loc = useLocation()
  return <div data-testid="probe">{`${justPublished}|${JSON.stringify(loc.state)}`}</div>
}

const at = (state: unknown) => render(
  <MemoryRouter initialEntries={[{ pathname: '/property/listing_1', state }]}>
    <Routes><Route path="/property/:id" element={<Probe />} /></Routes>
  </MemoryRouter>,
)

describe('useJustPublished', () => {
  it('is true on arrival from the wizard, and drops the flag so a refresh does not repeat it', () => {
    at({ justPublished: true })
    expect(screen.getByTestId('probe').textContent).toBe('true|null')
  })

  it('is false on an ordinary visit', () => {
    at(null)
    expect(screen.getByTestId('probe').textContent).toBe('false|null')
  })
})

describe('PublishedSharePrompt', () => {
  const props = { listing: {} as never, property: {} as never }

  it('offers to share, in Spanish, with "Ahora no" and "Compartir"', () => {
    render(<PublishedSharePrompt {...props} onClose={() => {}} />)
    expect(screen.getByText('¡Comparte tu anuncio en todas tus redes sociales!')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeTruthy()
    const share = screen.getByRole('button', { name: 'Compartir' })
    expect(share.className).toMatch(/tracking-\[1px\]/)
  })

  it('"Ahora no" closes it', () => {
    const onClose = vi.fn()
    render(<PublishedSharePrompt {...props} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('"Compartir" opens the share formats', () => {
    render(<PublishedSharePrompt {...props} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Compartir' }))
    expect(screen.getByText('formato')).toBeTruthy()
  })
})
