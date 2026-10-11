import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  magicLinkSchema,
  forgotPasswordSchema,
  setPasswordSchema,
  nameSchema,
  phoneSchema,
  verificationCodeSchema,
} from '../authSchema'

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    expect(() =>
      loginSchema.parse({ email: 'user@example.com', password: 'secret' })
    ).not.toThrow()
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------

/** Minimal password satisfying all four regex constraints + minimum length. */
const strongPassword = 'Abcdef1!'

describe('registerSchema', () => {
  const validRegister = {
    email: 'new@example.com',
    password: strongPassword,
    confirmPassword: strongPassword,
  }

  it('accepts valid register data', () => {
    expect(() => registerSchema.parse(validRegister)).not.toThrow()
  })

  it('rejects password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'Ab1!',
      confirmPassword: 'Ab1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without an uppercase letter', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'abcdef1!',
      confirmPassword: 'abcdef1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a lowercase letter', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'ABCDEF1!',
      confirmPassword: 'ABCDEF1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a digit', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'AbcdefGH!',
      confirmPassword: 'AbcdefGH!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a symbol', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'Abcdefg1',
      confirmPassword: 'Abcdefg1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      confirmPassword: strongPassword + 'x',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confirmPassword'))).toBe(true)
    }
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'bad-email' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// magicLinkSchema
// ---------------------------------------------------------------------------
describe('magicLinkSchema', () => {
  it('accepts a valid email', () => {
    expect(() => magicLinkSchema.parse({ email: 'user@example.com' })).not.toThrow()
  })

  it('rejects empty email', () => {
    const result = magicLinkSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = magicLinkSchema.safeParse({ email: 'notanemail' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// forgotPasswordSchema
// ---------------------------------------------------------------------------
describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(() =>
      forgotPasswordSchema.parse({ email: 'user@example.com' })
    ).not.toThrow()
  })

  it('rejects empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// setPasswordSchema
// ---------------------------------------------------------------------------
describe('setPasswordSchema', () => {
  it('accepts valid matching strong passwords', () => {
    expect(() =>
      setPasswordSchema.parse({ password: strongPassword, confirmPassword: strongPassword })
    ).not.toThrow()
  })

  it('rejects mismatched passwords', () => {
    const result = setPasswordSchema.safeParse({
      password: strongPassword,
      confirmPassword: strongPassword + 'x',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('confirmPassword'))).toBe(true)
    }
  })

  it('rejects weak password (no symbol)', () => {
    const result = setPasswordSchema.safeParse({
      password: 'Abcdefg1',
      confirmPassword: 'Abcdefg1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = setPasswordSchema.safeParse({
      password: 'Ab1!',
      confirmPassword: 'Ab1!',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// nameSchema
// ---------------------------------------------------------------------------
describe('nameSchema', () => {
  it('accepts a name of at least 2 chars', () => {
    expect(() => nameSchema.parse({ name: 'Jo' })).not.toThrow()
  })

  it('rejects name shorter than 2 chars', () => {
    const result = nameSchema.safeParse({ name: 'J' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = nameSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts name at exactly 100 chars', () => {
    expect(() => nameSchema.parse({ name: 'A'.repeat(100) })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// phoneSchema
// ---------------------------------------------------------------------------
describe('phoneSchema', () => {
  it('accepts a valid Peruvian number (9 digits, +51)', () => {
    expect(() =>
      phoneSchema.parse({ phoneNumber: '987654321', countryCode: '+51' })
    ).not.toThrow()
  })

  it('accepts a valid US number (10 digits, +1)', () => {
    expect(() =>
      phoneSchema.parse({ phoneNumber: '2025551234', countryCode: '+1' })
    ).not.toThrow()
  })

  it('rejects a Peruvian number with wrong length (8 digits)', () => {
    const result = phoneSchema.safeParse({
      phoneNumber: '98765432',
      countryCode: '+51',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a Peruvian number with wrong length (10 digits)', () => {
    const result = phoneSchema.safeParse({
      phoneNumber: '9876543210',
      countryCode: '+51',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a US number with wrong length (9 digits)', () => {
    const result = phoneSchema.safeParse({
      phoneNumber: '202555123',
      countryCode: '+1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-digit characters in phoneNumber', () => {
    const result = phoneSchema.safeParse({
      phoneNumber: '98765432a',
      countryCode: '+51',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty phoneNumber', () => {
    const result = phoneSchema.safeParse({ phoneNumber: '', countryCode: '+51' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid countryCode', () => {
    const result = phoneSchema.safeParse({
      phoneNumber: '987654321',
      countryCode: '+44',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// verificationCodeSchema
// ---------------------------------------------------------------------------
describe('verificationCodeSchema', () => {
  it('accepts a valid 6-digit code', () => {
    expect(() =>
      verificationCodeSchema.parse({ code: '123456' })
    ).not.toThrow()
  })

  it('rejects a code shorter than 6 digits', () => {
    const result = verificationCodeSchema.safeParse({ code: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects a code longer than 6 digits', () => {
    const result = verificationCodeSchema.safeParse({ code: '1234567' })
    expect(result.success).toBe(false)
  })

  it('rejects a code containing letters', () => {
    const result = verificationCodeSchema.safeParse({ code: '12345a' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty code', () => {
    const result = verificationCodeSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })

  it('accepts the boundary case of all zeros', () => {
    expect(() =>
      verificationCodeSchema.parse({ code: '000000' })
    ).not.toThrow()
  })
})
