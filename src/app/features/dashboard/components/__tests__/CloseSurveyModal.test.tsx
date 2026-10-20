// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'

/**
 * The three questions asked right after an owner marks a listing Vendido or
 * Alquilado. Wording approved by Jerson 2026-10-20, identical to the app.
 */

// jsdom has no <dialog>.showModal; the shell is replaced by one that exposes
// its close button so dismissing can be tested.
vi.mock('@/app/components/ui/Modal', () => ({
  default: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) =>
    isOpen ? (
      <div>
        <button onClick={onClose}>Cerrar</button>
        {children}
      </div>
    ) : null,
}))

import CloseSurveyModal from '../CloseSurveyModal'
import type { CloseSurveyAnswers } from '@/services/closeSurveyService'

let sent: CloseSurveyAnswers[]

function Harness({ isRental = false, onSubmit }: { isRental?: boolean; onSubmit?: (a: CloseSurveyAnswers) => Promise<void> }) {
  const [open, setOpen] = useState(true)
  return (
    <CloseSurveyModal
      isOpen={open}
      listingId="L1"
      isRental={isRental}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit ?? (async (a) => { sent.push(a) })}
    />
  )
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('CloseSurveyModal', () => {
  beforeEach(() => {
    sent = []
  })

  it('a sale asks about selling, with three answers', () => {
    render(<Harness />)
    expect(screen.getByText('¿Lo vendiste gracias a Oqupa?')).toBeTruthy()
    for (const name of ['Sí', 'No', 'Prefiero no responder']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('a rental asks about renting', () => {
    render(<Harness isRental />)
    expect(screen.getByText('¿Lo rentaste gracias a Oqupa?')).toBeTruthy()
  })

  it('Sí, then a comment and ENVIAR, sends both and closes', () => {
    render(<Harness />)
    click('Sí')
    expect(screen.getByText('¿Qué te gustó de Oqupa y qué te hubiera ayudado más?')).toBeTruthy()
    const box = screen.getByPlaceholderText('Tu opinión nos ayuda a mejorar (opcional)')
    fireEvent.change(box, { target: { value: '  Muy fácil  ' } })
    click('ENVIAR')
    expect(sent).toEqual([{ listingId: 'L1', viaOqupa: 'yes', channel: null, feedback: 'Muy fácil' }])
    expect(screen.queryByRole('button', { name: 'ENVIAR' })).toBeNull()
  })

  it('No asks where, offering the six approved places', () => {
    render(<Harness isRental />)
    click('No')
    expect(screen.getByText('¿Dónde lo rentaste?')).toBeTruthy()
    for (const name of [
      'Facebook o Marketplace',
      'Otra página de anuncios',
      'Agente inmobiliario',
      'Cartel en la propiedad',
      'Familiar o conocido',
      'Otro',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    click('Agente inmobiliario')
    click('Omitir')
    expect(sent).toEqual([{ listingId: 'L1', viaOqupa: 'no', channel: 'agent', feedback: null }])
  })

  it('a sale asks ¿Dónde lo vendiste?', () => {
    render(<Harness />)
    click('No')
    expect(screen.getByText('¿Dónde lo vendiste?')).toBeTruthy()
  })

  it('Prefiero no responder is recorded as an answer', () => {
    render(<Harness />)
    click('Prefiero no responder')
    click('Omitir')
    expect(sent[0]!.viaOqupa).toBe('skip')
  })

  it('ENVIAR with an empty box sends no comment', () => {
    render(<Harness />)
    click('Sí')
    fireEvent.change(screen.getByPlaceholderText('Tu opinión nos ayuda a mejorar (opcional)'), { target: { value: '   ' } })
    click('ENVIAR')
    expect(sent[0]!.feedback).toBeNull()
  })

  it('closing before answering sends nothing', () => {
    render(<Harness />)
    click('Cerrar')
    expect(sent).toEqual([])
  })

  it('closing after answering keeps the answer, sent once', () => {
    render(<Harness />)
    click('No')
    click('Cartel en la propiedad')
    click('Cerrar')
    expect(sent).toEqual([{ listingId: 'L1', viaOqupa: 'no', channel: 'sign', feedback: null }])
  })

  it('closing on the where-question still keeps the No', () => {
    render(<Harness />)
    click('No')
    click('Cerrar')
    expect(sent).toEqual([{ listingId: 'L1', viaOqupa: 'no', channel: null, feedback: null }])
  })

  it('a failed send never shows an error or blocks closing', async () => {
    render(<Harness onSubmit={async () => { throw new Error('offline') }} />)
    click('Sí')
    click('ENVIAR')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ENVIAR' })).toBeNull())
  })

  it('caps the comment at 1000 characters, like the server', () => {
    render(<Harness />)
    click('Sí')
    const box = screen.getByPlaceholderText('Tu opinión nos ayuda a mejorar (opcional)') as HTMLTextAreaElement
    expect(box.maxLength).toBe(1000)
  })
})
