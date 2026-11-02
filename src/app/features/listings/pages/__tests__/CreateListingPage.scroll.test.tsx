// @vitest-environment jsdom
// Hostile review 2026-11-02: each new wizard page starts at its top.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'

vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('../../components/WizardProgress', () => ({ default: () => null }))
vi.mock('../../components/WizardStep1', () => ({ default: () => <div>paso 1</div> }))
vi.mock('../../components/WizardStep2', () => ({ default: () => <div>paso 2</div> }))
vi.mock('../../components/WizardStep3', () => ({ default: () => <div>paso 3</div> }))
vi.mock('../../components/WizardStep4', () => ({ default: () => <div>paso 4</div> }))
vi.mock('../../components/WizardStep5', () => ({ default: () => <div>paso 5</div> }))

import CreateListingPage from '../CreateListingPage'
import { useListingFormStore } from '@/stores/listingFormStore'

describe('CreateListingPage — a new page starts at the top', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useListingFormStore.getState().reset()
  })

  it('SIGUIENTE and ATRÁS scroll the dashboard back to the top', async () => {
    const scrolled = vi.fn()
    HTMLElement.prototype.scrollTo = scrolled as unknown as typeof HTMLElement.prototype.scrollTo
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    render(<main><CreateListingPage /></main>)
    expect(scrolled).not.toHaveBeenCalled()
    await act(async () => useListingFormStore.getState().nextStep())
    expect(scrolled).toHaveBeenCalledWith({ top: 0 })
    await act(async () => useListingFormStore.getState().prevStep())
    expect(scrolled).toHaveBeenCalledTimes(2)
  })
})
