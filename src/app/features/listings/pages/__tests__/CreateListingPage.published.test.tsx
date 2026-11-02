// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Leaving during publishing, or in the 0.9 s "¡PUBLICADO!" moment, leaves a
 * published draft in memory. The next visit to Crear must open a fresh
 * wizard — never jump to the old listing with its share prompt again.
 */

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('../../components/WizardProgress', () => ({ default: () => null }))
vi.mock('../../components/WizardStep1', () => ({ default: () => <div>paso 1</div> }))
vi.mock('../../components/WizardStep2', () => ({ default: () => null }))
vi.mock('../../components/WizardStep3', () => ({ default: () => null }))
vi.mock('../../components/WizardStep4', () => ({ default: () => null }))
vi.mock('../../components/WizardStep5', () => ({ default: () => <div>paso 5</div> }))

import CreateListingPage from '../CreateListingPage'
import { useListingFormStore } from '@/stores/listingFormStore'

describe('CreateListingPage over a draft that was already published', () => {
  beforeEach(() => {
    sessionStorage.clear()
    navigate.mockReset()
    useListingFormStore.getState().reset()
  })

  it('starts a fresh draft with a fresh identity, at step 1, and goes nowhere', async () => {
    const s = useListingFormStore.getState()
    s.updateData({ description: 'Casa publicada hace un momento en Piura' })
    s.setStep(5)
    const oldId = s.publishId
    s.markPublished(`listing_${oldId}`)

    render(<CreateListingPage />)

    expect(await screen.findByText('paso 1')).toBeTruthy()
    const after = useListingFormStore.getState()
    expect(after.publishedListingId).toBeNull()
    expect(after.data.description).toBe('')
    expect(after.publishId).not.toBe(oldId)
    await new Promise((r) => setTimeout(r, 1500))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('an unpublished draft is kept where it was', async () => {
    useListingFormStore.getState().updateData({ description: 'Borrador a medias' })
    useListingFormStore.getState().setStep(5)
    render(<CreateListingPage />)
    expect(await screen.findByText('paso 5')).toBeTruthy()
    expect(useListingFormStore.getState().data.description).toBe('Borrador a medias')
  })
})
