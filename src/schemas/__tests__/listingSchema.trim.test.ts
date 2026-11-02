// The description's 20-letter minimum counts the text without spaces at its
// ends, as the app does (it trims) — otherwise the website's hint could go
// away while the app would still refuse the same description.
import { describe, it, expect } from 'vitest'
import { descriptionHint, step2Schema, fullListingSchema } from '../listingSchema'

const PADDED = `   ${'a'.repeat(17)}   ` // 23 characters, 17 letters

describe('description minimum counts trimmed text', () => {
  it('the hint ignores spaces at the ends', () => {
    expect(descriptionHint(PADDED)).toBe('Escribe un poco más (faltan 3 letras)')
    expect(descriptionHint(`  ${'a'.repeat(20)}  `)).toBeNull()
    expect(descriptionHint('                         ')).toBe('Escribe un poco más (faltan 20 letras)')
  })

  it('Detalles refuses 17 letters padded with spaces', () => {
    const r = step2Schema.safeParse({
      propertyType: 'terreno', description: PADDED, totalAreaInSquareMeters: 100,
      availableParkingSpaces: 0, propertyAmenities: [],
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.find((i) => i.path[0] === 'description')?.message).toBe('Escribe un poco más.')
  })

  it('the check before publishing refuses it too', () => {
    const r = fullListingSchema.safeParse({ description: PADDED })
    expect(r.error?.issues.find((i) => i.path[0] === 'description')?.message).toBe('La descripción es muy corta (Paso 2)')
  })
})
