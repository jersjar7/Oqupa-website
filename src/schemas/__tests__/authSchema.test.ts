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

// ---------------------------------------------------------------------------
// Feature audit 2026-11-02 (ADR-046 #10, #11; audit top item 4)
// ---------------------------------------------------------------------------
describe('phoneSchema — typed the way people type a number (audit top item 4)', () => {
  const parsed = (phoneNumber: string, countryCode: '+51' | '+1' = '+51') =>
    phoneSchema.safeParse({ phoneNumber, countryCode })

  it.each([
    ['912 345 678', '912345678'],
    ['+51 912345678', '912345678'],
    ['+51 912 345 678', '912345678'],
    ['51912345678', '912345678'],
    ['912-345-678', '912345678'],
    [' 912345678 ', '912345678'],
  ])('accepts %j and keeps only the 9 digits', (typed, digits) => {
    const result = parsed(typed)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phoneNumber).toBe(digits)
  })

  it('accepts a US number typed with its punctuation', () => {
    const result = parsed('(202) 555-1234', '+1')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phoneNumber).toBe('2025551234')
  })

  it('accepts a US number pasted with +1', () => {
    const result = parsed('+1 202 555 1234', '+1')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phoneNumber).toBe('2025551234')
  })

  it('still refuses letters', () => {
    expect(parsed('91234567a').success).toBe(false)
  })
})

describe('phoneSchema — a Peru number must be a mobile (ADR-046 #11)', () => {
  const MOBILE_ONLY = 'Ingresa tu celular: 9 dígitos que empiezan con 9.'

  it('refuses 9 digits that do not start with 9 (a landline), with the sentence', () => {
    const result = phoneSchema.safeParse({ phoneNumber: '731234567', countryCode: '+51' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]!.message).toBe(MOBILE_ONLY)
  })

  it('says the same for the wrong number of digits', () => {
    const result = phoneSchema.safeParse({ phoneNumber: '98765432', countryCode: '+51' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]!.message).toBe(MOBILE_ONLY)
  })

  it('leaves other countries as they were (a US number may start with any digit 2-9)', () => {
    expect(phoneSchema.safeParse({ phoneNumber: '3125551234', countryCode: '+1' }).success).toBe(true)
  })
})

describe('nameSchema — one name rule on both apps (ADR-046 #10)', () => {
  it.each(['María-José', "O'Neill", 'José Ñáñez', 'Ana M. Torres', 'Jo'])('accepts %j', (name) => {
    expect(nameSchema.safeParse({ name }).success).toBe(true)
  })

  it('refuses digits, saying so', () => {
    const result = nameSchema.safeParse({ name: 'Juan 2' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]!.message).toBe('Tu nombre no puede llevar números.')
  })

  it.each(['Juan@', 'Ana_Torres', '😀😀'])('refuses other symbols in %j', (name) => {
    const result = nameSchema.safeParse({ name })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe("Usa solo letras, espacios, apóstrofo ('), guion (-) y punto (.).")
    }
  })

  it('refuses punctuation with no letters', () => {
    expect(nameSchema.safeParse({ name: '--' }).success).toBe(false)
  })

  it('measures the name without the spaces around it', () => {
    expect(nameSchema.safeParse({ name: ' J ' }).success).toBe(false)
  })
})

describe('registerSchema — passwords in Spanish (ADR-046 #7, #9)', () => {
  it('accepts ñ, accents and spaces, as before', () => {
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'Contraseña 1!' }).success).toBe(true)
  })

  it('has no confirm-password field any more', () => {
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'Abcdef1!' }).success).toBe(true)
  })
})

describe('registerSchema — accented capitals count (decision 2026-11-02)', () => {
  it('accepts "Ñandú123!"', () => {
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'Ñandú123!' }).success).toBe(true)
  })
})
