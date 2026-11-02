// @vitest-environment jsdom
// The claim confirmation says what the app's says (audit 2026-11-02, section
// G): what the agent receives, what it costs, who decides, and that Oqupa only
// puts them in touch.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClaimConsequences from '../ClaimConsequences'

describe('ClaimConsequences', () => {
  it('lists the app bullets with the counts', () => {
    render(<ClaimConsequences limit={5} remaining={3} />)
    expect(screen.getByText('Al reclamar:')).toBeTruthy()
    expect(screen.getByText('Recibirás el nombre y WhatsApp del dueño')).toBeTruthy()
    expect(screen.getByText('Usarás 1 de tus 5 oportunidades mensuales (te quedarán 2)')).toBeTruthy()
    expect(screen.getByText('El dueño verá tu perfil y decidirá si trabaja contigo')).toBeTruthy()
    expect(
      screen.getByText('Oqupa solo los pone en contacto. El trato y sus resultados son entre ustedes; Oqupa no es responsable.'),
    ).toBeTruthy()
  })
  it('never promises a negative count', () => {
    render(<ClaimConsequences limit={5} remaining={0} />)
    expect(screen.getByText('Usarás 1 de tus 5 oportunidades mensuales (te quedarán 0)')).toBeTruthy()
  })
})
