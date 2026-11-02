// @vitest-environment jsdom
// Third hostile review #1: opening Publicar over an edit (or a published
// draft) must never paint the old page before the fresh start.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const painted = vi.hoisted(() => [] as string[])
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('../../components/WizardProgress', () => ({ default: () => null }))
vi.mock('../../components/WizardStep1', () => ({ default: () => { painted.push('1'); return <div>paso 1</div> } }))
vi.mock('../../components/WizardStep2', () => ({ default: () => { painted.push('2'); return null } }))
vi.mock('../../components/WizardStep3', () => ({ default: () => { painted.push('3'); return null } }))
vi.mock('../../components/WizardStep4', () => ({ default: () => { painted.push('4'); return null } }))
vi.mock('../../components/WizardStep5', () => ({ default: () => { painted.push('5'); return null } }))

import CreateListingPage from '../CreateListingPage'
import { useListingFormStore } from '@/stores/listingFormStore'

describe('CreateListingPage starts fresh without showing the old page', () => {
  beforeEach(() => {
    sessionStorage.clear()
    painted.length = 0
    useListingFormStore.getState().reset()
  })

  it('over an edit at page 4', async () => {
    useListingFormStore.getState().setEditMode('L1', 'P1')
    useListingFormStore.getState().updateData({ calle: 'Calle Secreta' })
    useListingFormStore.getState().setStep(4)
    render(<CreateListingPage />)
    expect(await screen.findByText('paso 1')).toBeTruthy()
    expect(painted).not.toContain('4')
    expect(useListingFormStore.getState().data.calle).toBe('')
  })

  it('over a published draft at page 5', async () => {
    useListingFormStore.getState().setStep(5)
    useListingFormStore.getState().markPublished('listing_x')
    render(<CreateListingPage />)
    expect(await screen.findByText('paso 1')).toBeTruthy()
    expect(painted).not.toContain('5')
  })
})
