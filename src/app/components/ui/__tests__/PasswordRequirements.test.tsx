// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PasswordRequirements from '../PasswordRequirements'

describe('PasswordRequirements — hints in words (ADR-046 #7)', () => {
  it('shows the rules in words, never codes', () => {
    render(<PasswordRequirements password="a" />)
    for (const label of ['8 letras o más', 'una mayúscula', 'una minúscula', 'un número', 'un símbolo']) {
      expect(screen.getByText(label)).toBeDefined()
    }
    for (const code of ['8+', 'A-Z', 'a-z', '1-9', '!@#']) expect(screen.queryByText(code)).toBeNull()
  })

  it('uses Gotham (font-sans), never the serif, and never weight 600', () => {
    render(<PasswordRequirements password="Abcdefg1!" />)
    const label = screen.getByText('una mayúscula')
    expect(label.className).toContain('font-sans')
    expect(label.className).not.toContain('font-serif')
    expect(label.className).not.toContain('font-semibold')
  })
})
