// Metrics plan A12c: at session start the website reads the person's own
// analyticsLabels/{uid} doc (written nightly by the server) and copies it into
// Google Analytics as user properties. The website goes live before the rule
// that lets it read the doc, and users never see these labels, so every
// failure must be silent.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { setUserPropertiesMock, clearUserPropertiesMock } = vi.hoisted(() => ({
  setUserPropertiesMock: vi.fn(),
  clearUserPropertiesMock: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({ db: { __db: true } }))
vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    setUserProperties: (...args: unknown[]) => setUserPropertiesMock(...args),
    clearUserProperties: () => clearUserPropertiesMock(),
  },
}))

import { applyAnalyticsLabels, clearAnalyticsLabels } from '../analyticsLabelsService'

describe('applyAnalyticsLabels', () => {
  beforeEach(() => {
    setUserPropertiesMock.mockReset()
    clearUserPropertiesMock.mockReset()
  })

  it('clears before setting, so nothing from yesterday or someone else lingers', async () => {
    const order: string[] = []
    clearUserPropertiesMock.mockImplementation(() => order.push('clear'))
    setUserPropertiesMock.mockImplementation(() => order.push('set'))
    await applyAnalyticsLabels('u1', { read: async () => ({ userSegment: 'buyer', homeDistrict: null, isRealtor: false }) })
    expect(order).toEqual(['clear', 'set'])
  })

  it('copies all three labels into Analytics user properties', async () => {
    await applyAnalyticsLabels('u1', {
      read: async () => ({ userSegment: 'landlord,buyer', homeDistrict: 'Castilla', isRealtor: false }),
    })
    expect(setUserPropertiesMock).toHaveBeenCalledExactlyOnceWith({
      userSegment: 'landlord,buyer',
      homeDistrict: 'Castilla',
      isRealtor: false,
    })
  })

  it('reads the doc of the signed-in person and nobody else', async () => {
    const read = vi.fn(async (_uid: string) => null)
    await applyAnalyticsLabels('u1', { read })
    expect(read).toHaveBeenCalledExactlyOnceWith('u1')
  })

  it('passes a missing district as null, which the logger leaves out', async () => {
    await applyAnalyticsLabels('u1', { read: async () => ({ userSegment: 'realtor', homeDistrict: null, isRealtor: true }) })
    expect(setUserPropertiesMock).toHaveBeenCalledExactlyOnceWith({
      userSegment: 'realtor',
      homeDistrict: null,
      isRealtor: true,
    })
  })

  it('clears the labels when there is no doc (new account, or no group any more)', async () => {
    await applyAnalyticsLabels('u1', { read: async () => null })
    expect(clearUserPropertiesMock).toHaveBeenCalledOnce()
    expect(setUserPropertiesMock).not.toHaveBeenCalled()
  })

  it('swallows a refused read — the rule is not deployed yet when this goes live', async () => {
    const refused = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })
    await expect(applyAnalyticsLabels('u1', { read: async () => { throw refused } })).resolves.toBeUndefined()
    expect(setUserPropertiesMock).not.toHaveBeenCalled()
    expect(clearUserPropertiesMock).not.toHaveBeenCalled()
  })

  it('ignores fields of the wrong type rather than sending them', async () => {
    await applyAnalyticsLabels('u1', { read: async () => ({ userSegment: 42, homeDistrict: ['Piura'], isRealtor: 'yes' }) })
    expect(setUserPropertiesMock).toHaveBeenCalledExactlyOnceWith({
      userSegment: null,
      homeDistrict: null,
      isRealtor: null,
    })
  })

  it('sets nothing if the person changed while the read was in flight', async () => {
    await applyAnalyticsLabels('u1', {
      read: async () => ({ userSegment: 'landlord', homeDistrict: null, isRealtor: false }),
      isStillSignedIn: () => false,
    })
    expect(setUserPropertiesMock).not.toHaveBeenCalled()
    expect(clearUserPropertiesMock).not.toHaveBeenCalled()
  })
})

describe('clearAnalyticsLabels', () => {
  it('removes the labels (sign-out) and never throws', () => {
    clearUserPropertiesMock.mockReset()
    clearUserPropertiesMock.mockImplementationOnce(() => { throw new Error('no analytics') })
    expect(() => clearAnalyticsLabels()).not.toThrow()
    expect(clearUserPropertiesMock).toHaveBeenCalledOnce()
  })
})
