// Brand colours for charts and SVG attributes, read from the CSS tokens in
// src/index.css (the brand rule: tokens, never hard-coded colours). recharts
// and SVG attributes need a resolved colour, so the token is read at render;
// the fallback is only for tests, where no stylesheet is loaded.

export function token(name: string): string {
  if (typeof document !== 'undefined') {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
    if (v) return v
  }
  return `var(--color-${name})`
}
