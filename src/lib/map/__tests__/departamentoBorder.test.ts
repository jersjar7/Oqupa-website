// The location picker only accepts pins inside the departamento de Piura — the
// same outer border the map draws (public/boundaries/departamento_piura.geojson).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DepartamentoBorder } from '../departamentoBorder'

const border = DepartamentoBorder.fromGeoJson(
  JSON.parse(readFileSync(resolve(__dirname, '../../../../public/boundaries/departamento_piura.geojson'), 'utf8')),
)

describe('DepartamentoBorder', () => {
  it('Piura city is inside', () => expect(border.contains(-5.1945, -80.6328)).toBe(true))
  it('Sullana is inside', () => expect(border.contains(-4.9017, -80.6768)).toBe(true))
  it('Lima is outside', () => expect(border.contains(-12.0464, -77.0428)).toBe(false))
  it('the open sea is outside', () => expect(border.contains(-5.2, -82.0)).toBe(false))
})
