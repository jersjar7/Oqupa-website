// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The contact sign-up funnel (metrics plan A10). Pipeline milestones count
 * only when the person is on their way to contact a seller, at most once per
 * errand, and recording them never consumes the errand.
 */

const { contactGateStepMock } = vi.hoisted(() => ({ contactGateStepMock: vi.fn() }))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: { contactGateStep: contactGateStepMock },
}))

import {
  CONTACT_GATE_STEPS,
  contactAuthState,
  pendingContactErrand,
  logContactGateStep,
  logContactMilestone,
} from '../contactFunnel'
import { setReturnUrl, consumeReturnUrl } from '@/lib/utils'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  contactGateStepMock.mockReset()
})

describe('CONTACT_GATE_STEPS', () => {
  it('spells every step exactly as the app does', () => {
    expect(Object.values(CONTACT_GATE_STEPS)).toEqual([
      'gate_shown',
      'gate_create_account',
      'gate_have_account',
      'gate_verify',
      'gate_dismissed',
      'signed_in',
      'phone_code_sent',
      'phone_verified',
      'email_verified',
      'returned',
    ])
  })
})

describe('contactAuthState', () => {
  it('is guest with no account session', () => {
    expect(contactAuthState(null, null)).toBe('guest')
  })

  it('is verified only with both email and phone verified', () => {
    expect(contactAuthState({ emailVerified: true }, { isPhoneVerified: true })).toBe('verified')
  })

  it('is unverified when either is missing', () => {
    expect(contactAuthState({ emailVerified: false }, { isPhoneVerified: true })).toBe('unverified')
    expect(contactAuthState({ emailVerified: true }, { isPhoneVerified: false })).toBe('unverified')
    expect(contactAuthState({ emailVerified: true }, null)).toBe('unverified')
  })
})

describe('pendingContactErrand', () => {
  it('finds a contact errand without consuming it', () => {
    setReturnUrl('/property/abc#contactar')
    expect(pendingContactErrand()).not.toBeNull()
    expect(consumeReturnUrl()).toBe('/property/abc#contactar')
  })

  it('ignores a return address that is not a contact (e.g. Publicar)', () => {
    setReturnUrl('/app/listings/new')
    expect(pendingContactErrand()).toBeNull()
  })

  it('is null when nothing is stored', () => {
    expect(pendingContactErrand()).toBeNull()
  })
})

describe('logContactMilestone', () => {
  it('logs the step while a contact errand is pending', () => {
    setReturnUrl('/property/abc#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.phoneVerified)
    expect(contactGateStepMock).toHaveBeenCalledWith('phone_verified')
  })

  it('logs nothing on the Publicar path or with no errand', () => {
    setReturnUrl('/app/listings/new')
    logContactMilestone(CONTACT_GATE_STEPS.phoneVerified)
    localStorage.clear()
    logContactMilestone(CONTACT_GATE_STEPS.signedIn)
    expect(contactGateStepMock).not.toHaveBeenCalled()
  })

  it('logs each step at most once per errand', () => {
    setReturnUrl('/property/abc#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.phoneCodeSent)
    logContactMilestone(CONTACT_GATE_STEPS.phoneCodeSent)
    expect(contactGateStepMock).toHaveBeenCalledTimes(1)
  })

  it('counts once across tabs: the record lives in localStorage, not this tab', () => {
    setReturnUrl('/property/abc#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.emailVerified)
    sessionStorage.clear() // another tab has its own sessionStorage
    logContactMilestone(CONTACT_GATE_STEPS.emailVerified)
    expect(contactGateStepMock).toHaveBeenCalledTimes(1)
  })

  it('prunes records of errands older than 30 minutes', () => {
    const old = Date.now() - 31 * 60 * 1000
    localStorage.setItem(`oqupa_contactFunnel:${old}:signed_in`, '1')
    setReturnUrl('/property/abc#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.signedIn)
    expect(localStorage.getItem(`oqupa_contactFunnel:${old}:signed_in`)).toBeNull()
    expect(Object.keys(localStorage).filter((k) => k.startsWith('oqupa_contactFunnel:'))).toHaveLength(1)
  })

  it('counts again for a new errand', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    setReturnUrl('/property/abc#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.signedIn)
    vi.spyOn(Date, 'now').mockReturnValue(2_000)
    setReturnUrl('/property/xyz#contactar')
    logContactMilestone(CONTACT_GATE_STEPS.signedIn)
    vi.restoreAllMocks()
    expect(contactGateStepMock).toHaveBeenCalledTimes(2)
  })

  it('uses an errand captured earlier, even if it has since been consumed', () => {
    setReturnUrl('/property/abc#contactar')
    const errand = pendingContactErrand()
    consumeReturnUrl() // the guard sent the person back meanwhile
    logContactMilestone(CONTACT_GATE_STEPS.signedIn, errand)
    expect(contactGateStepMock).toHaveBeenCalledWith('signed_in')
  })

  it('ignores a captured errand once it is older than the return address can live', () => {
    vi.useFakeTimers()
    setReturnUrl('/property/abc#contactar')
    const errand = pendingContactErrand() // captured when the pipeline page opened
    vi.advanceTimersByTime(30 * 60 * 1000 + 1)
    logContactMilestone(CONTACT_GATE_STEPS.emailVerified, errand)
    vi.useRealTimers()
    expect(contactGateStepMock).not.toHaveBeenCalled()
  })

  it('still uses a captured errand within its 30 minutes', () => {
    vi.useFakeTimers()
    setReturnUrl('/property/abc#contactar')
    const errand = pendingContactErrand()
    localStorage.clear() // consumed by another tab meanwhile
    vi.advanceTimersByTime(29 * 60 * 1000)
    logContactMilestone(CONTACT_GATE_STEPS.emailVerified, errand)
    vi.useRealTimers()
    expect(contactGateStepMock).toHaveBeenCalledWith('email_verified')
  })

  it('never throws, even when analytics does', () => {
    contactGateStepMock.mockImplementation(() => {
      throw new Error('analytics down')
    })
    setReturnUrl('/property/abc#contactar')
    expect(() => logContactMilestone(CONTACT_GATE_STEPS.signedIn)).not.toThrow()
  })
})

describe('logContactGateStep', () => {
  it('logs the gate step unconditionally and never throws', () => {
    logContactGateStep(CONTACT_GATE_STEPS.gateShown)
    expect(contactGateStepMock).toHaveBeenCalledWith('gate_shown')
    contactGateStepMock.mockImplementation(() => {
      throw new Error('analytics down')
    })
    expect(() => logContactGateStep(CONTACT_GATE_STEPS.gateDismissed)).not.toThrow()
  })
})
