// @vitest-environment jsdom
// ADR-043 step 3, bug 3: the browser's back button left the publishing wizard
// entirely. Back now moves one page; from page 1 it leaves.
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import WizardBackButton from '../WizardBackButton'
import { useListingFormStore } from '@/stores/listingFormStore'

let goBack: () => void = () => {}
const seen: string[] = []

function Wizard() {
  const step = useListingFormStore((s) => s.step)
  return (
    <div>
      <WizardBackButton />
      <p data-testid="step">{step}</p>
    </div>
  )
}

function Probe() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    goBack = () => navigate(-1)
  }, [navigate])
  useEffect(() => {
    seen.push(location.key)
  }, [location.key])
  return <p data-testid="path">{location.pathname}</p>
}

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/app', '/app/listings/new']} initialIndex={1}>
      <Probe />
      <Routes>
        <Route path="/app/listings/new" element={<Wizard />} />
        <Route path="*" element={<p>fuera</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const back = async () => act(async () => goBack())
const step = () => screen.queryByTestId('step')?.textContent
const path = () => screen.getByTestId('path').textContent

describe('WizardBackButton', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useListingFormStore.getState().reset()
  })

  it('back from page 3 goes to page 2, then page 1, then leaves', async () => {
    renderWizard()
    await act(async () => useListingFormStore.getState().nextStep())
    await act(async () => useListingFormStore.getState().nextStep())
    expect(step()).toBe('3')

    await back()
    expect(path()).toBe('/app/listings/new')
    expect(step()).toBe('2')

    await back()
    expect(path()).toBe('/app/listings/new')
    expect(step()).toBe('1')

    await back()
    expect(path()).toBe('/app')
  })

  // Found on staging 2026-11-02 (ADR-043 D13): after ¡PUBLICADO! the wizard
  // goes to the new listing and clears the draft. The clearing (step back to
  // 1) rendered before the router's move, and this took it for ATRÁS to page
  // 1 and went back in history — to the wizard, away from the new listing.
  it('the draft being cleared (not ATRÁS) never moves the browser', async () => {
    useListingFormStore.getState().setStep(5)
    renderWizard()
    const before = seen.length
    await act(async () => useListingFormStore.getState().reset())
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(seen.length).toBe(before)
  })

  it('on page 1, back leaves at once', async () => {
    renderWizard()
    await back()
    expect(path()).toBe('/app')
  })

  it('after ATRÁS to page 1, one back leaves', async () => {
    renderWizard()
    await act(async () => useListingFormStore.getState().nextStep())
    await act(async () => useListingFormStore.getState().prevStep())
    expect(step()).toBe('1')
    await back()
    expect(path()).toBe('/app')
  })

  it('a draft restored on page 4: back goes to page 3', async () => {
    useListingFormStore.getState().setStep(4)
    renderWizard()
    await back()
    expect(path()).toBe('/app/listings/new')
    expect(step()).toBe('3')
  })

  it('while publishing, back keeps the person on the page', async () => {
    useListingFormStore.getState().setStep(5)
    renderWizard()
    await act(async () => useListingFormStore.getState().setNavigationLocked(true))
    await back()
    expect(path()).toBe('/app/listings/new')
    expect(step()).toBe('5')
    await act(async () => useListingFormStore.getState().setNavigationLocked(false))
    await back()
    expect(step()).toBe('4')
  })
})

// Hostile review #4: on the edit page, the button must wait until the page
// has loaded ITS listing — never act on a leftover create draft's step.
describe('WizardBackButton on the edit page', () => {
  function renderEdit() {
    return render(
      <MemoryRouter initialEntries={['/app/listings', '/app/listings/L1/edit']} initialIndex={1}>
        <Probe />
        <Routes>
          <Route path="/app/listings/:id/edit" element={<div><WizardBackButton forEdit /><p data-testid="step">{useListingFormStore.getState().step}</p></div>} />
          <Route path="*" element={<p>fuera</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  beforeEach(() => {
    sessionStorage.clear()
    useListingFormStore.getState().reset()
  })

  it('a leftover create draft on page 4: back leaves the edit page at once, draft untouched', async () => {
    useListingFormStore.getState().updateData({ description: 'Borrador de creación' })
    useListingFormStore.getState().setStep(4)
    renderEdit()
    await back()
    expect(path()).toBe('/app/listings')
    expect(useListingFormStore.getState().step).toBe(4)
    expect(useListingFormStore.getState().data.description).toBe('Borrador de creación')
  })

  it('once the listing is loaded, back moves one page', async () => {
    renderEdit()
    await act(async () => {
      useListingFormStore.getState().setEditMode('L1', 'P1')
      useListingFormStore.getState().setStep(1)
    })
    await act(async () => useListingFormStore.getState().nextStep())
    await back()
    expect(path()).toBe('/app/listings/L1/edit')
    expect(useListingFormStore.getState().step).toBe(1)
    await back()
    expect(path()).toBe('/app/listings')
  })

  it('the create page ignores an edit in progress', async () => {
    useListingFormStore.getState().setEditMode('L1', 'P1')
    useListingFormStore.getState().setStep(3)
    renderWizard()
    await back()
    expect(path()).toBe('/app')
  })
})
