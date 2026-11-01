import { describe, it, expect } from 'vitest'
import { normalizedAddressOnEdit, publicLocationOnEdit } from '../editLocation'

/**
 * What an edit writes to the PUBLIC property document for the location.
 *
 * A listing that hides its address keeps only a blurred point there; the true
 * address lives in a private record (ADR-015 Phase 2). The edit form loads the
 * true address so the owner sees their own house. Saving it back unchanged
 * must not put it in the public document — not even for the seconds until the
 * server blurs it again, and without making the server draw a new blurred
 * point on every edit (many draws of the same address average to the house).
 */

const hidden = {
  publicLatitude: -5.17, publicLongitude: -80.65,
  trueLatitude: -5.19, trueLongitude: -80.63, trueCalle: 'Calle Real 9',
}

const base = {
  latitude: -5.19, longitude: -80.63, calle: 'Calle Real 9',
  showExactLocation: false, hiddenAddress: hidden,
}

describe('publicLocationOnEdit', () => {
  it('hidden address, pin not moved: the blurred point stays, no street', () => {
    expect(publicLocationOnEdit(base)).toEqual({ latitude: -5.17, longitude: -80.65, calle: '' })
  })

  it('hidden address, pin moved: the new point is sent, for the server to blur', () => {
    expect(publicLocationOnEdit({ ...base, latitude: -5.2 })).toEqual({ latitude: -5.2, longitude: -80.63, calle: 'Calle Real 9' })
  })

  it('hidden address, street changed: sent, for the server to blur', () => {
    expect(publicLocationOnEdit({ ...base, calle: 'Calle Nueva 1' }).calle).toBe('Calle Nueva 1')
  })

  it('owner chose to show the address: the true address is written', () => {
    expect(publicLocationOnEdit({ ...base, showExactLocation: true })).toEqual({ latitude: -5.19, longitude: -80.63, calle: 'Calle Real 9' })
  })

  it('a listing that never hid its address: what the form holds', () => {
    expect(publicLocationOnEdit({ ...base, showExactLocation: true, hiddenAddress: null })).toEqual({ latitude: -5.19, longitude: -80.63, calle: 'Calle Real 9' })
  })
})

/**
 * The address text stored next to the location (`normalizedAddress`). An edit
 * never rewrote it, so after an address change it kept describing the old
 * place. Same shape the server writes (functions/lib/location-privacy.js):
 * the parts that exist, joined by commas.
 */
describe('normalizedAddressOnEdit', () => {
  const place = { urbanizacion: 'Los Ficus', distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura' }

  it('follows the new address', () => {
    expect(normalizedAddressOnEdit('Av. Grau 123', place)).toBe('Av. Grau 123, Los Ficus, Castilla, Piura, Piura')
  })

  it('skips empty parts instead of leaving ", ,"', () => {
    expect(normalizedAddressOnEdit('Av. Grau 123', { ...place, urbanizacion: '' }))
      .toBe('Av. Grau 123, Castilla, Piura, Piura')
  })

  it('with no street (a hidden address left as is) carries no street', () => {
    expect(normalizedAddressOnEdit('', place)).toBe('Los Ficus, Castilla, Piura, Piura')
  })
})
