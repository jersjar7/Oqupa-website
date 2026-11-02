import { z } from 'zod'
import { PropertyType } from '@/types/enums'
import { propertyTypeHasRooms } from '@/types/enums'

// Every message here is shown to the person filling in the wizard, so every
// one is Spanish — including the ones zod would otherwise write in English
// for a wrong type ("Invalid input: expected number, received NaN").
// The limits and their words are the app's (ADR-043 step 3).

export const MAX_COUNT = 50
export const MAX_AREA_M2 = 1_000_000
export const MAX_PRICE = 999_999_999

export const LIMIT_MESSAGES = {
  count: 'Máximo 50.',
  area: 'El área máxima es 1,000,000 m².',
  price: 'Revisa el precio: es demasiado alto.',
  wholeNumber: 'Escribe un número entero, sin decimales.',
  onlyNumbers: 'Escribe solo números.',
} as const

const LOCATION_MESSAGE = 'Selecciona una ubicación en el mapa'

/** A box for dormitorios, baños or estacionamientos: 0 to 50, whole numbers. */
const countSchema = (emptyMessage: string) =>
  z
    .number({ error: (iss) => (iss.input == null ? emptyMessage : LIMIT_MESSAGES.onlyNumbers) })
    .int(LIMIT_MESSAGES.wholeNumber)
    .min(0, 'No puede ser negativo.')
    .max(MAX_COUNT, LIMIT_MESSAGES.count)

const areaSchema = (emptyMessage: string, notPositive: string) =>
  z
    .number({ error: (iss) => (iss.input == null ? emptyMessage : LIMIT_MESSAGES.onlyNumbers) })
    .positive(notPositive)
    .max(MAX_AREA_M2, LIMIT_MESSAGES.area)

const priceSchema = (invalid: string, notPositive: string) =>
  z
    .number({ error: invalid })
    .positive(notPositive)
    .max(MAX_PRICE, LIMIT_MESSAGES.price)

const latitudeSchema = (message: string) =>
  z.number({ error: message }).min(-90, message).max(90, message)
const longitudeSchema = (message: string) =>
  z.number({ error: message }).min(-180, message).max(180, message)

// Step 1: Basics
export const step1Schema = z.object({
  propertyType: z.enum(
    ['casa', 'departamento', 'terreno', 'oficina', 'local', 'hospedaje', 'habitacion'],
    { message: 'Selecciona el tipo de propiedad' },
  ),
  operationType: z.enum(['venta', 'alquiler'], {
    message: 'Selecciona el tipo de operación',
  }),
  rentalDurationType: z
    .enum(['longTerm', 'shortTerm', ''], { message: 'Selecciona la duración del alquiler' })
    .optional(),
  role: z.enum(['owner', 'realtor', 'relative'], {
    message: 'Selecciona tu relación con la propiedad',
  }),
}).superRefine((data, ctx) => {
  if (data.operationType === 'alquiler' && !data.rentalDurationType) {
    ctx.addIssue({
      code: 'custom',
      path: ['rentalDurationType'],
      message: 'Selecciona la duración del alquiler',
    })
  }
})
export type Step1Data = z.infer<typeof step1Schema>

/**
 * Casa, departamento and alojamiento need at least one bedroom and one
 * bathroom — the app's sentences, with the type as this website names it
 * ("Alojamiento" for hospedaje). 0 dormitorios (Monoambiente) arrives on
 * both platforms together in ADR-043 step 4.
 */
export const AT_LEAST_ONE: Record<string, { bedroom: string; bathroom: string }> = {
  casa: { bedroom: 'Una casa necesita al menos 1 dormitorio.', bathroom: 'Una casa necesita al menos 1 baño.' },
  departamento: { bedroom: 'Un departamento necesita al menos 1 dormitorio.', bathroom: 'Un departamento necesita al menos 1 baño.' },
  hospedaje: { bedroom: 'Un alojamiento necesita al menos 1 dormitorio.', bathroom: 'Un alojamiento necesita al menos 1 baño.' },
}

// Step 2: Details — conditional bedrooms/bathrooms
export const step2Schema = z
  .object({
    propertyType: z.string({ error: 'Selecciona el tipo de propiedad' }), // passed through for conditional validation
    description: z
      .string({ error: 'Escribe una descripción' })
      .min(20, 'La descripción debe tener al menos 20 caracteres')
      .max(2000, 'La descripción no puede exceder 2000 caracteres'),
    totalAreaInSquareMeters: areaSchema('Ingresa el área.', 'El área debe ser mayor a 0'),
    // 0 is refused for casa / departamento / alojamiento below, with the reason.
    bedroomCount: countSchema('Ingresa cantidad de dormitorios').optional().nullable(),
    bathroomCount: countSchema('Ingresa cantidad de baños').optional().nullable(),
    // Optional: an empty box means no parking.
    availableParkingSpaces: countSchema('Ingresa cantidad de estacionamientos').optional().nullable(),
    propertyAmenities: z
      .array(
        z.string({ error: 'Escribe la característica' }).max(50, 'Máximo 50 caracteres'),
        { error: 'Revisa las características' },
      )
      .max(30, 'Máximo 30 características'),
    hasPrivateBathroom: z.boolean({ error: 'Elige si el baño es privado' }).optional(),
  })
  .superRefine((data, ctx) => {
    const hasRooms = propertyTypeHasRooms(data.propertyType as PropertyType)

    if (hasRooms) {
      const needs = AT_LEAST_ONE[data.propertyType]
      if (data.bedroomCount == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['bedroomCount'],
          message: 'Ingresa cantidad de dormitorios',
        })
      } else if (data.bedroomCount === 0 && needs) {
        ctx.addIssue({ code: 'custom', path: ['bedroomCount'], message: needs.bedroom })
      }
      if (data.bathroomCount == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['bathroomCount'],
          message: 'Ingresa cantidad de baños',
        })
      } else if (data.bathroomCount === 0 && needs) {
        ctx.addIssue({ code: 'custom', path: ['bathroomCount'], message: needs.bathroom })
      }
    }
  })
