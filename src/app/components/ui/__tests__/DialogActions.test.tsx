// @vitest-environment jsdom
//
// The choices at the bottom of every confirmation window. Jerson, 2026-11-02,
// from the app's "Volver a publicar": a label broke onto two lines,
// left-aligned against the divider, and looked misaligned. The website had the
// same fault — "CANCELAR INVITACIÓN" and "ENVIAR INVITACIÓN" broke onto two
// lines inside their pills at 390 and 430 px.
//
// One rule on both platforms (the app's OqupaAlertDialog):
// - two choices sit side by side only when both labels fit on one line;
//   otherwise they stack full width, the action on top, the way out below;
// - side by side, the way out (Cancelar, Volver, Ahora no) is on the left;
// - every choice is at least 48 px tall, its label centred and never wrapped;
// - the action is a brand button (bold, upper case, tracked); the way out is a
//   quiet sentence-case text button.
//
// jsdom has no layout, so this pins the CSS that produces the rule; the
// rendered result is checked at 390/430 px with Playwright (see the PR notes).
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import DialogActions from '../DialogActions'
import Button from '../Button'
import Modal from '../Modal'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false }
})

const classes = (el: Element) => el.className.split(/\s+/)

describe('DialogActions', () => {
  it('wraps instead of squeezing: a choice that does not fit moves to its own line, above the way out', () => {
    render(
      <DialogActions>
        <Button variant="text">Cancelar</Button>
        <Button>Sí, volver a publicar</Button>
      </DialogActions>,
    )
    const row = screen.getByRole('button', { name: 'Cancelar' }).parentElement!
    // flex-wrap-reverse: the first line (the way out) is drawn at the bottom,
    // so a wrapped action sits on top.
    expect(classes(row)).toEqual(expect.arrayContaining(['flex', 'flex-wrap-reverse']))
    // Every choice: grows to share the row, never narrower than its label on
    // one line (so it wraps to a new line instead of breaking the label),
    // at least 48 px tall.
    expect(classes(row)).toEqual(
      expect.arrayContaining(['*:flex-1', '*:min-w-max', '*:min-h-12', '*:whitespace-nowrap']),
    )
  })

  it('keeps the way out first in reading order (left side by side, bottom when stacked)', () => {
    render(
      <DialogActions>
        <Button variant="text">Cancelar</Button>
        <Button>Confirmar</Button>
      </DialogActions>,
    )
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual(['Cancelar', 'Confirmar'])
  })
})

describe('Modal title', () => {
  it('is Roboto Serif Regular — never Gotham, never bold on serif', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Cancelar invitación">
        <p>cuerpo</p>
      </Modal>,
    )
    const title = screen.getByRole('heading', { name: 'Cancelar invitación' })
    expect(classes(title)).toEqual(expect.arrayContaining(['font-serif', 'font-normal']))
    expect(classes(title)).not.toContain('font-medium')
  })

  it('keeps a gutter from the screen edge on a phone', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Eliminar cuenta">
        <p>cuerpo</p>
      </Modal>,
    )
    const dialog = document.querySelector('dialog')!
    expect(dialog.className).toMatch(/w-\[calc\(100%-2rem\)\]/)
  })
})

// The confirmations themselves use the rule — the way out first, the action
// last, inside DialogActions.
import { useSignOutConfirm } from '@/app/components/SignOutConfirm'

function SignOutHarness() {
  const { ask, dialog } = useSignOutConfirm(vi.fn())
  return (
    <MemoryRouter>
      <button onClick={ask}>abrir</button>
      {dialog}
    </MemoryRouter>
  )
}

describe('Cerrar sesión window', () => {
  it('Cancelar (quiet) then SÍ, CERRAR SESIÓN (danger), in DialogActions', () => {
    render(<SignOutHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }))
    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    const action = screen.getByRole('button', { name: 'Sí, cerrar sesión' })
    const row = cancel.parentElement!
    expect(row.hasAttribute('data-dialog-actions')).toBe(true)
    expect([...row.children]).toEqual([cancel, action])
    expect(classes(cancel)).toContain('normal-case')
    expect(classes(action)).toEqual(expect.arrayContaining(['uppercase', 'text-error']))
  })
})
