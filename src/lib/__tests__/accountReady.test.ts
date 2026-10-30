// Saves move into an account only once it is fully set up — email confirmed,
// name, phone verified — the same moment the app moves them (hostile review,
// 2026-10-25: an abandoned sign-up took a visitor's saves with it).
import { describe, it, expect } from 'vitest'
import { isAccountReady } from '../accountReady'

const fb = (emailVerified: boolean) => ({ uid: 'u', emailVerified })
const user = (name: string | null, isPhoneVerified: boolean) => ({ name, isPhoneVerified })

describe('isAccountReady', () => {
  it('a visitor: no', () => expect(isAccountReady(null, null)).toBe(false))
  it('email not confirmed: no', () => expect(isAccountReady(fb(false), user('Ana', true))).toBe(false))
  it('phone not verified: no', () => expect(isAccountReady(fb(true), user('Ana', false))).toBe(false))
  it('no name yet: no', () => expect(isAccountReady(fb(true), user(null, true))).toBe(false))
  it('all three: yes', () => expect(isAccountReady(fb(true), user('Ana', true))).toBe(true))
})
