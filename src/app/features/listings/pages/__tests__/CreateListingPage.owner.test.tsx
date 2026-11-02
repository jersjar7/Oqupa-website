// @vitest-environment jsdom
// Hostile review #1: opening the wizard drops a draft another account left.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('../../components/WizardProgress', () => ({ default: () => null }))
vi.mock('../../components/WizardStep1', () => ({ default: () => <div>paso 1</div> }))
vi.mock('../../components/WizardStep2', () => ({ default: () => null }))
vi.mock('../../components/WizardStep3', () => ({ default: () => <div>paso 3</div> }))
vi.mock('../../components/WizardStep4', () => ({ default: () => null }))
vi.mock('../../components/WizardStep5', () => ({ default: () => null }))

import CreateListingPage from '../CreateListingPage'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'

describe('CreateListingPage — whose draft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useListingFormStore.getState().reset()
    useListingFormStore.getState().adoptDraftFor('ana')
    useListingFormStore.getState().updateData({ description: 'Casa de Ana en Castilla' })
    useListingFormStore.getState().setStep(3)
  })

  it('another account opens the wizard: a clean draft at page 1, fresh ids', async () => {
    const id = useListingFormStore.getState().publishId
    useAuthStore.setState({ firebaseUser: { uid: 'beto' } as never })
    render(<CreateListingPage />)
    expect(await screen.findByText('paso 1')).toBeTruthy()
    expect(useListingFormStore.getState().data.description).toBe('')
    expect(useListingFormStore.getState().publishId).not.toBe(id)
    expect(useListingFormStore.getState().draftOwnerId).toBe('beto')
  })

  it('the same account: the draft is kept', async () => {
    useAuthStore.setState({ firebaseUser: { uid: 'ana' } as never })
    render(<CreateListingPage />)
    expect(await screen.findByText('paso 3')).toBeTruthy()
    expect(useListingFormStore.getState().data.description).toBe('Casa de Ana en Castilla')
  })
})
