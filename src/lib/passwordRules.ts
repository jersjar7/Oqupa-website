// The password rule, written in words (ADR-046 #7). The rule itself is
// unchanged — 8 or more, an uppercase, a lowercase, a number and a symbol —
// and any other character (ñ, accents, spaces) is allowed, as it always was
// here. The app says the same words: lib/utils/validators/password_validator.dart.

export const PASSWORD_SYMBOL = /[!@#$%^&*()_+\-=[\]{};:"\\|,.<>/?`~]/

export interface PasswordRule {
  label: string
  met: (password: string) => boolean
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { label: '8 letras o más', met: (pw) => pw.length >= 8 },
  { label: 'una mayúscula', met: (pw) => /[A-Z]/.test(pw) },
  { label: 'una minúscula', met: (pw) => /[a-z]/.test(pw) },
  { label: 'un número', met: (pw) => /\d/.test(pw) },
  { label: 'un símbolo', met: (pw) => PASSWORD_SYMBOL.test(pw) },
]

export function missingPasswordRules(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.met(password)).map((rule) => rule.label)
}

function joinInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** "Tu contraseña necesita una mayúscula y un símbolo." — or null when it meets the rule. */
export function passwordNeedsSentence(password: string): string | null {
  const missing = missingPasswordRules(password)
  return missing.length ? `Tu contraseña necesita ${joinInSpanish(missing)}.` : null
}
