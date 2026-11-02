// @vitest-environment jsdom
// ADR-043 D1 — big SIGUIENTE and ATRÁS buttons on every page of the wizard.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WizardNav from '../WizardNav'

describe('WizardNav (D1)', () => {
  it('shows ATRÁS and SIGUIENTE, both at least 48 px tall', () => {
    render(<WizardNav onBack={() => {}} />)
    const back = screen.getByRole('button', { name: 'Atrás' })
    const next = screen.getByRole('button', { name: 'Siguiente' })
    for (const b of [back, next]) {
      expect(b.className).toMatch(/\bh-14\b/)
      expect(b.className).toMatch(/uppercase/)
      expect(b.className).toMatch(/tracking-\[1px\]/)
    }
  })

  it('SIGUIENTE submits the page; ATRÁS does not', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    const onBack = vi.fn()
    render(
      <form onSubmit={onSubmit}>
        <WizardNav onBack={onBack} />
      </form>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('SIGUIENTE is the one filled button; ATRÁS is the quiet one', () => {
    render(<WizardNav onBack={() => {}} />)
    expect(screen.getByRole('button', { name: 'Siguiente' }).className).toMatch(/\bbg-secondary\b/)
    expect(screen.getByRole('button', { name: 'Atrás' }).className).not.toMatch(/\bbg-secondary\b/)
  })

  it('the last page puts its own action where SIGUIENTE was', () => {
    render(
      <WizardNav onBack={() => {}}>
        <button type="submit">Publicar</button>
      </WizardNav>,
    )
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeTruthy()
  })

  it('ATRÁS can be held while publishing', () => {
    render(<WizardNav onBack={() => {}} backDisabled />)
    expect((screen.getByRole('button', { name: 'Atrás' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
