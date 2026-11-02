// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * One boost only — 30 days at S/ 29.90 (ADR-042, ADR-043 D16/D17).
 * The modal is a single confirmation, not a choice: no tier cards, no
 * "MÁS POPULAR" / "MEJOR VALOR" badges.
 *
 * Metrics plan A9: closing the modal without confirming still reports the tier
 * on offer, so `boost_checkout_abandoned` can carry it.
 */

// jsdom has no <dialog>.showModal; the shell exposes its close button.
vi.mock('@/app/components/ui', () => ({
  Modal: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) =>
    isOpen ? (
      <div>
        <button onClick={onClose}>Cerrar</button>
        {children}
      </div>
    ) : null,
  Spinner: () => null,
}))

const tiersState: { isLoading: boolean; data: unknown } = { isLoading: false, data: undefined }
vi.mock('@/hooks/useBoost', () => ({
  useBoostTiers: () => tiersState,
}))

import BoostTierSelectionModal from '../BoostTierSelectionModal'

const THIRTY = { tier: 'thirtyDays', durationDays: 30, feeInSoles: 29.9, feeInCentimos: 2990, displayName: '30 días' }

function setup(notice?: string) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  render(<BoostTierSelectionModal isOpen onClose={onClose} onConfirm={onConfirm} isProcessing={false} notice={notice} />)
  return { onClose, onConfirm }
}

beforeEach(() => {
  tiersState.isLoading = false
  tiersState.data = [THIRTY]
})

describe('BoostTierSelectionModal — one boost, a single confirmation', () => {
  it('shows the one boost as "30 días · S/ 29.90"', () => {
    setup()
    expect(screen.getByText('30 días · S/ 29.90')).toBeTruthy()
  })

  it('offers no choice: no tier cards and no 7- or 15-day options', () => {
    setup()
    expect(screen.queryByText(/7 días|15 días/)).toBeNull()
    // Only the close button and the confirm button are buttons.
    expect(screen.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
      'Cerrar',
      expect.stringMatching(/Confirmar y pagar/i),
    ])
  })

  it('shows no "MÁS POPULAR" or "MEJOR VALOR" badge', () => {
    setup()
    expect(screen.queryByText(/MÁS POPULAR|MEJOR VALOR/i)).toBeNull()
  })

  it('heading is the brand serif, regular weight', () => {
    setup()
    const heading = screen.getByRole('heading', { name: 'Destaca tu publicación' })
    expect(heading.className).toContain('font-serif')
    expect(heading.className).toContain('font-normal')
    expect(heading.className).not.toMatch(/font-sans|font-medium|font-bold/)
  })

  it('the confirm button reads CONFIRMAR Y PAGAR — Gotham Bold, uppercase, tracked 1px (ADR-038)', () => {
    setup()
    const button = screen.getByRole('button', { name: /CONFIRMAR Y PAGAR/ })
    expect(button.textContent?.trim()).toBe('CONFIRMAR Y PAGAR')
    for (const cls of ['font-sans', 'font-bold', 'uppercase', 'tracking-[1px]']) {
      expect(button.className).toContain(cls)
    }
  })

  it('shows a notice above the offer when there is one, and none otherwise', () => {
    setup('Ahora el destacado es de 30 días por S/ 29.90. Elige 30 días para continuar.')
    expect(screen.getByRole('alert').textContent)
      .toBe('Ahora el destacado es de 30 días por S/ 29.90. Elige 30 días para continuar.')
  })

  it('shows no notice by default', () => {
    setup()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('confirming buys 30 days and does not close', () => {
    const { onClose, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y pagar/i }))
    expect(onConfirm).toHaveBeenCalledWith('thirtyDays')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closing untouched reports the 30-day tier as abandoned', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledWith('thirtyDays')
  })

  it('still offers 30 days at S/ 29.90 when the pricing could not be read', () => {
    tiersState.data = undefined
    const { onConfirm } = setup()
    expect(screen.getByText('30 días · S/ 29.90')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y pagar/i }))
    expect(onConfirm).toHaveBeenCalledWith('thirtyDays')
  })

  it('cannot confirm while the price is loading', () => {
    tiersState.isLoading = true
    tiersState.data = undefined
    setup()
    expect((screen.getByRole('button', { name: /Confirmar y pagar/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})
