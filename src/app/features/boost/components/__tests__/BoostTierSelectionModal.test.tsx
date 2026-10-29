// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Metrics plan A9: closing the tier modal without confirming reports the tier
 * that was highlighted at the time, so `boost_checkout_abandoned` can carry it.
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
vi.mock('@/hooks/useBoost', () => ({
  useBoostTiers: () => ({
    isLoading: false,
    data: [
      { tier: 'sevenDays', durationDays: 7, feeInSoles: 10, feeInCentimos: 1000, displayName: '7 días' },
      { tier: 'fifteenDays', durationDays: 15, feeInSoles: 18, feeInCentimos: 1800, displayName: '15 días' },
      { tier: 'thirtyDays', durationDays: 30, feeInSoles: 30, feeInCentimos: 3000, displayName: '30 días' },
    ],
  }),
}))

import BoostTierSelectionModal from '../BoostTierSelectionModal'

function setup() {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  render(<BoostTierSelectionModal isOpen onClose={onClose} onConfirm={onConfirm} isProcessing={false} />)
  return { onClose, onConfirm }
}

describe('BoostTierSelectionModal — highlighted tier on close', () => {
  it('reports the default highlighted tier when closed untouched', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledWith('fifteenDays')
  })

  it('reports the tier the user highlighted last', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: /7 días/ }))
    fireEvent.click(screen.getByRole('button', { name: /30 días/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledWith('thirtyDays')
  })

  it('confirming does not close', () => {
    const { onClose, onConfirm } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Pagar/ }))
    expect(onConfirm).toHaveBeenCalledWith('fifteenDays')
    expect(onClose).not.toHaveBeenCalled()
  })
})
