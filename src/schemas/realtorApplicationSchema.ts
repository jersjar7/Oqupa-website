import { z } from 'zod'
import { PIURA_DISTRICTS } from '@/lib/map/piuraDistricts'

// One application form with the app (ADR-046 #19). Experience is one of the
// app's ranges, stored as the app stores it (a representative number of
// years); districts are picked from the official list, never typed — a typo
// in the old comma-typed zones meant no matching opportunities.

export const EXPERIENCE_RANGES = [
  { label: 'Menos de 1 año', years: 0 },
  { label: '1 – 3 años', years: 2 },
  { label: '3 – 5 años', years: 4 },
  { label: '5 – 10 años', years: 7 },
  { label: 'Más de 10 años', years: 12 },
] as const

const RANGE_YEARS: readonly number[] = EXPERIENCE_RANGES.map((r) => r.years)
const OFFICIAL_NAMES = new Set(PIURA_DISTRICTS.map((d) => d.distrito))
const EXPERIENCE_MESSAGE = 'Elige cuántos años llevas como agente.'

export const realtorApplicationSchema = z.object({
  yearsExperience: z
    .number({ message: EXPERIENCE_MESSAGE })
    .refine((n) => RANGE_YEARS.includes(n), EXPERIENCE_MESSAGE),
  serviceZones: z
    .array(z.string().refine((name) => OFFICIAL_NAMES.has(name), 'Elige los distritos de la lista.'))
    .min(1, 'Elige al menos un distrito.'),
  motivation: z
    .string()
    .min(20, 'Por favor, proporciona más detalles (mínimo 20 caracteres)')
    .max(500, 'La motivación es demasiado larga (máximo 500 caracteres)'),
})

export type RealtorApplicationFormData = z.infer<typeof realtorApplicationSchema>
