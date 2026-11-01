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
    message: 'Selecciona el tipo de operación',
  }),
  rentalDurationType: z.enum(['longTerm', 'shortTerm', '']).optional(),
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

// Step 2: Details — conditional bedrooms/bathrooms
export const step2Schema = z
  .object({
    propertyType: z.string(), // passed through for conditional validation
    description: z
      .string()
      .min(20, 'La descripción debe tener al menos 20 caracteres')
      .max(2000, 'La descripción no puede exceder 2000 caracteres'),
    totalAreaInSquareMeters: z
      .number({ message: 'Ingresa un número válido' })
      .positive('El área debe ser mayor a 0'),
    bedroomCount: z.number().int().min(1).optional().nullable(),
    bathroomCount: z.number().int().min(1).optional().nullable(),
    availableParkingSpaces: z.number().int().min(0),
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
          message: 'Ingresa cantidad de baños',
        })
      }
    }
  })
export type Step2Data = z.infer<typeof step2Schema>

// Step 3: Location + Photos
export const step3Schema = z.object({
  latitude: z
    .number({ message: 'Selecciona una ubicación en el mapa' })
    .min(-90)
    .max(90),
  longitude: z
    .number({ message: 'Selecciona una ubicación en el mapa' })
    .min(-180)
    .max(180),
  calle: z.string().min(1, 'Ingresa la calle y número'),
  urbanizacion: z.string(),
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
      .number({ message: 'Ingresa un precio válido' })
      .positive('El precio debe ser mayor a 0'),
    currency: z.enum(['PEN', 'USD']),
    wantsRealtorHelp: z.boolean(),
    maxRealtors: z.number().int().min(1).max(5, 'Selecciona un número válido de agentes'),
  })
export type Step4Data = z.infer<typeof step4Schema>

// Pre-submission validation for all steps (used in Step 4 before publish)
export const fullListingSchema = z.object({
  // Step 1
  propertyType: z.string().min(1, 'Tipo de propiedad no seleccionado (Paso 1)'),
  operationType: z.string().min(1, 'Tipo de operación no seleccionado (Paso 1)'),
  rentalDurationType: z.string().optional(),
  role: z.string().min(1, 'Relación con la propiedad no seleccionada (Paso 1)'),
  // Step 2
  description: z.string().min(20, 'La descripción es muy corta (Paso 2)'),
  totalAreaInSquareMeters: z
    .number({ message: 'Área total no ingresada (Paso 2)' })
    .positive('Área total no ingresada (Paso 2)'),
  // Step 3
  latitude: z
    .number({ message: 'Ubicación no seleccionada en el mapa (Paso 3)' })
    .min(-90)
    .max(90),
  longitude: z
    .number({ message: 'Ubicación no seleccionada en el mapa (Paso 3)' })
    .min(-180)
    .max(180),
  calle: z.string().min(1, 'Calle no ingresada (Paso 3)'),
  distrito: z.string().min(1, 'Distrito no ingresado (Paso 3)'),
  provincia: z.string().min(1, 'Provincia no ingresada (Paso 3)'),
  departamento: z.string().min(1, 'Departamento no ingresado (Paso 3)'),
  // Step 5
  amount: z
    .number({ message: 'Precio no ingresado (Paso 5)' })
    .positive('El precio debe ser mayor a 0 (Paso 5)'),
  currency: z.enum(['PEN', 'USD'], {
    message: 'Moneda no seleccionada (Paso 5)',
  }),
  wantsRealtorHelp: z.boolean({
    message: 'Preferencia de agente no seleccionada (Paso 5)',
  }),
  maxRealtors: z.number({ message: 'Número de agentes no ingresado (Paso 5)' }).int().min(1).max(5, 'Número de agentes inválido (Paso 5)'),
})
