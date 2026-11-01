import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Hover and quiet fills on cream must stay visible (regression 2026-10-31:
// the darker cream was folded into #FFF9F0 and every hover on cream vanished).
const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')
const token = (name: string) => css.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim()
const resolveToken = (name: string): string => {
  const v = token(name)!
  const ref = v.match(/^var\(--color-([\w-]+)\)$/)
  return ref ? resolveToken(ref[1]!) : v
}

describe('cream tokens', () => {
  it('the page cream is the deck cream', () => {
    expect(resolveToken('background').toUpperCase()).toBe('#FFF9F0')
    expect(resolveToken('cream').toUpperCase()).toBe('#FFF9F0')
  })

  it('the hover/fill cream differs from the background, and is darker', () => {
    const bg = resolveToken('background')
    const hover = resolveToken('background-secondary')
    expect(hover).toBe(resolveToken('cream-strong'))
    expect(hover.toUpperCase()).not.toBe(bg.toUpperCase())
    const sum = (hex: string) => [1, 3, 5].reduce((s, i) => s + parseInt(hex.slice(i, i + 2), 16), 0)
    expect(sum(hover)).toBeLessThan(sum(bg) - 10)
  })
})
