// The app's words for turning agent help off (realtor_help_disable_warning.dart).
import { describe, it, expect } from 'vitest'
import { realtorHelpDisableWarning as w } from '../realtorHelpWarning'

describe('realtorHelpDisableWarning — same words as the app', () => {
  it('nobody affected: nothing', () => {
    expect(w({ assignmentStatus: null, claimsCount: 0 })).toBeNull()
  })
  it('an invitation not yet accepted', () => {
    expect(w({ assignmentStatus: 'pending_acceptance', claimsCount: 1 })).toBe(
      'Invitaste a un agente que aún no confirma. Si guardas este cambio, se cancelará la invitación y se le avisará.')
  })
  it('an assigned agent, alone or with others', () => {
    expect(w({ assignmentStatus: 'accepted', claimsCount: 1 })).toBe(
      'Un agente ya representa esta propiedad. Si guardas este cambio, se cancelará la asignación y se le avisará.')
    expect(w({ assignmentStatus: 'accepted', claimsCount: 2 })).toBe(
      'Un agente ya representa esta propiedad y otro agente está interesado en trabajar contigo. Si guardas este cambio, se cancelará la asignación y se les avisará.')
    expect(w({ assignmentStatus: 'accepted', claimsCount: 4 })).toBe(
      'Un agente ya representa esta propiedad y otros 3 agentes están interesados en trabajar contigo. Si guardas este cambio, se cancelará la asignación y se les avisará.')
  })
  it('agents interested, none assigned', () => {
    expect(w({ assignmentStatus: null, claimsCount: 1 })).toBe(
      '1 agente está interesado en trabajar contigo. Si guardas este cambio, dejará de ver tu anuncio y se le avisará.')
    expect(w({ assignmentStatus: undefined, claimsCount: 3 })).toBe(
      '3 agentes están interesados en trabajar contigo. Si guardas este cambio, dejarán de ver tu anuncio y se les avisará.')
  })
})