export type Step2Data = z.infer<typeof step2Schema>

// Step 3: Location + Photos
export const step3Schema = z.object({
  latitude: latitudeSchema(LOCATION_MESSAGE),
  longitude: longitudeSchema(LOCATION_MESSAGE),
  calle: z.string({ error: 'Ingresa la calle y número' }).min(1, 'Ingresa la calle y número'),
  urbanizacion: z.string({ error: 'Revisa la urbanización' }),
  distrito: z.string({ error: 'Ingresa el distrito' }).min(1, 'Ingresa el distrito'),
  provincia: z.string({ error: 'Ingresa la provincia' }).min(1, 'Ingresa la provincia'),
  departamento: z.string({ error: 'Ingresa el departamento' }).min(1, 'Ingresa el departamento'),
})
export type Step3Data = z.infer<typeof step3Schema>

// Step 4: Price
export const step4Schema = z
  .object({
    operationType: z.string({ error: 'Selecciona el tipo de operación' }), // passed through for price validation
    rentalDurationType: z.string({ error: 'Selecciona la duración del alquiler' }).optional(), // passed through for price validation
    propertyType: z.string({ error: 'Selecciona el tipo de propiedad' }).optional(), // passed through for price validation
    amount: priceSchema('Ingresa un precio válido', 'El precio debe ser mayor a 0'),
    currency: z.enum(['PEN', 'USD'], { error: 'Elige la moneda' }),
    wantsRealtorHelp: z.boolean({ error: 'Elige si quieres ayuda de agentes' }),
    maxRealtors: z
      .number({ error: 'Selecciona un número válido de agentes' })
      .int('Selecciona un número válido de agentes')
      .min(1, 'Selecciona un número válido de agentes')
      .max(5, 'Selecciona un número válido de agentes'),
  })
export type Step4Data = z.infer<typeof step4Schema>

// Pre-submission validation for all steps (used in Step 4 before publish)
export const fullListingSchema = z.object({
  // Step 1
  propertyType: z.string({ error: 'Tipo de propiedad no seleccionado (Paso 1)' }).min(1, 'Tipo de propiedad no seleccionado (Paso 1)'),
  operationType: z.string({ error: 'Tipo de operación no seleccionado (Paso 1)' }).min(1, 'Tipo de operación no seleccionado (Paso 1)'),
  rentalDurationType: z.string({ error: 'Duración del alquiler no seleccionada (Paso 1)' }).optional(),
  role: z.string({ error: 'Relación con la propiedad no seleccionada (Paso 1)' }).min(1, 'Relación con la propiedad no seleccionada (Paso 1)'),
  // Step 2
  description: z.string({ error: 'La descripción es muy corta (Paso 2)' }).min(20, 'La descripción es muy corta (Paso 2)'),
  totalAreaInSquareMeters: areaSchema('Área total no ingresada (Paso 2)', 'Área total no ingresada (Paso 2)'),
  // Step 3
  latitude: latitudeSchema('Ubicación no seleccionada en el mapa (Paso 3)'),
  longitude: longitudeSchema('Ubicación no seleccionada en el mapa (Paso 3)'),
  calle: z.string({ error: 'Calle no ingresada (Paso 3)' }).min(1, 'Calle no ingresada (Paso 3)'),
  distrito: z.string({ error: 'Distrito no ingresado (Paso 3)' }).min(1, 'Distrito no ingresado (Paso 3)'),
  provincia: z.string({ error: 'Provincia no ingresada (Paso 3)' }).min(1, 'Provincia no ingresada (Paso 3)'),
  departamento: z.string({ error: 'Departamento no ingresado (Paso 3)' }).min(1, 'Departamento no ingresado (Paso 3)'),
  // Step 5
  amount: priceSchema('Precio no ingresado (Paso 5)', 'El precio debe ser mayor a 0 (Paso 5)'),
  currency: z.enum(['PEN', 'USD'], {
    message: 'Moneda no seleccionada (Paso 5)',
  }),
  wantsRealtorHelp: z.boolean({
    message: 'Preferencia de agente no seleccionada (Paso 5)',
  }),
  maxRealtors: z
    .number({ message: 'Número de agentes no ingresado (Paso 5)' })
    .int('Número de agentes inválido (Paso 5)')
    .min(1, 'Número de agentes inválido (Paso 5)')
    .max(5, 'Número de agentes inválido (Paso 5)'),
})
