// @vitest-environment jsdom
// Sign out asks first, with the app's words, and is called "Cerrar sesión"
// everywhere (audit 2026-11-02, F.2).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/components/ui/Modal', () => ({
  default: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))

import { useSignOutConfirm } from '../SignOutConfirm'

function Harness({ onConfirm }: { onConfirm: () => Promise<void> | void }) {
  const { ask, dialog } = useSignOutConfirm(onConfirm)
  return (
    <>
      <button onClick={ask}>Salir de aquí</button>
      {dialog}
    </>
  )
}

describe('useSignOutConfirm', () => {
  it('asks before signing out', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salir de aquí' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('¿Estás seguro que deseas cerrar sesión?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar sesión' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })
  it('Cancelar keeps the session', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salir de aquí' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
