import { describe, it, expect } from 'vitest'
import { profileSchema, changePasswordSchema } from '../profileSchema'

// ---------------------------------------------------------------------------
// profileSchema
// ---------------------------------------------------------------------------
describe('profileSchema', () => {
  const validProfile = {
    name: 'Ana García',
    preferredContactTimeSlot: 'morning' as const,
  }

  it('accepts a minimal valid profile (no additionalContactNotes)', () => {
    expect(() => profileSchema.parse(validProfile)).not.toThrow()
  })

  it('accepts all valid preferredContactTimeSlot values', () => {
    const slots = ['morning', 'afternoon', 'evening', 'anytime'] as const
    for (const slot of slots) {
      expect(() =>
        profileSchema.parse({ ...validProfile, preferredContactTimeSlot: slot })
      ).not.toThrow()
    }
  })

  it('rejects an invalid preferredContactTimeSlot', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      preferredContactTimeSlot: 'night',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a profile with additionalContactNotes', () => {
    expect(() =>
      profileSchema.parse({
        ...validProfile,
        additionalContactNotes: 'Please call before 6 PM.',
      })
    ).not.toThrow()
  })

  it('rejects name shorter than 2 chars', () => {
    const result = profileSchema.safeParse({ ...validProfile, name: 'A' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true)
    }
  })

  it('accepts name at exactly 2 chars (minimum)', () => {
    expect(() => profileSchema.parse({ ...validProfile, name: 'Jo' })).not.toThrow()
  })

  it('rejects name longer than 100 chars', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      name: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts name at exactly 100 chars (maximum)', () => {
    expect(() =>
      profileSchema.parse({ ...validProfile, name: 'A'.repeat(100) })
    ).not.toThrow()
  })

  it('rejects additionalContactNotes longer than 500 chars', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      additionalContactNotes: 'A'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('accepts additionalContactNotes at exactly 500 chars', () => {
    expect(() =>
      profileSchema.parse({
        ...validProfile,
        additionalContactNotes: 'A'.repeat(500),
      })
    ).not.toThrow()
  })

  it('accepts additionalContactNotes as an empty string', () => {
    expect(() =>
      profileSchema.parse({ ...validProfile, additionalContactNotes: '' })
    ).not.toThrow()
  })

  it('rejects missing name', () => {
    const { name: _n, ...withoutName } = validProfile
    const result = profileSchema.safeParse(withoutName)
    expect(result.success).toBe(false)
  })

  it('rejects missing preferredContactTimeSlot', () => {
    const { preferredContactTimeSlot: _s, ...withoutSlot } = validProfile
    const result = profileSchema.safeParse(withoutSlot)
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// changePasswordSchema
// ---------------------------------------------------------------------------
describe('changePasswordSchema', () => {
  const validChange = {
    newPassword: 'NewPassword1!',
    confirmPassword: 'NewPassword1!',
  }

  it('accepts matching passwords that meet the minimum length', () => {
    expect(() => changePasswordSchema.parse(validChange)).not.toThrow()
  })

  it('rejects newPassword shorter than 6 chars', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'abc',
      confirmPassword: 'abc',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('newPassword'))).toBe(true)
    }
  })

  it('accepts newPassword at exactly 6 chars', () => {
    expect(() =>
      changePasswordSchema.parse({ newPassword: 'abcdef', confirmPassword: 'abcdef' })
    ).not.toThrow()
  })

  it('rejects when newPassword and confirmPassword do not match', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'abcdef',
      confirmPassword: 'abcdefg',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('confirmPassword')
      expect(result.error.issues.some((i) => /coinciden/i.test(i.message))).toBe(true)
    }
  })

  it('rejects empty confirmPassword', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'abcdef',
      confirmPassword: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts identical passwords of exactly 6 chars', () => {
    expect(() =>
      changePasswordSchema.parse({ newPassword: '123456', confirmPassword: '123456' })
    ).not.toThrow()
  })

  it('the mismatch error is on the confirmPassword path', () => {
    const result = changePasswordSchema.safeParse({
      newPassword: 'password1',
      confirmPassword: 'password2',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confirmPassword'))).toBe(true)
    }
  })
})
