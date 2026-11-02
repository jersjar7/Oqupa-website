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
