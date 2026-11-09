// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The homepage says only what Oqupa does (Jerson 2026-11-09: "Fix the home
 * page claims"). Nothing reviews listings, nothing proves an agent, owners may
 * hide the exact address, and no measurement shows "miles de personas". What is
 * true: every publisher confirmed their phone by SMS and their email.
 * The full list lives in Oqupa-Platform docs/marketing/PRODUCT-FACTS.md.
 */
const FILES = [
  'src/pages/LandingPage.tsx',
  'src/components/landing/HeroSection.tsx',
  'src/components/landing/TrustStrip.tsx',
  'src/components/landing/SolutionSection.tsx',
  'src/components/landing/ShowcaseSection.tsx',
  'src/components/landing/PricingSection.tsx',
  'src/components/landing/PiuraOnlyBanner.tsx',
]
const homepage = FILES.map((f) => readFileSync(resolve(__dirname, '../../..', f), 'utf8')).join('\n')

describe('Homepage claims', () => {
  it.each([
    'elimina fraudes',
    'agentes verificados',
    'Avisos verificados',
    'proceso de verificación',
    'datos verificados',
    'contacto verificados',
    'ubicación exacta',
    'miles de personas',
    'fotos reales',
  ])('does not claim "%s"', (claim) => {
    expect(homepage).not.toContain(claim)
  })

  it('says what is true about who publishes', () => {
    expect(homepage).toContain('Publicadores confirmados')
    expect(homepage).toContain('Cada persona que publica confirmó su teléfono por SMS y su correo.')
  })

  it('the search-engine description matches the page', () => {
    const description =
      'Oqupa reúne los avisos de Piura en un mapa y te conecta por WhatsApp con dueños que confirmaron su teléfono y correo.'
    expect(homepage.split(description).length - 1).toBe(2) // page meta + JSON-LD
  })

  it('the location promise allows a hidden address', () => {
    expect(homepage).toContain('su ubicación (exacta o aproximada, según el dueño)')
  })
})
