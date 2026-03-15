import { z } from 'zod'
import { PropertyType } from '@/types/enums'
import { propertyTypeHasRooms } from '@/types/enums'

// Step 1: Basics
export const step1Schema = z.object({
  propertyType: z.enum(
    ['casa', 'departamento', 'terreno', 'oficina', 'local', 'hospedaje', 'habitacion'],
    { message: 'Selecciona el tipo de propiedad' },
  ),
  operationType: z.enum(['venta', 'alquiler'], {
    message: 'Selecciona el tipo de operacion',
  }),
  rentalDurationType: z.enum(['longTerm', 'shortTerm', '']).optional(),
  role: z.enum(['owner', 'realtor', 'relative'], {
    message: 'Selecciona tu relacion con la propiedad',
  }),
}).superRefine((data, ctx) => {
  if (data.operationType === 'alquiler' && !data.rentalDurationType) {
    ctx.addIssue({
      code: 'custom',
      path: ['rentalDurationType'],
      message: 'Selecciona la duracion del alquiler',
    })
  }
})
export type Step1Data = z.infer<typeof step1Schema>

// Step 2: Details — conditional bedrooms/bathrooms
export const step2Schema = z
  .object({
    propertyType: z.string(), // passed through for conditional validation
    description: z
      .string()
      .min(20, 'La descripcion debe tener al menos 20 caracteres')
      .max(2000, 'La descripcion no puede exceder 2000 caracteres'),
    totalAreaInSquareMeters: z
      .number({ message: 'Ingresa un numero valido' })
      .positive('El area debe ser mayor a 0')
      .max(50000, 'El area no puede exceder 50,000 m²'),
    bedroomCount: z.number().int().min(1).max(20).optional().nullable(),
    bathroomCount: z.number().int().min(1).max(15).optional().nullable(),
    availableParkingSpaces: z.number().int().min(0).max(50),
    propertyAmenities: z.array(z.string().max(50)).max(30),
    hasPrivateBathroom: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasRooms = propertyTypeHasRooms(data.propertyType as PropertyType)

    if (hasRooms) {
      if (data.bedroomCount == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['bedroomCount'],
          message: 'Ingresa cantidad de dormitorios',
        })
      }
      if (data.bathroomCount == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['bathroomCount'],
          message: 'Ingresa cantidad de banos',
        })
      }
    }
  })
export type Step2Data = z.infer<typeof step2Schema>

// Step 3: Location + Photos
export const step3Schema = z.object({
  latitude: z
    .number({ message: 'Selecciona una ubicacion en el mapa' })
    .min(-90)
    .max(90),
  longitude: z
    .number({ message: 'Selecciona una ubicacion en el mapa' })
    .min(-180)
    .max(180),
  calle: z.string().min(1, 'Ingresa la calle y numero'),
  distrito: z.string().min(1, 'Ingresa el distrito'),
  provincia: z.string().min(1, 'Ingresa la provincia'),
  departamento: z.string().min(1, 'Ingresa el departamento'),
})
export type Step3Data = z.infer<typeof step3Schema>

// Step 4: Price
export const step4Schema = z
  .object({
    operationType: z.string(), // passed through for price validation
    rentalDurationType: z.string().optional(), // passed through for price validation
    propertyType: z.string().optional(), // passed through for price validation
    amount: z
      .number({ message: 'Ingresa un precio valido' })
      .positive('El precio debe ser mayor a 0'),
    currency: z.enum(['PEN', 'USD']),
    wantsRealtorHelp: z.boolean(),
    maxRealtors: z.number().int(),
  })
  .superRefine((data, ctx) => {
    const isVenta = data.operationType === 'venta'
    const isShortTerm = data.rentalDurationType === 'shortTerm'
    const isRoom = data.propertyType === 'habitacion'
    const isPEN = data.currency === 'PEN'
    const symbol = isPEN ? 'S/' : 'US$'

    if (isVenta) {
      const max = isPEN ? 5_000_000 : 2_000_000
      if (data.amount > max) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `El precio no puede exceder ${symbol} ${max.toLocaleString()}`,
        })
      }
    } else if (isShortTerm) {
      // Short-term rental (nightly)
      const max = isRoom
        ? (isPEN ? 500 : 150)
        : (isPEN ? 2_000 : 500)
      if (data.amount > max) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `El precio por noche no puede exceder ${symbol} ${max.toLocaleString()}`,
        })
      }
    } else {
      // Long-term rental (monthly)
      const max = isRoom
        ? (isPEN ? 5_000 : 1_500)
        : (isPEN ? 50_000 : 15_000)
      if (data.amount > max) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: `El precio mensual no puede exceder ${symbol} ${max.toLocaleString()}`,
        })
      }
    }
  })
export type Step4Data = z.infer<typeof step4Schema>

// Pre-submission validation for all steps (used in Step 4 before publish)
export const fullListingSchema = z.object({
  // Step 1
  propertyType: z.string().min(1, 'Tipo de propiedad no seleccionado (Paso 1)'),
  operationType: z.string().min(1, 'Tipo de operacion no seleccionado (Paso 1)'),
  rentalDurationType: z.string().optional(),
  role: z.string().min(1, 'Relacion con la propiedad no seleccionada (Paso 1)'),
  // Step 2
  description: z.string().min(20, 'La descripcion es muy corta (Paso 2)'),
  totalAreaInSquareMeters: z
    .number({ message: 'Area total no ingresada (Paso 2)' })
    .positive('Area total no ingresada (Paso 2)'),
  // Step 3
  latitude: z
    .number({ message: 'Ubicacion no seleccionada en el mapa (Paso 3)' })
    .min(-90)
    .max(90),
  longitude: z
    .number({ message: 'Ubicacion no seleccionada en el mapa (Paso 3)' })
    .min(-180)
    .max(180),
  calle: z.string().min(1, 'Calle no ingresada (Paso 3)'),
  distrito: z.string().min(1, 'Distrito no ingresado (Paso 3)'),
  provincia: z.string().min(1, 'Provincia no ingresada (Paso 3)'),
  departamento: z.string().min(1, 'Departamento no ingresado (Paso 3)'),
})
